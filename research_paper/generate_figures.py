"""
Figure and Data Export Generator for ZeroEdge-NIDS Research Paper.
Extracts empirical results from backend/data artifacts, exports CSV tables,
and renders publication-grade 300 DPI figures using matplotlib and seaborn.
"""

import os
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import seaborn as sns

# Configure publication styling
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['DejaVu Sans', 'Arial', 'Helvetica']
plt.rcParams['axes.edgecolor'] = '#333333'
plt.rcParams['axes.linewidth'] = 0.8
plt.rcParams['grid.color'] = '#e0e0e0'
plt.rcParams['grid.linestyle'] = '--'
plt.rcParams['grid.linewidth'] = 0.5
plt.rcParams['figure.dpi'] = 300
plt.rcParams['savefig.dpi'] = 300
plt.rcParams['savefig.bbox'] = 'tight'

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "backend", "data")
OUT_DATA_DIR = os.path.join(BASE_DIR, "research_paper", "data")
OUT_FIG_DIR = os.path.join(BASE_DIR, "research_paper", "figures")

os.makedirs(OUT_DATA_DIR, exist_ok=True)
os.makedirs(OUT_FIG_DIR, exist_ok=True)

# 1. Load artifacts
with open(os.path.join(DATA_DIR, "metrics.json"), "r") as f:
    metrics = json.load(f)

with open(os.path.join(DATA_DIR, "per_attack.json"), "r") as f:
    per_attack = json.load(f)

with open(os.path.join(DATA_DIR, "permutation_importance.json"), "r") as f:
    perm_importance = json.load(f)

with open(os.path.join(DATA_DIR, "profiling.json"), "r") as f:
    profiling = json.load(f)

with open(os.path.join(DATA_DIR, "stats.json"), "r") as f:
    stats_data = json.load(f)

with open(os.path.join(DATA_DIR, "dataset_stats.json"), "r") as f:
    dataset_stats = json.load(f)

print("[+] Successfully loaded all JSON artifacts from backend/data.")

# ==============================================================================
# EXPORT RAW CSV DATA FILES
# ==============================================================================

# CSV 1: Metrics Summary Table
metrics_rows = [
    {
        "Domain": "In-Domain (CIC-IDS-2017)",
        "Model": "FP32",
        "Accuracy": metrics["in_domain"]["fp32"]["accuracy"],
        "Balanced_Accuracy": metrics["in_domain"]["fp32"]["balanced_accuracy"],
        "Precision": metrics["in_domain"]["fp32"]["precision"],
        "Recall_TPR": metrics["in_domain"]["fp32"]["recall_tpr"],
        "F1_Score": metrics["in_domain"]["fp32"]["f1_score"],
        "FPR": metrics["in_domain"]["fp32"]["fpr"],
        "ROC_AUC": metrics["in_domain"]["fp32"]["roc_auc"]
    },
    {
        "Domain": "In-Domain (CIC-IDS-2017)",
        "Model": "INT8",
        "Accuracy": metrics["in_domain"]["int8"]["accuracy"],
        "Balanced_Accuracy": metrics["in_domain"]["int8"]["balanced_accuracy"],
        "Precision": metrics["in_domain"]["int8"]["precision"],
        "Recall_TPR": metrics["in_domain"]["int8"]["recall_tpr"],
        "F1_Score": metrics["in_domain"]["int8"]["f1_score"],
        "FPR": metrics["in_domain"]["int8"]["fpr"],
        "ROC_AUC": metrics["in_domain"]["int8"]["roc_auc"]
    },
    {
        "Domain": "Cross-Domain Zero-Shot (UNSW-NB15)",
        "Model": "FP32",
        "Accuracy": metrics["cross_domain"]["fp32"]["accuracy"],
        "Balanced_Accuracy": metrics["cross_domain"]["fp32"]["balanced_accuracy"],
        "Precision": metrics["cross_domain"]["fp32"]["precision"],
        "Recall_TPR": metrics["cross_domain"]["fp32"]["recall_tpr"],
        "F1_Score": metrics["cross_domain"]["fp32"]["f1_score"],
        "FPR": metrics["cross_domain"]["fp32"]["fpr"],
        "ROC_AUC": metrics["cross_domain"]["fp32"]["roc_auc"]
    },
    {
        "Domain": "Cross-Domain Zero-Shot (UNSW-NB15)",
        "Model": "INT8",
        "Accuracy": metrics["cross_domain"]["int8"]["accuracy"],
        "Balanced_Accuracy": metrics["cross_domain"]["int8"]["balanced_accuracy"],
        "Precision": metrics["cross_domain"]["int8"]["precision"],
        "Recall_TPR": metrics["cross_domain"]["int8"]["recall_tpr"],
        "F1_Score": metrics["cross_domain"]["int8"]["f1_score"],
        "FPR": metrics["cross_domain"]["int8"]["fpr"],
        "ROC_AUC": metrics["cross_domain"]["int8"]["roc_auc"]
    }
]
df_metrics = pd.DataFrame(metrics_rows)
df_metrics.to_csv(os.path.join(OUT_DATA_DIR, "data_metrics_summary.csv"), index=False)

# CSV 2: Per-Attack Recall Table
attack_rows = []
for cat, vals in per_attack.items():
    if vals.get("type") == "attack":
        attack_rows.append({
            "Attack_Category": cat,
            "Total_Flows": vals["count"],
            "FP32_Detected": vals["detected_fp32"],
            "FP32_Recall": vals["recall_fp32"],
            "INT8_Detected": vals["detected_int8"],
            "INT8_Recall": vals["recall_int8"],
            "Delta_Recall": vals["recall_int8"] - vals["recall_fp32"]
        })
    else:
        attack_rows.append({
            "Attack_Category": cat,
            "Total_Flows": vals["count"],
            "FP32_Detected": vals.get("correct_fp32", 0),
            "FP32_Recall": 1.0 - vals.get("fpr_fp32", 0.0),
            "INT8_Detected": vals.get("correct_int8", 0),
            "INT8_Recall": 1.0 - vals.get("fpr_int8", 0.0),
            "Delta_Recall": vals.get("fpr_fp32", 0.0) - vals.get("fpr_int8", 0.0)
        })
df_per_attack = pd.DataFrame(attack_rows)
df_per_attack.to_csv(os.path.join(OUT_DATA_DIR, "data_per_attack_recall.csv"), index=False)

# CSV 3: Permutation Importance Table
df_perm = pd.DataFrame(perm_importance["analysis"])
df_perm.to_csv(os.path.join(OUT_DATA_DIR, "data_permutation_importance.csv"), index=False)

# CSV 4: Confusion Matrices
cm_rows = [
    {"Evaluation": "In-Domain FP32", "TN": metrics["in_domain"]["fp32"]["confusion_matrix"]["tn"],
     "FP": metrics["in_domain"]["fp32"]["confusion_matrix"]["fp"],
     "FN": metrics["in_domain"]["fp32"]["confusion_matrix"]["fn"],
     "TP": metrics["in_domain"]["fp32"]["confusion_matrix"]["tp"]},
    {"Evaluation": "In-Domain INT8", "TN": metrics["in_domain"]["int8"]["confusion_matrix"]["tn"],
     "FP": metrics["in_domain"]["int8"]["confusion_matrix"]["fp"],
     "FN": metrics["in_domain"]["int8"]["confusion_matrix"]["fn"],
     "TP": metrics["in_domain"]["int8"]["confusion_matrix"]["tp"]},
    {"Evaluation": "Cross-Domain FP32", "TN": metrics["cross_domain"]["fp32"]["confusion_matrix"]["tn"],
     "FP": metrics["cross_domain"]["fp32"]["confusion_matrix"]["fp"],
     "FN": metrics["cross_domain"]["fp32"]["confusion_matrix"]["fn"],
     "TP": metrics["cross_domain"]["fp32"]["confusion_matrix"]["tp"]},
    {"Evaluation": "Cross-Domain INT8", "TN": metrics["cross_domain"]["int8"]["confusion_matrix"]["tn"],
     "FP": metrics["cross_domain"]["int8"]["confusion_matrix"]["fp"],
     "FN": metrics["cross_domain"]["int8"]["confusion_matrix"]["fn"],
     "TP": metrics["cross_domain"]["int8"]["confusion_matrix"]["tp"]},
]
df_cm = pd.DataFrame(cm_rows)
df_cm.to_csv(os.path.join(OUT_DATA_DIR, "data_confusion_matrices.csv"), index=False)

# CSV 5: Benchmarking & Profiling
bench_rows = [
    {"Tier": "Measured on Host (CPU)", "Metric": "FP32 Median Latency", "Value": profiling["measured_benchmark"]["fp32"]["median_us"], "Unit": "microseconds"},
    {"Tier": "Measured on Host (CPU)", "Metric": "FP32 P95 Latency", "Value": profiling["measured_benchmark"]["fp32"]["p95_us"], "Unit": "microseconds"},
    {"Tier": "Measured on Host (CPU)", "Metric": "INT8 Median Latency", "Value": profiling["measured_benchmark"]["int8"]["median_us"], "Unit": "microseconds"},
    {"Tier": "Measured on Host (CPU)", "Metric": "INT8 P95 Latency", "Value": profiling["measured_benchmark"]["int8"]["p95_us"], "Unit": "microseconds"},
    {"Tier": "Measured on Host (CPU)", "Metric": "INT8 Throughput", "Value": profiling["measured_benchmark"]["int8"]["throughput_inf_per_s"], "Unit": "inf/sec"},
    {"Tier": "ESP32 Projection (Analytical)", "Metric": "Projected INT8 Cycles", "Value": profiling["esp32_projection_int8"]["cycles"], "Unit": "cycles"},
    {"Tier": "ESP32 Projection (Analytical)", "Metric": "Projected FP32 Cycles", "Value": profiling["esp32_projection_fp32"]["cycles"], "Unit": "cycles"},
    {"Tier": "ESP32 Projection (Analytical)", "Metric": "Tensor Arena SRAM", "Value": profiling["esp32_projection_int8"]["tensor_arena_bytes"], "Unit": "bytes"},
    {"Tier": "ESP32 Projection (Analytical)", "Metric": "Flash Footprint", "Value": profiling["esp32_projection_int8"]["flash_param_bytes"], "Unit": "bytes"},
    {"Tier": "ESP32 Projection (Analytical)", "Metric": "Energy per Inference", "Value": profiling["esp32_projection_int8"]["energy_uj"], "Unit": "microjoules"},
    {"Tier": "ESP32 Projection (Analytical)", "Metric": "Active Power", "Value": profiling["esp32_projection_int8"]["active_power_mw"], "Unit": "milliwatts"},
]
df_bench = pd.DataFrame(bench_rows)
df_bench.to_csv(os.path.join(OUT_DATA_DIR, "data_benchmarking_profiling.csv"), index=False)

print("[+] Successfully exported 5 CSV datasets to research_paper/data/.")

# ==============================================================================
# FIGURE GENERATION (300 DPI)
# ==============================================================================

# ------------------------------------------------------------------------------
# FIG 1: System Architecture Diagram
# ------------------------------------------------------------------------------
fig, ax = plt.subplots(figsize=(10, 6.2))
ax.set_xlim(0, 100)
ax.set_ylim(0, 100)
ax.axis('off')

# Layer boxes
layers = [
    ("Layer 4: Interactive Validation & Emulation Dashboard (React / Vite)", 77, 18, "#e8f4f8", "#0284c7"),
    ("Layer 3: Telemetry Server & Real-Time Engine (FastAPI / WebSocket)", 53, 18, "#f0fdf4", "#16a34a"),
    ("Layer 2: Post-Training Integer Quantization & Edge Modeling (NumPy / ESP32 Model)", 29, 18, "#faf5ff", "#9333ea"),
    ("Layer 1: Offline Training, Feature Harmonization & Shortcut Probing", 5, 18, "#fff7ed", "#ea580c"),
]

for label, y, h, bg_color, border_color in layers:
    rect = patches.FancyBboxPatch((4, y), 92, h, boxstyle="round,pad=1.2",
                                  facecolor=bg_color, edgecolor=border_color, linewidth=1.5)
    ax.add_patch(rect)
    ax.text(6, y + h - 4.5, label, fontsize=10.5, fontweight='bold', color=border_color)

# Sub-components inside Layer 4
comp_l4 = [
    ("Cross-Domain Oscilloscope", 6, 79, 26, 9),
    ("Hardware-in-the-Loop Simulator", 35, 79, 30, 9),
    ("Interactive Experiment Lab", 68, 79, 26, 9),
]
for text, x, y, w, h in comp_l4:
    box = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.5", facecolor="#ffffff", edgecolor="#0284c7", linewidth=0.8)
    ax.add_patch(box)
    ax.text(x + w/2, y + h/2 - 0.5, text, fontsize=8, ha='center', va='center', color="#0f172a")

# Sub-components inside Layer 3
comp_l3 = [
    ("FastAPI REST Endpoints (/metrics, /predict)", 6, 55, 34, 9),
    ("Zero-Copy Host Inference Engine", 43, 55, 26, 9),
    ("WebSocket Telemetry Stream (:8000)", 72, 55, 22, 9),
]
for text, x, y, w, h in comp_l3:
    box = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.5", facecolor="#ffffff", edgecolor="#16a34a", linewidth=0.8)
    ax.add_patch(box)
    ax.text(x + w/2, y + h/2 - 0.5, text, fontsize=8, ha='center', va='center', color="#0f172a")

# Sub-components inside Layer 2
comp_l2 = [
    ("Asymmetric Input Quantization\nq = round(x/S) + Z", 6, 31, 28, 9),
    ("Symmetric Weight Quantization\nW_int = round(W/S_w)", 37, 31, 28, 9),
    ("Analytical ESP32 Hardware Model\n(Cycles, SRAM, Flash, INA219)", 68, 31, 26, 9),
]
for text, x, y, w, h in comp_l2:
    box = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.5", facecolor="#ffffff", edgecolor="#9333ea", linewidth=0.8)
    ax.add_patch(box)
    ax.text(x + w/2, y + h/2 - 0.5, text, fontsize=7.5, ha='center', va='center', color="#0f172a")

# Sub-components inside Layer 1
comp_l1 = [
    ("CIC-IDS-2017 Dataset\n(2.83M Flows / 358k Sampled)", 6, 7, 26, 9),
    ("16 Harmonized Flow Features\n(Artifact-Dropped Mapping)", 35, 7, 30, 9),
    ("Zero-Shot Target Evaluation\n(UNSW-NB15 / 257k Flows)", 68, 7, 26, 9),
]
for text, x, y, w, h in comp_l1:
    box = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.5", facecolor="#ffffff", edgecolor="#ea580c", linewidth=0.8)
    ax.add_patch(box)
    ax.text(x + w/2, y + h/2 - 0.5, text, fontsize=7.5, ha='center', va='center', color="#0f172a")

# Connecting Arrows
for y_arr in [24, 48, 72]:
    ax.annotate('', xy=(50, y_arr + 4), xytext=(50, y_arr - 0.5),
                arrowprops=dict(arrowstyle="->", lw=1.5, color="#64748b"))

plt.title("Fig. 1: Four-Tier System Architecture of the ZeroEdge-NIDS Evaluation Platform", fontsize=11, fontweight='bold', pad=12)
plt.savefig(os.path.join(OUT_FIG_DIR, "fig1_system_architecture.png"))
plt.close()

# ------------------------------------------------------------------------------
# FIG 2: Data Flow and Pipeline Sequence
# ------------------------------------------------------------------------------
fig, ax = plt.subplots(figsize=(9, 4.8))
ax.set_xlim(0, 100)
ax.set_ylim(0, 100)
ax.axis('off')

steps = [
    ("1. Raw PCAP / Flow Capture\n(Source / Target)", 8, 45, 16, 22, "#f1f5f9", "#475569"),
    ("2. 16 Harmonized Features\n(Drop IP/Port shortcuts)", 28, 45, 16, 22, "#e0f2fe", "#0284c7"),
    ("3. Log1p + Pre-fitted Scaler\n(Frozen CIC Parameters)", 48, 45, 16, 22, "#fef3c7", "#d97706"),
    ("4. Dual Execution Engine\nFP32 MLP vs. INT8 PTQ", 68, 45, 16, 22, "#ede9fe", "#7c3aed"),
    ("5. Telemetry & Hardware Auditing\n(Host Latency & MCU Model)", 88, 45, 10, 22, "#dcfce7", "#16a34a"),
]

for title, cx, cy, w, h, bg, border in steps:
    rect = patches.FancyBboxPatch((cx - w/2, cy - h/2), w, h, boxstyle="round,pad=0.8", facecolor=bg, edgecolor=border, linewidth=1.2)
    ax.add_patch(rect)
    ax.text(cx, cy, title, fontsize=7.8, ha='center', va='center', fontweight='medium', color="#1e293b")

# Arrows between steps
for cx in [16, 36, 56, 76]:
    ax.annotate('', xy=(cx + 4, 45), xytext=(cx, 45),
                arrowprops=dict(arrowstyle="->", lw=1.8, color="#0f172a"))

# Feedback / Statistical Loop
ax.annotate('Statistical Tests: McNemar Correctness (p < 10⁻¹⁵) & Wilcoxon Parity',
            xy=(48, 22), xytext=(48, 22),
            ha='center', va='center', fontsize=8.5, fontweight='bold', color="#4338ca",
            bbox=dict(boxstyle="round,pad=0.6", facecolor="#e0e7ff", edgecolor="#6366f1", lw=1))
ax.annotate('', xy=(28, 34), xytext=(28, 26), arrowprops=dict(arrowstyle="<-", lw=1.2, color="#6366f1", connectionstyle="angle,angleA=0,angleB=90"))
ax.annotate('', xy=(68, 34), xytext=(68, 26), arrowprops=dict(arrowstyle="<-", lw=1.2, color="#6366f1", connectionstyle="angle,angleA=0,angleB=90"))

plt.title("Fig. 2: ZeroEdge-NIDS End-to-End Flow Transformation & Evaluation Pipeline", fontsize=10.5, fontweight='bold', pad=12)
plt.savefig(os.path.join(OUT_FIG_DIR, "fig2_data_flow_sequence.png"))
plt.close()

# ------------------------------------------------------------------------------
# FIG 3: Accuracy Collapse and Quantization Mitigation
# ------------------------------------------------------------------------------
fig, ax = plt.subplots(figsize=(7.5, 4.8))

labels = ['In-Domain\n(CIC-IDS-2017)', 'Cross-Domain Zero-Shot\n(UNSW-NB15)']
fp32_acc = [metrics["in_domain"]["fp32"]["accuracy"] * 100, metrics["cross_domain"]["fp32"]["accuracy"] * 100]
int8_acc = [metrics["in_domain"]["int8"]["accuracy"] * 100, metrics["cross_domain"]["int8"]["accuracy"] * 100]

x = np.arange(len(labels))
width = 0.32

rects1 = ax.bar(x - width/2, fp32_acc, width, label='FP32 Baseline MLP', color='#0284c7', edgecolor='#0369a1')
rects2 = ax.bar(x + width/2, int8_acc, width, label='INT8 Quantized (PTQ)', color='#7c3aed', edgecolor='#6d28d9')

ax.set_ylabel('Accuracy (%)', fontsize=10, fontweight='bold')
ax.set_title('Fig. 3: Cross-Domain Accuracy Collapse and Quantization Mitigation Effect', fontsize=10.5, fontweight='bold', pad=12)
ax.set_xticks(x)
ax.set_xticklabels(labels, fontsize=9.5, fontweight='medium')
ax.legend(frameon=True, fontsize=9, loc='upper right')
ax.set_ylim(0, 115)
ax.grid(axis='y', alpha=0.5)

# Value annotations
for rect in rects1:
    h = rect.get_height()
    ax.annotate(f'{h:.2f}%', xy=(rect.get_x() + rect.get_width() / 2, h),
                xytext=(0, 4), textcoords="offset points", ha='center', va='bottom', fontsize=8.5, fontweight='bold', color='#0369a1')

for rect in rects2:
    h = rect.get_height()
    ax.annotate(f'{h:.2f}%', xy=(rect.get_x() + rect.get_width() / 2, h),
                xytext=(0, 4), textcoords="offset points", ha='center', va='bottom', fontsize=8.5, fontweight='bold', color='#6d28d9')

# Annotate Collapse & Mitigation
ax.annotate('Catastrophic Collapse\n-61.92% (FP32)', xy=(0.35, 65), xytext=(0.48, 75),
            arrowprops=dict(arrowstyle="->", lw=1.2, color='#b91c1c'),
            fontsize=8.5, fontweight='bold', color='#b91c1c', ha='center',
            bbox=dict(boxstyle="round,pad=0.4", facecolor="#fee2e2", edgecolor="#ef4444", lw=0.8))

ax.annotate('+1.09% Boost\n(-2.32% Collapse Dampening)\nMcNemar p < 10⁻¹⁵',
            xy=(1.16, 38), xytext=(1.18, 55),
            arrowprops=dict(arrowstyle="->", lw=1.2, color='#047857'),
            fontsize=8, fontweight='bold', color='#047857', ha='center',
            bbox=dict(boxstyle="round,pad=0.4", facecolor="#d1fae5", edgecolor="#10b981", lw=0.8))

plt.savefig(os.path.join(OUT_FIG_DIR, "fig3_collapse_comparison.png"))
plt.close()

# ------------------------------------------------------------------------------
# FIG 4: Confusion Matrices (2x2 Grid)
# ------------------------------------------------------------------------------
fig, axes = plt.subplots(2, 2, figsize=(7.8, 6.8))

cms = [
    ("In-Domain FP32 (CIC-IDS-2017)", metrics["in_domain"]["fp32"]["confusion_matrix"], axes[0, 0], "Blues"),
    ("In-Domain INT8 (CIC-IDS-2017)", metrics["in_domain"]["int8"]["confusion_matrix"], axes[0, 1], "Purples"),
    ("Cross-Domain FP32 (UNSW-NB15)", metrics["cross_domain"]["fp32"]["confusion_matrix"], axes[1, 0], "Reds"),
    ("Cross-Domain INT8 (UNSW-NB15)", metrics["cross_domain"]["int8"]["confusion_matrix"], axes[1, 1], "Oranges")
]

for title, cm_dict, ax_cur, cmap in cms:
    mat = np.array([[cm_dict["tn"], cm_dict["fp"]],
                    [cm_dict["fn"], cm_dict["tp"]]])
    total = np.sum(mat)
    
    # Heatmap
    sns.heatmap(mat, annot=False, cmap=cmap, cbar=False, ax=ax_cur, linewidths=1, linecolor='#cbd5e1')
    
    # Text labels
    labels_names = [["TN", "FP"], ["FN", "TP"]]
    for i in range(2):
        for j in range(2):
            val = mat[i, j]
            pct = val / total * 100
            txt_color = "white" if (i == 0 and j == 0) or (val > total * 0.4) else "black"
            ax_cur.text(j + 0.5, i + 0.5, f"{labels_names[i][j]}\n{val:,}\n({pct:.1f}%)",
                        ha='center', va='center', fontsize=9, fontweight='bold', color=txt_color)
            
    ax_cur.set_title(title, fontsize=9.2, fontweight='bold', pad=8)
    ax_cur.set_xlabel('Predicted Label (0: Benign, 1: Attack)', fontsize=8)
    ax_cur.set_ylabel('True Label (0: Benign, 1: Attack)', fontsize=8)
    ax_cur.set_xticklabels(['Benign', 'Attack'], fontsize=8.5)
    ax_cur.set_yticklabels(['Benign', 'Attack'], fontsize=8.5)

plt.suptitle("Fig. 4: Normalized Confusion Matrices Across In-Domain & Cross-Domain Evaluations", fontsize=10.5, fontweight='bold', y=0.99)
plt.tight_layout()
plt.savefig(os.path.join(OUT_FIG_DIR, "fig4_confusion_matrices.png"))
plt.close()

# ------------------------------------------------------------------------------
# FIG 5: Per-Attack Category Recall Breakdown
# ------------------------------------------------------------------------------
fig, ax = plt.subplots(figsize=(8, 5))

categories = [c for c in per_attack.keys() if per_attack[c].get("type") == "attack"]
fp32_recalls = [per_attack[c]["recall_fp32"] * 100 for c in categories]
int8_recalls = [per_attack[c]["recall_int8"] * 100 for c in categories]

y = np.arange(len(categories))
height = 0.36

rects1 = ax.barh(y - height/2, fp32_recalls, height, label='FP32 Recall', color='#0284c7', edgecolor='#0369a1')
rects2 = ax.barh(y + height/2, int8_recalls, height, label='INT8 Recall', color='#7c3aed', edgecolor='#6d28d9')

ax.set_xlabel('True Positive Rate / Recall (%)', fontsize=9.5, fontweight='bold')
ax.set_ylabel('UNSW-NB15 Attack Category', fontsize=9.5, fontweight='bold')
ax.set_title('Fig. 5: Zero-Shot Transfer Attack Category Recall Across UNSW-NB15', fontsize=10.5, fontweight='bold', pad=12)
ax.set_yticks(y)
ax.set_yticklabels([f"{c} (n={per_attack[c]['count']:,})" for c in categories], fontsize=8.5)
ax.legend(frameon=True, fontsize=9, loc='lower right')
ax.set_xlim(0, 100)
ax.grid(axis='x', alpha=0.5)

# Value annotations
for rect in rects2:
    w = rect.get_width()
    if w > 0.05:
        ax.annotate(f'{w:.1f}%', xy=(w, rect.get_y() + rect.get_height()/2),
                    xytext=(4, 0), textcoords="offset points", ha='left', va='center',
                    fontsize=7.5, color='#6d28d9', fontweight='bold')

plt.savefig(os.path.join(OUT_FIG_DIR, "fig5_per_attack_recall.png"))
plt.close()

# ------------------------------------------------------------------------------
# FIG 6: Permutation Feature Importance & Shortcut Probe
# ------------------------------------------------------------------------------
fig, ax = plt.subplots(figsize=(8.2, 5.2))

# Top 10 features by in-domain drop
df_sorted = df_perm.sort_values(by="cic_fp32_importance", ascending=True)
top_feats = df_sorted.tail(10)

y = np.arange(len(top_feats))
height = 0.35

r1 = ax.barh(y - height/2, top_feats["cic_fp32_importance"] * 100, height, label='In-Domain Importance (CIC)', color='#0284c7', edgecolor='#0369a1')
r2 = ax.barh(y + height/2, top_feats["unsw_fp32_importance"] * 100, height, label='Cross-Domain Importance (UNSW)', color='#f59e0b', edgecolor='#d97706')

ax.set_xlabel('Permutation Accuracy Drop (%)', fontsize=9.5, fontweight='bold')
ax.set_ylabel('Harmonized Flow Feature', fontsize=9.5, fontweight='bold')
ax.set_title('Fig. 6: Shortcut Learning Diagnosis via Permutation Feature Importance', fontsize=10.5, fontweight='bold', pad=12)
ax.set_yticks(y)
ax.set_yticklabels(top_feats["feature"], fontsize=8.5)
ax.legend(frameon=True, fontsize=9, loc='lower right')
ax.grid(axis='x', alpha=0.5)

# Annotate shortcut features
ax.annotate('Candidate Shortcut:\nHigh in-domain reliance,\nzero cross-domain utility',
            xy=(28, 8.5), xytext=(15, 6),
            arrowprops=dict(arrowstyle="->", lw=1.2, color='#b91c1c'),
            fontsize=8, fontweight='bold', color='#b91c1c', ha='center',
            bbox=dict(boxstyle="round,pad=0.4", facecolor="#fee2e2", edgecolor="#ef4444", lw=0.8))

plt.savefig(os.path.join(OUT_FIG_DIR, "fig6_shortcut_importance.png"))
plt.close()

# ------------------------------------------------------------------------------
# FIG 7: Latency, Resource and Energy Trade-Off
# ------------------------------------------------------------------------------
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(8.6, 4.2))

# Subplot 1: Measured Host CPU Latency
models = ['FP32 Baseline', 'INT8 Quantized']
med_lat = [profiling["measured_benchmark"]["fp32"]["median_us"], profiling["measured_benchmark"]["int8"]["median_us"]]
p95_lat = [profiling["measured_benchmark"]["fp32"]["p95_us"], profiling["measured_benchmark"]["int8"]["p95_us"]]

x = np.arange(len(models))
w = 0.35

ax1.bar(x - w/2, med_lat, w, label='Median Latency', color='#0ea5e9')
ax1.bar(x + w/2, p95_lat, w, label='P95 Latency', color='#0284c7')
ax1.set_ylabel('Latency (microseconds, µs)', fontsize=9, fontweight='bold')
ax1.set_title('Host CPU Execution Latency\n(time.perf_counter_ns)', fontsize=9.5, fontweight='bold')
ax1.set_xticks(x)
ax1.set_xticklabels(models, fontsize=8.5)
ax1.legend(frameon=True, fontsize=8)
ax1.grid(axis='y', alpha=0.5)

for i, v in enumerate(med_lat):
    ax1.text(i - w/2, v + 0.1, f"{v:.2f}µs", ha='center', fontsize=8, fontweight='bold')
for i, v in enumerate(p95_lat):
    ax1.text(i + w/2, v + 0.1, f"{v:.2f}µs", ha='center', fontsize=8, fontweight='bold')

# Subplot 2: Analytical ESP32 MCU Metrics
mcu_labels = ['Active Energy\n(µJ / inf)', 'Tensor Arena\nSRAM (KB)', 'Flash Size\n(KB)']
fp32_mcu = [21.5, 4.352, 4.356]
int8_mcu = [4.69, 4.160, 1.236]

x2 = np.arange(len(mcu_labels))
ax2.bar(x2 - w/2, fp32_mcu, w, label='FP32 Projected', color='#94a3b8')
ax2.bar(x2 + w/2, int8_mcu, w, label='INT8 Projected', color='#7c3aed')
ax2.set_ylabel('Projected Value (Units on X-axis)', fontsize=9, fontweight='bold')
ax2.set_title('Analytical ESP32 Edge Metrics\n(Xtensa LX6 @ 240MHz)', fontsize=9.5, fontweight='bold')
ax2.set_xticks(x2)
ax2.set_xticklabels(mcu_labels, fontsize=8.5)
ax2.legend(frameon=True, fontsize=8)
ax2.grid(axis='y', alpha=0.5)

# Savings annotations
ax2.text(0 + w/2, 5.8, '-78.2%', ha='center', fontsize=8, color='#047857', fontweight='bold')
ax2.text(1 + w/2, 4.9, '-4.4%', ha='center', fontsize=8, color='#047857', fontweight='bold')
ax2.text(2 + w/2, 2.0, '-71.6%', ha='center', fontsize=8, color='#047857', fontweight='bold')

plt.suptitle("Fig. 7: Real Host Benchmarking vs. Analytical ESP32 Edge Projections", fontsize=10.5, fontweight='bold', y=1.02)
plt.tight_layout()
plt.savefig(os.path.join(OUT_FIG_DIR, "fig7_latency_energy_tradeoff.png"))
plt.close()

print("[+] Successfully generated all 7 figures in research_paper/figures/.")
