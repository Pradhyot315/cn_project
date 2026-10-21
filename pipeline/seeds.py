"""
Multi-Seed Robustness Validation.
Trains and quantizes models across 5 random seeds to determine if the quantization effect
on cross-domain collapse is statistically consistent or attributable to random initialization noise.
"""

import numpy as np
from scipy import stats
from pipeline.train import train_fp32_mlp
from pipeline.quantize import quantize_model, int8_quantize_input, int8_forward_integer_only
from pipeline.evaluate import compute_binary_metrics

def run_multi_seed_experiments(X_train, y_train, X_cic_val, y_cic_val, X_unsw, y_unsw, seeds=[42, 123, 456, 789, 101112]):
    """
    Runs training, INT8 quantization, and evaluation over multiple seeds.
    """
    print(f"Running multi-seed experiments across {len(seeds)} seeds...")
    seed_results = []
    
    # 500 calibration samples
    calib_x = X_train[:500]
    
    for s in seeds:
        print(f"  Training Seed {s}...")
        model_fp32 = train_fp32_mlp(X_train, y_train, epochs=8, batch_size=512, seed=s)
        model_int8 = quantize_model(model_fp32.to_dict(), calib_x)
        
        # In-domain predictions
        prob_f_in = model_fp32.predict_prob(X_cic_val)
        pred_f_in = (prob_f_in >= 0.5).astype(int)
        
        q_x_in = int8_quantize_input(X_cic_val, model_int8["s_in"], model_int8["z_in"])
        prob_i_in, pred_i_in = int8_forward_integer_only(q_x_in, model_int8)
        
        # Cross-domain predictions
        prob_f_cross = model_fp32.predict_prob(X_unsw)
        pred_f_cross = (prob_f_cross >= 0.5).astype(int)
        
        q_x_cross = int8_quantize_input(X_unsw, model_int8["s_in"], model_int8["z_in"])
        prob_i_cross, pred_i_cross = int8_forward_integer_only(q_x_cross, model_int8)
        
        # Metrics
        m_f_in = compute_binary_metrics(y_cic_val, pred_f_in, prob_f_in)
        m_i_in = compute_binary_metrics(y_cic_val, pred_i_in, prob_i_in)
        m_f_cross = compute_binary_metrics(y_unsw, pred_f_cross, prob_f_cross)
        m_i_cross = compute_binary_metrics(y_unsw, pred_i_cross, prob_i_cross)
        
        seed_results.append({
            "seed": s,
            "in_domain": {
                "fp32_acc": m_f_in["accuracy"],
                "int8_acc": m_i_in["accuracy"],
                "fp32_bal_acc": m_f_in["balanced_accuracy"],
                "int8_bal_acc": m_i_in["balanced_accuracy"],
            },
            "cross_domain": {
                "fp32_acc": m_f_cross["accuracy"],
                "int8_acc": m_i_cross["accuracy"],
                "fp32_bal_acc": m_f_cross["balanced_accuracy"],
                "int8_bal_acc": m_i_cross["balanced_accuracy"],
            },
            "collapse_drop": {
                "fp32_drop": m_f_in["accuracy"] - m_f_cross["accuracy"],
                "int8_drop": m_i_in["accuracy"] - m_i_cross["accuracy"],
                "quantization_effect": (m_i_in["accuracy"] - m_i_cross["accuracy"]) - (m_f_in["accuracy"] - m_f_cross["accuracy"])
            }
        })
        
    cross_acc_f = [r["cross_domain"]["fp32_acc"] for r in seed_results]
    cross_acc_i = [r["cross_domain"]["int8_acc"] for r in seed_results]
    
    t_stat, p_val = stats.ttest_rel(cross_acc_f, cross_acc_i)
    
    return {
        "seeds": seed_results,
        "summary": {
            "mean_cross_acc_fp32": float(np.mean(cross_acc_f)),
            "std_cross_acc_fp32": float(np.std(cross_acc_f)),
            "mean_cross_acc_int8": float(np.mean(cross_acc_i)),
            "std_cross_acc_int8": float(np.std(cross_acc_i)),
            "paired_t_statistic": float(t_stat) if not np.isnan(t_stat) else 0.0,
            "p_value": float(p_val) if not np.isnan(p_val) else 1.0,
            "is_statistically_significant": bool(p_val < 0.05) if not np.isnan(p_val) else False
        }
    }
