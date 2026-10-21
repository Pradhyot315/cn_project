"""
Shortcut Learning Probe using Permutation Feature Importance.
Evaluates the drop in balanced accuracy when each of the 16 features is permuted.
Compares in-domain (CIC) vs cross-domain (UNSW) for FP32 and INT8.
Features with high in-domain importance but near-zero cross-domain importance
are flagged as candidate shortcut features.
"""

import numpy as np
from sklearn.metrics import balanced_accuracy_score

def compute_permutation_importance(predict_fn, X, y, feature_names, n_repeats=5, max_samples=20000, seed=42):
    """
    Computes permutation importance (drop in balanced accuracy) for each feature.
    """
    rng = np.random.default_rng(seed)
    N = len(y)
    
    # Subsample if large
    if N > max_samples:
        idx = rng.choice(N, size=max_samples, replace=False)
        X = X[idx]
        y = y[idx]
        N = max_samples
        
    baseline_preds = predict_fn(X)
    baseline_score = float(balanced_accuracy_score(y, baseline_preds))
    
    importances = {}
    for j, feat in enumerate(feature_names):
        scores = []
        for r in range(n_repeats):
            X_perm = X.copy()
            X_perm[:, j] = rng.permutation(X_perm[:, j])
            perm_preds = predict_fn(X_perm)
            perm_score = float(balanced_accuracy_score(y, perm_preds))
            scores.append(baseline_score - perm_score)
            
        importances[feat] = {
            "mean_importance": float(np.mean(scores)),
            "std_importance": float(np.std(scores)),
            "baseline_score": baseline_score
        }
        
    return importances

def probe_shortcuts(fp32_pred_fn, int8_pred_fn, X_cic, y_cic, X_unsw, y_unsw, feature_names):
    """Runs permutation probe on both domains and both precisions."""
    print("Running shortcut probe on in-domain (CIC)...")
    cic_fp32 = compute_permutation_importance(fp32_pred_fn, X_cic, y_cic, feature_names)
    cic_int8 = compute_permutation_importance(int8_pred_fn, X_cic, y_cic, feature_names)
    
    print("Running shortcut probe on cross-domain (UNSW)...")
    unsw_fp32 = compute_permutation_importance(fp32_pred_fn, X_unsw, y_unsw, feature_names)
    unsw_int8 = compute_permutation_importance(int8_pred_fn, X_unsw, y_unsw, feature_names)
    
    shortcut_analysis = []
    for feat in feature_names:
        in_imp_f = cic_fp32[feat]["mean_importance"]
        cross_imp_f = unsw_fp32[feat]["mean_importance"]
        in_imp_i = cic_int8[feat]["mean_importance"]
        cross_imp_i = unsw_int8[feat]["mean_importance"]
        
        # Shortcut score: high in-domain reliance but negligible or negative transfer to target
        is_candidate_shortcut = bool((in_imp_f > 0.02) and (cross_imp_f < 0.005))
        
        shortcut_analysis.append({
            "feature": feat,
            "cic_fp32_importance": in_imp_f,
            "cic_int8_importance": in_imp_i,
            "unsw_fp32_importance": cross_imp_f,
            "unsw_int8_importance": cross_imp_i,
            "is_candidate_shortcut": is_candidate_shortcut
        })
        
    return {
        "analysis": shortcut_analysis,
        "details": {
            "cic_fp32": cic_fp32,
            "cic_int8": cic_int8,
            "unsw_fp32": unsw_fp32,
            "unsw_int8": unsw_int8
        }
    }
