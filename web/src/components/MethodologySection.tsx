import React from 'react';
import { ShieldAlert, Cpu, Wrench, CheckCircle, HelpCircle, HardDrive } from 'lucide-react';

export const MethodologySection: React.FC = () => {
  return (
    <section className="py-16 border-b border-[#141f30] bg-[#06090e]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
            Scientific Integrity & Scope
          </span>
          <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold text-white">
            Methodology, Assumptions & Honest Limitations
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400">
            Transparently delineating real empirical software benchmarks from analytical hardware projections.
          </p>
        </div>

        {/* Big Honesty Alert Banner */}
        <div className="p-6 rounded-xl bg-amber-950/20 border border-amber-500/40 mb-12">
          <div className="flex items-start gap-4">
            <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-1" />
            <div>
              <h3 className="text-base font-bold text-amber-300">
                Mandatory Honesty Declaration: Simulated Hardware Emulation
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                As stipulated by the project constraints, <strong className="text-white">no physical ESP32 or INA219 sensor silicon was attached during runtime</strong>.
                All hardware numbers—including ESP32 clock cycles, tensor arena SRAM, flash footprint percentage, active current, power (mW), and energy per inference (µJ)—are generated via a documented <strong className="text-white">analytical mathematical model</strong>.
                In contrast, <strong className="text-cyan-400">all host execution latencies are real software benchmarks</strong> timed with <code className="text-cyan-300 font-mono">time.perf_counter_ns()</code>, and <strong className="text-emerald-400">all ML metrics</strong> (in-domain and cross-domain accuracies, F1, McNemar tests, bootstrap CIs) are <strong className="text-white">rigorous computations on the real datasets</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* 2-Column: Documented Constants vs Honest Limitations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Documented Simulator Constants */}
          <div className="p-6 rounded-xl bg-[#0b121d] border border-[#1a273b]">
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-bold text-white">Documented Simulator Constants</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Constants stored in <code className="text-purple-300 font-mono">pipeline/hw_model_config.json</code> used for all analytical projections:
            </p>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded bg-[#111a28] border border-[#1a273b] flex justify-between">
                <span className="text-slate-400">Target MCU:</span>
                <span className="text-white font-bold">ESP32 (Xtensa LX6 Dual-Core)</span>
              </div>
              <div className="p-2.5 rounded bg-[#111a28] border border-[#1a273b] flex justify-between">
                <span className="text-slate-400">Clock Frequency:</span>
                <span className="text-cyan-400 font-bold">240 MHz (4.167 ns / cycle)</span>
              </div>
              <div className="p-2.5 rounded bg-[#111a28] border border-[#1a273b] flex justify-between">
                <span className="text-slate-400">Usable DRAM / Flash:</span>
                <span className="text-white font-bold">320 KB Usable / 4 MB Flash</span>
              </div>
              <div className="p-2.5 rounded bg-[#111a28] border border-[#1a273b] flex justify-between">
                <span className="text-slate-400">Cycles per MAC (INT8 / FP32):</span>
                <span className="text-amber-400 font-bold">4 cycles (INT8) / 18 cycles (FP32)</span>
              </div>
              <div className="p-2.5 rounded bg-[#111a28] border border-[#1a273b] flex justify-between">
                <span className="text-slate-400">Virtual UART Link:</span>
                <span className="text-white font-bold">921,600 baud, 8N1 (24B frame)</span>
              </div>
              <div className="p-2.5 rounded bg-[#111a28] border border-[#1a273b] flex justify-between">
                <span className="text-slate-400">Virtual INA219 Parameters:</span>
                <span className="text-emerald-400 font-bold">3.3V supply, 45mA idle, 10µV shunt LSB</span>
              </div>
            </div>
          </div>

          {/* Explicit Limitations */}
          <div className="p-6 rounded-xl bg-[#0b121d] border border-[#1a273b]">
            <div className="flex items-center gap-2 mb-4">
              <Wrench className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white">Limitations & Threat to Validity</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Scientific caveats that must be considered when interpreting results:
            </p>

            <ul className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
              <li className="flex items-start gap-2">
                <span className="text-red-400 font-bold font-mono">1.</span>
                <span>
                  <strong>Feature Alignment Approximations:</strong> UNSW-NB15 provides pre-partitioned train/test CSVs with derived metrics (e.g. inter-packet arrival times). Converting units and approximating packet size carries inherent alignment noise.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 font-bold font-mono">2.</span>
                <span>
                  <strong>Attack Taxonomy Discrepancy:</strong> CIC-IDS-2017 models DoS, PortScan, and Web attacks, while UNSW-NB15 introduces Fuzzers, Exploits, and Worms. Cross-domain misses stem partially from taxonomy mismatch, not solely shortcut learning.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 font-bold font-mono">3.</span>
                <span>
                  <strong>Host Architecture vs Silicon ISA:</strong> Real measured latency reflects x86/x64 instruction pipelines rather than Xtensa LX6 assembly. Hardware paired tests demonstrate analytical methodology until physical silicon is plugged in.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Future Work Road Map */}
        <div className="p-6 rounded-xl bg-[#0b121d] border border-[#1a273b]">
          <h3 className="text-base font-bold text-white mb-2">Roadmap for Future Physical Verification (Project Review 2)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono mt-4">
            <div className="p-3 bg-[#111a28] rounded border border-[#1a273b]">
              <div className="text-cyan-400 font-bold">1. Physical ESP32 + INA219</div>
              <p className="text-slate-400 mt-1 font-sans text-[11px]">
                Flash generated <code className="text-purple-300">model_data.h</code> to real hardware over USB-UART and record high-frequency shunt current via I2C.
              </p>
            </div>
            <div className="p-3 bg-[#111a28] rounded border border-[#1a273b]">
              <div className="text-cyan-400 font-bold">2. TON_IoT Evaluation</div>
              <p className="text-slate-400 mt-1 font-sans text-[11px]">
                Incorporate TON_IoT as a second independent zero-shot target domain to validate whether the INT8 regularization finding holds across IoT sensor traffic.
              </p>
            </div>
            <div className="p-3 bg-[#111a28] rounded border border-[#1a273b]">
              <div className="text-cyan-400 font-bold">3. ESP-NN Optimized Kernels</div>
              <p className="text-slate-400 mt-1 font-sans text-[11px]">
                Replace TFLM reference C++ fallback kernels with Espressif’s handcrafted SIMD assembly routines for maximal integer throughput.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
