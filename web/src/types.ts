export interface FeatureDefinition {
  name: string;
  description: string;
  cic_col: string;
  unsw_derivation: string;
  log_transform: boolean;
}

export interface ExcludedArtifact {
  name: string;
  reason: string;
}

export interface FeatureMapData {
  features: FeatureDefinition[];
  feature_names: string[];
  excluded_artifacts: ExcludedArtifact[];
}

export interface DriftMetric {
  feature: string;
  source_min: number;
  source_max: number;
  source_median: number;
  target_median: number;
  out_of_bounds_pct: number;
}

export interface ModelMetricSet {
  accuracy: number;
  balanced_accuracy: number;
  precision: number;
  recall_tpr: number;
  f1_score: number;
  fpr: number;
  roc_auc?: number;
  confusion_matrix: {
    tn: number;
    fp: number;
    fn: number;
    tp: number;
  };
}

export interface MetricsData {
  in_domain: {
    fp32: ModelMetricSet;
    int8: ModelMetricSet;
  };
  cross_domain: {
    fp32: ModelMetricSet;
    int8: ModelMetricSet;
  };
  collapse: {
    accuracy_collapse: {
      fp32_drop: number;
      int8_drop: number;
      effect_on_collapse: number;
    };
    balanced_accuracy_collapse: {
      fp32_drop: number;
      int8_drop: number;
      effect_on_collapse: number;
    };
  };
}

export interface AttackCategoryMetric {
  type: 'attack' | 'normal';
  count: number;
  recall_fp32?: number;
  recall_int8?: number;
  fpr_fp32?: number;
  fpr_int8?: number;
  detected_fp32?: number;
  detected_int8?: number;
}

export interface ShortcutAnalysisItem {
  feature: string;
  cic_fp32_importance: number;
  cic_int8_importance: number;
  unsw_fp32_importance: number;
  unsw_int8_importance: number;
  is_candidate_shortcut: boolean;
}

export interface SeedRun {
  seed: number;
  in_domain: {
    fp32_acc: number;
    int8_acc: number;
    fp32_bal_acc: number;
    int8_bal_acc: number;
  };
  cross_domain: {
    fp32_acc: number;
    int8_acc: number;
    fp32_bal_acc: number;
    int8_bal_acc: number;
  };
  collapse_drop: {
    fp32_drop: number;
    int8_drop: number;
    quantization_effect: number;
  };
}

export interface SeedsData {
  seeds: SeedRun[];
  summary: {
    mean_cross_acc_fp32: number;
    std_cross_acc_fp32: number;
    mean_cross_acc_int8: number;
    std_cross_acc_int8: number;
    paired_t_statistic: number;
    p_value: number;
    is_statistically_significant: boolean;
  };
}

export interface HostBenchmarkSummary {
  badge: string;
  sample_count: number;
  repeats: number;
  fp32: {
    mean_us: number;
    median_us: number;
    p95_us: number;
    p99_us: number;
    std_us: number;
    throughput_inf_per_s: number;
  };
  int8: {
    mean_us: number;
    median_us: number;
    p95_us: number;
    p99_us: number;
    std_us: number;
    throughput_inf_per_s: number;
  };
}

export interface ESP32Projection {
  precision: string;
  badge: string;
  cycles: number;
  latency_us: number;
  tensor_arena_bytes: number;
  sram_utilization_pct: number;
  flash_param_bytes: number;
  flash_utilization_pct: number;
  voltage_v: number;
  idle_current_ma: number;
  active_current_ma: number;
  idle_power_mw: number;
  active_power_mw: number;
  energy_uj: number;
  uart_tx_latency_us: number;
  uart_rx_latency_us: number;
  total_roundtrip_us: number;
}

export interface ProfilingData {
  host_environment: Record<string, any>;
  op_counts: Record<string, any>;
  measured_benchmark: HostBenchmarkSummary;
  esp32_projection_fp32: ESP32Projection;
  esp32_projection_int8: ESP32Projection;
  comparison: {
    latency_ratio_esp32_to_host: number;
    flash_savings_pct: number;
    sram_reduction_pct: number;
  };
}

export interface VerdictData {
  verdict: string;
  explanation: string;
  p_value_mcnemar_correctness: number;
  bootstrap_ci_95_effect: [number, number];
  delta_collapse_fp32: number;
  delta_collapse_int8: number;
  quantization_effect_on_collapse: number;
}

export interface StreamSample {
  flow_id: number;
  features_norm: number[];
  features_int8: number[];
  true_label: number;
  attack_cat: string;
  server_fp32_prob: number;
  server_fp32_pred: number;
  server_fp32_latency_us: number;
  server_int8_prob: number;
  server_int8_pred: number;
  server_int8_latency_us: number;
  agreement: boolean;
  telemetry: {
    esp32_projected_cycles: number;
    esp32_projected_latency_us: number;
    esp32_projected_power_mw: number;
    esp32_projected_energy_uj: number;
    uart_transit_time_us: number;
  };
}
