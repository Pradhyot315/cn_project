/**
 * API Client for ZeroEdge-NIDS FastAPI backend.
 */

const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchDatasetStats() {
  const res = await fetch(`${API_BASE}/dataset/stats`);
  if (!res.ok) throw new Error(`Failed to load dataset stats`);
  return res.json();
}

export async function fetchFeatureMap() {
  const res = await fetch(`${API_BASE}/dataset/features`);
  if (!res.ok) throw new Error(`Failed to load feature map`);
  return res.json();
}

export async function fetchDrift() {
  const res = await fetch(`${API_BASE}/dataset/drift`);
  if (!res.ok) throw new Error(`Failed to load drift data`);
  return res.json();
}

export async function fetchMetrics() {
  const res = await fetch(`${API_BASE}/metrics`);
  if (!res.ok) throw new Error(`Failed to load metrics`);
  return res.json();
}

export async function fetchPerAttack() {
  const res = await fetch(`${API_BASE}/metrics/per-attack`);
  if (!res.ok) throw new Error(`Failed to load per-attack metrics`);
  return res.json();
}

export async function fetchPermutationImportance() {
  const res = await fetch(`${API_BASE}/importance`);
  if (!res.ok) throw new Error(`Failed to load shortcut importance`);
  return res.json();
}

export async function fetchSeeds() {
  const res = await fetch(`${API_BASE}/seeds`);
  if (!res.ok) throw new Error(`Failed to load seeds data`);
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error(`Failed to load stats data`);
  return res.json();
}

export async function fetchVerdict() {
  const res = await fetch(`${API_BASE}/verdict`);
  if (!res.ok) throw new Error(`Failed to load verdict`);
  return res.json();
}

export async function fetchBenchmark() {
  const res = await fetch(`${API_BASE}/benchmark`);
  if (!res.ok) throw new Error(`Failed to load benchmark data`);
  return res.json();
}

export async function runLiveBenchmark(sampleCount: number = 500) {
  const res = await fetch(`${API_BASE}/benchmark/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sample_count: sampleCount }),
  });
  if (!res.ok) throw new Error(`Failed to run live benchmark`);
  return res.json();
}

export async function predictFeatures(features: number[], isNormalized: boolean = false) {
  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ features, is_normalized: isNormalized }),
  });
  if (!res.ok) throw new Error(`Predict failed`);
  return res.json();
}

export async function inspectExperimentDataset(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/experiment/inspect-dataset`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to inspect dataset');
  }
  return res.json();
}

export async function runExperiment(payload: {
  file_id: string;
  feature_mapping: Record<string, string>;
  label_column?: string | null;
  positive_label_value?: string | null;
}) {
  const res = await fetch(`${API_BASE}/experiment/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to run experiment');
  }
  return res.json();
}

export async function runManualFlow(payload: {
  features: number[];
  model_choice?: string;
}) {
  const res = await fetch(`${API_BASE}/experiment/manual-flow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to evaluate manual flow');
  }
  return res.json();
}

export async function fetchPresetFlows() {
  const res = await fetch(`${API_BASE}/experiment/preset-flows`);
  if (!res.ok) throw new Error('Failed to fetch preset flows');
  return res.json();
}

