import React, { useState } from 'react';
import { Cpu, Download, RefreshCw, Zap, Gauge, HardDrive, Sliders, CheckCircle2, AlertCircle } from 'lucide-react';
import { ProfilingData } from '../types';
import { predictFeatures, runLiveBenchmark } from '../api/client';

interface Layer2SectionProps {
  profiling: ProfilingData | null;
}

export const Layer2Section: React.FC<Layer2SectionProps> = ({ profiling }) => {
  // Quantization Widget State
  const [inputValue, setInputValue] = useState<number>(0.42);
  const scale = 0.0039215; // standard min-max scaled scale (~1/255)
  const zeroPoint = -128;
  const qVal = Math.max(-128, Math.min(127, Math.round(inputValue / scale) + zeroPoint));
  const dequantVal = (qVal - zeroPoint) * scale;
  const quantError = Math.abs(inputValue - dequantVal);

  // Try it yourself state
  const [sliderFeatures, setSliderFeatures] = useState<number[]>(new Array(16).fill(0.2));
  const [predictResult, setPredictResult] = useState<any | null>(null);
  const [predictLoading, setPredictLoading] = useState<boolean>(false);

  // Live benchmark re-run state
  const [liveBenchResult, setLiveBenchResult] = useState<any | null>(null);
  const [benchRunning, setBenchRunning] = useState<boolean>(false);

  // Presets
  const loadBenignPreset = () => {
    // typical benign flow: low duration, low packet rate, high win
    setSliderFeatures([0.05, 0.02, 0.01, 0.01, 0.01, 0.1, 0.1, 0.02, 0.01, 0.01, 0.01, 0.2, 0.1, 0.15, 0.0, 0.8]);
  };

  const loadAttackPreset = () => {
    // typical DoS attack flow: zero duration, huge packet rate, high forward packets
    setSliderFeatures([0.0, 0.85, 0.0, 0.9, 0.0, 0.7, 0.0, 0.95, 0.99, 0.99, 0.0, 0.0, 0.0, 0.75, 0.0, 0.0]);
  };

  const handlePredict = async () => {
    setPredictLoading(true);
    try {
      const res = await predictFeatures(sliderFeatures, true);
      setPredictResult(res);
    } catch (e: any) {
      alert(`Predict failed: ${e.message}`);
    } finally {
      setPredictLoading(false);
    }
  };

  const handleRunLiveBenchmark = async () => {
    setBenchRunning(true);
    try {
      const res = await runLiveBenchmark(500);
      setLiveBenchResult(res);
    } catch (e: any) {
      alert(`Benchmark failed: ${e.message}`);
    } finally {
      setBenchRunning(false);
    }
  };

  const defaultEsp32 = {
    cycles: 5504,
    latency_us: 22.93,
    tensor_arena_bytes: 4160,
    sram_utilization_pct: 1.2695,
    flash_param_bytes: 1236,
    flash_utilization_pct: 0.0295,
    active_power_mw: 204.6,
    energy_uj: 4.691,
    uart_tx_latency_us: 260.42,
  };

  const benchData = liveBenchResult || (profiling ? profiling.measured_benchmark : null);
  const esp32Data = profiling
    ? ((profiling as any).esp32_projection || (profiling as any).esp32_projection_int8 || defaultEsp32)
    : defaultEsp32;

  return (
    <section className="py-16 border-b border-[#141f30] bg-[#06090e]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-mono text-purple-400 uppercase tracking-wider font-semibold">
            Layer 2 Quantization & Profiling
          </span>
          <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold text-white">
            Host Software Benchmarking & ESP32 Projection
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400">
            Real measured microsecond timings on host CPU alongside analytical hardware models for the virtual Xtensa LX6 microcontroller.
          </p>
        </div>

        {/* Interactive Quantization Calculator Widget */}
        <div className="p-6 rounded-xl bg-[#0b121d] border border-[#1a273b] mb-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-purple-400 uppercase font-semibold">
                  Interactive Formula Widget
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300">
                  q = round(r / S) + Z
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">
                Affine Asymmetric Activation Quantization
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">Signed INT8 [-128, 127]</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-2">
                Real Normalized Float Input <span className="text-cyan-400 font-bold font-mono">r = {inputValue.toFixed(4)}</span>
              </label>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.001"
                value={inputValue}
                onChange={(e) => setInputValue(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                <span>0.0 (Min)</span>
                <span>0.5</span>
                <span>1.0 (Max)</span>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-[#111a28] border border-[#1a273b] text-xs font-mono space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Scale Parameter (S):</span>
                  <span className="text-white font-bold">{scale.toFixed(7)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Zero-Point (Z):</span>
                  <span className="text-white font-bold">{zeroPoint}</span>
                </div>
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-[#111a28] border border-[#1a273b] text-center">
                <div className="text-[10px] text-slate-400">Quantized INT8</div>
                <div className="text-xl font-bold text-cyan-400 mt-1">{qVal}</div>
                <div className="text-[9px] text-slate-500">int8 [-128, 127]</div>
              </div>
              <div className="p-3 rounded-lg bg-[#111a28] border border-[#1a273b] text-center">
                <div className="text-[10px] text-slate-400">Dequantized Float</div>
                <div className="text-xl font-bold text-purple-400 mt-1">{dequantVal.toFixed(4)}</div>
                <div className="text-[9px] text-slate-500">r_hat = (q-Z)*S</div>
              </div>
              <div className="p-3 rounded-lg bg-[#111a28] border border-[#1a273b] text-center col-span-2 sm:col-span-1">
                <div className="text-[10px] text-slate-400">Rounding Error</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">{quantError.toExponential(2)}</div>
                <div className="text-[9px] text-slate-500">|r - r_hat|</div>
              </div>
            </div>
          </div>
        </div>

        {/* Dual Panels: Measured on Host vs Projected on ESP32 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Panel A: Measured on Host */}
          <div className="p-6 rounded-xl bg-[#0b121d] border border-cyan-500/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Measured Host Benchmark</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold">
                Measured on host
              </span>
            </div>

            {benchData && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div className="p-3 rounded-lg bg-[#111a28] border border-[#1a273b]">
                    <div className="text-slate-400">FP32 Latency (Median)</div>
                    <div className="text-xl font-bold text-white mt-1">
                      {benchData.fp32 ? benchData.fp32.median_us.toFixed(2) : benchData.fp32_median_us} µs
                    </div>
                    <div className="text-[10px] text-slate-500">
                      p95: {benchData.fp32 ? benchData.fp32.p95_us.toFixed(2) : benchData.fp32_p95_us} µs
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#111a28] border border-[#1a273b]">
                    <div className="text-slate-400">INT8 Latency (Median)</div>
                    <div className="text-xl font-bold text-cyan-400 mt-1">
                      {benchData.int8 ? benchData.int8.median_us.toFixed(2) : benchData.int8_median_us} µs
                    </div>
                    <div className="text-[10px] text-slate-500">
                      p95: {benchData.int8 ? benchData.int8.p95_us.toFixed(2) : benchData.int8_p95_us} µs
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#111a28] border border-[#1a273b] text-xs font-mono flex items-center justify-between">
                  <span className="text-slate-400">Batch-of-1 Throughput:</span>
                  <span className="text-emerald-400 font-bold">
                    {benchData.int8
                      ? Math.round(benchData.int8.throughput_inf_per_s).toLocaleString()
                      : Math.round(benchData.throughput_int8).toLocaleString()}{' '}
                    inferences/sec
                  </span>
                </div>

                {profiling && (
                  <div className="p-3 rounded-lg bg-[#0e1726] border border-[#1a273b] text-[11px] font-mono text-slate-400 space-y-1">
                    <div>CPU: {profiling.host_environment.processor || profiling.host_environment.machine}</div>
                    <div>Cores: {profiling.host_environment.cpu_count_physical} Physical / {profiling.host_environment.cpu_count_logical} Logical</div>
                    <div>Environment: Python {profiling.host_environment.python_version} | NumPy {profiling.host_environment.numpy_version}</div>
                  </div>
                )}

                <button
                  onClick={handleRunLiveBenchmark}
                  disabled={benchRunning}
                  className="w-full py-2.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${benchRunning ? 'animate-spin' : ''}`} />
                  {benchRunning ? 'Benchmarking 500 Samples...' : 'Re-run Benchmark (500 Fresh Samples)'}
                </button>
              </div>
            )}
          </div>

          {/* Panel B: Projected ESP32 Analytical Model */}
          <div className="p-6 rounded-xl bg-[#0b121d] border border-purple-500/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">ESP32 Analytical Projection</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold">
                Estimated (ESP32 projection)
              </span>
            </div>

            {esp32Data && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div className="p-3 rounded-lg bg-[#111a28] border border-[#1a273b]">
                    <div className="text-slate-400">Projected Cycle Count</div>
                    <div className="text-xl font-bold text-purple-400 mt-1">
                      {esp32Data.cycles.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-500">240 MHz Xtensa LX6</div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#111a28] border border-[#1a273b]">
                    <div className="text-slate-400">Projected MCU Latency</div>
                    <div className="text-xl font-bold text-purple-400 mt-1">
                      {esp32Data.latency_us} µs
                    </div>
                    <div className="text-[10px] text-slate-500">cycles / 240 MHz</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div className="p-3 rounded-lg bg-[#111a28] border border-[#1a273b]">
                    <div className="text-slate-400">Tensor Arena SRAM</div>
                    <div className="text-base font-bold text-white mt-1">
                      {esp32Data.tensor_arena_bytes} B
                    </div>
                    <div className="text-[10px] text-emerald-400">{esp32Data.sram_utilization_pct}% of 320 KB DRAM</div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#111a28] border border-[#1a273b]">
                    <div className="text-slate-400">Flash Footprint</div>
                    <div className="text-base font-bold text-white mt-1">
                      {esp32Data.flash_param_bytes} B
                    </div>
                    <div className="text-[10px] text-emerald-400">{esp32Data.flash_utilization_pct}% of 4 MB Flash</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#111a28] border border-[#1a273b] text-xs font-mono space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Virtual INA219 Active Power:</span>
                    <span className="text-amber-400 font-bold">{esp32Data.active_power_mw} mW</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Virtual Energy Per Inference:</span>
                    <span className="text-amber-400 font-bold">{esp32Data.energy_uj} µJ</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Virtual UART Link Overhead:</span>
                    <span className="text-slate-300 font-bold">{esp32Data.uart_tx_latency_us} µs (921.6k baud)</span>
                  </div>
                </div>

                <a
                  href="/api/downloads/model_data.h"
                  download="model_data.h"
                  className="w-full py-2.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download model_data.h (C Byte Array)
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Try It Yourself Panel */}
        <div className="p-6 rounded-xl bg-[#0b121d] border border-[#1a273b]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Live Edge Inference Playground</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Feed 16 normalized feature inputs to FastAPI server and compare live FP32 vs integer-only INT8 execution.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadBenignPreset}
                className="px-3 py-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono text-xs transition-colors"
              >
                Load Benign Preset
              </button>
              <button
                onClick={loadAttackPreset}
                className="px-3 py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-mono text-xs transition-colors"
              >
                Load Attack Preset
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
            {sliderFeatures.map((val, idx) => (
              <div key={idx} className="p-2 rounded bg-[#111a28] border border-[#1a273b] text-center font-mono text-[10px]">
                <div className="text-slate-400 truncate">F{idx + 1}</div>
                <div className="text-cyan-400 font-bold my-1">{val.toFixed(2)}</div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={val}
                  onChange={(e) => {
                    const next = [...sliderFeatures];
                    next[idx] = parseFloat(e.target.value);
                    setSliderFeatures(next);
                  }}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#141f30]">
            <button
              onClick={handlePredict}
              disabled={predictLoading}
              className="px-6 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Zap className="w-4 h-4 fill-current" />
              {predictLoading ? 'Computing...' : 'Run POST /api/predict'}
            </button>

            {predictResult && (
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">FP32 Output:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded ${
                      predictResult.fp32_pred === 1
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {predictResult.fp32_label} ({predictResult.fp32_prob.toFixed(3)})
                  </span>
                  <span className="text-slate-500 text-[10px]">{predictResult.fp32_latency_us} µs</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400">INT8 Output:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded ${
                      predictResult.int8_pred === 1
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {predictResult.int8_label} ({predictResult.int8_prob.toFixed(3)})
                  </span>
                  <span className="text-slate-500 text-[10px]">{predictResult.int8_latency_us} µs</span>
                </div>

                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Bit-Exact Agreement: {predictResult.agreement ? 'YES' : 'NO'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
