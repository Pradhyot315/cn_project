import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Activity, Terminal, Cpu, CheckCircle2, AlertTriangle, Filter, Search, Zap, Radio } from 'lucide-react';

interface Layer3SectionProps {
  backendOnline: boolean;
}

export const Layer3Section: React.FC<Layer3SectionProps> = ({ backendOnline }) => {
  // Simulator State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(5);
  const [selectedPrecision, setSelectedPrecision] = useState<'int8' | 'fp32'>('int8');
  const [streamMode, setStreamMode] = useState<'batch' | 'infinite'>('batch');
  const [filterType, setFilterType] = useState<string>('all');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Logs and Samples
  const [logs, setLogs] = useState<any[]>([]);
  const [currentFlow, setCurrentFlow] = useState<any | null>(null);
  const [selectedFlowModal, setSelectedFlowModal] = useState<any | null>(null);
  const [localSamples, setLocalSamples] = useState<any[]>([]);

  // Statistics State
  const [stats, setStats] = useState({
    total: 0,
    correct: 0,
    attacksDetected: 0,
    falseAlarms: 0,
    totalBenign: 0,
    totalAttacks: 0,
    bitExactCount: 0,
    serverWorkerAgreement: 0,
  });

  // Oscilloscope Waveform points (array of 60 points)
  const [waveform, setWaveform] = useState<number[]>(
    Array.from({ length: 60 }, () => 148.5 + (Math.random() * 2 - 1))
  );

  // Hardware LED state & Packet Animation
  const [ledFlash, setLedFlash] = useState<boolean>(false);
  const [packetTick, setPacketTick] = useState<number>(0);

  // References
  const wsRef = useRef<WebSocket | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const localIndexRef = useRef<number>(0);
  const localTimerRef = useRef<any>(null);
  const samplesRef = useRef<any[]>([]);

  // 1. Preload 3,000 stream samples for instantaneous local fallback streaming
  useEffect(() => {
    fetch('/data/stream_samples.json')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setLocalSamples(data);
          samplesRef.current = data;
        }
      })
      .catch((err) => {
        console.warn('Fallback stream sample load failed:', err);
      });
  }, []);

  // 2. Initialize Web Worker for client-side integer-only INT8 inference
  useEffect(() => {
    try {
      workerRef.current = new Worker(new URL('../workers/int8Worker.ts', import.meta.url), { type: 'module' });

      fetch('/data/model_int8.json')
        .then((res) => res.json())
        .then((mInt8) => {
          if (workerRef.current) {
            workerRef.current.postMessage({ type: 'INIT_MODEL', payload: mInt8 });
          }
        })
        .catch(() => null);

      workerRef.current.onmessage = (e) => {
        if (e.data.type === 'INFERENCE_RESULT') {
          const { is_match } = e.data.payload;
          if (is_match) {
            setStats((prev) => ({
              ...prev,
              bitExactCount: prev.bitExactCount + 1,
              serverWorkerAgreement: prev.serverWorkerAgreement + 1,
            }));
          }
        }
      };
    } catch (e) {
      console.warn('Worker initialization failed:', e);
    }

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // 3. WebSocket Connection (with transparent fallback)
  useEffect(() => {
    if (!backendOnline) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/stream/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ action: 'speed', value: speedMultiplier }));
        if (!isPlaying) {
          ws.send(JSON.stringify({ action: 'pause' }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleStreamFlow(data);
        } catch (err) {
          console.error('Error parsing stream message:', err);
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
      };

      return () => {
        ws.close();
      };
    } catch (err) {
      console.warn('WebSocket setup error, using local streamer:', err);
    }
  }, [backendOnline]);

  // 4. Reliable Local Timer Streamer: guarantees smooth playback whenever isPlaying is true
  useEffect(() => {
    if (!isPlaying) {
      if (localTimerRef.current) clearInterval(localTimerRef.current);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: 'pause' }));
      }
      return;
    }

    // Tell WebSocket to resume if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'resume' }));
      wsRef.current.send(JSON.stringify({ action: 'speed', value: speedMultiplier }));
    }

    // Local Interval Streamer (fires every 150ms / speedMultiplier)
    const intervalMs = Math.max(30, Math.round(200 / speedMultiplier));
    localTimerRef.current = setInterval(() => {
      // If WebSocket is actively connected, let WebSocket drive it; otherwise local timer drives it
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        setPacketTick((t) => (t + 1) % 100);
        return;
      }

      const availableSamples = samplesRef.current;
      if (availableSamples.length === 0) return;

      if (streamMode === 'batch' && localIndexRef.current >= availableSamples.length) {
        setIsPlaying(false);
        setIsCompleted(true);
        return;
      }

      const sample = availableSamples[localIndexRef.current % availableSamples.length];
      localIndexRef.current++;

      handleStreamFlow({
        flow_id: sample.flow_id,
        true_label: sample.true_label,
        attack_cat: sample.attack_cat,
        features_norm: sample.features_norm,
        features_int8: sample.features_int8,
        server_fp32_prob: sample.fp32_prob,
        server_fp32_pred: sample.fp32_pred,
        server_fp32_latency_us: sample.host_measured_fp32_us || 3.8,
        server_int8_prob: sample.int8_prob,
        server_int8_pred: sample.int8_pred,
        server_int8_latency_us: sample.host_measured_int8_us || 3.6,
        agreement: sample.fp32_pred === sample.int8_pred,
        telemetry: sample.telemetry,
      });

      setPacketTick((t) => (t + 1) % 100);
    }, intervalMs);

    return () => {
      if (localTimerRef.current) clearInterval(localTimerRef.current);
    };
  }, [isPlaying, speedMultiplier]);

  // 5. Ingestion of each streaming flow
  const handleStreamFlow = (flow: any) => {
    setCurrentFlow(flow);

    // Flash virtual LED
    setLedFlash(true);
    setTimeout(() => setLedFlash(false), 90);

    const isInt8 = selectedPrecision === 'int8';
    const pred = isInt8 ? flow.server_int8_pred : flow.server_fp32_pred;
    const isCorrect = pred === flow.true_label;
    const isAttack = flow.true_label === 1;

    // Send to browser worker for bit-exact check
    if (workerRef.current && flow.features_int8) {
      workerRef.current.postMessage({
        type: 'INFER_SAMPLE',
        payload: {
          flow_id: flow.flow_id,
          features_int8: flow.features_int8,
          expected_pred: flow.server_int8_pred,
        },
      });
    }

    // Cumulative Statistics
    setStats((prev) => ({
      ...prev,
      total: prev.total + 1,
      correct: prev.correct + (isCorrect ? 1 : 0),
      totalAttacks: prev.totalAttacks + (isAttack ? 1 : 0),
      totalBenign: prev.totalBenign + (isAttack ? 0 : 1),
      attacksDetected: prev.attacksDetected + (isAttack && pred === 1 ? 1 : 0),
      falseAlarms: prev.falseAlarms + (!isAttack && pred === 1 ? 1 : 0),
    }));

    // Update Oscilloscope Waveform (pulse)
    const activePower = flow.telemetry?.esp32_projected_power_mw || (isInt8 ? 204.6 : 259.0);
    const noise = (Math.random() * 2.5 - 1.25);
    setWaveform((prev) => [
      ...prev.slice(3),
      148.5 + noise,
      activePower + noise,
      170.0 + noise,
    ]);

    // Append to serial monitor logs
    const logItem = {
      id: `${flow.flow_id}-${Date.now()}-${Math.random()}`,
      flow_id: flow.flow_id,
      precision: isInt8 ? 'INT8' : 'FP32',
      predLabel: pred === 1 ? 'ATTACK' : 'BENIGN',
      trueLabel: flow.true_label === 1 ? 'ATTACK' : 'BENIGN',
      attack_cat: flow.attack_cat,
      latency_us: isInt8 ? flow.server_int8_latency_us : flow.server_fp32_latency_us,
      power_mw: flow.telemetry?.esp32_projected_power_mw || 204.6,
      energy_uj: flow.telemetry?.esp32_projected_energy_uj || 4.69,
      isCorrect,
      raw: flow,
    };

    setLogs((prev) => {
      const updated = [...prev.slice(-80), logItem];
      return updated;
    });

    // Auto-scroll serial terminal
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const resetSimulator = () => {
    setIsPlaying(false);
    setIsCompleted(false);
    setLogs([]);
    setCurrentFlow(null);
    localIndexRef.current = 0;
    setStats({
      total: 0,
      correct: 0,
      attacksDetected: 0,
      falseAlarms: 0,
      totalBenign: 0,
      totalAttacks: 0,
      bitExactCount: 0,
      serverWorkerAgreement: 0,
    });
    setWaveform(Array.from({ length: 60 }, () => 148.5 + (Math.random() * 2 - 1)));
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'reset' }));
    }
  };

  const runningAcc = stats.total > 0 ? ((stats.correct / stats.total) * 100).toFixed(1) : '0.0';
  const runningTPR = stats.totalAttacks > 0 ? ((stats.attacksDetected / stats.totalAttacks) * 100).toFixed(1) : '0.0';
  const runningFPR = stats.totalBenign > 0 ? ((stats.falseAlarms / stats.totalBenign) * 100).toFixed(1) : '0.0';

  // SVG Path generator for oscilloscope waveform
  const generateSvgPath = () => {
    const width = 500;
    const height = 180;
    const minMw = 120;
    const maxMw = 270;

    const points = waveform.map((val, idx) => {
      const x = (idx / (waveform.length - 1)) * width;
      const normalizedY = (val - minMw) / (maxMw - minMw);
      const y = height - normalizedY * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return `M ${points.join(' L ')}`;
  };

  return (
    <section className="py-16 border-b border-[#141f30] bg-[#070b12]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs mb-3">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>REAL-TIME HARDWARE-IN-THE-LOOP SIMULATION BENCH</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
            Virtual ESP32 Bench & Telemetry Oscilloscope
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-400">
            Streams real network flows across a virtual UART link to a software-simulated ESP32 with oscilloscope power monitor.
          </p>
        </div>

        {/* Visual Bench Graphic */}
        <div className="p-6 rounded-xl bg-[#0b121d] border border-[#1a273b] mb-8 shadow-[0_0_25px_rgba(0,0,0,0.5)]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            {/* Component 1: Host PC */}
            <div className="p-4 rounded-lg bg-[#111a28] border border-[#1a273b] text-center">
              <div className="text-xs font-mono text-slate-400">HOST PC</div>
              <div className="text-sm font-bold text-white mt-1">Telemetry Streamer</div>
              <div className="mt-2 text-[10px] font-mono text-cyan-400 flex items-center justify-center gap-1">
                <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-cyan-400 animate-ping' : 'bg-slate-600'}`}></span>
                {isPlaying ? 'Streaming Active' : 'Standby'}
              </div>
            </div>

            {/* Component 2: UART Link (Animated with Moving Packets) */}
            <div className="p-4 rounded-lg bg-[#111a28] border border-amber-500/30 text-center relative overflow-hidden">
              <div className="text-xs font-mono text-amber-400 font-semibold">VIRTUAL UART LINK</div>
              <div className="text-xs text-white mt-1">921,600 baud (8N1)</div>

              {/* Animated UART Bus Track with Moving Signal Packets */}
              <div className="mt-2.5 h-2 bg-slate-900 border border-amber-500/20 rounded-full relative overflow-hidden flex items-center">
                {isPlaying ? (
                  <>
                    <div
                      className="absolute w-3 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff] transition-all duration-75"
                      style={{ left: `${(packetTick * 25) % 100}%` }}
                    ></div>
                    <div
                      className="absolute w-3 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#ffaa00] transition-all duration-75"
                      style={{ left: `${((packetTick * 25) + 50) % 100}%` }}
                    ></div>
                  </>
                ) : (
                  <div className="w-full text-[8px] font-mono text-slate-600 text-center">Link Idle</div>
                )}
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-1">24B Payload Frame (~260µs)</div>
            </div>

            {/* Component 3: ESP32 Chip Graphic */}
            <div className="p-4 rounded-lg bg-[#111a28] border border-purple-500/40 text-center relative">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div
                  className={`w-3.5 h-3.5 rounded-full border transition-all duration-75 ${
                    ledFlash
                      ? 'bg-cyan-400 border-cyan-200 shadow-[0_0_16px_#00f0ff] scale-125'
                      : 'bg-slate-700 border-slate-600'
                  }`}
                ></div>
                <span className="text-xs font-mono text-purple-300 font-bold">ESP32 Xtensa LX6</span>
              </div>
              <div className="text-xs text-white">240 MHz Dual-Core</div>
              <div className="mt-2 text-[10px] font-mono text-purple-400">
                Mode: <span className="font-bold uppercase text-white">{selectedPrecision}</span>
              </div>
            </div>

            {/* Component 4: INA219 Sensor Graphic */}
            <div className="p-4 rounded-lg bg-[#111a28] border border-emerald-500/40 text-center">
              <div className="text-xs font-mono text-emerald-400 font-semibold">VIRTUAL INA219</div>
              <div className="text-base font-bold text-white mt-1 font-mono">
                {currentFlow ? `${currentFlow.telemetry?.esp32_projected_power_mw || 204.6} mW` : '148.5 mW'}
              </div>
              <div className="mt-2 text-[10px] font-mono text-slate-400">Supply: 3.3V | I_idle: 45mA</div>
            </div>
          </div>
        </div>

        {/* Bench Controls */}
        <div className="p-4 rounded-xl bg-[#0b121d] border border-[#1a273b] mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-5 py-2.5 rounded-lg font-mono text-xs font-bold flex items-center gap-2 transition-all ${
                isPlaying
                  ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-[0_0_15px_rgba(255,170,0,0.4)]'
                  : 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.4)] animate-pulse'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              {isPlaying ? 'PAUSE STREAM' : 'START INFERENCE'}
            </button>

            <button
              onClick={resetSimulator}
              className="p-2.5 rounded-lg bg-[#111a28] hover:bg-[#182538] border border-[#1a273b] text-slate-300 text-xs transition-colors"
              title="Reset Counters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Precision Toggle */}
            <div className="flex items-center bg-[#111a28] rounded-lg p-1 border border-[#1a273b] text-xs font-mono">
              <button
                onClick={() => setSelectedPrecision('int8')}
                className={`px-3 py-1 rounded transition-colors ${
                  selectedPrecision === 'int8' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                INT8 (Simulated)
              </button>
              <button
                onClick={() => setSelectedPrecision('fp32')}
                className={`px-3 py-1 rounded transition-colors ${
                  selectedPrecision === 'fp32' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                FP32 Baseline
              </button>
            </div>

            {/* Stream Mode Toggle */}
            <div className="flex items-center bg-[#111a28] rounded-lg p-1 border border-[#1a273b] text-xs font-mono">
              <button
                onClick={() => setStreamMode('batch')}
                className={`px-3 py-1 rounded transition-colors ${
                  streamMode === 'batch' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Evaluates 3,000 flows and then stops automatically"
              >
                1 Batch (3,000 Flows)
              </button>
              <button
                onClick={() => setStreamMode('infinite')}
                className={`px-3 py-1 rounded transition-colors ${
                  streamMode === 'infinite' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Continuous endless loop"
              >
                Continuous Loop
              </button>
            </div>
          </div>

          {/* Speed Slider */}
          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-slate-400">Stream Rate:</span>
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={speedMultiplier}
              onChange={(e) => setSpeedMultiplier(parseInt(e.target.value))}
              className="accent-cyan-400 w-32 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
            <span className="text-cyan-400 font-bold">{speedMultiplier * 2} flows/sec</span>
          </div>
        </div>

        {/* Progress Bar & Status */}
        <div className="mb-6 p-4 rounded-xl bg-[#0b121d] border border-[#1a273b]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono mb-2">
            <div className="text-slate-300">
              Evaluation Progress: <span className="text-cyan-400 font-bold">{stats.total.toLocaleString()}</span> / {samplesRef.current.length > 0 ? samplesRef.current.length.toLocaleString() : '3,000'} test flows
              <span className="text-slate-500 ml-2">
                ({((stats.total / (samplesRef.current.length || 3000)) * 100).toFixed(1)}%)
              </span>
            </div>

            {isCompleted ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                ✔ STREAM COMPLETE: Evaluated All 3,000 Flows
              </span>
            ) : isPlaying ? (
              <span className="inline-flex items-center gap-1.5 text-cyan-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                Evaluating Stream Live (Mode: {streamMode === 'batch' ? 'Auto-stop at 3,000' : 'Continuous Loop'})
              </span>
            ) : (
              <span className="text-slate-500">Stream Paused</span>
            )}
          </div>

          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-[#1a273b]">
            <div
              className={`h-full transition-all duration-150 ${
                isCompleted
                  ? 'bg-emerald-400'
                  : 'bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-500'
              }`}
              style={{
                width: `${Math.min(100, (stats.total / (samplesRef.current.length || 3000)) * 100)}%`,
              }}
            ></div>
          </div>
        </div>

        {/* Live Running Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8 text-center font-mono text-xs">
          <div className="p-3 rounded-lg bg-[#0b121d] border border-[#1a273b]">
            <div className="text-[10px] text-slate-400">FLOWS PROCESSED</div>
            <div className="text-xl font-bold text-white mt-1">{stats.total.toLocaleString()}</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0b121d] border border-[#1a273b]">
            <div className="text-[10px] text-slate-400">RUNNING ACCURACY</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">{runningAcc}%</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0b121d] border border-[#1a273b]">
            <div className="text-[10px] text-slate-400">RUNNING TPR (RECALL)</div>
            <div className="text-xl font-bold text-cyan-400 mt-1">{runningTPR}%</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0b121d] border border-[#1a273b]">
            <div className="text-[10px] text-slate-400">FALSE ALARM RATE</div>
            <div className="text-xl font-bold text-amber-400 mt-1">{runningFPR}%</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0b121d] border border-[#1a273b]">
            <div className="text-[10px] text-slate-400">BIT-EXACT INT8 CHECK</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">✔ {stats.bitExactCount}</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0b121d] border border-[#1a273b]">
            <div className="text-[10px] text-slate-400">WORKER AGREEMENT</div>
            <div className="text-xl font-bold text-cyan-400 mt-1">✔ {stats.serverWorkerAgreement}</div>
          </div>
        </div>

        {/* Dual Display: Oscilloscope Waveform & Scrolling Serial Monitor */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Oscilloscope Power Waveform Canvas */}
          <div className="p-5 rounded-xl bg-[#0b121d] border border-[#1a273b]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Virtual INA219 Power Oscilloscope (mW)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Idle: 148.5 mW | Active: ~204.6 mW</span>
            </div>

            {/* Glowing Oscilloscope Display */}
            <div className="h-64 w-full bg-[#03060a] rounded-lg border border-[#162234] p-2 relative overflow-hidden flex flex-col justify-between">
              {/* CRT Phosphor Grid */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#0d1a29_1px,transparent_1px),linear-gradient(to_bottom,#0d1a29_1px,transparent_1px)] bg-[size:24px_24px] opacity-40 pointer-events-none"></div>

              {/* Horizontal Reference Lines */}
              <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none opacity-20 text-[9px] font-mono text-cyan-500">
                <div className="border-b border-dashed border-cyan-500">250 mW (Peak active)</div>
                <div className="border-b border-dashed border-cyan-500">200 mW (INT8 active)</div>
                <div className="border-b border-dashed border-cyan-500">150 mW (Baseline idle)</div>
              </div>

              {/* Smooth Animated Oscilloscope SVG Trace */}
              <svg className="w-full h-full relative z-10" viewBox="0 0 500 180" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="traceGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#00ff88" stopOpacity="0.0" />
                  </linearGradient>
                  <filter id="glowEffect">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Filled Area below waveform */}
                <path
                  d={`${generateSvgPath()} L 500,180 L 0,180 Z`}
                  fill="url(#traceGlow)"
                />

                {/* High-visibility glowing trace path */}
                <path
                  d={generateSvgPath()}
                  fill="none"
                  stroke={isPlaying ? '#00f0ff' : '#00ff88'}
                  strokeWidth="2.5"
                  filter="url(#glowEffect)"
                />

                {/* Scanning Vertical Line Beam */}
                {isPlaying && (
                  <line
                    x1={(packetTick * 5) % 500}
                    y1="0"
                    x2={(packetTick * 5) % 500}
                    y2="180"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeOpacity="0.5"
                  />
                )}
              </svg>
            </div>

            <div className="mt-2.5 flex justify-between text-[10px] font-mono text-slate-500">
              <span>T-60 samples</span>
              <span className="text-cyan-400 font-semibold">
                {isPlaying ? '● REAL-TIME SIGNAL SWEEP' : '○ PAUSED'}
              </span>
              <span>T-0 (Current Flow)</span>
            </div>
          </div>

          {/* Right: Scrolling Serial Monitor */}
          <div className="p-5 rounded-xl bg-[#0b121d] border border-[#1a273b] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Virtual UART Serial Monitor
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Click entry to inspect flow</span>
              </div>

              {/* Scrolling Terminal Box */}
              <div className="h-64 overflow-y-auto bg-[#03060a] rounded-lg border border-[#162234] p-3 font-mono text-[11px] space-y-1.5 scrollbar-thin">
                {logs.length === 0 ? (
                  <div className="text-slate-600 text-center py-20 flex flex-col items-center justify-center gap-2">
                    <Zap className="w-6 h-6 text-slate-700 animate-pulse" />
                    <span>Click [START INFERENCE] above to begin streaming telemetry...</span>
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      onClick={() => setSelectedFlowModal(log.raw)}
                      className="cursor-pointer hover:bg-slate-800/60 p-1.5 rounded transition-colors flex items-center justify-between gap-2 border border-transparent hover:border-slate-700"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-slate-500">#{log.flow_id}</span>
                        <span className="text-amber-400 font-semibold">[{log.precision}]</span>
                        <span
                          className={`font-bold px-1 rounded text-[10px] ${
                            log.predLabel === 'ATTACK'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {log.predLabel}
                        </span>
                        <span className="text-slate-400 truncate">({log.attack_cat})</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] shrink-0 font-mono">
                        <span className="text-slate-400">{log.latency_us}µs</span>
                        <span className="text-cyan-400">{log.power_mw}mW</span>
                        <span>{log.isCorrect ? '✔' : '❌'}</span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </div>

            <div className="mt-2.5 text-[10px] font-mono text-slate-500 flex justify-between">
              <span>921600 baud 8N1</span>
              <span>Buffer size: {logs.length} flows</span>
            </div>
          </div>
        </div>

        {/* Modal: Flow Inspector */}
        {selectedFlowModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0b121d] border border-[#1a273b] rounded-xl max-w-2xl w-full p-6 font-mono text-xs max-h-[90vh] overflow-y-auto shadow-[0_0_30px_rgba(0,0,0,0.8)]">
              <div className="flex items-center justify-between border-b border-[#141f30] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-white text-sm">Flow #{selectedFlowModal.flow_id} Telemetry Inspector</span>
                </div>
                <button
                  onClick={() => setSelectedFlowModal(null)}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  ✕ Close
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="p-2.5 rounded bg-[#111a28] border border-[#1a273b]">
                  <div className="text-[10px] text-slate-400">True Label</div>
                  <div className={`font-bold mt-1 ${selectedFlowModal.true_label === 1 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {selectedFlowModal.true_label === 1 ? 'ATTACK' : 'BENIGN'} ({selectedFlowModal.attack_cat})
                  </div>
                </div>
                <div className="p-2.5 rounded bg-[#111a28] border border-[#1a273b]">
                  <div className="text-[10px] text-slate-400">INT8 Probability</div>
                  <div className="font-bold text-cyan-400 mt-1">{selectedFlowModal.server_int8_prob?.toFixed(4) || selectedFlowModal.int8_prob?.toFixed(4)}</div>
                </div>
                <div className="p-2.5 rounded bg-[#111a28] border border-[#1a273b]">
                  <div className="text-[10px] text-slate-400">Host Latency</div>
                  <div className="font-bold text-white mt-1">{selectedFlowModal.server_int8_latency_us || selectedFlowModal.host_measured_int8_us} µs</div>
                </div>
                <div className="p-2.5 rounded bg-[#111a28] border border-[#1a273b]">
                  <div className="text-[10px] text-slate-400">Projected ESP32 Energy</div>
                  <div className="font-bold text-amber-400 mt-1">{selectedFlowModal.telemetry?.esp32_projected_energy_uj} µJ</div>
                </div>
              </div>

              <div className="text-[11px] font-bold text-slate-300 mb-2">16 Harmonized Normalized Features:</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] mb-4">
                {selectedFlowModal.features_norm?.map((val: number, i: number) => (
                  <div key={i} className="p-1.5 rounded bg-[#111a28] border border-[#1a273b] flex justify-between">
                    <span className="text-slate-500">F{i + 1}:</span>
                    <span className="text-cyan-300 font-bold">{val.toFixed(4)}</span>
                  </div>
                ))}
              </div>

              <div className="text-[11px] font-bold text-slate-300 mb-2">Quantized INT8 Inputs [-128, 127]:</div>
              <div className="p-2 rounded bg-[#070c14] border border-[#1a273b] text-[10px] text-slate-400 break-all">
                [{selectedFlowModal.features_int8?.join(', ')}]
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
