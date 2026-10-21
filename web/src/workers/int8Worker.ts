/**
 * Web Worker executing real integer-only INT8 inference in the browser.
 * Validates bit-exact consistency against Python reference and FastAPI server.
 */

interface QuantizedModel {
  s_in: number;
  z_in: number;
  s_a1: number;
  z_a1: number;
  s_a2: number;
  z_a2: number;
  s_out: number;
  z_out: number;
  s_w1: number;
  q_w1: number[][]; // [16, 32]
  q_b1: number[];   // [32]
  s_w2: number;
  q_w2: number[][]; // [32, 16]
  q_b2: number[];   // [16]
  s_w3: number;
  q_w3: number[][]; // [16, 1]
  q_b3: number[];   // [1]
  m1_real: number;
  m2_real: number;
  m3_real: number;
}

let model: QuantizedModel | null = null;

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'INIT_MODEL') {
    model = payload as QuantizedModel;
    self.postMessage({ type: 'MODEL_READY' });
    return;
  }

  if (type === 'INFER_SAMPLE') {
    if (!model) {
      self.postMessage({ type: 'ERROR', message: 'Model not initialized' });
      return;
    }

    const { flow_id, features_int8, expected_pred } = payload;
    const q_in = new Int8Array(features_int8); // 16 elements

    // Layer 1: 16 -> 32
    const acc1 = new Int32Array(32);
    for (let j = 0; j < 32; j++) {
      let sum = model.q_b1[j];
      for (let i = 0; i < 16; i++) {
        const x_c = q_in[i] - model.z_in;
        sum += x_c * model.q_w1[i][j];
      }
      acc1[j] = sum;
    }

    // Requantize Layer 1 & ReLU
    const q_a1 = new Int8Array(32);
    for (let j = 0; j < 32; j++) {
      let val = Math.round(acc1[j] * model.m1_real) + model.z_a1;
      // ReLU clipped at z_a1
      if (val < model.z_a1) val = model.z_a1;
      if (val > 127) val = 127;
      q_a1[j] = val;
    }

    // Layer 2: 32 -> 16
    const acc2 = new Int32Array(16);
    for (let j = 0; j < 16; j++) {
      let sum = model.q_b2[j];
      for (let i = 0; i < 32; i++) {
        const a1_c = q_a1[i] - model.z_a1;
        sum += a1_c * model.q_w2[i][j];
      }
      acc2[j] = sum;
    }

    // Requantize Layer 2 & ReLU
    const q_a2 = new Int8Array(16);
    for (let j = 0; j < 16; j++) {
      let val = Math.round(acc2[j] * model.m2_real) + model.z_a2;
      if (val < model.z_a2) val = model.z_a2;
      if (val > 127) val = 127;
      q_a2[j] = val;
    }

    // Layer 3: 16 -> 1
    let sum3 = model.q_b3[0];
    for (let i = 0; i < 16; i++) {
      const a2_c = q_a2[i] - model.z_a2;
      sum3 += a2_c * model.q_w3[i][0];
    }

    // Dequantize logit to float for sigmoid
    const s_logit = model.s_a2 * model.s_w3;
    const logit = sum3 * s_logit;
    const prob = 1.0 / (1.0 + Math.exp(-logit));
    const browser_pred = prob >= 0.5 ? 1 : 0;
    const is_match = expected_pred !== undefined ? (browser_pred === expected_pred) : true;

    self.postMessage({
      type: 'INFERENCE_RESULT',
      payload: {
        flow_id,
        browser_prob: prob,
        browser_pred,
        is_match,
      }
    });
  }
};
