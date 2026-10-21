import React, { useState, useEffect } from 'react';
import {
  Upload, FileText, CheckCircle2, AlertTriangle, Play,
  Download, RefreshCw, Cpu, Activity, ShieldAlert, ShieldCheck,
  Check, X, HelpCircle, Layers, ArrowRight, Database, Gauge,
  Clock, Hash, Sparkles
} from 'lucide-react';
import {
  inspectExperimentDataset, runExperiment, runManualFlow,
  fetchPresetFlows
} from '../api/client';

const REQUIRED_FEATURES: { name: string; description: string; derivation: string }[] = [
  { name: 'dst_port', description: 'Destination Transport Port', derivation: 'dsport' },
  { name: 'flow_duration', description: 'Flow Duration (microseconds)', derivation: 'dur * 1e6' },
  { name: 'tot_fwd_pkts', description: 'Total Forward Packets', derivation: 'spkts' },
  { name: 'tot_bwd_pkts', description: 'Total Backward Packets', derivation: 'dpkts' },
  { name: 'totlen_fwd_pkts', description: 'Total Forward Payload Bytes', derivation: 'sbytes' },
  { name: 'totlen_bwd_pkts', description: 'Total Backward Payload Bytes', derivation: 'dbytes' },
  { name: 'fwd_pkt_len_max', description: 'Maximum Forward Packet Size', derivation: 'sbytes / spkts' },
  { name: 'fwd_pkt_len_min', description: 'Minimum Forward Packet Size', derivation: 'sbytes / spkts' },
  { name: 'fwd_pkt_len_mean', description: 'Mean Forward Packet Size', derivation: 'sbytes / spkts' },
  { name: 'fwd_pkt_len_std', description: 'Std Dev Forward Packet Size', derivation: '0.0 (unsw)' },
  { name: 'bwd_pkt_len_max', description: 'Maximum Backward Packet Size', derivation: 'dbytes / dpkts' },
  { name: 'bwd_pkt_len_min', description: 'Minimum Backward Packet Size', derivation: 'dbytes / dpkts' },
  { name: 'bwd_pkt_len_mean', description: 'Mean Backward Packet Size', derivation: 'dbytes / dpkts' },
  { name: 'bwd_pkt_len_std', description: 'Std Dev Backward Packet Size', derivation: '0.0 (unsw)' },
  { name: 'flow_byts_s', description: 'Flow Throughput (Bytes/sec)', derivation: 'sload / 8' },
  { name: 'flow_pkts_s', description: 'Flow Packet Rate (Packets/sec)', derivation: 'spkts / dur' },
];

interface ExperimentLabSectionProps {
  backendOnline: boolean;
}

export const ExperimentLabSection: React.FC<ExperimentLabSectionProps> = ({ backendOnline }) => {
  const [activeMode, setActiveMode] = useState<'dataset' | 'manual'>('dataset');

  // Mode A: Dataset State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inspecting, setInspecting] = useState<boolean>(false);
  const [inspectData, setInspectData] = useState<any | null>(null);
  const [inspectError, setInspectError] = useState<string | null>(null);

  const [featureMapping, setFeatureMapping] = useState<Record<string, string>>({});
  const [hasGroundTruth, setHasGroundTruth] = useState<boolean>(false);
  const [selectedLabelCol, setSelectedLabelCol] = useState<string>('');
  const [positiveLabelVal, setPositiveLabelVal] = useState<string>('1');

  const [runningExperiment, setRunningExperiment] = useState<boolean>(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [currentRunResult, setCurrentRunResult] = useState<any | null>(null);
  const [runHistory, setRunHistory] = useState<any[]>([]);

  // Mode B: Manual Flow State
  const [manualFeatures, setManualFeatures] = useState<number[]>(new Array(16).fill(0));
  const [manualModelChoice, setManualModelChoice] = useState<'both' | 'fp32' | 'int8'>('both');
  const [evaluatingFlow, setEvaluatingFlow] = useState<boolean>(false);
  const [manualResult, setManualResult] = useState<any | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);

  // Presets
  const [presetFlows, setPresetFlows] = useState<any | null>(null);

  useEffect(() => {
    if (backendOnline) {
      fetchPresetFlows()
        .then((data) => setPresetFlows(data))
        .catch((err) => console.warn('Could not load preset flows:', err));
    }
  }, [backendOnline]);

  // Handle File Upload and Auto-Inspect
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setSelectedFile(file);
    setInspectError(null);
    setInspectData(null);
    setCurrentRunResult(null);
    setInspecting(true);

    try {
      const data = await inspectExperimentDataset(file);
      setInspectData(data);

      // Initialize mapping from auto suggestions
      const initialMap: Record<string, string> = {};
      REQUIRED_FEATURES.forEach((f) => {
        const suggested = data.suggested_mapping?.[f.name];
        if (suggested && data.columns.includes(suggested)) {
          initialMap[f.name] = suggested;
        } else {
          initialMap[f.name] = '';
        }
      });
      setFeatureMapping(initialMap);

      // Auto detect label column
      const possibleLabel = data.columns.find((c: string) =>
        ['label', 'attack', 'is_attack', 'target', 'class'].includes(c.toLowerCase())
      );
      if (possibleLabel) {
        setHasGroundTruth(true);
        setSelectedLabelCol(possibleLabel);
      } else {
        setHasGroundTruth(false);
        setSelectedLabelCol('');
      }
    } catch (err: any) {
      setInspectError(err.message || 'Failed to inspect dataset file.');
    } finally {
      setInspecting(false);
    }
  };

  // Check mapping validity
  const allFeaturesMapped = REQUIRED_FEATURES.every(
    (f) => featureMapping[f.name] && featureMapping[f.name].trim() !== ''
  );

  // Execute Mode A Experiment
  const handleRunExperiment = async () => {
    if (!inspectData || !allFeaturesMapped) return;
    setRunningExperiment(true);
    setRunError(null);

    try {
      const payload = {
        file_id: inspectData.file_id,
        feature_mapping: featureMapping,
        label_column: hasGroundTruth && selectedLabelCol ? selectedLabelCol : null,
        positive_label_value: hasGroundTruth ? positiveLabelVal : null,
      };

      const result = await runExperiment(payload);
      setCurrentRunResult(result);
      setRunHistory((prev) => [
        {
          run_id: result.run_id,
          timestamp: result.timestamp,
          filename: inspectData.filename,
          row_count: result.row_count,
          has_labels: result.has_labels,
          agreement_pct: result.step5_comparison?.agreement_percentage,
          result: result,
        },
        ...prev,
      ]);
    } catch (err: any) {
      setRunError(err.message || 'Execution error during experiment run.');
    } finally {
      setRunningExperiment(false);
    }
  };

  // Mode B: Manual Flow Execution
  const handleRunManualFlow = async () => {
    setEvaluatingFlow(true);
    setManualError(null);
    try {
      const res = await runManualFlow({
        features: manualFeatures,
        model_choice: manualModelChoice,
      });
      setManualResult(res);
    } catch (err: any) {
      setManualError(err.message || 'Error evaluating single flow.');
    } finally {
      setEvaluatingFlow(false);
    }
  };

  const loadPreset = (type: 'benign' | 'attack') => {
    if (!presetFlows) return;
    const sample = type === 'benign' ? presetFlows.benign_example : presetFlows.attack_example;
    if (sample && sample.features_norm) {
      setManualFeatures([...sample.features_norm]);
      setManualResult(null);
    }
  };

  const handleFeatureInputChange = (index: number, val: string) => {
    const num = parseFloat(val);
    const updated = [...manualFeatures];
    updated[index] = isNaN(num) ? 0 : num;
    setManualFeatures(updated);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-[#0b121d] border border-[#1a273b] rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                Interactive Validation
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                Zero Data Fabrication
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <Activity className="w-7 h-7 text-cyan-400" />
              Interactive Experiment Lab
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Provide your own network dataset or manual flow vector to execute live FP32 and INT8 decision inference.
              All calculations run through the real model pipeline with dependency gating, honest label validation, host benchmark timings, and ESP32 hardware projections.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-[#06090e] p-1.5 rounded-lg border border-[#1a273b] shrink-0">
            <button
              onClick={() => setActiveMode('dataset')}
              className={`px-4 py-2 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${
                activeMode === 'dataset'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-4 h-4 text-cyan-400" />
              Dataset Upload (Batch)
            </button>
            <button
              onClick={() => setActiveMode('manual')}
              className={`px-4 py-2 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${
                activeMode === 'manual'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-4 h-4 text-purple-400" />
              Single-Flow Manual Test
            </button>
          </div>
        </div>
      </div>

      {/* Backend Offline Warning */}
      {!backendOnline && (
        <div className="bg-amber-950/40 border border-amber-500/50 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200">
            <strong>Backend API Offline:</strong> The interactive lab requires the FastAPI server to inspect files and execute inferences. Start the backend with <code className="bg-black/50 px-1 py-0.5 rounded font-mono text-amber-300">.\venv\Scripts\uvicorn backend.main:app --reload</code>.
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE A: DATASET EXPERIMENT (CSV UPLOAD)                                    */}
      {/* ========================================================================= */}
      {activeMode === 'dataset' && (
        <div className="space-y-8">
          {/* Step 1: Upload Card */}
          <div className="bg-[#0b121d] border border-[#1a273b] rounded-xl p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center text-xs font-mono">1</span>
              Upload Network Dataset (CSV)
            </h2>

            <div className="border-2 border-dashed border-[#1e2f47] hover:border-cyan-500/50 transition-colors rounded-xl p-6 text-center bg-[#070c14]">
              <input
                type="file"
                id="dataset-upload"
                accept=".csv,.txt"
                onChange={handleFileChange}
                disabled={inspecting || !backendOnline}
                className="hidden"
              />
              <label
                htmlFor="dataset-upload"
                className="cursor-pointer flex flex-col items-center justify-center space-y-3"
              >
                <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-sm font-medium text-white hover:text-cyan-400 transition-colors">
                    Click to select CSV file
                  </span>
                  <p className="text-xs text-slate-400 mt-1">
                    Standard network traffic capture or flow feature dataset (max 50 MB, parsed up to 50k rows for memory safety)
                  </p>
                </div>
                {selectedFile && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#0f1b2c] border border-cyan-500/30 text-xs text-cyan-300 font-mono">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
              </label>
            </div>

            {inspecting && (
              <div className="mt-4 flex items-center justify-center gap-3 text-cyan-400 text-sm font-mono py-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Parsing CSV schema, validating numeric formats and detecting mappings...
              </div>
            )}

            {inspectError && (
              <div className="mt-4 p-3 rounded-lg bg-red-950/50 border border-red-500/40 text-red-300 text-xs font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                {inspectError}
              </div>
            )}

            {/* Inspection Summary */}
            {inspectData && (
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                  <div className="bg-[#070c14] border border-[#1a273b] p-3 rounded-lg">
                    <div className="text-slate-400">Total Rows</div>
                    <div className="text-base font-bold text-cyan-400 mt-1">{inspectData.row_count.toLocaleString()}</div>
                  </div>
                  <div className="bg-[#070c14] border border-[#1a273b] p-3 rounded-lg">
                    <div className="text-slate-400">Columns Detected</div>
                    <div className="text-base font-bold text-white mt-1">{inspectData.col_count}</div>
                  </div>
                  <div className="bg-[#070c14] border border-[#1a273b] p-3 rounded-lg">
                    <div className="text-slate-400">Duplicates</div>
                    <div className="text-base font-bold text-slate-300 mt-1">{inspectData.duplicate_count}</div>
                  </div>
                  <div className="bg-[#070c14] border border-[#1a273b] p-3 rounded-lg">
                    <div className="text-slate-400">Missing/Inf Values</div>
                    <div className="text-base font-bold text-amber-400 mt-1">
                      {Object.values(inspectData.missing_counts).reduce((a: any, b: any) => a + b, 0) as number}
                    </div>
                  </div>
                </div>

                {/* Preview Table */}
                {inspectData.preview && inspectData.preview.length > 0 && (
                  <div className="border border-[#1a273b] rounded-lg overflow-x-auto bg-[#070c14]">
                    <div className="px-3 py-2 bg-[#0d1624] border-b border-[#1a273b] text-xs font-mono text-slate-400 flex items-center justify-between">
                      <span>Dataset Preview (First 5 Rows)</span>
                      <span className="text-[10px] text-cyan-400">Read-Only Sanitized Preview</span>
                    </div>
                    <table className="w-full text-[11px] font-mono text-slate-300">
                      <thead>
                        <tr className="border-b border-[#1a273b] text-slate-400 bg-[#09101b]">
                          {Object.keys(inspectData.preview[0]).slice(0, 8).map((col) => (
                            <th key={col} className="px-3 py-1.5 text-left font-normal truncate max-w-[120px]">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {inspectData.preview.slice(0, 5).map((row: any, idx: number) => (
                          <tr key={idx} className="border-b border-[#141f30] hover:bg-slate-900/40">
                            {Object.keys(inspectData.preview[0]).slice(0, 8).map((col) => (
                              <td key={col} className="px-3 py-1 truncate max-w-[120px]">
                                {String(row[col])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Feature Mapping Card */}
          {inspectData && (
            <div className="bg-[#0b121d] border border-[#1a273b] rounded-xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center text-xs font-mono">2</span>
                  Canonical Feature Mapping (16 Flow Features)
                </h2>
                <div className="text-xs font-mono">
                  {allFeaturesMapped ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded">
                      <Check className="w-3.5 h-3.5" /> All 16 Features Mapped
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {REQUIRED_FEATURES.filter((f) => !featureMapping[f.name]).length} Feature(s) Unmapped
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-4">
                Map columns from your uploaded CSV to the 16 canonical features expected by ZeroEdge-NIDS.
                The pre-fitted scaler is loaded from the CIC-IDS training partition and will <em>never</em> be refit on your target data.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                {REQUIRED_FEATURES.map((feat) => {
                  const mappedCol = featureMapping[feat.name] || '';
                  const isMapped = mappedCol !== '';

                  return (
                    <div
                      key={feat.name}
                      className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                        isMapped
                          ? 'bg-[#070c14] border-[#1e2f47]'
                          : 'bg-amber-950/10 border-amber-500/30'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-mono font-semibold text-white flex items-center gap-1.5">
                          {feat.name}
                          {isMapped ? (
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 rounded">Mapped</span>
                          ) : (
                            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 rounded">Required</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{feat.description}</div>
                      </div>

                      <div className="w-48 shrink-0">
                        <select
                          value={mappedCol}
                          onChange={(e) =>
                            setFeatureMapping((prev) => ({
                              ...prev,
                              [feat.name]: e.target.value,
                            }))
                          }
                          className="w-full bg-[#0d1624] border border-[#1a273b] focus:border-cyan-500 rounded px-2 py-1 text-slate-200 text-xs font-mono outline-none"
                        >
                          <option value="">-- Select Column --</option>
                          {inspectData.columns.map((c: string) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Step 3: Ground Truth Label Configuration */}
              <div className="mt-6 pt-6 border-t border-[#1a273b]">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center text-xs font-mono">3</span>
                  Ground Truth Labels (Optional for Unlabeled Inference)
                </h3>

                <div className="bg-[#070c14] border border-[#1a273b] p-4 rounded-xl space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="has-labels-check"
                      checked={hasGroundTruth}
                      onChange={(e) => setHasGroundTruth(e.target.checked)}
                      className="rounded bg-[#0d1624] border-[#1a273b] text-cyan-500 focus:ring-0 w-4 h-4"
                    />
                    <label htmlFor="has-labels-check" className="text-xs text-white cursor-pointer select-none">
                      This uploaded dataset contains ground-truth binary attack labels
                    </label>
                  </div>

                  {hasGroundTruth ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-[11px] font-mono text-slate-400 mb-1">
                          Ground Truth Label Column:
                        </label>
                        <select
                          value={selectedLabelCol}
                          onChange={(e) => setSelectedLabelCol(e.target.value)}
                          className="w-full bg-[#0d1624] border border-[#1a273b] focus:border-cyan-500 rounded px-3 py-1.5 text-slate-200 text-xs font-mono outline-none"
                        >
                          <option value="">-- Choose Label Column --</option>
                          {inspectData.columns.map((col: string) => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-slate-400 mb-1">
                          Positive Class Representation (Attack):
                        </label>
                        <input
                          type="text"
                          value={positiveLabelVal}
                          onChange={(e) => setPositiveLabelVal(e.target.value)}
                          placeholder="e.g. 1, Attack, Malicious"
                          className="w-full bg-[#0d1624] border border-[#1a273b] focus:border-cyan-500 rounded px-3 py-1.5 text-slate-200 text-xs font-mono outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-500/20 text-xs text-blue-300 font-mono">
                      <strong>Unlabeled Dataset Mode:</strong> Accuracy, Precision, Recall, F1, FPR, Confusion Matrix, and McNemar correctness test will be skipped as mathematically undefined without ground truth. The system will calculate model outputs, direct FP32 vs INT8 prediction parity, Wilcoxon distribution test, host benchmark latency, and ESP32 projections.
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-400 font-mono">
                  {allFeaturesMapped
                    ? 'Ready for execution. Strict dependency checks satisfied.'
                    : 'Please map all 16 required canonical features above to enable execution.'}
                </div>

                <button
                  onClick={handleRunExperiment}
                  disabled={!allFeaturesMapped || runningExperiment || !backendOnline}
                  className={`px-6 py-2.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition-all ${
                    allFeaturesMapped && !runningExperiment && backendOnline
                      ? 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.4)] cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  {runningExperiment ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Executing 10-Step Pipeline...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      Execute Experiment Lab Pipeline
                    </>
                  )}
                </button>
              </div>

              {runError && (
                <div className="mt-4 p-3 rounded-lg bg-red-950/50 border border-red-500/40 text-red-300 text-xs font-mono flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  {runError}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* EXPERIMENT RUN RESULTS (10-STEP VISUAL AUDIT)                              */}
          {/* ========================================================================= */}
          {currentRunResult && (
            <div className="space-y-6">
              {/* Results Header */}
              <div className="bg-[#0b121d] border border-cyan-500/30 rounded-xl p-6 shadow-[0_0_20px_rgba(0,240,255,0.05)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1a273b]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                        Run ID: {currentRunResult.run_id}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                        {currentRunResult.timestamp}
                      </span>
                      {currentRunResult.has_labels ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          Labeled Dataset
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          Unlabeled Dataset
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-white mt-1">
                      10-Step Experiment Execution Completed
                    </h2>
                  </div>

                  {/* Export Buttons */}
                  <div className="flex items-center gap-2">
                    <a
                      href={`/api/experiment/export/${currentRunResult.run_id}/json`}
                      download
                      className="px-3 py-1.5 rounded-lg bg-[#070c14] hover:bg-slate-800 border border-[#1a273b] hover:border-cyan-500/40 text-cyan-400 text-xs font-mono flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Download JSON Audit
                    </a>
                    <a
                      href={`/api/experiment/export/${currentRunResult.run_id}/csv`}
                      download
                      className="px-3 py-1.5 rounded-lg bg-[#070c14] hover:bg-slate-800 border border-[#1a273b] hover:border-cyan-500/40 text-purple-400 text-xs font-mono flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Predictions CSV
                    </a>
                  </div>
                </div>

                {/* 10-Step Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {/* Step 1: Inspection */}
                  <div className="bg-[#070c14] border border-[#1a273b] p-4 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-mono">1</span>
                        Dataset Ingestion & Sanitization
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Completed
                      </span>
                    </div>
                    <div className="text-slate-400 space-y-1 font-mono pt-1">
                      <div>Total Observations: <span className="text-white">{currentRunResult.step1_inspection.row_count} flows</span></div>
                      <div>Input Columns: <span className="text-white">{currentRunResult.step1_inspection.col_count}</span></div>
                      <div>Missing Values: <span className="text-white">{currentRunResult.step1_inspection.missing_values_handled} sanitized</span></div>
                      <div>Duplicates: <span className="text-white">{currentRunResult.step1_inspection.duplicate_count}</span></div>
                    </div>
                  </div>

                  {/* Step 2: Preprocessing */}
                  <div className="bg-[#070c14] border border-[#1a273b] p-4 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-mono">2</span>
                        Frozen CIC-IDS Scaler Preprocessing
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Completed
                      </span>
                    </div>
                    <div className="text-slate-400 space-y-1 font-mono pt-1">
                      <div>Scaler Source: <span className="text-cyan-400">{currentRunResult.step2_preprocessing.scaler_source}</span></div>
                      <div>Target Refitting: <span className="text-emerald-400 font-bold">0% (Strictly Forbidden)</span></div>
                      <div>Max Feature Drift: <span className="text-amber-400">{currentRunResult.step2_preprocessing.max_drift_pct}%</span></div>
                      <div>Log1p Transform: <span className="text-white">Applied to skewed heavy tails</span></div>
                    </div>
                  </div>

                  {/* Step 3: FP32 Inference */}
                  <div className="bg-[#070c14] border border-[#1a273b] p-4 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-mono">3</span>
                        FP32 Decision Engine Inference
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                        {currentRunResult.step3_fp32.badge}
                      </span>
                    </div>
                    <div className="text-slate-400 space-y-1 font-mono pt-1">
                      <div>Predicted Attacks: <span className="text-red-400 font-bold">{currentRunResult.step3_fp32.predicted_attacks.toLocaleString()}</span> ({((currentRunResult.step3_fp32.predicted_attacks / currentRunResult.row_count) * 100).toFixed(1)}%)</div>
                      <div>Predicted Benign: <span className="text-emerald-400 font-bold">{currentRunResult.step3_fp32.predicted_benign.toLocaleString()}</span></div>
                      <div>Mean Output Probability: <span className="text-white">{currentRunResult.step3_fp32.mean_probability}</span></div>
                      <div>Decision Threshold: <span className="text-white">{currentRunResult.step3_fp32.decision_threshold}</span></div>
                    </div>
                  </div>

                  {/* Step 4: INT8 Inference */}
                  <div className="bg-[#070c14] border border-[#1a273b] p-4 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-mono">4</span>
                        INT8 Quantized Integer Inference
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                        {currentRunResult.step4_int8.badge}
                      </span>
                    </div>
                    <div className="text-slate-400 space-y-1 font-mono pt-1">
                      <div>Input Scale (S_in): <span className="text-white">{currentRunResult.step4_int8.scale_in}</span></div>
                      <div>Zero Point (Z_in): <span className="text-white">{currentRunResult.step4_int8.zero_point_in}</span></div>
                      <div>Predicted Attacks: <span className="text-red-400 font-bold">{currentRunResult.step4_int8.predicted_attacks.toLocaleString()}</span> ({((currentRunResult.step4_int8.predicted_attacks / currentRunResult.row_count) * 100).toFixed(1)}%)</div>
                      <div>Predicted Benign: <span className="text-emerald-400 font-bold">{currentRunResult.step4_int8.predicted_benign.toLocaleString()}</span></div>
                    </div>
                  </div>

                  {/* Step 5: Direct Comparison */}
                  <div className="bg-[#070c14] border border-[#1a273b] p-4 rounded-xl text-xs space-y-2 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-mono">5</span>
                        Direct FP32 vs. INT8 Decision Parity Comparison
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
                        {currentRunResult.step5_comparison.badge}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 font-mono">
                      <div className="bg-[#0d1624] p-2.5 rounded border border-[#1a273b]">
                        <div className="text-slate-400 text-[10px]">Decision Agreement</div>
                        <div className="text-base font-bold text-cyan-400 mt-0.5">
                          {currentRunResult.step5_comparison.agreement_percentage}%
                        </div>
                      </div>
                      <div className="bg-[#0d1624] p-2.5 rounded border border-[#1a273b]">
                        <div className="text-slate-400 text-[10px]">Discordant Flows</div>
                        <div className="text-base font-bold text-amber-400 mt-0.5">
                          {currentRunResult.step5_comparison.discordant_count}
                        </div>
                      </div>
                      <div className="bg-[#0d1624] p-2.5 rounded border border-[#1a273b]">
                        <div className="text-slate-400 text-[10px]">Mean Prob Delta</div>
                        <div className="text-base font-bold text-slate-200 mt-0.5">
                          {currentRunResult.step5_comparison.mean_prob_difference}
                        </div>
                      </div>
                      <div className="bg-[#0d1624] p-2.5 rounded border border-[#1a273b]">
                        <div className="text-slate-400 text-[10px]">Max Prob Delta</div>
                        <div className="text-base font-bold text-slate-200 mt-0.5">
                          {currentRunResult.step5_comparison.max_prob_difference}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 6: Classification Evaluation */}
                  <div className="bg-[#070c14] border border-[#1a273b] p-4 rounded-xl text-xs space-y-2 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-mono">6</span>
                        Classification Performance Evaluation
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        currentRunResult.step6_evaluation.status === 'completed'
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {currentRunResult.step6_evaluation.badge}
                      </span>
                    </div>

                    {currentRunResult.step6_evaluation.status === 'completed' ? (
                      <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 font-mono text-[11px]">
                          <div className="bg-[#0d1624] p-2 rounded border border-[#1a273b]">
                            <div className="text-slate-400 text-[10px]">FP32 Acc</div>
                            <div className="text-cyan-400 font-bold mt-0.5">
                              {(currentRunResult.step6_evaluation.fp32_metrics.accuracy * 100).toFixed(2)}%
                            </div>
                          </div>
                          <div className="bg-[#0d1624] p-2 rounded border border-[#1a273b]">
                            <div className="text-slate-400 text-[10px]">INT8 Acc</div>
                            <div className="text-purple-400 font-bold mt-0.5">
                              {(currentRunResult.step6_evaluation.int8_metrics.accuracy * 100).toFixed(2)}%
                            </div>
                          </div>
                          <div className="bg-[#0d1624] p-2 rounded border border-[#1a273b]">
                            <div className="text-slate-400 text-[10px]">FP32 Bal Acc</div>
                            <div className="text-cyan-400 font-bold mt-0.5">
                              {(currentRunResult.step6_evaluation.fp32_metrics.balanced_accuracy * 100).toFixed(2)}%
                            </div>
                          </div>
                          <div className="bg-[#0d1624] p-2 rounded border border-[#1a273b]">
                            <div className="text-slate-400 text-[10px]">INT8 Bal Acc</div>
                            <div className="text-purple-400 font-bold mt-0.5">
                              {(currentRunResult.step6_evaluation.int8_metrics.balanced_accuracy * 100).toFixed(2)}%
                            </div>
                          </div>
                          <div className="bg-[#0d1624] p-2 rounded border border-[#1a273b]">
                            <div className="text-slate-400 text-[10px]">FP32 F1</div>
                            <div className="text-cyan-400 font-bold mt-0.5">
                              {(currentRunResult.step6_evaluation.fp32_metrics.f1 * 100).toFixed(2)}%
                            </div>
                          </div>
                          <div className="bg-[#0d1624] p-2 rounded border border-[#1a273b]">
                            <div className="text-slate-400 text-[10px]">INT8 F1</div>
                            <div className="text-purple-400 font-bold mt-0.5">
                              {(currentRunResult.step6_evaluation.int8_metrics.f1 * 100).toFixed(2)}%
                            </div>
                          </div>
                        </div>

                        {/* Confusion Matrix Table */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                          <div className="bg-[#0d1624] p-3 rounded border border-[#1a273b]">
                            <div className="text-cyan-400 font-bold mb-2">FP32 Confusion Matrix</div>
                            <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                              <div className="bg-[#070c14] p-2 rounded border border-slate-800">
                                <div className="text-slate-500 text-[10px]">TN</div>
                                <div className="text-emerald-400 font-bold">{currentRunResult.step6_evaluation.fp32_metrics.confusion_matrix.tn}</div>
                              </div>
                              <div className="bg-[#070c14] p-2 rounded border border-slate-800">
                                <div className="text-slate-500 text-[10px]">FP</div>
                                <div className="text-amber-400 font-bold">{currentRunResult.step6_evaluation.fp32_metrics.confusion_matrix.fp}</div>
                              </div>
                              <div className="bg-[#070c14] p-2 rounded border border-slate-800">
                                <div className="text-slate-500 text-[10px]">FN</div>
                                <div className="text-red-400 font-bold">{currentRunResult.step6_evaluation.fp32_metrics.confusion_matrix.fn}</div>
                              </div>
                              <div className="bg-[#070c14] p-2 rounded border border-slate-800">
                                <div className="text-slate-500 text-[10px]">TP</div>
                                <div className="text-cyan-400 font-bold">{currentRunResult.step6_evaluation.fp32_metrics.confusion_matrix.tp}</div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-[#0d1624] p-3 rounded border border-[#1a273b]">
                            <div className="text-purple-400 font-bold mb-2">INT8 Confusion Matrix</div>
                            <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                              <div className="bg-[#070c14] p-2 rounded border border-slate-800">
                                <div className="text-slate-500 text-[10px]">TN</div>
                                <div className="text-emerald-400 font-bold">{currentRunResult.step6_evaluation.int8_metrics.confusion_matrix.tn}</div>
                              </div>
                              <div className="bg-[#070c14] p-2 rounded border border-slate-800">
                                <div className="text-slate-500 text-[10px]">FP</div>
                                <div className="text-amber-400 font-bold">{currentRunResult.step6_evaluation.int8_metrics.confusion_matrix.fp}</div>
                              </div>
                              <div className="bg-[#070c14] p-2 rounded border border-slate-800">
                                <div className="text-slate-500 text-[10px]">FN</div>
                                <div className="text-red-400 font-bold">{currentRunResult.step6_evaluation.int8_metrics.confusion_matrix.fn}</div>
                              </div>
                              <div className="bg-[#070c14] p-2 rounded border border-slate-800">
                                <div className="text-slate-500 text-[10px]">TP</div>
                                <div className="text-purple-400 font-bold">{currentRunResult.step6_evaluation.int8_metrics.confusion_matrix.tp}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-[#0d1624] rounded border border-slate-800 text-slate-400 font-mono text-xs">
                        {currentRunResult.step6_evaluation.reason}
                      </div>
                    )}
                  </div>

                  {/* Step 7: Paired Statistics */}
                  <div className="bg-[#070c14] border border-[#1a273b] p-4 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-mono">7</span>
                        Paired Statistical Significance
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
                        {currentRunResult.step7_statistics.badge}
                      </span>
                    </div>
                    <div className="text-slate-400 space-y-1 font-mono pt-1">
                      <div>
                        Wilcoxon Signed-Rank Test (Probabilities):
                        <div className="text-white pl-2">
                          p-value: <span className="text-cyan-400">{currentRunResult.step7_statistics.wilcoxon_probabilities.p_value}</span> (W={currentRunResult.step7_statistics.wilcoxon_probabilities.statistic})
                        </div>
                      </div>
                      <div className="pt-1">
                        McNemar Test (Prediction Agreement):
                        <div className="text-white pl-2">
                          χ²: <span className="text-white">{currentRunResult.step7_statistics.mcnemar_predictions.chi2_continuity_corrected}</span>,
                          p-value: <span className="text-purple-400">{currentRunResult.step7_statistics.mcnemar_predictions.p_value}</span>
                        </div>
                      </div>
                      {typeof currentRunResult.step7_statistics.mcnemar_correctness === 'object' && (
                        <div className="pt-1 text-emerald-400">
                          McNemar Test (Classification Error Parity):
                          <div className="pl-2">
                            χ²: {currentRunResult.step7_statistics.mcnemar_correctness.chi2_continuity_corrected},
                            p-value: {currentRunResult.step7_statistics.mcnemar_correctness.p_value}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 8: Host Benchmark */}
                  <div className="bg-[#070c14] border border-[#1a273b] p-4 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-mono">8</span>
                        Host CPU Timing Benchmark
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                        {currentRunResult.step8_benchmark.badge}
                      </span>
                    </div>
                    <div className="text-slate-400 space-y-1 font-mono pt-1">
                      <div>FP32 Median Latency: <span className="text-cyan-400 font-bold">{currentRunResult.step8_benchmark.fp32_latency.median_us} μs</span> (p95: {currentRunResult.step8_benchmark.fp32_latency.p95_us} μs)</div>
                      <div>INT8 Median Latency: <span className="text-purple-400 font-bold">{currentRunResult.step8_benchmark.int8_latency.median_us} μs</span> (p95: {currentRunResult.step8_benchmark.int8_latency.p95_us} μs)</div>
                      <div>INT8 Throughput: <span className="text-white font-bold">{currentRunResult.step8_benchmark.int8_latency.throughput_inferences_per_sec.toLocaleString()} inf/s</span></div>
                      <div className="text-[10px] text-slate-500 truncate pt-1">
                        Host: {currentRunResult.step8_benchmark.host_environment?.cpu_model} ({currentRunResult.step8_benchmark.host_environment?.os})
                      </div>
                    </div>
                  </div>

                  {/* Step 9: Analytical ESP32 Projection */}
                  <div className="bg-[#070c14] border border-[#1a273b] p-4 rounded-xl text-xs space-y-2 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-mono">9</span>
                        Analytical ESP32 Hardware Deployment Projection
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        {currentRunResult.step9_projection.badge}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 font-mono">
                      <div className="bg-[#0d1624] p-2.5 rounded border border-[#1a273b]">
                        <div className="text-slate-400 text-[10px]">Projected Cycles (INT8)</div>
                        <div className="text-amber-400 font-bold mt-0.5">
                          {currentRunResult.step9_projection.projected_cycles_int8.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-500">22.93 μs @ 240MHz</div>
                      </div>
                      <div className="bg-[#0d1624] p-2.5 rounded border border-[#1a273b]">
                        <div className="text-slate-400 text-[10px]">Tensor Arena SRAM</div>
                        <div className="text-cyan-400 font-bold mt-0.5">
                          {currentRunResult.step9_projection.tensor_arena_sram_bytes.toLocaleString()} B
                        </div>
                        <div className="text-[10px] text-slate-500">{currentRunResult.step9_projection.sram_utilization_pct}% of 320KB</div>
                      </div>
                      <div className="bg-[#0d1624] p-2.5 rounded border border-[#1a273b]">
                        <div className="text-slate-400 text-[10px]">Flash Binary Footprint</div>
                        <div className="text-purple-400 font-bold mt-0.5">
                          {currentRunResult.step9_projection.flash_footprint_bytes.toLocaleString()} B
                        </div>
                        <div className="text-[10px] text-slate-500">{currentRunResult.step9_projection.flash_utilization_pct}% of 4MB</div>
                      </div>
                      <div className="bg-[#0d1624] p-2.5 rounded border border-[#1a273b]">
                        <div className="text-slate-400 text-[10px]">Projected Energy / Inf</div>
                        <div className="text-emerald-400 font-bold mt-0.5">
                          {currentRunResult.step9_projection.virtual_ina219_energy_per_inference_uj} μJ
                        </div>
                        <div className="text-[10px] text-slate-500">204.6 mW active load</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Limitations and Disclaimers */}
                <div className="mt-6 p-4 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs text-amber-300 font-mono space-y-1">
                  <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-200">
                    <AlertTriangle className="w-4 h-4" /> Academic & Scientific Method Limitations:
                  </div>
                  {currentRunResult.limitations.map((lim: string, idx: number) => (
                    <div key={idx}>• {lim}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Session Calculation History */}
          {runHistory.length > 0 && (
            <div className="bg-[#0b121d] border border-[#1a273b] rounded-xl p-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-cyan-400" />
                Current Session Calculation History ({runHistory.length} Runs)
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-slate-300">
                  <thead>
                    <tr className="border-b border-[#1a273b] text-slate-400 text-left bg-[#070c14]">
                      <th className="px-3 py-2">Run ID</th>
                      <th className="px-3 py-2">Dataset File</th>
                      <th className="px-3 py-2">Rows</th>
                      <th className="px-3 py-2">Labels</th>
                      <th className="px-3 py-2">Agreement</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runHistory.map((h, i) => (
                      <tr key={h.run_id} className="border-b border-[#141f30] hover:bg-slate-900/40">
                        <td className="px-3 py-2 font-bold text-cyan-400">{h.run_id}</td>
                        <td className="px-3 py-2">{h.filename}</td>
                        <td className="px-3 py-2">{h.row_count.toLocaleString()}</td>
                        <td className="px-3 py-2">
                          {h.has_labels ? (
                            <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px]">
                              Labeled
                            </span>
                          ) : (
                            <span className="text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                              Unlabeled
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-purple-400 font-bold">{h.agreement_pct}%</td>
                        <td className="px-3 py-2 text-right space-x-2">
                          <button
                            onClick={() => setCurrentRunResult(h.result)}
                            className="px-2 py-1 rounded bg-[#0d1624] hover:bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px]"
                          >
                            Inspect Run
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE B: SINGLE-FLOW MANUAL TEST                                            */}
      {/* ========================================================================= */}
      {activeMode === 'manual' && (
        <div className="space-y-8">
          <div className="bg-[#0b121d] border border-[#1a273b] rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-purple-400" />
                  Single Network Flow Vector Evaluation
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Enter 16 raw flow feature values or load genuine verified test captures to trace through preprocessing, integer quantization, and dual-model classification.
                </p>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => loadPreset('benign')}
                  disabled={!presetFlows}
                  className="px-3 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Load Genuine Benign Flow
                </button>
                <button
                  onClick={() => loadPreset('attack')}
                  disabled={!presetFlows}
                  className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  Load Genuine Attack Flow
                </button>
                <button
                  onClick={() => {
                    setManualFeatures(new Array(16).fill(0));
                    setManualResult(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#070c14] hover:bg-slate-800 border border-[#1a273b] text-slate-400 text-xs font-mono transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Model choice radio */}
            <div className="flex items-center gap-4 mb-6 text-xs font-mono bg-[#070c14] p-3 rounded-lg border border-[#1a273b]">
              <span className="text-slate-400">Target Decision Engine:</span>
              {(['both', 'fp32', 'int8'] as const).map((choice) => (
                <label key={choice} className="flex items-center gap-1.5 cursor-pointer text-slate-200">
                  <input
                    type="radio"
                    name="model-choice"
                    checked={manualModelChoice === choice}
                    onChange={() => setManualModelChoice(choice)}
                    className="text-cyan-500 focus:ring-0 bg-[#0d1624]"
                  />
                  {choice === 'both' ? 'Both (FP32 & INT8)' : choice.toUpperCase()}
                </label>
              ))}
            </div>

            {/* 16 Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {REQUIRED_FEATURES.map((feat, idx) => (
                <div key={feat.name} className="bg-[#070c14] border border-[#1a273b] p-2.5 rounded-lg">
                  <label className="block text-[11px] font-mono text-cyan-300 truncate font-semibold mb-0.5">
                    {idx + 1}. {feat.name}
                  </label>
                  <div className="text-[10px] text-slate-500 truncate mb-1">{feat.description}</div>
                  <input
                    type="number"
                    step="any"
                    value={manualFeatures[idx]}
                    onChange={(e) => handleFeatureInputChange(idx, e.target.value)}
                    className="w-full bg-[#0d1624] border border-[#1a273b] focus:border-cyan-500 rounded px-2 py-1 text-white text-xs font-mono outline-none"
                  />
                </div>
              ))}
            </div>

            {/* Action Button */}
            <div className="mt-6 flex items-center justify-end">
              <button
                onClick={handleRunManualFlow}
                disabled={evaluatingFlow || !backendOnline}
                className={`px-6 py-2.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition-all ${
                  !evaluatingFlow && backendOnline
                    ? 'bg-purple-600 text-white hover:bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                {evaluatingFlow ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Tracing Decision Flow...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Run Flow Decision Inference
                  </>
                )}
              </button>
            </div>

            {manualError && (
              <div className="mt-4 p-3 rounded-lg bg-red-950/50 border border-red-500/40 text-red-300 text-xs font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                {manualError}
              </div>
            )}
          </div>

          {/* Results Display */}
          {manualResult && (
            <div className="bg-[#0b121d] border border-purple-500/30 rounded-xl p-6 space-y-6 shadow-[0_0_20px_rgba(168,85,247,0.05)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#1a273b]">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-400" />
                    Inference Breakdown & Tensor Representation
                  </h3>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    Origin Badge: <span className="text-purple-400">{manualResult.origin_badge}</span> | Host Timing: <span className="text-cyan-400">{manualResult.latency_badge}</span>
                  </div>
                </div>

                {manualResult.comparison && (
                  <div className="text-xs font-mono">
                    {manualResult.comparison.agreement ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <Check className="w-3.5 h-3.5" /> FP32 & INT8 Parity Match
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        <AlertTriangle className="w-3.5 h-3.5" /> Divergent Classification
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Model Outputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {manualResult.fp32 && (
                  <div className="bg-[#070c14] border border-[#1a273b] p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-cyan-400">FP32 Decision Engine</div>
                      <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                        Latency: {manualResult.fp32.latency_us} μs
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-slate-400">Predicted Classification:</span>
                      <span className={`px-2.5 py-1 rounded font-mono font-bold text-xs ${
                        manualResult.fp32.prediction === 1
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      }`}>
                        {manualResult.fp32.label}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                        <span>Sigmoid Probability:</span>
                        <span className="text-white font-bold">{manualResult.fp32.probability}</span>
                      </div>
                      <div className="w-full bg-[#141f30] h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            manualResult.fp32.prediction === 1 ? 'bg-red-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${manualResult.fp32.probability * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {manualResult.int8 && (
                  <div className="bg-[#070c14] border border-[#1a273b] p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-purple-400">INT8 Quantized Engine</div>
                      <span className="text-[10px] font-mono text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800">
                        Latency: {manualResult.int8.latency_us} μs
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-slate-400">Predicted Classification:</span>
                      <span className={`px-2.5 py-1 rounded font-mono font-bold text-xs ${
                        manualResult.int8.prediction === 1
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      }`}>
                        {manualResult.int8.label}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                        <span>Quantized Probability:</span>
                        <span className="text-white font-bold">{manualResult.int8.probability}</span>
                      </div>
                      <div className="w-full bg-[#141f30] h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            manualResult.int8.prediction === 1 ? 'bg-red-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${manualResult.int8.probability * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quantized Integer Vector Trace */}
              {manualResult.int8?.quantized_inputs && (
                <div className="bg-[#070c14] border border-[#1a273b] p-4 rounded-xl">
                  <div className="text-xs font-mono font-bold text-slate-300 mb-2 flex items-center justify-between">
                    <span>Quantized INT8 Tensor (q ∈ [-128, 127]):</span>
                    <span className="text-[10px] text-purple-400">Formula: q = round(x / S) + Z</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                    {manualResult.int8.quantized_inputs.map((qVal: number, i: number) => (
                      <span
                        key={i}
                        className="px-2 py-1 rounded bg-[#0d1624] border border-[#1a273b] text-slate-200"
                        title={REQUIRED_FEATURES[i].name}
                      >
                        <span className="text-slate-500 text-[10px]">{REQUIRED_FEATURES[i].name}:</span>{' '}
                        <span className="text-purple-300 font-bold">{qVal}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="p-3 bg-blue-950/20 border border-blue-500/30 rounded-lg text-xs text-blue-300 font-mono">
                <strong>Academic / Scientific Notice:</strong> {manualResult.disclaimer}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
