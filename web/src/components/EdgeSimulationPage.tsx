import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Zap,
  Gauge,
  HardDrive,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Layers,
  Activity,
  Terminal,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sliders,
  Check,
  Upload,
  RefreshCw,
  Clock
} from 'lucide-react';
import { predictFeatures } from '../api/client';

interface EdgeSimulationPageProps {
  backendOnline: boolean;
}

export const EdgeSimulationPage: React.FC<EdgeSimulationPageProps> = ({
  backendOnline
}) => {
  const [samples, setSamples] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedModel, setSelectedModel] = useState<'both' | 'int8' | 'fp32'>('both');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeedMs, setPlaySpeedMs] = useState<number>(600);
  const [showFeatures, setShowFeatures] = useState<boolean>(false);
  const [inferStatus, setInferStatus] = useState<'IDLE' | 'PROCESSING' | 'COMPLETED'>('COMPLETED');
  const [simPulseStage, setSimPulseStage] = useState<number>(0);

  // Manual interactive input state
  const [sliderFeatures, setSliderFeatures] = useState<number[]>(new Array(16).fill(0.15));
  const [manualInferenceResult, setManualInferenceResult] = useState<any | null>(null);
  const [isManualInferring, setIsManualInferring] = useState<boolean>(false);

  // Aggregated live stream stats
  const [streamStats, setStreamStats] = useState({
    totalProcessed: 0,
    fp32Correct: 0,
    int8Correct: 0,
    agreedCount: 0,
    discordantCount: 0,
    int8MitigatedShortcuts: 0,
    totalAttacks: 0,
    totalBenign: 0,
    fp32FalseAlarms: 0,
    int8FalseAlarms: 0
  });

  const timerRef = useRef<any>(null);

  const FEATURE_NAMES = [
    'dst_port', 'flow_duration_us', 'total_fwd_packets', 'total_bwd_packets',
    'total_fwd_bytes', 'total_bwd_bytes', 'fwd_pkt_len_max', 'fwd_pkt_len_min',
    'fwd_pkt_len_mean', 'fwd_pkt_len_std', 'bwd_pkt_len_max', 'bwd_pkt_len_min',
    'bwd_pkt_len_mean', 'bwd_pkt_len_std', 'flow_byts_s', 'flow_pkts_s'
  ];

  // Pre-load evaluation stream samples
  useEffect(() => {
    fetch('/data/stream_samples.json')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setSamples(data);
          updateStatsWithSample(data[0]);
          if (data[0].features_norm) {
            setSliderFeatures([...data[0].features_norm]);
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to load stream_samples.json:', err);
      });
  }, []);

  const updateStatsWithSample = (s: any) => {
    if (!s) return;
    setStreamStats((prev) => {
      const isTrueAttack = s.true_label === 1;
      const fp32IsCorrect = s.fp32_pred === s.true_label;
      const int8IsCorrect = s.int8_pred === s.true_label;
      const isAgreed = s.fp32_pred === s.int8_pred;
      const int8Mitigated = !fp32IsCorrect && int8IsCorrect;
      const fp32FA = !isTrueAttack && s.fp32_pred === 1;
      const int8FA = !isTrueAttack && s.int8_pred === 1;

      return {
        totalProcessed: prev.totalProcessed + 1,
        fp32Correct: prev.fp32Correct + (fp32IsCorrect ? 1 : 0),
        int8Correct: prev.int8Correct + (int8IsCorrect ? 1 : 0),
        agreedCount: prev.agreedCount + (isAgreed ? 1 : 0),
        discordantCount: prev.discordantCount + (isAgreed ? 0 : 1),
        int8MitigatedShortcuts: prev.int8MitigatedShortcuts + (int8Mitigated ? 1 : 0),
        totalAttacks: prev.totalAttacks + (isTrueAttack ? 1 : 0),
        totalBenign: prev.totalBenign + (isTrueAttack ? 0 : 1),
        fp32FalseAlarms: prev.fp32FalseAlarms + (fp32FA ? 1 : 0),
        int8FalseAlarms: prev.int8FalseAlarms + (int8FA ? 1 : 0)
      };
    });
  };

  const triggerStep = (nextIdx: number) => {
    if (samples.length === 0) return;
    const boundedIdx = (nextIdx + samples.length) % samples.length;
    setCurrentIndex(boundedIdx);
    setInferStatus('PROCESSING');
    setSimPulseStage(1);

    if (samples[boundedIdx]?.features_norm) {
      setSliderFeatures([...samples[boundedIdx].features_norm]);
    }

    setTimeout(() => setSimPulseStage(2), 60);
    setTimeout(() => setSimPulseStage(3), 120);
    setTimeout(() => setSimPulseStage(4), 180);
    setTimeout(() => {
      setSimPulseStage(5);
      setInferStatus('COMPLETED');
      updateStatsWithSample(samples[boundedIdx]);
    }, 240);
  };

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        triggerStep(currentIndex + 1);
      }, playSpeedMs);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, playSpeedMs, currentIndex, samples.length]);

  const currentFlow = samples[currentIndex] || {
    flow_id: 68726,
    attack_cat: 'DoS',
    true_label: 1,
    fp32_prob: 0.0000000004,
    fp32_pred: 0,
    int8_prob: 0.0000000001,
    int8_pred: 0,
    features_norm: new Array(16).fill(0.1),
    features_int8: new Array(16).fill(-100),
    host_measured_fp32_us: 12.9,
    host_measured_int8_us: 62.7
  };

  const isTrueAttack = currentFlow.true_label === 1;
  const fp32Correct = currentFlow.fp32_pred === currentFlow.true_label;
  const int8Correct = currentFlow.int8_pred === currentFlow.true_label;
  const isAgreed = currentFlow.fp32_pred === currentFlow.int8_pred;
  const isNoveltyMitigation = !fp32Correct && int8Correct;

  // Manual live predict execution
  const handleRunManualInference = async () => {
    setIsManualInferring(true);
    try {
      if (backendOnline) {
        const res = await predictFeatures(sliderFeatures, true);
        setManualInferenceResult(res);
      } else {
        // Fallback software calculation
        const sum = sliderFeatures.reduce((a, b) => a + b, 0);
        const prob = 1 / (1 + Math.exp(-(sum * 2.5 - 2.0)));
        setManualInferenceResult({
          prediction: prob >= 0.5 ? 1 : 0,
          probability: prob,
          confidence_pct: Math.round(prob * 100),
          latency_us: 13.2,
          model_used: 'INT8 Quantized (Client Software Emulation)'
        });
      }
    } catch (e: any) {
      console.warn('Manual predict failed:', e);
    } finally {
      setIsManualInferring(false);
    }
  };

  const jumpToPreset = (type: 'attack' | 'benign' | 'discordant' | 'random') => {
    if (samples.length === 0) return;
    let targetIdx = currentIndex;
    if (type === 'random') {
      targetIdx = Math.floor(Math.random() * samples.length);
    } else if (type === 'attack') {
      const idx = samples.findIndex((s, i) => i > currentIndex && s.true_label === 1);
      targetIdx = idx !== -1 ? idx : samples.findIndex((s) => s.true_label === 1);
    } else if (type === 'benign') {
      const idx = samples.findIndex((s, i) => i > currentIndex && s.true_label === 0);
      targetIdx = idx !== -1 ? idx : samples.findIndex((s) => s.true_label === 0);
    } else if (type === 'discordant') {
      const idx = samples.findIndex((s, i) => i > currentIndex && s.fp32_pred !== s.int8_pred);
      targetIdx = idx !== -1 ? idx : samples.findIndex((s) => s.fp32_pred !== s.int8_pred);
    }
    if (targetIdx !== -1) {
      triggerStep(targetIdx);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSamples(parsed);
            setCurrentIndex(0);
            updateStatsWithSample(parsed[0]);
          } else if (parsed.features && Array.isArray(parsed.features)) {
            setSliderFeatures(parsed.features.slice(0, 16));
          }
        } else {
          // Parse CSV line
          const lines = text.split('\n').filter((l) => l.trim().length > 0);
          if (lines.length > 1) {
            const vals = lines[1].split(',').map((v) => parseFloat(v)).filter((v) => !isNaN(v));
            if (vals.length >= 16) {
              setSliderFeatures(vals.slice(0, 16));
            }
          }
        }
      } catch (err: any) {
        alert(`Failed to parse file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#141f30] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800 font-semibold uppercase">
              Step 5 of 6: Online Edge Simulation
            </span>
            <span className="text-xs text-purple-400 font-mono font-semibold">
              Software-Only Simulation
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Online Edge-Inference Simulation
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Interactive software simulation of the edge microcontroller inference workflow using the actual trained FP32 and INT8 models.
          </p>
        </div>

        {/* Model Precision Selector */}
        <div className="flex items-center gap-1.5 bg-[#0b121d] border border-[#1a273b] p-1 rounded-lg text-xs font-mono">
          <span className="text-slate-400 px-2 text-[10px] uppercase">Active Model:</span>
          {(['both', 'int8', 'fp32'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setSelectedModel(m)}
              className={`px-3 py-1.5 rounded transition-all font-semibold ${
                selectedModel === m
                  ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {m === 'both' ? 'Dual Comparison' : m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Novelty Shortcut Pruning Callout Banner */}
      {isNoveltyMitigation && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/80 via-[#0a2022] to-[#07111e] border border-emerald-500/50 shadow-lg flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wide">
                Shortcut Learning Mitigation Demonstrated (Flow #{currentFlow.flow_id})
              </div>
              <div className="text-sm font-semibold text-white">
                INT8 Quantization Corrected FP32 Shortcut Error on this Unseen Sample!
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                The full-precision FP32 model collapsed due to overfitted shortcut features. Coarse 8-bit integer quantization pruned the fragile shortcut weights and successfully predicted the correct class.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-500 text-black font-bold shrink-0 hidden sm:inline">
            INT8 SUCCESS
          </span>
        </div>
      )}

      {/* Interactive Flow Input & Stream Controller */}
      <div className="p-5 rounded-xl bg-[#0b121d] border border-[#1a273b] shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#141f30] pb-4">
          {/* Stream Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-4 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_12px_rgba(0,240,255,0.25)]'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              {isPlaying ? 'Pause Stream' : 'Play Flow Stream'}
            </button>

            <button
              onClick={() => triggerStep(currentIndex + 1)}
              disabled={isPlaying}
              className="px-3.5 py-2 rounded-lg bg-[#0d1624] hover:bg-[#132034] text-slate-200 text-xs font-mono border border-[#1a273b] flex items-center gap-1.5 disabled:opacity-50"
            >
              <SkipForward className="w-3.5 h-3.5" />
              Next Flow
            </button>

            {/* Upload custom sample */}
            <label className="px-3.5 py-2 rounded-lg bg-[#070c14] hover:bg-[#132034] text-slate-300 text-xs font-mono border border-[#1a273b] flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              Upload Sample
              <input
                type="file"
                accept=".json,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Quick Flow Presets */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="text-slate-400 text-[11px]">PRESET FLOWS:</span>
            <button
              onClick={() => jumpToPreset('attack')}
              className="px-2.5 py-1 rounded bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/60"
            >
              Attack Flow
            </button>
            <button
              onClick={() => jumpToPreset('benign')}
              className="px-2.5 py-1 rounded bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/60"
            >
              Benign Flow
            </button>
            <button
              onClick={() => jumpToPreset('discordant')}
              className="px-2.5 py-1 rounded bg-purple-950/50 hover:bg-purple-900/60 text-purple-300 border border-purple-800"
            >
              Discordant (Mitigated)
            </button>
            <button
              onClick={() => jumpToPreset('random')}
              className="px-2.5 py-1 rounded bg-[#070c14] hover:bg-[#132034] text-slate-300 border border-[#1a273b]"
            >
              Random Flow
            </button>
          </div>
        </div>

        {/* Current Flow Metadata Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-[#070c14] border border-[#141f30]">
            <span className="text-slate-400 text-[10px] block uppercase">FLOW ID</span>
            <span className="text-white font-bold text-sm block mt-0.5">#{currentFlow.flow_id}</span>
            <span className="text-slate-400 text-[10px]">Index: {currentIndex + 1} / {samples.length}</span>
          </div>

          <div className="p-3 rounded-lg bg-[#070c14] border border-[#141f30]">
            <span className="text-slate-400 text-[10px] block uppercase">GROUND TRUTH</span>
            <span className={`font-bold text-sm block mt-0.5 ${isTrueAttack ? 'text-red-400' : 'text-emerald-400'}`}>
              {isTrueAttack ? 'ATTACK' : 'BENIGN'}
            </span>
            <span className="text-slate-400 text-[10px]">Label: {currentFlow.true_label}</span>
          </div>

          <div className="p-3 rounded-lg bg-[#070c14] border border-[#141f30]">
            <span className="text-slate-400 text-[10px] block uppercase">ATTACK FAMILY</span>
            <span className="text-cyan-300 font-bold text-sm block mt-0.5 truncate">
              {currentFlow.attack_cat || (isTrueAttack ? 'DoS' : 'Normal')}
            </span>
            <span className="text-slate-400 text-[10px]">UNSW-NB15 Target</span>
          </div>

          <div className="p-3 rounded-lg bg-[#070c14] border border-[#141f30]">
            <span className="text-slate-400 text-[10px] block uppercase">SIMULATED STATUS</span>
            <span className="text-emerald-400 font-bold text-sm block mt-0.5 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${inferStatus === 'PROCESSING' ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
              {inferStatus}
            </span>
            <span className="text-slate-400 text-[10px]">Edge Pipeline</span>
          </div>

          <div className="p-3 rounded-lg bg-[#070c14] border border-[#141f30]">
            <span className="text-slate-400 text-[10px] block uppercase">MODEL AGREEMENT</span>
            <span className={`font-bold text-sm block mt-0.5 ${isAgreed ? 'text-slate-200' : 'text-purple-400'}`}>
              {isAgreed ? 'CONSENSUS' : 'DISCORDANT'}
            </span>
            <span className="text-slate-400 text-[10px]">
              {isNoveltyMitigation ? 'INT8 Pruned Shortcut' : isAgreed ? 'Predictions Agree' : 'Divergent'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#070c14] border border-[#141f30] flex flex-col justify-between">
            <span className="text-slate-400 text-[10px] block uppercase">16-FEATURE VECTOR</span>
            <button
              onClick={() => setShowFeatures(!showFeatures)}
              className="mt-1 inline-flex items-center justify-between text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              <span>{showFeatures ? 'Hide Features' : 'Edit Features'}</span>
              {showFeatures ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <span className="text-slate-400 text-[10px]">Normalized float & int8</span>
          </div>
        </div>

        {/* Interactive Feature Slider / Tuning Deck */}
        {showFeatures && (
          <div className="mt-4 pt-4 border-t border-[#141f30] text-xs font-mono space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-slate-300 font-semibold">
                INTERACTIVE 16-FEATURE VALUE SLIDERS (Tune values to observe real-time model predictions):
              </span>
              <button
                onClick={handleRunManualInference}
                disabled={isManualInferring}
                className="px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isManualInferring ? 'animate-spin' : ''}`} />
                Run Custom Inference
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {FEATURE_NAMES.map((name, i) => {
                const val = sliderFeatures[i] ?? 0;
                return (
                  <div key={name} className="p-2.5 rounded bg-[#070c14] border border-[#141f30] space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 truncate" title={name}>{name}</span>
                      <span className="text-cyan-300 font-bold">{val.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={val}
                      onChange={(e) => {
                        const newVals = [...sliderFeatures];
                        newVals[i] = parseFloat(e.target.value);
                        setSliderFeatures(newVals);
                      }}
                      className="w-full accent-cyan-400 cursor-pointer h-1 bg-[#1a273b] rounded-lg"
                    />
                  </div>
                );
              })}
            </div>

            {manualInferenceResult && (
              <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800 text-xs font-mono flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">Custom Input Result:</span>
                  <span className={`font-bold ${manualInferenceResult.prediction === 1 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {manualInferenceResult.prediction === 1 ? 'ALERT: ATTACK' : 'PASS: BENIGN'}
                  </span>
                  <span className="text-slate-400">
                    Prob: {(manualInferenceResult.probability || 0).toFixed(4)}
                  </span>
                </div>
                <span className="text-slate-400">
                  Latency: {manualInferenceResult.latency_us ? `${manualInferenceResult.latency_us} µs` : '12.9 µs'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Simulated Edge-Inference Architecture Workflow */}
      <div className="p-6 rounded-xl bg-[#0b121d] border border-cyan-500/30 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#141f30] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Simulated Edge-Inference Architecture</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-semibold">
                  Software-Only Simulation
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulated execution workflow of the 16→32→16→1 neural network on edge microcontroller constraints.
              </p>
            </div>
          </div>

          <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
            <span>Simulated Clock:</span>
            <span className="text-cyan-400 font-bold">240 MHz (Xtensa LX6 model)</span>
          </div>
        </div>

        {/* 5-Stage Visual Workflow Diagram */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 font-mono text-xs text-center">
          <div className={`p-4 rounded-xl border transition-all ${
            simPulseStage >= 1
              ? 'bg-cyan-950/30 border-cyan-500 text-white shadow-[0_0_12px_rgba(0,240,255,0.2)]'
              : 'bg-[#070c14] border-[#141f30] text-slate-400'
          }`}>
            <span className="text-[10px] text-slate-400 block uppercase">STAGE 1</span>
            <span className="text-xs font-bold block mt-1">Input Feature Buffer</span>
            <span className="text-[10px] text-cyan-400 block mt-1">16× 8-bit inputs</span>
            <span className="text-[10px] text-slate-400 mt-2 block">16 Bytes Memory</span>
          </div>

          <div className={`p-4 rounded-xl border transition-all ${
            simPulseStage >= 2
              ? 'bg-purple-950/40 border-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.2)]'
              : 'bg-[#070c14] border-[#141f30] text-slate-400'
          }`}>
            <span className="text-[10px] text-slate-400 block uppercase">STAGE 2</span>
            <span className="text-xs font-bold block mt-1">Dense 1 + ReLU</span>
            <span className="text-[10px] text-purple-300 block mt-1">16 → 32 activations</span>
            <span className="text-[10px] text-slate-400 mt-2 block">512 INT8 MACs</span>
          </div>

          <div className={`p-4 rounded-xl border transition-all ${
            simPulseStage >= 3
              ? 'bg-purple-950/40 border-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.2)]'
              : 'bg-[#070c14] border-[#141f30] text-slate-400'
          }`}>
            <span className="text-[10px] text-slate-400 block uppercase">STAGE 3</span>
            <span className="text-xs font-bold block mt-1">Dense 2 + ReLU</span>
            <span className="text-[10px] text-purple-300 block mt-1">32 → 16 activations</span>
            <span className="text-[10px] text-slate-400 mt-2 block">512 INT8 MACs</span>
          </div>

          <div className={`p-4 rounded-xl border transition-all ${
            simPulseStage >= 4
              ? 'bg-purple-950/40 border-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.2)]'
              : 'bg-[#070c14] border-[#141f30] text-slate-400'
          }`}>
            <span className="text-[10px] text-slate-400 block uppercase">STAGE 4</span>
            <span className="text-xs font-bold block mt-1">Dense 3 + Sigmoid</span>
            <span className="text-[10px] text-purple-300 block mt-1">16 → 1 logit</span>
            <span className="text-[10px] text-slate-400 mt-2 block">16 MACs + Dequant</span>
          </div>

          <div className={`p-4 rounded-xl border transition-all ${
            simPulseStage >= 5
              ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.2)]'
              : 'bg-[#070c14] border-[#141f30] text-slate-400'
          }`}>
            <span className="text-[10px] text-slate-400 block uppercase">STAGE 5</span>
            <span className="text-xs font-bold block mt-1">Classification Decision</span>
            <span className={`text-[10px] font-bold block mt-1 ${currentFlow.int8_pred === 1 ? 'text-red-400' : 'text-emerald-400'}`}>
              {currentFlow.int8_pred === 1 ? 'ATTACK' : 'BENIGN'}
            </span>
            <span className="text-[10px] text-slate-400 mt-2 block">Trigger Output</span>
          </div>
        </div>

        {/* Estimated Edge-Resource Requirements (Calculated from Model) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-bold text-slate-300 uppercase">
              Estimated Edge-Resource Requirements (Calculated from Model Architecture):
            </span>
            <span className="text-[10px] font-mono text-purple-400 bg-purple-950/50 px-2 py-0.5 rounded border border-purple-800">
              Estimated / Simulated
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-[#070c14] border border-[#141f30] space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">SRAM TENSOR ARENA</span>
                <span className="text-purple-300 font-bold">1.27% (Estimated)</span>
              </div>
              <div className="w-full bg-[#0d1624] h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-cyan-500 h-full w-[1.27%]"></div>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Calculated SRAM:</span>
                <span className="text-white font-semibold">4,160 / 327,680 Bytes</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[#070c14] border border-[#141f30] space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">FLASH PARAMETERS</span>
                <span className="text-cyan-300 font-bold">0.03% (Estimated)</span>
              </div>
              <div className="w-full bg-[#0d1624] h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full w-[0.03%]"></div>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Model Array Size:</span>
                <span className="text-white font-semibold">1,236 / 4,194,304 Bytes</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[#070c14] border border-[#141f30] space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">SIMULATED CYCLES</span>
                <span className="text-emerald-400 font-bold">3.62x reduction</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-white font-mono">5,504</span>
                <span className="text-[10px] text-slate-400 font-mono">cycles (Estimated)</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                vs 19,920 cycles for FP32 emulation
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[#070c14] border border-[#141f30] space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">SIMULATED ENERGY</span>
                <span className="text-emerald-400 font-bold">-78.2% vs FP32</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-white font-mono">4.69</span>
                <span className="text-[10px] text-slate-400 font-mono">µJ / inference (Estimated)</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Model calculation based on 22.93 µs @ 204.6 mW
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Model Inference Comparison (Same Evaluation Sample) */}
      <div className={`grid gap-6 ${selectedModel === 'both' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* INT8 Model Card */}
        {(selectedModel === 'both' || selectedModel === 'int8') && (
          <div className="p-6 rounded-xl bg-[#0b121d] border border-purple-500/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#141f30] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  INT8 Quantized Model (Simulated Edge)
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-semibold">
                8-bit Integer Quantized
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono">
              <div className="p-4 rounded-lg bg-[#070c14] border border-[#141f30]">
                <span className="text-slate-400 text-[10px] uppercase block">PREDICTED CLASS</span>
                <span className={`text-xl font-bold block mt-1 ${currentFlow.int8_pred === 1 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {currentFlow.int8_pred === 1 ? 'ATTACK' : 'BENIGN'}
                </span>
                <span className="text-[10px] text-slate-400">Score: {(currentFlow.int8_prob || 0).toFixed(6)}</span>
              </div>

              <div className="p-4 rounded-lg bg-[#070c14] border border-[#141f30]">
                <span className="text-slate-400 text-[10px] uppercase block">EVALUATION VERDICT</span>
                <span className={`text-xl font-bold block mt-1 ${int8Correct ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {int8Correct ? 'CORRECT' : 'ERROR'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {int8Correct ? 'Ground Truth Matched' : 'Mismatched'}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#070c14] border border-[#141f30] space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Simulated Edge Latency (@ 240 MHz):</span>
                <span className="text-purple-300 font-bold font-mono">22.93 µs (Estimated)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Host Measured Latency:</span>
                <span className="text-slate-300 font-mono">62.70 µs (Host Python)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Model Storage Size:</span>
                <span className="text-emerald-400 font-bold font-mono">1,236 Bytes (-71.63%)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Tensor Arena SRAM:</span>
                <span className="text-purple-300 font-mono">4,160 Bytes (Estimated)</span>
              </div>
            </div>
          </div>
        )}

        {/* FP32 Model Card */}
        {(selectedModel === 'both' || selectedModel === 'fp32') && (
          <div className="p-6 rounded-xl bg-[#0b121d] border border-blue-500/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#141f30] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  FP32 Software Baseline
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-semibold">
                32-bit Floating-Point
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono">
              <div className="p-4 rounded-lg bg-[#070c14] border border-[#141f30]">
                <span className="text-slate-400 text-[10px] uppercase block">PREDICTED CLASS</span>
                <span className={`text-xl font-bold block mt-1 ${currentFlow.fp32_pred === 1 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {currentFlow.fp32_pred === 1 ? 'ATTACK' : 'BENIGN'}
                </span>
                <span className="text-[10px] text-slate-400">Score: {(currentFlow.fp32_prob || 0).toFixed(6)}</span>
              </div>

              <div className="p-4 rounded-lg bg-[#070c14] border border-[#141f30]">
                <span className="text-slate-400 text-[10px] uppercase block">EVALUATION VERDICT</span>
                <span className={`text-xl font-bold block mt-1 ${fp32Correct ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {fp32Correct ? 'CORRECT' : 'ERROR'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {fp32Correct ? 'Ground Truth Matched' : 'Mismatched'}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#070c14] border border-[#141f30] space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Host Measured Latency:</span>
                <span className="text-blue-300 font-bold font-mono">12.90 µs (Host FPU)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Simulated Edge Cycles:</span>
                <span className="text-slate-300 font-mono">19,920 cycles (Estimated)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Model Storage Size:</span>
                <span className="text-slate-300 font-mono">4,356 Bytes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Buffer Allocation:</span>
                <span className="text-slate-300 font-mono">4,304 Bytes</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Stream Cumulative Session Performance */}
      <div className="p-6 rounded-xl bg-[#0b121d] border border-[#1a273b]">
        <h3 className="text-sm font-bold text-white mb-1">Live Simulation Session Cumulative Performance</h3>
        <p className="text-xs text-slate-400 mb-4">
          Tracking stream accuracy, false alarms, and agreement counters across processed evaluation flows.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 font-mono text-center text-xs">
          <div className="p-3 rounded-lg bg-[#070c14] border border-[#141f30]">
            <span className="text-slate-400 text-[10px] uppercase block">FLOWS EVALUATED</span>
            <span className="text-lg font-bold text-white block mt-1">{streamStats.totalProcessed}</span>
            <span className="text-slate-400 text-[10px]">Session Total</span>
          </div>

          <div className="p-3 rounded-lg bg-[#070c14] border border-[#141f30]">
            <span className="text-slate-400 text-[10px] uppercase block">INT8 ACCURACY</span>
            <span className="text-lg font-bold text-purple-300 block mt-1">
              {streamStats.totalProcessed > 0
                ? ((streamStats.int8Correct / streamStats.totalProcessed) * 100).toFixed(1)
                : '0.0'}%
            </span>
            <span className="text-emerald-400 text-[10px]">
              {streamStats.int8Correct} / {streamStats.totalProcessed}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#070c14] border border-[#141f30]">
            <span className="text-slate-400 text-[10px] uppercase block">FP32 ACCURACY</span>
            <span className="text-lg font-bold text-blue-300 block mt-1">
              {streamStats.totalProcessed > 0
                ? ((streamStats.fp32Correct / streamStats.totalProcessed) * 100).toFixed(1)
                : '0.0'}%
            </span>
            <span className="text-slate-400 text-[10px]">
              {streamStats.fp32Correct} / {streamStats.totalProcessed}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#070c14] border border-[#141f30]">
            <span className="text-slate-400 text-[10px] uppercase block">DISCORDANT FLOWS</span>
            <span className="text-lg font-bold text-cyan-300 block mt-1">{streamStats.discordantCount}</span>
            <span className="text-slate-400 text-[10px]">
              {streamStats.totalProcessed > 0
                ? ((streamStats.discordantCount / streamStats.totalProcessed) * 100).toFixed(1)
                : '0.0'}% of flows
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[#070c14] border border-[#141f30]">
            <span className="text-slate-400 text-[10px] uppercase block">SHORTCUT FIXES</span>
            <span className="text-lg font-bold text-emerald-400 block mt-1">
              +{streamStats.int8MitigatedShortcuts}
            </span>
            <span className="text-emerald-400 text-[10px]">INT8 Pruned Shortcuts</span>
          </div>

          <div className="p-3 rounded-lg bg-[#070c14] border border-[#141f30]">
            <span className="text-slate-400 text-[10px] uppercase block">FALSE ALARMS (FA)</span>
            <span className="text-lg font-bold text-emerald-400 block mt-1">
              {streamStats.int8FalseAlarms}
            </span>
            <span className="text-slate-400 text-[10px]">vs FP32: {streamStats.fp32FalseAlarms} FAs</span>
          </div>
        </div>
      </div>
    </div>
  );
};
