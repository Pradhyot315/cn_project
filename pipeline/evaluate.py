"""
Comprehensive evaluation metrics for in-domain (CIC) and cross-domain (UNSW).
Computes accuracy, balanced accuracy, F1, precision, recall (TPR), FPR, ROC-AUC,
confusion matrices, and per-attack-category recall breakdown on UNSW.
"""

import numpy as np
from sklearn.metrics import (
    accuracy_score, balanced_accuracy_score, precision_score,
    recall_score, f1_score, roc_auc_score, confusion_matrix
)

def compute_binary_metrics(y_true, y_pred, y_prob=None):
    """Computes all standard binary classification metrics."""
    y_true = np.asarray(y_true, dtype=int)
    y_pred = np.asarray(y_pred, dtype=int)
    
    acc = float(accuracy_score(y_true, y_pred))
    bal_acc = float(balanced_accuracy_score(y_true, y_pred))
    prec = float(precision_score(y_true, y_pred, zero_division=0))
    rec = float(recall_score(y_true, y_pred, zero_division=0)) # TPR
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = map(int, cm.ravel())
    fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
    
    auc = None
    if y_prob is not None:
        try:
            auc = float(roc_auc_score(y_true, y_prob))
        except Exception:
            auc = None
            
    return {
        "accuracy": acc,
        "balanced_accuracy": bal_acc,
        "precision": prec,
        "recall_tpr": rec,
        "f1_score": f1,
        "fpr": fpr,
        "roc_auc": auc,
        "confusion_matrix": {
            "tn": tn, "fp": fp,
            "fn": fn, "tp": tp
        }
    }

def evaluate_per_attack_category(df_unsw, y_pred_fp32, y_pred_int8):
    """
    Computes recall for each UNSW attack category and FPR for Normal.
    """
    attack_cats = df_unsw["attack_cat"].astype(str).str.strip()
    unique_cats = sorted(attack_cats.unique())
    
    results = {}
    for cat in unique_cats:
        mask = (attack_cats == cat).values
        n_samples = int(np.sum(mask))
        if n_samples == 0:
            continue
            
        preds_f = y_pred_fp32[mask]
        preds_i = y_pred_int8[mask]
        
        if cat.lower() == "normal":
            # For normal, report FPR (fraction flagged as attack = 1)
            fpr_f = float(np.mean(preds_f == 1))
            fpr_i = float(np.mean(preds_i == 1))
            results[cat] = {
                "type": "normal",
                "count": n_samples,
                "fpr_fp32": fpr_f,
                "fpr_int8": fpr_i,
                "correct_fp32": int(np.sum(preds_f == 0)),
                "correct_int8": int(np.sum(preds_i == 0))
            }
        else:
            # For attack categories, report Recall (fraction correctly flagged as 1)
            rec_f = float(np.mean(preds_f == 1))
            rec_i = float(np.mean(preds_i == 1))
            results[cat] = {
                "type": "attack",
                "count": n_samples,
                "recall_fp32": rec_f,
                "recall_int8": rec_i,
                "detected_fp32": int(np.sum(preds_f == 1)),
                "detected_int8": int(np.sum(preds_i == 1))
            }
            
    return results

def compute_collapse_delta(in_domain_metrics, cross_domain_metrics):
    """
    Computes performance drop (in-domain - cross-domain) for FP32 and INT8.
    """
    delta_fp32_acc = in_domain_metrics["fp32"]["accuracy"] - cross_domain_metrics["fp32"]["accuracy"]
    delta_int8_acc = in_domain_metrics["int8"]["accuracy"] - cross_domain_metrics["int8"]["accuracy"]
    
    delta_fp32_bal = in_domain_metrics["fp32"]["balanced_accuracy"] - cross_domain_metrics["fp32"]["balanced_accuracy"]
    delta_int8_bal = in_domain_metrics["int8"]["balanced_accuracy"] - cross_domain_metrics["int8"]["balanced_accuracy"]
    
    return {
        "accuracy_collapse": {
            "fp32_drop": float(delta_fp32_acc),
            "int8_drop": float(delta_int8_acc),
            "effect_on_collapse": float(delta_int8_acc - delta_fp32_acc)
        },
        "balanced_accuracy_collapse": {
            "fp32_drop": float(delta_fp32_bal),
            "int8_drop": float(delta_int8_bal),
            "effect_on_collapse": float(delta_int8_bal - delta_fp32_bal)
        }
    }
