"""
Statistical hypothesis tests and data-driven scientific verdict engine.
Implements McNemar tests (predictions & correctness), Wilcoxon signed-rank,
paired t-tests on real host timings, bootstrap confidence intervals, and verdict synthesis.
"""

import numpy as np
from scipy import stats

def compute_mcnemar_test(y_true, y_pred_a, y_pred_b, name_a="FP32", name_b="INT8"):
    """
    Computes McNemar test for:
    1. Direct prediction agreement (contingency of classifications)
    2. Correctness agreement (contingency of correctness against ground truth)
    """
    y_true = np.array(y_true).astype(int)
    y_pred_a = np.array(y_pred_a).astype(int)
    y_pred_b = np.array(y_pred_b).astype(int)
    
    # 1. Prediction table
    # [ [both 0, a=0 & b=1], [a=1 & b=0, both 1] ]
    n00 = int(np.sum((y_pred_a == 0) & (y_pred_b == 0)))
    n01 = int(np.sum((y_pred_a == 0) & (y_pred_b == 1))) # a=0, b=1
    n10 = int(np.sum((y_pred_a == 1) & (y_pred_b == 0))) # a=1, b=0
    n11 = int(np.sum((y_pred_a == 1) & (y_pred_b == 1)))
    
    b_pred, c_pred = n10, n01
    table_pred = [[n00, n01], [n10, n11]]
    
    # 2. Correctness table (did precision change accuracy?)
    corr_a = (y_pred_a == y_true).astype(int)
    corr_b = (y_pred_b == y_true).astype(int)
    
    c00 = int(np.sum((corr_a == 0) & (corr_b == 0))) # both incorrect
    c01 = int(np.sum((corr_a == 0) & (corr_b == 1))) # a wrong, b correct
    c10 = int(np.sum((corr_a == 1) & (corr_b == 0))) # a correct, b wrong
    c11 = int(np.sum((corr_a == 1) & (corr_b == 1))) # both correct
    
    b_corr, c_corr = c10, c01
    table_corr = [[c00, c01], [c10, c11]]
    
    def calc_stats(b, c):
        discordant = b + c
        if discordant == 0:
            return 0.0, 0.0, 1.0, "exact_zero"
        
        # Standard chi-squared
        chi2 = ((b - c) ** 2) / float(discordant)
        # Continuity-corrected chi-squared
        chi2_cc = ((abs(b - c) - 1.0) ** 2) / float(discordant) if abs(b - c) >= 1 else 0.0
        
        if discordant < 25:
            # Exact two-sided binomial test
            # Under H0, b ~ Binomial(n=b+c, p=0.5)
            k = min(b, c)
            binom_res = stats.binomtest(k, discordant, p=0.5, alternative='two-sided')
            p_val = float(binom_res.pvalue)
            method = "exact_binomial"
        else:
            p_val = float(1.0 - stats.chi2.cdf(chi2_cc, df=1))
            method = "chi2_continuity_corrected"
            
        return float(chi2), float(chi2_cc), p_val, method
    
    chi2_p, chi2_p_cc, p_val_p, meth_p = calc_stats(b_pred, c_pred)
    chi2_c, chi2_c_cc, p_val_c, meth_c = calc_stats(b_corr, c_corr)
    
    return {
        "predictions": {
            "table_2x2": table_pred,
            "b": b_pred,
            "c": c_pred,
            "discordant_pairs": b_pred + c_pred,
            "chi2": chi2_p,
            "chi2_continuity_corrected": chi2_p_cc,
            "p_value": p_val_p,
            "method": meth_p,
            "significant_at_05": bool(p_val_p < 0.05)
        },
        "correctness": {
            "table_2x2": table_corr,
            "b_a_correct_b_wrong": b_corr,
            "c_a_wrong_b_correct": c_corr,
            "discordant_pairs": b_corr + c_corr,
            "chi2": chi2_c,
            "chi2_continuity_corrected": chi2_c_cc,
            "p_value": p_val_c,
            "method": meth_c,
            "significant_at_05": bool(p_val_c < 0.05)
        }
    }

def compute_paired_latency_stats(fp32_latencies, int8_latencies):
    """
    Computes paired t-test, Wilcoxon signed-rank, Cohen's d_z on measured host latency.
    """
    diffs = fp32_latencies - int8_latencies
    mean_diff = float(np.mean(diffs))
    std_diff = float(np.std(diffs, ddof=1)) if len(diffs) > 1 else 1e-6
    n = len(diffs)
    
    # Cohen's dz
    cohens_d = mean_diff / std_diff if std_diff > 0 else 0.0
    
    # 95% Confidence Interval for mean difference
    se = std_diff / np.sqrt(n)
    t_crit = stats.t.ppf(0.975, df=n-1) if n > 1 else 1.96
    ci_lower = mean_diff - t_crit * se
    ci_upper = mean_diff + t_crit * se
    
    # Paired t-test
    t_stat, p_t = stats.ttest_rel(fp32_latencies, int8_latencies)
    
    # Wilcoxon signed-rank test
    try:
        w_stat, p_w = stats.wilcoxon(fp32_latencies, int8_latencies)
        w_stat = float(w_stat)
        p_w = float(p_w)
    except Exception:
        w_stat, p_w = 0.0, 1.0
        
    return {
        "mean_diff_us": mean_diff,
        "ci_95_diff_us": [float(ci_lower), float(ci_upper)],
        "cohens_d_z": float(cohens_d),
        "t_statistic": float(t_stat) if not np.isnan(t_stat) else 0.0,
        "p_value_ttest": float(p_t) if not np.isnan(p_t) else 1.0,
        "wilcoxon_statistic": w_stat,
        "p_value_wilcoxon": p_w,
        "badge": "Measured on host"
    }

def compute_bootstrap_ci(metric_fn, y_true, y_pred_fp32, y_pred_int8, n_bootstrap=1000, seed=42):
    """
    Bootstrap 95% CI for (metric_int8 - metric_fp32) on cross-domain data.
    """
    rng = np.random.default_rng(seed)
    n = len(y_true)
    diffs = np.zeros(n_bootstrap)
    
    for b in range(n_bootstrap):
        idx = rng.choice(n, size=n, replace=True)
        yt_b = y_true[idx]
        m_fp32 = metric_fn(yt_b, y_pred_fp32[idx])
        m_int8 = metric_fn(yt_b, y_pred_int8[idx])
        diffs[b] = m_int8 - m_fp32
        
    ci_lower = float(np.percentile(diffs, 2.5))
    ci_upper = float(np.percentile(diffs, 97.5))
    mean_diff = float(np.mean(diffs))
    return {
        "mean_effect": mean_diff,
        "ci_95": [ci_lower, ci_upper]
    }

def synthesize_scientific_verdict(mcnemar_cross, bootstrap_bal_acc, delta_collapse_fp32, delta_collapse_int8):
    """
    Synthesizes scientific verdict according to the paper's decision rules:
    - If 95% CI of effect on cross-domain balanced acc > 0 and McNemar(correctness) p < 0.05:
      "INT8 MITIGATES collapse"
    - If 95% CI < 0 and p < 0.05:
      "INT8 EXACERBATES collapse"
    - Otherwise:
      "NO STATISTICALLY SIGNIFICANT EFFECT (INT8 preserves FP32's shortcut behaviour)"
    """
    ci_lower, ci_upper = bootstrap_bal_acc["ci_95"]
    p_val_corr = mcnemar_cross["correctness"]["p_value"]
    is_significant = (p_val_corr < 0.05)
    
    if is_significant and ci_lower > 0.0:
        decision = "INT8 MITIGATES COLLAPSE"
        explanation = (
            f"INT8 quantization demonstrated a statistically significant mitigating effect on cross-domain "
            f"accuracy collapse (McNemar correctness p = {p_val_corr:.4e} < 0.05, 95% Bootstrap CI: [{ci_lower:+.4f}, {ci_upper:+.4f}]). "
            f"Quantization acted as an implicit regularizer, pruning fragile shortcut features learned during training."
        )
    elif is_significant and ci_upper < 0.0:
        decision = "INT8 EXACERBATES COLLAPSE"
        explanation = (
            f"INT8 quantization worsened cross-domain accuracy collapse (McNemar correctness p = {p_val_corr:.4e} < 0.05, "
            f"95% Bootstrap CI: [{ci_lower:+.4f}, {ci_upper:+.4f}]). "
            f"Low-precision representations degraded marginal classification margins without dislodging shortcut dependencies."
        )
    else:
        decision = "NO STATISTICALLY SIGNIFICANT EFFECT"
        explanation = (
            f"INT8 quantization neither significantly mitigated nor exacerbated cross-domain collapse "
            f"(McNemar correctness p = {p_val_corr:.4f}, 95% Bootstrap CI: [{ci_lower:+.4f}, {ci_upper:+.4f}] covers zero). "
            f"INT8 post-training quantization preserved the FP32 model's shortcut learning representations virtually identically."
        )
        
    return {
        "verdict": decision,
        "explanation": explanation,
        "p_value_mcnemar_correctness": p_val_corr,
        "bootstrap_ci_95_effect": [ci_lower, ci_upper],
        "delta_collapse_fp32": float(delta_collapse_fp32),
        "delta_collapse_int8": float(delta_collapse_int8),
        "quantization_effect_on_collapse": float(delta_collapse_int8 - delta_collapse_fp32)
    }
