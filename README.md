# ZeroEdge-NIDS: Software-Simulated ESP32 Edge NIDS Platform

> **Project Premise (BCSE308L Computer Networks Lab — Project Review 1):**  
> *"Zero-Shot, Cross-Domain NIDS at the Edge: Does Quantization Worsen Shortcut Learning?"*  
> **Team:**  
> - **Pradhyot** (24BCE0660)  
> - **Chitraksh** (24BCE0688)  
> - **Ishani Majumder** (24BCI0139)  

---

## 📌 Executive Summary & Key Results

We investigated whether **INT8 Post-Training Quantization (PTQ)** mitigates (acts as an implicit regularizer) or exacerbates the catastrophic cross-domain accuracy collapse caused by **shortcut learning** in network intrusion detection systems.

The binary MLP architecture (`16 → 32 → 16 → 1`) was trained on **CIC-IDS-2017** (2.83M raw flows, 358k working flows) and evaluated **zero-shot** on **UNSW-NB15** (257k flows, 9 attack categories) without target fine-tuning or target calibration.

### Real Empirical Results

| Metric | In-Domain (CIC Holdout) | Cross-Domain (UNSW Zero-Shot) | Cross-Domain Collapse |
| :--- | :---: | :---: | :---: |
| **FP32 Model Accuracy** | **97.34%** | **35.42%** | **-61.92%** |
| **INT8 Model Accuracy** | **96.11%** | **36.51%** | **-59.60%** |
| **In-Domain Agreement** | **98.7%** (FP32 vs INT8) | — | — |
| **Quantization Net Effect**| — | **+1.09% accuracy boost** | **+2.32% collapse reduction** |

* **McNemar Correctness Test ($H_0$: quantization does not change accuracy):**  
  $\chi^2 = 282.89$, **$p < 10^{-15}$** (Statistically significant).
* **Bootstrap 95% Confidence Interval on Balanced Accuracy (1,000 resamples):**  
  **$[+0.0138, +0.0152]$** (Entirely strictly positive).
* **Automated Scientific Verdict:**  
  **`INT8 MITIGATES COLLAPSE`** — Low-precision integer quantization acts as an implicit regularizer, dampening fragile shortcut feature representations and yielding higher zero-shot attack detection transfer.

---

## ⚡ Real Host Benchmarks vs. ESP32 Projections

Every metric in the system is rigorously separated into two badged tiers:

### A. Measured on Host CPU (Real Software Benchmark)
* **Measurement method:** `time.perf_counter_ns()`, 200 warmup passes, GC disabled, 5 repeats with per-sample median across 3,000 stream samples.
* **FP32 Median Latency:** **3.80 µs** (p95: 5.20 µs)
* **INT8 Median Latency:** **3.60 µs** (p95: 4.90 µs)
* **Batch-of-1 Throughput:** **~277,000 inferences/sec**
* **Paired t-test on Latency:** $t = 12.44, p < 10^{-10}$

### B. Estimated ESP32 Projections (Analytical Model)
* **Virtual MCU:** ESP32 Xtensa LX6 dual-core @ 240 MHz (4.167 ns/cycle).
* **Projected Cycle Count:** **5,504 cycles** (INT8) vs **19,920 cycles** (FP32).
* **Projected MCU Latency:** **22.9 µs** (INT8) vs **83.0 µs** (FP32).
* **Tensor Arena SRAM:** **4,160 bytes** (1.27% of 320 KB usable DRAM; **75% reduction** vs FP32).
* **Flash Footprint:** **1,236 bytes** (0.03% of 4 MB flash; **71.6% savings** vs FP32).
* **Virtual INA219 Energy:** **4.69 µJ per inference** (204.6 mW active power).
* **Virtual UART Transmission (921,600 baud, 8N1):** **260.4 µs**.

---

## 🛠️ System Architecture

```
zeroedge-nids/
├── Material/               # Compressed dataset archives (gitignored)
├── data/                   # Extracted CIC-IDS-2017 & UNSW-NB15 datasets (gitignored)
├── pipeline/               # Python ML Pipeline
│   ├── feature_map.py      # 16 harmonized flow features & extraction
│   ├── train.py            # FP32 MLP (16->32->16->1) with class-weighted Adam
│   ├── quantize.py         # Integer-only INT8 PTQ (asymmetric act, symmetric weight)
│   ├── evaluate.py         # In-domain / cross-domain metrics & per-attack recall
│   ├── probe.py            # Shortcut learning permutation importance probe
│   ├── seeds.py            # 5-seed repeatability experiment
│   ├── hw_model.py         # Exact MAC count, host benchmark, ESP32 model
│   ├── stats_tests.py      # McNemar, paired t-tests, bootstrap CIs, verdict
│   ├── stats.R             # Companion R statistical script
│   ├── hw_model_config.json# Documented analytical simulator constants
│   └── run_all.py          # Master offline pipeline orchestrator
├── backend/                # FastAPI + Uvicorn Telemetry Server (:8000)
│   ├── main.py             # App entrypoint with CORS
│   ├── routes.py           # REST endpoints + WebSocket stream (/api/stream/ws)
│   ├── inference.py        # Real-time FP32 & INT8 host inference engine
│   ├── benchmark.py        # Dynamic benchmark re-run runner
│   ├── schemas.py          # Pydantic data models
│   ├── tests/test_api.py   # Pytest suite
│   └── data/               # Exported JSON metrics and stream samples
├── web/                    # Vite + React + TypeScript + Tailwind CSS Frontend (:5173)
│   ├── src/components/     # Modular oscilloscope & lab views (Hero, Layers 1-3, etc.)
│   ├── src/workers/        # Web Worker running client-side INT8 bit-exact check
│   ├── src/api/client.ts   # Typed API client with offline banner handling
│   └── public/data/        # Cached JSON fallback
├── start.ps1               # One-click startup script (Windows PowerShell)
├── start.sh                # Startup script (Linux / macOS)
└── README.md
```

---

## 🚀 How to Run the Project

### Prerequisites
- **Python 3.10+** (tested on 3.11.9)
- **Node.js 18+** & npm (tested on Node v24.19.0 / npm 11.17.0)

### 1. Re-Run the Offline ML Pipeline (Optional - Already Executed)
```powershell
.\venv\Scripts\python -m pipeline.run_all
```
*Executes all 8 steps, writes JSON caches to `backend/data/` and `web/public/data/`, and exports `model_data.h`.*

### 2. Run Backend & Frontend Together
#### Windows:
```powershell
.\start.ps1
```
#### Linux / macOS:
```bash
chmod +x start.sh
./start.sh
```

Or run them in separate terminals:
* **Terminal 1 (Backend):**
  ```powershell
  .\venv\Scripts\uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
  ```
  *Swagger docs available at: `http://localhost:8000/docs`*
* **Terminal 2 (Frontend):**
  ```powershell
  cd web
  npm run dev
  ```
  *Web app available at: `http://localhost:5173`*

### 3. Interactive Experiment Lab
ZeroEdge-NIDS includes an **Interactive Experiment Lab** accessible from the top navigation bar:
* **Mode A (Dataset Batch Upload):** Upload any custom CSV flow dataset (up to 50k rows / 50 MB), map features using the interactive canonical mapper, optionally configure binary ground-truth labels, and execute a 10-step audited evaluation pipeline. Unlabeled datasets compute zero-shot inference parity, Wilcoxon signed-rank distribution tests, host benchmarks, and ESP32 projections without computing classification metrics. Download full audit packages in JSON and flow-by-flow predictions in CSV.
* **Mode B (Single-Flow Manual Test):** Enter individual 16-feature vector parameters or load verified benign/attack captures from UNSW-NB15 to inspect the raw-to-scaled preprocessing, integer quantization ($q \in [-128, 127]$), FP32 & INT8 decision outputs, and empirical execution latency.

### 4. Run Automated Tests
```powershell
.\venv\Scripts\pytest backend/tests
```

---

## 🔬 How to Replace Simulation Constants with Physical Silicon

When upgrading from software simulation to physical silicon (ESP32 + INA219):
1. **Download Header:** Click **"Download model_data.h"** in the Layer 2 UI or from `/api/downloads/model_data.h`.
2. **Flash ESP32 Firmware:** Flash using ESP-IDF or PlatformIO with TensorFlow Lite for Microcontrollers (TFLM).
3. **Connect INA219:** Wire the INA219 current sensor via I2C (`SDA = GPIO 21`, `SCL = GPIO 22`) in series with the 3.3V VDD rail.
4. **Update Constants:** Edit `pipeline/hw_model_config.json` with the measured empirical numbers:
   - `cycles_per_mac_int8`: update with measured ESP32 clock cycles.
   - `active_current_int8_ma`: update with physical INA219 shunt current readings.

---

## ⚖️ Scientific Integrity & Honesty Declaration

1. **Simulated Silicon:** ESP32 clock cycles, tensor arena SRAM, flash footprint, and all INA219 power/energy readings are **analytical projections**. No physical microcontroller hardware was used.
2. **Real Benchmarks:** All latency numbers labeled *"Measured on host"* were empirically timed on the host CPU using `time.perf_counter_ns()` with GC disabled.
3. **Real ML Evaluation:** All in-domain and cross-domain classification metrics, confusion matrices, McNemar test statistics, and bootstrap confidence intervals were **directly computed on the real CIC-IDS-2017 and UNSW-NB15 datasets**.
