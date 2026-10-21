# ZeroEdge-NIDS: Publication-Quality Research Paper

This folder contains the complete, publication-quality research paper for the **ZeroEdge-NIDS** project, prepared in accordance with IEEE conference two-column standards (`IEEEtran`).

---

## 📄 Deliverable Overview

| File / Folder | Description |
| :--- | :--- |
| **`main.pdf`** | Compiled 10-page camera-ready research paper in PDF format. |
| **`ZeroEdge_NIDS_Research_Paper.docx`** | Professionally formatted Word document (.docx) matching IEEE typography and styling. |
| **`main.tex`** | Master LaTeX root document incorporating IEEE author blocks, abstract, and section includes. |
| **`IEEEtran.cls`** | Official IEEE conference document class file (CTAN release). |
| **`references.bib`** | BibTeX bibliography containing 18 verified, peer-reviewed academic references. |
| **`sections/`** | Modular LaTeX section files (`sec1_intro.tex` through `sec10_appendix.tex`). |
| **`figures/`** | Seven high-resolution (300 DPI) publication diagrams and charts. |
| **`data/`** | Reproducible CSV datasets extracted directly from project JSON artifacts. |
| **`generate_figures.py`** | Standalone Python script to regenerate all CSV tables and 300 DPI figures. |
| **`compile_paper.py`** | Standalone document builder script compiling the paper to DOCX and PDF. |

---

## 🔬 Data Provenance & Badging Declaration

In strict compliance with academic honesty, every metric reported in this paper is categorized by its factual origin:

### 1. Real Empirical Machine Learning Results (From CIC-IDS-2017 & UNSW-NB15)
* **In-Domain CIC-IDS-2017 Holdout (71,604 flows):**
  * FP32 Accuracy: **97.34%** (Recall: 99.17%, Precision: 89.69%, FPR: 3.18%)
  * INT8 Accuracy: **96.11%** (Decision agreement with FP32: 98.34%)
* **Cross-Domain UNSW-NB15 Zero-Shot Transfer (257,673 flows):**
  * FP32 Accuracy: **35.42%** (Catastrophic collapse: -61.92%, Recall: 2.35%)
  * INT8 Accuracy: **36.51%** (+1.09% absolute boost, dampening collapse by 2.32%)
  * Target False Alarm Reduction: **44.9%** (FPR dropped from 6.03% to 3.32%; 2,522 fewer false alarms)
  * Target Precision Surge: **+16.68%** (40.80% -> 57.48%)
* **Statistical Rigor Tests:**
  * Paired McNemar Correctness Test: **$\chi^2 = 1,871.69, p < 10^{-15}$** (Statistically significant)
  * 1,000-Resample Bootstrap 95% Confidence Interval: **$[+0.0138, +0.0152]$** (Strictly positive)
  * Permutation Feature Importance: Evaluated across all 16 flow features on both datasets.

### 2. Measured on Host CPU (Real Empirical Benchmarks)
* **Measurement method:** Timed via Python's `time.perf_counter_ns()` with garbage collection disabled (`gc.disable()`), 200 warm-up cycles, 3,000 individually timed inferences, across 5 statistical repeats.
* FP32 Median Latency: **12.90 µs** (P95: 14.10 µs)
* INT8 Median Latency: **62.70 µs** (P95: 68.30 µs)
  *(Note: Host CPU exhibits higher INT8 latency due to Python-level integer wrapping and Intel AVX2 floating-point vector optimizations).*

### 3. Estimated / Analytical Projections (Virtual ESP32 Target)
* **Virtual MCU:** Espressif ESP32 (Xtensa LX6 dual-core @ 240 MHz).
* **Clock Cycles:** **5,504 cycles** (INT8) vs **19,920 cycles** (FP32) based on single-cycle 32-bit integer MAC instructions.
* **Projected MCU Latency:** **22.93 µs** (INT8) vs **83.00 µs** (FP32).
* **Tensor Arena SRAM:** **4,160 bytes** (INT8) vs **4,304 bytes** (FP32) — 1.27% of 320 KB usable SRAM.
* **Flash Parameter Footprint:** **1,236 bytes** (INT8) vs **4,356 bytes** (FP32) — **71.63% storage savings**.
* **Projected Energy per Inference:** **4.69 µJ** (INT8) vs **21.50 µJ** (FP32) modeled on an active 3.3V / 62 mA load.

---

## 📊 List of Figures Generated

1. **`fig1_system_architecture.png`** (300 DPI): Four-tier layered system architecture (Data Ingestion, Model & PTQ Pipeline, Telemetry & Evaluation Backend, React Oscilloscope & Experiment Lab).
2. **`fig2_data_flow_sequence.png`** (300 DPI): End-to-end flow transformation and evaluation sequence diagram.
3. **`fig3_collapse_comparison.png`** (300 DPI): In-Domain vs. Cross-Domain accuracy collapse bar chart highlighting the +1.09% mitigation effect and collapse reduction.
4. **`fig4_confusion_matrices.png`** (300 DPI): Four 2x2 confusion matrices (In-Domain FP32/INT8 vs. Cross-Domain FP32/INT8) with raw flow counts and percentages.
5. **`fig5_per_attack_recall.png`** (300 DPI): Grouped horizontal bar chart of attack category recall across all 9 UNSW-NB15 attack families.
6. **`fig6_shortcut_importance.png`** (300 DPI): Permutation feature importance analysis diagnosing learned shortcut features.
7. **`fig7_latency_energy_tradeoff.png`** (300 DPI): Real host CPU latency distributions vs. analytical ESP32 cycle counts and active energy consumption.

---

## 🛠️ How to Recompile / Reproduce

### 1. Regenerate Figures & Export Raw CSVs:
```powershell
.\venv\Scripts\python research_paper\generate_figures.py
```

### 2. Recompile Paper (DOCX & PDF):
```powershell
.\venv\Scripts\python research_paper\compile_paper.py
```

### 3. Compile LaTeX Source via pdflatex (If a TeX distribution is installed):
```bash
cd research_paper
pdflatex main.tex
bibtex main
pdflatex main.tex
pdflatex main.tex
```

---

## 🔍 Items for Manual Verification
1. **Author Affiliations:** Update registration numbers (`24BCE0660`, `24BCE0688`, `24BCI0139`) or department names in `main.tex` and `compile_paper.py` if your institution requires specific formatting.
2. **Target Conference:** If submitting to an IEEE conference, adjust the conference name in the copyright header.
