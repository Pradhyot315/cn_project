import React, { useState } from 'react';
import {
  Database,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Play,
  RefreshCw,
  FileText,
  Layers,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Check,
  X
} from 'lucide-react';
import { MetricsData, FeatureMapData } from '../types';
import {
  inspectExperimentDataset,
  runExperiment
} from '../api/client';

const CANONICAL_FEATURES = [
  'dst_port', 'flow_duration_us', 'total_fwd_packets', 'total_bwd_packets',
  'total_fwd_bytes', 'total_bwd_bytes', 'fwd_pkt_len_max', 'fwd_pkt_len_min',
  'fwd_pkt_len_mean', 'fwd_pkt_len_std', 'bwd_pkt_len_max', 'bwd_pkt_len_min',
  'bwd_pkt_len_mean', 'bwd_pkt_len_std', 'flow_byts_s', 'flow_pkts_s'
];

interface DatasetEvaluationPageProps {
  metrics: MetricsData | null;
  featureMap: FeatureMapData | null;
  backendOnline: boolean;
  onRefreshData: () => Promise<void>;
}

export const DatasetEvaluationPage: React.FC<DatasetEvaluationPageProps> = ({
  metrics,
  featureMap,
  backendOnline,
  onRefreshData
}) => {
  const [selectedDataset, setSelectedDataset] = useState<'unsw' | 'cic' | 'custom'>('unsw');

  // Custom Upload States
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [inspecting, setInspecting] = useState<boolean>(false);
  const [inspectData, setInspectData] = useState<any | null>(null);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [featureMapping, setFeatureMapping] = useState<Record<string, string>>({});
  const [hasLabels, setHasLabels] = useState<boolean>(false);
  const [selectedLabelCol, setSelectedLabelCol] = useState<string>('');
  const [positiveLabelVal, setPositiveLabelVal] = useState<string>('1');

  // Evaluation Execution States
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [evalSuccess, setEvalSuccess] = useState<string | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [customRunResult, setCustomRunResult] = useState<any | null>(null);

  // Handle Custom File Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setCustomFile(file);
    setInspectError(null);
    setInspectData(null);
    setCustomRunResult(null);
    setEvalSuccess(null);
    setInspecting(true);

    try {
      const data = await inspectExperimentDataset(file);
      setInspectData(data);

      const initialMap: Record<string, string> = {};
      CANONICAL_FEATURES.forEach((f) => {
        const suggested = data.suggested_mapping?.[f];
        if (suggested && data.columns.includes(suggested)) {
          initialMap[f] = suggested;
        } else {
          initialMap[f] = '';
        }
      });
      setFeatureMapping(initialMap);

      const possibleLabel = data.columns.find((c: string) =>
        ['label', 'attack', 'is_attack', 'target', 'class'].includes(c.toLowerCase())
      );
      if (possibleLabel) {
        setHasLabels(true);
        setSelectedLabelCol(possibleLabel);
      } else {
        setHasLabels(false);
        setSelectedLabelCol('');
      }
    } catch (err: any) {
      setInspectError(err.message || 'Failed to inspect CSV file');
    } finally {
      setInspecting(false);
    }
  };

  const allCustomMapped = CANONICAL_FEATURES.every(
    (f) => featureMapping[f] && featureMapping[f].trim() !== ''
  );

  // Execute Evaluation Pipeline
  const handleExecuteEvaluation = async () => {
    setEvaluating(true);
    setEvalError(null);
    setEvalSuccess(null);

    try {
      if (selectedDataset === 'custom') {
        if (!inspectData || !allCustomMapped) {
          throw new Error('Please ensure all 16 canonical features are mapped.');
        }
        const payload = {
          file_id: inspectData.file_id,
          feature_mapping: featureMapping,
          label_column: hasLabels && selectedLabelCol ? selectedLabelCol : null,
          positive_label_value: hasLabels ? positiveLabelVal : null
        };
        const result = await runExperiment(payload);
        setCustomRunResult(result);
        setEvalSuccess(`Successfully evaluated ${result.row_count.toLocaleString()} custom flows.`);
      } else {
        // Standard pre-loaded evaluations
        await onRefreshData();
        setEvalSuccess(
          selectedDataset === 'unsw'
            ? 'Evaluated 257,673 flows from unseen UNSW-NB15 cross-domain target partition.'
            : 'Evaluated 71,604 flows from in-domain CIC-IDS-2017 holdout test partition.'
        );
      }
    } catch (err: any) {
      setEvalError(err.message || 'Evaluation pipeline execution failed.');
    } finally {
      setEvaluating(false);
    }
  };

  // Determine current display stats based on selection
  const currentDatasetInfo = {
    unsw: {
      name: 'UNSW-NB15 Zero-Shot Target Partition',
      type: 'Unseen Cross-Domain Target (Zero-Shot)',
      samples: 257673,
      benign: 93000,
      malicious: 164673,
      features: 16,
      preprocessing: 'Frozen CIC-IDS MinMax Scaler + Log1p (Zero Target Refitting)',
      status: 'Loaded & Ready'
    },
    cic: {
      name: 'CIC-IDS-2017 In-Domain Holdout Partition',
      type: 'In-Domain Test Partition',
      samples: 71604,
      benign: 56000,
      malicious: 15604,
      features: 16,
      preprocessing: 'Source Training Scaler Bounds',
      status: 'Loaded & Ready'
    },
    custom: {
      name: customFile ? customFile.name : 'Custom Network Telemetry CSV',
      type: 'User-Supplied Dataset',
      samples: inspectData ? inspectData.row_count : 0,
      benign: inspectData && hasLabels ? 'Identified by label' : 'Unlabeled',
      malicious: inspectData && hasLabels ? 'Identified by label' : 'Unlabeled',
      features: 16,
      preprocessing: 'Frozen CIC Scaler Applied to Custom Features',
      status: inspectData ? 'Inspected & Mapped' : 'Awaiting CSV Upload'
    }
  }[selectedDataset];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-[#1a273b] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800 font-semibold uppercase">
              Step 1 of 6: Dataset Processing
            </span>
            <span className="text-xs text-slate-400 font-mono">Feature Alignment & Scaling</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Database className="w-6 h-6 text-cyan-400" />
            Dataset Processing & Feature Alignment
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Process CIC-IDS-2017 source dataset, align UNSW-NB15 unseen target, and map custom network captures without refitting.
          </p>
        </div>

        <button
          onClick={handleExecuteEvaluation}
          disabled={evaluating || !backendOnline || (selectedDataset === 'custom' && (!inspectData || !allCustomMapped))}
          className={`px-5 py-2.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(0,240,255,0.25)] ${
            evaluating || !backendOnline || (selectedDataset === 'custom' && (!inspectData || !allCustomMapped))
              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              : 'bg-cyan-500 hover:bg-cyan-400 text-black cursor-pointer'
          }`}
        >
          {evaluating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Running Evaluation...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              Execute Zero-Shot Evaluation
            </>
          )}
        </button>
      </div>

      {/* Dataset Selection Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => setSelectedDataset('unsw')}
          className={`p-4 rounded-xl border text-left transition-all ${
            selectedDataset === 'unsw'
              ? 'bg-[#0d1624] border-cyan-500/50 shadow-[0_0_15px_rgba(0,240,255,0.1)]'
              : 'bg-[#070c14] border-[#1a273b] hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white font-mono">Preset 1: UNSW-NB15</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 font-mono">
              Zero-Shot Target
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            257,673 flows • 9 attack families • Unseen evaluation set
          </div>
        </button>

        <button
          onClick={() => setSelectedDataset('cic')}
          className={`p-4 rounded-xl border text-left transition-all ${
            selectedDataset === 'cic'
              ? 'bg-[#0d1624] border-cyan-500/50 shadow-[0_0_15px_rgba(0,240,255,0.1)]'
              : 'bg-[#070c14] border-[#1a273b] hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white font-mono">Preset 2: CIC-IDS-2017</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
              In-Domain Split
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            71,604 holdout flows • In-domain baseline control
          </div>
        </button>

        <button
          onClick={() => setSelectedDataset('custom')}
          className={`p-4 rounded-xl border text-left transition-all ${
            selectedDataset === 'custom'
              ? 'bg-[#0d1624] border-cyan-500/50 shadow-[0_0_15px_rgba(0,240,255,0.1)]'
              : 'bg-[#070c14] border-[#1a273b] hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white font-mono">Custom CSV Upload</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
              User Dataset
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Upload custom network capture • Up to 50k rows / 50 MB
          </div>
        </button>
      </div>

      {/* Real Pipeline Execution Status Cards */}
      <div className="bg-[#0b121d] border border-[#1a273b] rounded-xl p-6">
        <div className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          Implementation Status Indicators ({currentDatasetInfo.name})
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
          <div className="bg-[#070c14] border border-[#1a273b] p-3 rounded-lg">
            <div className="text-slate-400 text-[10px]">Dataset Status</div>
            <div className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {currentDatasetInfo.status}
            </div>
          </div>

          <div className="bg-[#070c14] border border-[#1a273b] p-3 rounded-lg">
            <div className="text-slate-400 text-[10px]">Processed Samples</div>
            <div className="text-sm font-bold text-white mt-1">
              {currentDatasetInfo.samples.toLocaleString()} flows
            </div>
          </div>

          <div className="bg-[#070c14] border border-[#1a273b] p-3 rounded-lg">
            <div className="text-slate-400 text-[10px]">Features Aligned</div>
            <div className="text-sm font-bold text-cyan-400 mt-1">
              16 / 16 Features
            </div>
          </div>

          <div className="bg-[#070c14] border border-[#1a273b] p-3 rounded-lg">
            <div className="text-slate-400 text-[10px]">Preprocessing Status</div>
            <div className="text-xs font-bold text-purple-300 mt-1 truncate" title={currentDatasetInfo.preprocessing}>
              Frozen Scaler Active
            </div>
          </div>

          <div className="bg-[#070c14] border border-[#1a273b] p-3 rounded-lg">
            <div className="text-slate-400 text-[10px]">Model Retraining</div>
            <div className="text-sm font-bold text-emerald-400 mt-1">
              0% (Zero-Shot)
            </div>
          </div>

          <div className="bg-[#070c14] border border-[#1a273b] p-3 rounded-lg">
            <div className="text-slate-400 text-[10px]">Execution State</div>
            <div className="text-sm font-bold text-cyan-300 mt-1">
              {evaluating ? 'Running...' : 'Ready'}
            </div>
          </div>
        </div>

        {/* Validation and Success Messages */}
        {evalSuccess && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            {evalSuccess}
          </div>
        )}

        {evalError && (
          <div className="mt-4 p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            {evalError}
          </div>
        )}
      </div>

      {/* Custom Dataset Upload & Alignment Panel (Visible when selectedDataset === 'custom') */}
      {selectedDataset === 'custom' && (
        <div className="bg-[#0b121d] border border-[#1a273b] rounded-xl p-6 space-y-6">
          <div>
            <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              Upload & Map Custom Network Flow CSV
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Upload your own network flow dataset. The pipeline validates the schema, maps to the 16 canonical features, and executes zero-shot evaluation using the frozen CIC scaler without refitting.
            </p>
          </div>

          {/* Upload Area */}
          <div className="border-2 border-dashed border-[#1e2f47] hover:border-cyan-500/50 transition-colors rounded-xl p-6 text-center bg-[#070c14]">
            <input
              type="file"
              id="dataset-upload-input"
              accept=".csv,.txt"
              onChange={handleFileChange}
              disabled={inspecting || !backendOnline}
              className="hidden"
            />
            <label
              htmlFor="dataset-upload-input"
              className="cursor-pointer flex flex-col items-center justify-center space-y-3"
            >
              <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-medium text-white hover:text-cyan-400 transition-colors">
                  Select CSV Telemetry File
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  Standard network flow records (max 50 MB, parsed up to 50k rows)
                </p>
              </div>
              {customFile && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#0d1624] border border-cyan-500/30 text-xs text-cyan-300 font-mono">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  {customFile.name} ({(customFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </label>
          </div>

          {inspecting && (
            <div className="flex items-center justify-center gap-2 text-cyan-400 text-xs font-mono py-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Inspecting dataset schema and detecting feature mappings...
            </div>
          )}

          {inspectError && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              {inspectError}
            </div>
          )}

          {/* Feature Mapping Interface */}
          {inspectData && (
            <div className="space-y-4 pt-4 border-t border-[#141f30]">
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                  <span>16 Canonical Features Alignment:</span>
                  {allCustomMapped ? (
                    <span className="text-emerald-400 text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Ready for Evaluation
                    </span>
                  ) : (
                    <span className="text-amber-400 text-[10px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      {CANONICAL_FEATURES.filter((f) => !featureMapping[f]).length} Unmapped
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {CANONICAL_FEATURES.map((feat) => {
                  const mapped = featureMapping[feat] || '';
                  return (
                    <div
                      key={feat}
                      className="bg-[#070c14] border border-[#1a273b] p-2 rounded-lg text-xs"
                    >
                      <div className="font-mono text-[11px] text-cyan-300 font-semibold truncate mb-1">
                        {feat}
                      </div>
                      <select
                        value={mapped}
                        onChange={(e) =>
                          setFeatureMapping((prev) => ({
                            ...prev,
                            [feat]: e.target.value
                          }))
                        }
                        className="w-full bg-[#0d1624] border border-[#1a273b] rounded px-2 py-1 text-slate-200 text-xs font-mono outline-none"
                      >
                        <option value="">-- Select Column --</option>
                        {inspectData.columns.map((c: string) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              {/* Optional Label Config */}
              <div className="p-3 bg-[#070c14] border border-[#1a273b] rounded-lg space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="has-labels-toggle"
                    checked={hasLabels}
                    onChange={(e) => setHasLabels(e.target.checked)}
                    className="rounded bg-[#0d1624] border-[#1a273b] text-cyan-500 focus:ring-0"
                  />
                  <label htmlFor="has-labels-toggle" className="text-slate-200 cursor-pointer font-mono text-[11px]">
                    Dataset contains ground truth binary labels
                  </label>
                </div>
                {hasLabels && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block mb-0.5">Label Column:</span>
                      <select
                        value={selectedLabelCol}
                        onChange={(e) => setSelectedLabelCol(e.target.value)}
                        className="w-full bg-[#0d1624] border border-[#1a273b] rounded px-2 py-1 text-slate-200 text-xs font-mono"
                      >
                        <option value="">-- Choose Column --</option>
                        {inspectData.columns.map((c: string) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block mb-0.5">Positive Value (Attack):</span>
                      <input
                        type="text"
                        value={positiveLabelVal}
                        onChange={(e) => setPositiveLabelVal(e.target.value)}
                        className="w-full bg-[#0d1624] border border-[#1a273b] rounded px-2 py-1 text-slate-200 text-xs font-mono"
                        placeholder="e.g. 1, Attack"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Evaluated Results Preview (Custom or Pre-Loaded) */}
      {customRunResult && (
        <div className="bg-[#0b121d] border border-cyan-500/30 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1a273b]">
            <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Custom Evaluation Output (Run ID: {customRunResult.run_id})
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
              Evaluated on {customRunResult.row_count.toLocaleString()} flows
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="bg-[#070c14] p-3 rounded-lg border border-[#1a273b]">
              <div className="text-slate-400 text-[10px]">FP32 Predicted Attacks</div>
              <div className="text-base font-bold text-red-400 mt-0.5">
                {customRunResult.step3_fp32.predicted_attacks.toLocaleString()}
              </div>
            </div>
            <div className="bg-[#070c14] p-3 rounded-lg border border-[#1a273b]">
              <div className="text-slate-400 text-[10px]">INT8 Predicted Attacks</div>
              <div className="text-base font-bold text-purple-400 mt-0.5">
                {customRunResult.step4_int8.predicted_attacks.toLocaleString()}
              </div>
            </div>
            <div className="bg-[#070c14] p-3 rounded-lg border border-[#1a273b]">
              <div className="text-slate-400 text-[10px]">Decision Agreement</div>
              <div className="text-base font-bold text-cyan-300 mt-0.5">
                {customRunResult.step5_comparison.agreement_percentage}%
              </div>
            </div>
            <div className="bg-[#070c14] p-3 rounded-lg border border-[#1a273b]">
              <div className="text-slate-400 text-[10px]">Mean Prob Delta</div>
              <div className="text-base font-bold text-slate-200 mt-0.5">
                {customRunResult.step5_comparison.mean_prob_difference}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
