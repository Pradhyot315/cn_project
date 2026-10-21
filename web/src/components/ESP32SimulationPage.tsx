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
  ServerOff,
  ChevronDown,
  ChevronUp,
  Sliders,
  Check,
  Clock
} from 'lucide-react';
import { NavTabId } from './Sidebar';

interface ESP32SimulationPageProps {
  backendOnline: boolean;
  onNavigate?: (tab: NavTabId) => void;
}

export const ESP32SimulationPage: React.FC<ESP32SimulationPageProps> = ({
  backendOnline,
  onNavigate
}) => {
  const [samples, setSamples] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeedMs, setPlaySpeedMs] = useState<number>(600);
  const [showFeatures, setShowFeatures] = useState<boolean>(false);
  const [inferStatus, setInferStatus] = useState<'IDLE' | 'PROCESSING' | 'COMPLETED'>('COMPLETED');
  const [simPulseStage, setSimPulseStage] = useState<number>(0);

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

  // Canonical feature names
  const FEATURE_NAMES = [
    'dst_port', 'flow_duration_us', 'total_fwd_packets', 'total_bwd_packets',
    'total_fwd_bytes', 'total_bwd_bytes', 'fwd_pkt_len_max', 'fwd_pkt_len_min',
    'fwd_pkt_len_mean', 'fwd_pkt_len_std', 'bwd_pkt_len_max', 'bwd_pkt_len_min',
    'bwd_pkt_len_mean', 'bwd_pkt_len_std', 'flow_byts_s', 'flow_pkts_s'
  ];

  // Pre-load stream samples
  useEffect(() => {
    fetch('/data/stream_samples.json')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setSamples(data);
          // initialize stats with first flow
          updateStatsWithSample(data[0]);
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

    setTimeout(() => setSimPulseStage(2), 70);
    setTimeout(() => setSimPulseStage(3), 140);
    setTimeout(() => setSimPulseStage(4), 210);
    setTimeout(() => {
      setSimPulseStage(5);
      setInferStatus('COMPLETED');
      updateStatsWithSample(samples[boundedIdx]);
    }, 280);
  };

  // Continuous stream playback
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
    telemetry: {
      esp32_projected_cycles: 5504,
      esp32_projected_latency_us: 22.93,
      esp32_projected_power_mw: 204.6,
      esp32_projected_energy_uj: 4.69,
      uart_transit_time_us: 260.42
    },
    host_measured_fp32_us: 12.9,
    host_measured_int8_us: 62.7
  };

  const isTrueAttack = currentFlow.true_label === 1;
  const fp32Correct = currentFlow.fp32_pred === currentFlow.true_label;
  const int8Correct = currentFlow.int8_pred === currentFlow.true_label;
  const isAgreed = currentFlow.fp32_pred === currentFlow.int8_pred;
  const isNoveltyMitigation = !fp32Correct && int8Correct;

  // Preset quick jumps
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

  const resetStats = () => {
    setStreamStats({
      totalProcessed: 1,
      fp32Correct: fp32Correct ? 1 : 0,
      int8Correct: int8Correct ? 1 : 0,
      agreedCount: isAgreed ? 1 : 0,
      discordantCount: isAgreed ? 0 : 1,
      int8MitigatedShortcuts: isNoveltyMitigation ? 1 : 0,
      totalAttacks: isTrueAttack ? 1 : 0,
      totalBenign: isTrueAttack ? 0 : 1,
      fp32FalseAlarms: !isTrueAttack && currentFlow.fp32_pred === 1 ? 1 : 0,
      int8FalseAlarms: !isTrueAttack && currentFlow.int8_pred === 1 ? 1 : 0
    });
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#141f30] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800 font-semibold uppercase">
              Online ESP32 Simulation
            </span>
            <span className="text-xs text-purple-400 font-mono font-semibold">
              Xtensa LX6 Microcontroller Pipeline
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            ESP32 Online Inference Simulation
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Interactive edge inference simulating the actual trained MLP and INT8 quantized pipeline on zero-shot network flows without physical hardware.
          </p>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
          <span className="px-3 py-1.5 rounded-lg bg-purple-950/70 text-purple-300 border border-purple-800 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            SIMULATED Xtensa LX6 @ 240MHz
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-emerald-950/70 text-emerald-300 border border-emerald-800 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            Simulation Online
          </span>
        </div>
      </div>

      {/* Novelty Callout Banner if current sample shows shortcut mitigation */}
      {isNoveltyMitigation && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/80 via-[#0a2022] to-[#07111e] border border-emerald-500/50 shadow-lg flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wide">
                Key Novelty Demonstration (Sample #{currentFlow.flow_id})
              </div>
              <div className="text-sm font-semibold text-white">
                INT8 Quantization Corrected FP32 Shortcut Error on this Flow!
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                The full-precision FP32 model collapsed due to domain shift artifacts. The INT8 quantized model successfully pruned the fragile shortcut and made the correct classification.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-500 text-black font-bold shrink-0 hidden sm:inline">
            INT8 SUCCESS
          </span>
        </div>
      )}

      {/* Control Deck: Stream playback & Presets */}
      <div className="p-5 rounded-xl bg-[#0b121d] border border-[#1a273b] shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#141f30] pb-4 mb-5">
          {/* Playback Controls */}
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
              {isPlaying ? 'Pause Stream' : 'Play Stream'}
            </button>

            <button
              onClick={() => triggerStep(currentIndex + 1)}
              disabled={isPlaying}
              className="px-3.5 py-2 rounded-lg bg-[#0d1624] hover:bg-[#132034] text-slate-200 text-xs font-mono border border-[#1a273b] flex items-center gap-1.5 disabled:opacity-50"
            >
              <SkipForward className="w-3.5 h-3.5" />
              Next Flow
            </button>

            <button
              onClick={resetStats}
              className="px-3 py-2 rounded-lg bg-[#070c14] hover:bg-[#0f172a] text-slate-400 hover:text-white text-xs font-mono border border-[#141f30] flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Counters
            </button>

            {/* Play Speed Selector */}
            <div className="flex items-center gap-1 bg-[#070c14] border border-[#141f30] rounded-lg p-1 text-xs font-mono ml-1">
              <span className="text-slate-400 px-1.5 text-[10px]">SPEED:</span>
              {[
                { label: '1x', ms: 1000 },
                { label: '2x', ms: 500 },
                { label: '5x', ms: 200 }
              ].map((s) => (
                <button
                  key={s.label}
                  onClick={() => setPlaySpeedMs(s.ms)}
                  className={`px-2 py-0.5 rounded ${
                    playSpeedMs === s.ms
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Flow Presets */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="text-slate-400 text-[11px]">JUMP PRESET:</span>
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
            <span className="text-slate-400 text-[10px] block uppercase">ATTACK CATEGORY</span>
            <span className="text-cyan-300 font-bold text-sm block mt-0.5 truncate">
              {currentFlow.attack_cat || (isTrueAttack ? 'DoS' : 'Normal')}
            </span>
            <span className="text-slate-400 text-[10px]">Target: UNSW-NB15</span>
          </div>

          <div className="p-3 rounded-lg bg-[#070c14] border border-[#141f30]">
            <span className="text-slate-400 text-[10px] block uppercase">INFERENCE STATUS</span>
            <span className="text-emerald-400 font-bold text-sm block mt-0.5 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${inferStatus === 'PROCESSING' ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
              {inferStatus}
            </span>
            <span className="text-slate-400 text-[10px]">XTENSA LX6</span>
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
            <span className="text-slate-400 text-[10px] block uppercase">FEATURE VECTOR</span>
            <button
              onClick={() => setShowFeatures(!showFeatures)}
              className="mt-1 inline-flex items-center justify-between text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              <span>{showFeatures ? 'Hide 16 Features' : 'View 16 Features'}</span>
              {showFeatures ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <span className="text-slate-400 text-[10px]">FP32 + INT8 mapped</span>
          </div>
        </div>

        {/* Expandable 16-Feature Inspector */}
        {showFeatures && (
          <div className="mt-4 pt-4 border-t border-[#141f30] text-xs font-mono">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 font-semibold">16-DIMENSIONAL FLOW FEATURE VALUES (FP32 Normalized vs INT8 Quantized):</span>
              <span className="text-[10px] text-slate-400">Scaling: q = round(x / 0.00392) - 128</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {FEATURE_NAMES.map((name, i) => {
                const normVal = currentFlow.features_norm?.[i] ?? 0;
                const int8Val = currentFlow.features_int8?.[i] ?? 0;
                return (
                  <div key={name} className="p-2 rounded bg-[#070c14] border border-[#141f30] text-center">
                    <span className="text-[9px] text-slate-400 block truncate" title={name}>
                      {name}
                    </span>
                    <span className="text-xs text-cyan-300 font-bold block mt-0.5">
                      {normVal.toFixed(3)}
                    </span>
                    <span className="text-[10px] text-purple-400 font-mono">
                      int8: {int8Val}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Simulated Hardware Dashboard & Workflow Pipeline */}
      <div className="p-6 rounded-xl bg-[#0b121d] border border-cyan-500/30 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#141f30] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Simulated ESP32 Inference Workflow</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-semibold">
                  Simulated Hardware Pipeline
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulated execution flow of TensorFlow Lite for Microcontrollers on Xtensa LX6 dual-core.
              </p>
            </div>
          </div>

          <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
            <span>Clock Frequency:</span>
            <span className="text-cyan-400 font-bold">240 MHz</span>
          </div>
        </div>

        {/* Visual Pipeline Flowchart */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 font-mono text-xs text-center">
          {/* Stage 1: Input Buffer */}
          <div className={`p-4 rounded-xl border transition-all ${
            simPulseStage >= 1
              ? 'bg-cyan-950/30 border-cyan-500 text-white shadow-[0_0_12px_rgba(0,240,255,0.2)]'
              : 'bg-[#070c14] border-[#141f30] text-slate-400'
          }`}>
            <span className="text-[10px] text-slate-400 block uppercase">STAGE 1</span>
            <span className="text-xs font-bold block mt-1">UART RX Buffer</span>
            <span className="text-[10px] text-cyan-400 block mt-1">16× 8-bit inputs</span>
            <span className="text-[10px] text-slate-400 mt-2 block">16 Bytes Payload</span>
          </div>

          {/* Stage 2: Dense 1 */}
          <div className={`p-4 rounded-xl border transition-all ${
            simPulseStage >= 2
              ? 'bg-purple-950/40 border-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.2)]'
              : 'bg-[#070c14] border-[#141f30] text-slate-400'
          }`}>
            <span className="text-[10px] text-slate-400 block uppercase">STAGE 2</span>
            <span className="text-xs font-bold block mt-1">Dense 1 + ReLU</span>
            <span className="text-[10px] text-purple-300 block mt-1">16 → 32 neurons</span>
            <span className="text-[10px] text-slate-400 mt-2 block">512 INT8 MACs</span>
          </div>

          {/* Stage 3: Dense 2 */}
          <div className={`p-4 rounded-xl border transition-all ${
            simPulseStage >= 3
              ? 'bg-purple-950/40 border-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.2)]'
              : 'bg-[#070c14] border-[#141f30] text-slate-400'
          }`}>
            <span className="text-[10px] text-slate-400 block uppercase">STAGE 3</span>
            <span className="text-xs font-bold block mt-1">Dense 2 + ReLU</span>
            <span className="text-[10px] text-purple-300 block mt-1">32 → 16 neurons</span>
            <span className="text-[10px] text-slate-400 mt-2 block">512 INT8 MACs</span>
          </div>

          {/* Stage 4: Dense 3 */}
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

          {/* Stage 5: Output */}
          <div className={`p-4 rounded-xl border transition-all ${
            simPulseStage >= 5
              ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.2)]'
              : 'bg-[#070c14] border-[#141f30] text-slate-400'
          }`}>
            <span className="text-[10px] text-slate-400 block uppercase">STAGE 5</span>
            <span className="text-xs font-bold block mt-1">Decision Output</span>
            <span className={`text-[10px] font-bold block mt-1 ${currentFlow.int8_pred === 1 ? 'text-red-400' : 'text-emerald-400'}`}>
              {currentFlow.int8_pred === 1 ? 'ALERT: ATTACK' : 'PASS: BENIGN'}
            </span>
            <span className="text-[10px] text-slate-400 mt-2 block">1-bit Trigger Pin</span>
          </div>
        </div>

        {/* Simulated Hardware Resource Estimates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* SRAM Usage */}
          <div className="p-4 rounded-lg bg-[#070c14] border border-[#141f30] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">SRAM TENSOR ARENA</span>
              <span className="text-purple-300 font-bold">1.27%</span>
            </div>
            <div className="w-full bg-[#0d1624] h-2 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-cyan-500 h-full w-[1.27%]"></div>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Simulated Allocated:</span>
              <span className="text-white font-semibold">4,160 / 327,680 Bytes</span>
            </div>
          </div>

          {/* Flash Usage */}
          <div className="p-4 rounded-lg bg-[#070c14] border border-[#141f30] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">FLASH PARAMETERS</span>
              <span className="text-cyan-300 font-bold">0.03%</span>
            </div>
            <div className="w-full bg-[#0d1624] h-2 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full w-[0.03%]"></div>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Simulated Footprint:</span>
              <span className="text-white font-semibold">1,236 / 4,194,304 Bytes</span>
            </div>
          </div>

          {/* Cycle Count */}
          <div className="p-4 rounded-lg bg-[#070c14] border border-[#141f30] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">SIMULATED CYCLES</span>
              <span className="text-emerald-400 font-bold">-72.4% vs FP32</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-white font-mono">5,504</span>
              <span className="text-[10px] text-slate-400 font-mono">cycles / inference</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              3.62x cycle reduction vs 19,920 cycles (FP32)
            </div>
          </div>

          {/* Energy Estimate */}
          <div className="p-4 rounded-lg bg-[#070c14] border border-[#141f30] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">SIMULATED ENERGY</span>
              <span className="text-emerald-400 font-bold">-78.2% vs FP32</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-white font-mono">4.69</span>
              <span className="text-[10px] text-slate-400 font-mono">µJ / inference</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Theoretical active power: 204.6 mW @ 3.3V
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Inference Comparison for Current Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* INT8 Quantized (Simulated ESP32 Execution) */}
        <div className="p-6 rounded-xl bg-[#0b121d] border border-purple-500/40 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#141f30] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                INT8 Quantized (Simulated ESP32 Xtensa LX6)
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-semibold">
              Simulated Execution
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono">
            <div className="p-4 rounded-lg bg-[#070c14] border border-[#141f30]">
              <span className="text-slate-400 text-[10px] uppercase block">PREDICTED CLASS</span>
              <span className={`text-xl font-bold block mt-1 ${currentFlow.int8_pred === 1 ? 'text-red-400' : 'text-emerald-400'}`}>
                {currentFlow.int8_pred === 1 ? 'ATTACK' : 'BENIGN'}
              </span>
              <span className="text-[10px] text-slate-400">Probability: {(currentFlow.int8_prob || 0).toFixed(6)}</span>
            </div>

            <div className="p-4 rounded-lg bg-[#070c14] border border-[#141f30]">
              <span className="text-slate-400 text-[10px] uppercase block">PREDICTION VERDICT</span>
              <span className={`text-xl font-bold block mt-1 ${int8Correct ? 'text-emerald-400' : 'text-amber-400'}`}>
                {int8Correct ? 'CORRECT' : 'ERROR'}
              </span>
              <span className="text-[10px] text-slate-400">
                {int8Correct ? 'Matched Ground Truth' : 'Mismatched'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#070c14] border border-[#141f30] space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Simulated Microcontroller Latency:</span>
              <span className="text-purple-300 font-bold font-mono">22.93 µs (@ 240 MHz)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Simulated Cycle Count:</span>
              <span className="text-purple-300 font-semibold">5,504 cycles</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Tensor Arena Allocation:</span>
              <span className="text-purple-300 font-semibold">4,160 Bytes (SRAM)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Model Flash Footprint:</span>
              <span className="text-emerald-400 font-semibold">1,236 Bytes (-71.63%)</span>
            </div>
          </div>
        </div>

        {/* FP32 Software Model (Host Software Baseline) */}
        <div className="p-6 rounded-xl bg-[#0b121d] border border-blue-500/40 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#141f30] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                FP32 Baseline (Host Software Baseline)
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-semibold">
              Software FPU
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono">
            <div className="p-4 rounded-lg bg-[#070c14] border border-[#141f30]">
              <span className="text-slate-400 text-[10px] uppercase block">PREDICTED CLASS</span>
              <span className={`text-xl font-bold block mt-1 ${currentFlow.fp32_pred === 1 ? 'text-red-400' : 'text-emerald-400'}`}>
                {currentFlow.fp32_pred === 1 ? 'ATTACK' : 'BENIGN'}
              </span>
              <span className="text-[10px] text-slate-400">Probability: {(currentFlow.fp32_prob || 0).toFixed(6)}</span>
            </div>

            <div className="p-4 rounded-lg bg-[#070c14] border border-[#141f30]">
              <span className="text-slate-400 text-[10px] uppercase block">PREDICTION VERDICT</span>
              <span className={`text-xl font-bold block mt-1 ${fp32Correct ? 'text-emerald-400' : 'text-amber-400'}`}>
                {fp32Correct ? 'CORRECT' : 'ERROR'}
              </span>
              <span className="text-[10px] text-slate-400">
                {fp32Correct ? 'Matched Ground Truth' : 'Mismatched'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#070c14] border border-[#141f30] space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Host Software Latency:</span>
              <span className="text-blue-300 font-bold font-mono">12.90 µs (Host CPU)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Projected Microcontroller Cycles:</span>
              <span className="text-slate-300 font-semibold">19,920 cycles</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Buffer Allocation:</span>
              <span className="text-slate-300 font-semibold">4,304 Bytes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Model Storage Footprint:</span>
              <span className="text-slate-300 font-semibold">4,356 Bytes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Stream Cumulative Session Counters */}
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
            <span className="text-slate-400 text-[10px] uppercase block">INT8 SHORTCUT FIXES</span>
            <span className="text-lg font-bold text-emerald-400 block mt-1">
              +{streamStats.int8MitigatedShortcuts}
            </span>
            <span className="text-emerald-400 text-[10px]">Pruned Shortcuts</span>
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

      {/* Separate Physical Hardware Status Panel (Future Connection) */}
      <div className="p-5 rounded-xl bg-[#080d16] border border-amber-500/30 space-y-3 font-mono text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#141f30] pb-3">
          <div className="flex items-center gap-2.5">
            <ServerOff className="w-4 h-4 text-amber-400 shrink-0" />
            <h3 className="font-bold text-white uppercase tracking-wider">
              Physical Hardware Status (Future Direct Interface)
            </h3>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
            Hardware Not Connected / Unavailable
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded bg-[#05080e] border border-[#141f30]">
            <span className="text-slate-400 text-[10px] block uppercase">Physical ESP32 Board</span>
            <span className="text-amber-400 font-semibold block mt-1">Disconnected</span>
            <span className="text-slate-400 text-[10px]">Online simulation active</span>
          </div>
          <div className="p-3 rounded bg-[#05080e] border border-[#141f30]">
            <span className="text-slate-400 text-[10px] block uppercase">Physical INA219 Power Shunt</span>
            <span className="text-slate-300 font-semibold block mt-1">Not measured</span>
            <span className="text-slate-400 text-[10px]">Probe not attached</span>
          </div>
          <div className="p-3 rounded bg-[#05080e] border border-[#141f30]">
            <span className="text-slate-400 text-[10px] block uppercase">Physical Executions</span>
            <span className="text-slate-300 font-semibold block mt-1">0 executions</span>
            <span className="text-slate-400 text-[10px]">Zero fabricated readings</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 font-sans pt-1">
          When an ESP32 board is connected via USB-UART and flashed with <code className="text-cyan-300">model_data.h</code>, real-time physical current, voltage, and hardware execution cycles will be displayed here separately from the online simulation.
        </p>
      </div>
    </div>
  );
};
