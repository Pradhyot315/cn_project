"""
Post-Training Quantization (PTQ) to INT8 in pure NumPy.
Implements asymmetric affine activation quantization, symmetric weight quantization,
INT32 bias scaling, and integer-only inference matching TFLM.
"""

import json
import numpy as np

def quantize_tensor_asymmetric(x, num_bits=8):
    """Asymmetric quantization to signed int8 [-128, 127]."""
    x_min = float(np.min(x))
    x_max = float(np.max(x))
    if x_min == x_max:
        return 1.0, -128
    
    q_min, q_max = -128, 127
    scale = (x_max - x_min) / float(q_max - q_min)
    zero_point = int(np.round(q_min - x_min / scale))
    zero_point = int(np.clip(zero_point, q_min, q_max))
    return scale, zero_point

def quantize_tensor_symmetric(w, num_bits=8):
    """Symmetric quantization to signed int8 [-127, 127]."""
    w_max = float(np.max(np.abs(w)))
    if w_max == 0.0:
        return 1.0, 0, np.zeros_like(w, dtype=np.int8)
    
    scale = w_max / 127.0
    zero_point = 0
    q_w = np.clip(np.round(w / scale), -127, 127).astype(np.int8)
    return scale, zero_point, q_w

def compute_fixed_point_multiplier(real_multiplier):
    """Decomposes a floating point multiplier into a 32-bit integer multiplier and shift."""
    if real_multiplier == 0.0:
        return 0, 0
    # normalize to [0.5, 1.0)
    shift = 0
    while real_multiplier < 0.5:
        real_multiplier *= 2.0
        shift -= 1
    while real_multiplier >= 1.0:
        real_multiplier /= 2.0
        shift += 1
    
    multiplier_int = int(np.round(real_multiplier * (1 << 31)))
    if multiplier_int == (1 << 31):
        multiplier_int = (1 << 31) - 1
    return multiplier_int, shift

def quantize_model(fp32_model, calib_x):
    """
    Calibrates activation ranges and quantizes weights to INT8.
    fp32_model: dict containing 'W1', 'b1', 'W2', 'b2', 'W3', 'b3'
    calib_x: representative training samples (shape [N, 16])
    """
    # 1. Calibrate Input
    s_in, z_in = quantize_tensor_asymmetric(calib_x)
    
    # Run FP32 forward on calib_x to observe activations
    W1 = np.array(fp32_model["W1"], dtype=np.float32)
    b1 = np.array(fp32_model["b1"], dtype=np.float32)
    W2 = np.array(fp32_model["W2"], dtype=np.float32)
    b2 = np.array(fp32_model["b2"], dtype=np.float32)
    W3 = np.array(fp32_model["W3"], dtype=np.float32)
    b3 = np.array(fp32_model["b3"], dtype=np.float32)
    
    z1 = np.dot(calib_x, W1) + b1
    a1 = np.maximum(0.0, z1) # ReLU
    
    z2 = np.dot(a1, W2) + b2
    a2 = np.maximum(0.0, z2) # ReLU
    
    z3 = np.dot(a2, W3) + b3 # Logit before sigmoid
    
    # 2. Calibrate hidden activations
    s_a1, z_a1 = quantize_tensor_asymmetric(a1)
    s_a2, z_a2 = quantize_tensor_asymmetric(a2)
    s_out, z_out = quantize_tensor_asymmetric(z3)
    
    # 3. Quantize Weights (symmetric)
    s_w1, z_w1, q_w1 = quantize_tensor_symmetric(W1)
    s_w2, z_w2, q_w2 = quantize_tensor_symmetric(W2)
    s_w3, z_w3, q_w3 = quantize_tensor_symmetric(W3)
    
    # 4. Quantize Biases (INT32)
    s_b1 = s_in * s_w1
    q_b1 = np.round(b1 / s_b1).astype(np.int32)
    
    s_b2 = s_a1 * s_w2
    q_b2 = np.round(b2 / s_b2).astype(np.int32)
    
    s_b3 = s_a2 * s_w3
    q_b3 = np.round(b3 / s_b3).astype(np.int32)
    
    # 5. Effective requantization multipliers
    m1_real = (s_in * s_w1) / s_a1
    m2_real = (s_a1 * s_w2) / s_a2
    m3_real = (s_a2 * s_w3) / s_out
    
    m1_int, shift1 = compute_fixed_point_multiplier(m1_real)
    m2_int, shift2 = compute_fixed_point_multiplier(m2_real)
    m3_int, shift3 = compute_fixed_point_multiplier(m3_real)
    
    quantized_model = {
        "s_in": float(s_in), "z_in": int(z_in),
        "s_a1": float(s_a1), "z_a1": int(z_a1),
        "s_a2": float(s_a2), "z_a2": int(z_a2),
        "s_out": float(s_out), "z_out": int(z_out),
        "s_w1": float(s_w1), "z_w1": 0, "q_w1": q_w1.tolist(),
        "s_w2": float(s_w2), "z_w2": 0, "q_w2": q_w2.tolist(),
        "s_w3": float(s_w3), "z_w3": 0, "q_w3": q_w3.tolist(),
        "s_b1": float(s_b1), "q_b1": q_b1.tolist(),
        "s_b2": float(s_b2), "q_b2": q_b2.tolist(),
        "s_b3": float(s_b3), "q_b3": q_b3.tolist(),
        "m1_real": float(m1_real), "m1_int": int(m1_int), "shift1": int(shift1),
        "m2_real": float(m2_real), "m2_int": int(m2_int), "shift2": int(shift2),
        "m3_real": float(m3_real), "m3_int": int(m3_int), "shift3": int(shift3),
    }
    return quantized_model

def int8_quantize_input(x_float, s_in, z_in):
    """Quantizes float input array to signed int8."""
    return np.clip(np.round(x_float / s_in) + z_in, -128, 127).astype(np.int8)

def int8_forward_integer_only(q_x, model_int8):
    """
    Executes integer-only inference using INT32 accumulator and integer arithmetic.
    q_x: INT8 array of shape [N, 16] or [16]
    Returns INT8 logits / dequantized probability in [0, 1].
    """
    single = False
    if q_x.ndim == 1:
        q_x = q_x.reshape(1, -1)
        single = True
        
    N = q_x.shape[0]
    z_in = model_int8["z_in"]
    z_a1 = model_int8["z_a1"]
    z_a2 = model_int8["z_a2"]
    
    q_w1 = np.array(model_int8["q_w1"], dtype=np.int32) # [16, 32]
    q_b1 = np.array(model_int8["q_b1"], dtype=np.int32) # [32]
    q_w2 = np.array(model_int8["q_w2"], dtype=np.int32) # [32, 16]
    q_b2 = np.array(model_int8["q_b2"], dtype=np.int32) # [16]
    q_w3 = np.array(model_int8["q_w3"], dtype=np.int32) # [16, 1]
    q_b3 = np.array(model_int8["q_b3"], dtype=np.int32) # [1]
    
    # Layer 1: (q_in - z_in) * q_w1 + q_b1
    x_centered = q_x.astype(np.int32) - z_in
    acc1 = np.dot(x_centered, q_w1) + q_b1 # shape [N, 32], int32
    # Requantize and ReLU
    m1 = model_int8["m1_real"]
    q_a1 = np.round(acc1 * m1) + z_a1
    q_a1 = np.clip(q_a1, z_a1, 127).astype(np.int8) # ReLU clipped at zero_point
    
    # Layer 2: (q_a1 - z_a1) * q_w2 + q_b2
    a1_centered = q_a1.astype(np.int32) - z_a1
    acc2 = np.dot(a1_centered, q_w2) + q_b2 # shape [N, 16], int32
    # Requantize and ReLU
    m2 = model_int8["m2_real"]
    q_a2 = np.round(acc2 * m2) + z_a2
    q_a2 = np.clip(q_a2, z_a2, 127).astype(np.int8)
    
    # Layer 3: (q_a2 - z_a2) * q_w3 + q_b3
    a2_centered = q_a2.astype(np.int32) - z_a2
    acc3 = np.dot(a2_centered, q_w3) + q_b3 # shape [N, 1], int32
    
    # Dequantize logit to real float and apply sigmoid
    s_logit = model_int8["s_a2"] * model_int8["s_w3"]
    logit_float = acc3.astype(np.float32) * s_logit
    probs = 1.0 / (1.0 + np.exp(-logit_float))
    preds = (probs >= 0.5).astype(int).flatten()
    
    if single:
        return probs[0, 0], preds[0]
    return probs.flatten(), preds

def generate_c_header(model_int8):
    """Generates a model_data.h C byte array file matching TFLM style."""
    w1_flat = np.array(model_int8["q_w1"], dtype=np.int8).flatten()
    w2_flat = np.array(model_int8["q_w2"], dtype=np.int8).flatten()
    w3_flat = np.array(model_int8["q_w3"], dtype=np.int8).flatten()
    b1_flat = np.array(model_int8["q_b1"], dtype=np.int32).flatten()
    b2_flat = np.array(model_int8["q_b2"], dtype=np.int32).flatten()
    b3_flat = np.array(model_int8["q_b3"], dtype=np.int32).flatten()
    
    total_bytes = len(w1_flat) + len(w2_flat) + len(w3_flat) + (len(b1_flat) + len(b2_flat) + len(b3_flat)) * 4
    
    lines = [
        "// Automatically generated by ZeroEdge-NIDS Quantization Pipeline",
        "// Architecture: 16 -> 32 -> 16 -> 1 (INT8 weights, INT32 biases)",
        f"// Total parameter size: {total_bytes} bytes",
        "#ifndef ZEROEDGE_MODEL_DATA_H",
        "#define ZEROEDGE_MODEL_DATA_H",
        "",
        "#include <stdint.h>",
        "",
        f"const unsigned int g_model_data_len = {total_bytes};",
        "",
        f"// Quantization params: S_in = {model_int8['s_in']}, Z_in = {model_int8['z_in']}",
        f"// Layer 1 weights ({len(w1_flat)} bytes):",
        "const int8_t g_model_w1[] = {" + ", ".join(map(str, w1_flat)) + "};",
        "",
        f"// Layer 1 biases ({len(b1_flat)} int32):",
        "const int32_t g_model_b1[] = {" + ", ".join(map(str, b1_flat)) + "};",
        "",
        f"// Layer 2 weights ({len(w2_flat)} bytes):",
        "const int8_t g_model_w2[] = {" + ", ".join(map(str, w2_flat)) + "};",
        "",
        f"// Layer 2 biases ({len(b2_flat)} int32):",
        "const int32_t g_model_b2[] = {" + ", ".join(map(str, b2_flat)) + "};",
        "",
        f"// Layer 3 weights ({len(w3_flat)} bytes):",
        "const int8_t g_model_w3[] = {" + ", ".join(map(str, w3_flat)) + "};",
        "",
        f"// Layer 3 biases ({len(b3_flat)} int32):",
        "const int32_t g_model_b3[] = {" + ", ".join(map(str, b3_flat)) + "};",
        "",
        "#endif // ZEROEDGE_MODEL_DATA_H"
    ]
    return "\n".join(lines)
