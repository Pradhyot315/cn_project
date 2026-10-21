"""
Hardware Modeling & Profiling Module.
Provides:
1. Exact counted MACs and op counts.
2. Host CPU empirical timing measurements (time.perf_counter_ns) with GC disabled (Patch 1).
3. Analytical ESP32 projection (cycles, tensor arena SRAM, flash %, INA219 power/energy, UART time).
"""

import os
import gc
import json
import time
import platform
import psutil
import numpy as np

def count_model_ops():
    """Counts exact MACs and layer operations for 16 -> 32 -> 16 -> 1 MLP."""
    ops = {
        "layer1": {
            "name": "Dense(16, 32) + ReLU",
            "in_features": 16,
            "out_features": 32,
            "macs": 16 * 32,
            "additions": 32,
            "activations": 32,
            "weights": 16 * 32,
            "biases": 32
        },
        "layer2": {
            "name": "Dense(32, 16) + ReLU",
            "in_features": 32,
            "out_features": 16,
            "macs": 32 * 16,
            "additions": 16,
            "activations": 16,
            "weights": 32 * 16,
            "biases": 16
        },
        "layer3": {
            "name": "Dense(16, 1) + Sigmoid",
            "in_features": 16,
            "out_features": 1,
            "macs": 16 * 1,
            "additions": 1,
            "activations": 1,
            "weights": 16 * 1,
            "biases": 1
        }
    }
    total_macs = sum(l["macs"] for l in ops.values())
    total_weights = sum(l["weights"] for l in ops.values())
    total_biases = sum(l["biases"] for l in ops.values())
    total_params = total_weights + total_biases
    
    return {
        "layers": ops,
        "total_macs": total_macs,
        "total_weights": total_weights,
        "total_biases": total_biases,
        "total_params": total_params
    }

def get_host_environment_info():
    """Captures the host execution environment."""
    return {
        "system": platform.system(),
        "os_release": platform.release(),
        "os_version": platform.version(),
        "machine": platform.machine(),
        "processor": platform.processor(),
        "cpu_count_physical": psutil.cpu_count(logical=False) or 1,
        "cpu_count_logical": psutil.cpu_count(logical=True) or 1,
        "python_version": platform.python_version(),
        "numpy_version": np.__version__
    }

def project_esp32_metrics(config, count_info, precision="int8", noise_seed=42):
    """
    Computes analytical projections for ESP32 and INA219.
    All returned numbers are labeled as ESTIMATED.
    """
    total_macs = count_info["total_macs"]
    clock_mhz = config["clock_freq_mhz"]
    overhead_cycles = config["interpreter_overhead_cycles"]
    
    if precision == "int8":
        cycles_per_mac = config["cycles_per_mac_int8"]
        requant_ops = 32 + 16 # requantizations for layer 1 and layer 2
        requant_cycles = requant_ops * config["cycles_per_requant_int8"]
        base_cycles = overhead_cycles + (total_macs * cycles_per_mac) + requant_cycles
        active_current_ma = config["active_current_int8_ma"]
        param_bytes = count_info["total_weights"] * 1 + count_info["total_biases"] * 4 # 1040 + 196 = 1236 bytes
        peak_act_bytes = (32 + 16) * 1 # peak adjacent live tensors
    else: # fp32
        cycles_per_mac = config["cycles_per_mac_fp32"]
        base_cycles = overhead_cycles + (total_macs * cycles_per_mac)
        active_current_ma = config["active_current_fp32_ma"]
        param_bytes = count_info["total_params"] * 4 # 1089 * 4 = 4356 bytes
        peak_act_bytes = (32 + 16) * 4 # peak adjacent live tensors in float32
        
    base_latency_us = base_cycles / float(clock_mhz)
    
    # Tensor Arena estimation
    tensor_arena_bytes = config["tflm_interpreter_overhead_bytes"] + peak_act_bytes + config["alignment_bytes"]
    sram_utilization_pct = (tensor_arena_bytes / config["usable_dram_bytes"]) * 100.0
    flash_utilization_pct = (param_bytes / config["flash_bytes"]) * 100.0
    
    # Power & Energy (INA219)
    voltage = config["voltage_v"]
    idle_current_ma = config["idle_current_ma"]
    idle_power_mw = voltage * idle_current_ma
    active_power_mw = voltage * active_current_ma
    energy_uj = active_power_mw * (base_latency_us / 1000.0) # mW * ms = uJ
    
    # UART transit time
    baud = config["uart_baud_rate"]
    frame_bytes = config["uart_frame_bytes"]
    bits_per_char = config["uart_bits_per_char"]
    uart_tx_latency_us = (frame_bytes * bits_per_char / float(baud)) * 1e6
    uart_rx_latency_us = (15 * bits_per_char / float(baud)) * 1e6 # 15 bytes return payload
    
    return {
        "precision": precision,
        "badge": "Estimated (ESP32 projection)",
        "cycles": int(base_cycles),
        "latency_us": round(base_latency_us, 2),
        "tensor_arena_bytes": int(tensor_arena_bytes),
        "sram_utilization_pct": round(sram_utilization_pct, 4),
        "flash_param_bytes": int(param_bytes),
        "flash_utilization_pct": round(flash_utilization_pct, 4),
        "voltage_v": voltage,
        "idle_current_ma": idle_current_ma,
        "active_current_ma": active_current_ma,
        "idle_power_mw": round(idle_power_mw, 2),
        "active_power_mw": round(active_power_mw, 2),
        "energy_uj": round(energy_uj, 3),
        "uart_tx_latency_us": round(uart_tx_latency_us, 2),
        "uart_rx_latency_us": round(uart_rx_latency_us, 2),
        "total_roundtrip_us": round(uart_tx_latency_us + base_latency_us + uart_rx_latency_us, 2)
    }

def benchmark_host_latency(fp32_predict_fn, int8_predict_fn, stream_subset, repeats=5, warmup=200):
    """
    Executes real measured host timings on the 3,000 UNSW stream subset.
    Measures per-sample latency with time.perf_counter_ns(), GC disabled, across repeats.
    """
    N = len(stream_subset)
    print(f"Starting host benchmark on {N} samples (warmup={warmup}, repeats={repeats})...")
    
    # Warmup
    for i in range(min(warmup, N)):
        sample = stream_subset[i]
        _ = fp32_predict_fn(sample["features_norm"])
        _ = int8_predict_fn(sample["features_int8"])
        
    fp32_timings_ns = np.zeros((repeats, N), dtype=np.float64)
    int8_timings_ns = np.zeros((repeats, N), dtype=np.float64)
    
    for r in range(repeats):
        gc.disable()
        # FP32 pass
        for i in range(N):
            feat = stream_subset[i]["features_norm"]
            t0 = time.perf_counter_ns()
            _ = fp32_predict_fn(feat)
            t1 = time.perf_counter_ns()
            fp32_timings_ns[r, i] = t1 - t0
            
        # INT8 pass
        for i in range(N):
            q_feat = stream_subset[i]["features_int8"]
            t0 = time.perf_counter_ns()
            _ = int8_predict_fn(q_feat)
            t1 = time.perf_counter_ns()
            int8_timings_ns[r, i] = t1 - t0
        gc.enable()
        
    # Take per-sample median across repeats (in microseconds)
    fp32_sample_medians_us = np.median(fp32_timings_ns, axis=0) / 1000.0
    int8_sample_medians_us = np.median(int8_timings_ns, axis=0) / 1000.0
    
    summary = {
        "badge": "Measured on host",
        "sample_count": N,
        "repeats": repeats,
        "fp32": {
            "mean_us": float(np.mean(fp32_sample_medians_us)),
            "median_us": float(np.median(fp32_sample_medians_us)),
            "p95_us": float(np.percentile(fp32_sample_medians_us, 95)),
            "p99_us": float(np.percentile(fp32_sample_medians_us, 99)),
            "std_us": float(np.std(fp32_sample_medians_us)),
            "throughput_inf_per_s": float(1e6 / np.median(fp32_sample_medians_us)) if np.median(fp32_sample_medians_us) > 0 else 0
        },
        "int8": {
            "mean_us": float(np.mean(int8_sample_medians_us)),
            "median_us": float(np.median(int8_sample_medians_us)),
            "p95_us": float(np.percentile(int8_sample_medians_us, 95)),
            "p99_us": float(np.percentile(int8_sample_medians_us, 99)),
            "std_us": float(np.std(int8_sample_medians_us)),
            "throughput_inf_per_s": float(1e6 / np.median(int8_sample_medians_us)) if np.median(int8_sample_medians_us) > 0 else 0
        }
    }
    return summary, fp32_sample_medians_us, int8_sample_medians_us
