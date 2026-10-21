import React from 'react';
import { Award, CheckCircle2, TrendingUp, HelpCircle, AlertTriangle } from 'lucide-react';
import { VerdictData } from '../types';

interface StatsVerdictSectionProps {
  stats: any | null;
  verdict: VerdictData | null;
}

export const StatsVerdictSection: React.FC<StatsVerdictSectionProps> = ({ stats, verdict }) => {
  if (!stats) return null;

  const mcnemarCross = stats.mcnemar_cross_domain;
  const latencyTest = stats.host_latency_paired_test;
  const bootstrapEffect = stats.bootstrap_quantization_effect;

  return (
    <section className="py-16 border-b border-[#141f30] bg-[#06090e]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
            Statistical Inference
          </span>
          <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold text-white">
            Hypothesis Testing & Data-Driven Verdict
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400">
            Rigorous statistical evaluation evaluating whether INT8 quantization statistically mitigates, exacerbates, or preserves cross-domain collapse.
          </p>
        </div>

        {/* Big Verdict Card */}
        {verdict && (
          <div className="p-8 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-[#0b1424] to-[#0b121d] border border-emerald-500/50 mb-12 relative overflow-hidden shadow-[0_0_30px_rgba(0,255,136,0.15)]">
            <div className="flex flex-col md:flex-row items-start justify-between gap-6">
              <div className="space-y-4 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold uppercase tracking-wider">
                  <Award className="w-4 h-4" />
                  {verdict.verdict}
                </div>
                <h3 className="text-2xl font-bold text-white">
                  Empirical Decision: Quantization Acts as an Implicit Regularizer
                </h3>
                <p className="text-sm text-slate-200 leading-relaxed">{verdict.explanation}</p>
              </div>

              <div className="shrink-0 p-4 rounded-xl bg-[#0e1726] border border-[#1a273b] font-mono text-xs space-y-2 min-w-[260px]">
                <div className="text-slate-400 border-b border-[#141f30] pb-2 font-bold text-white">
                  Statistical Confidence Summary
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">McNemar Correctness:</span>
                  <span className="text-emerald-400 font-bold">{verdict.p_value_mcnemar_correctness.toExponential(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Bootstrap 95% CI:</span>
                  <span className="text-cyan-300 font-bold">
                    [{verdict.bootstrap_ci_95_effect[0].toFixed(4)}, {verdict.bootstrap_ci_95_effect[1].toFixed(4)}]
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Net Collapse Effect:</span>
                  <span className="text-emerald-400 font-bold">
                    {verdict.quantization_effect_on_collapse >= 0 ? '+' : ''}
                    {(verdict.quantization_effect_on_collapse * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* McNemar Tests: Predictions vs Correctness */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Version A: Predictions Agreement */}
          <div className="p-6 rounded-xl bg-[#0b121d] border border-[#1a273b]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">McNemar Test: Prediction Agreement</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                Paper Definition (a)
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Contingency of classification decisions between FP32 and INT8 models on the UNSW-NB15 target set.
            </p>

            <div className="grid grid-cols-2 gap-3 text-center font-mono text-xs mb-4">
              <div className="p-3 bg-[#111a28] rounded border border-[#1a273b]">
                <div className="text-[10px] text-slate-400">Both Benign</div>
                <div className="text-base font-bold text-white mt-1">
                  {mcnemarCross.predictions.table_2x2[0][0].toLocaleString()}
                </div>
              </div>
              <div className="p-3 bg-[#111a28] rounded border border-[#1a273b]">
                <div className="text-[10px] text-slate-400">FP32=0, INT8=1 (c)</div>
                <div className="text-base font-bold text-cyan-400 mt-1">
                  {mcnemarCross.predictions.c.toLocaleString()}
                </div>
              </div>
              <div className="p-3 bg-[#111a28] rounded border border-[#1a273b]">
                <div className="text-[10px] text-slate-400">FP32=1, INT8=0 (b)</div>
                <div className="text-base font-bold text-amber-400 mt-1">
                  {mcnemarCross.predictions.b.toLocaleString()}
                </div>
              </div>
              <div className="p-3 bg-[#111a28] rounded border border-[#1a273b]">
                <div className="text-[10px] text-slate-400">Both Attack</div>
                <div className="text-base font-bold text-white mt-1">
                  {mcnemarCross.predictions.table_2x2[1][1].toLocaleString()}
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#0e1726] rounded border border-[#1a273b] font-mono text-xs space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>Chi-Squared (Continuity Corrected):</span>
                <span className="text-cyan-400 font-bold">{mcnemarCross.predictions.chi2_continuity_corrected.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>p-value:</span>
                <span className="text-emerald-400 font-bold">{mcnemarCross.predictions.p_value.toExponential(2)}</span>
              </div>
            </div>
          </div>

          {/* Version B: Correctness vs Ground Truth */}
          <div className="p-6 rounded-xl bg-[#0b121d] border border-cyan-500/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">McNemar Test: Correctness Agreement</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Accuracy Impact (b)
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Directly answers: "Did INT8 quantization change classification accuracy against ground truth?"
            </p>

            <div className="grid grid-cols-2 gap-3 text-center font-mono text-xs mb-4">
              <div className="p-3 bg-[#111a28] rounded border border-[#1a273b]">
                <div className="text-[10px] text-slate-400">Both Incorrect</div>
                <div className="text-base font-bold text-white mt-1">
                  {mcnemarCross.correctness.table_2x2[0][0].toLocaleString()}
                </div>
              </div>
              <div className="p-3 bg-[#111a28] rounded border border-emerald-500/30">
                <div className="text-[10px] text-emerald-400">FP32 wrong, INT8 correct (c)</div>
                <div className="text-base font-bold text-emerald-400 mt-1">
                  {mcnemarCross.correctness.c_a_wrong_b_correct.toLocaleString()}
                </div>
              </div>
              <div className="p-3 bg-[#111a28] rounded border border-red-500/30">
                <div className="text-[10px] text-red-400">FP32 correct, INT8 wrong (b)</div>
                <div className="text-base font-bold text-red-400 mt-1">
                  {mcnemarCross.correctness.b_a_correct_b_wrong.toLocaleString()}
                </div>
              </div>
              <div className="p-3 bg-[#111a28] rounded border border-[#1a273b]">
                <div className="text-[10px] text-slate-400">Both Correct</div>
                <div className="text-base font-bold text-white mt-1">
                  {mcnemarCross.correctness.table_2x2[1][1].toLocaleString()}
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#0e1726] rounded border border-[#1a273b] font-mono text-xs space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>Chi-Squared (Continuity Corrected):</span>
                <span className="text-cyan-400 font-bold">{mcnemarCross.correctness.chi2_continuity_corrected.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>p-value:</span>
                <span className="text-emerald-400 font-bold">{mcnemarCross.correctness.p_value.toExponential(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Host Latency Paired Test */}
        {latencyTest && (
          <div className="p-6 rounded-xl bg-[#0b121d] border border-[#1a273b]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Paired Inference Latency Statistical Tests</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Measured on host CPU (N = 3,000)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-3.5 rounded bg-[#111a28] border border-[#1a273b]">
                <div className="text-slate-400">Mean Latency Difference:</div>
                <div className="text-base font-bold text-white mt-1">
                  {latencyTest.mean_diff_us >= 0 ? '+' : ''}{latencyTest.mean_diff_us.toFixed(3)} µs
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  95% CI: [{latencyTest.ci_95_diff_us[0].toFixed(3)}, {latencyTest.ci_95_diff_us[1].toFixed(3)}]
                </div>
              </div>

              <div className="p-3.5 rounded bg-[#111a28] border border-[#1a273b]">
                <div className="text-slate-400">Paired Student's t-test:</div>
                <div className="text-base font-bold text-cyan-400 mt-1">
                  t = {latencyTest.t_statistic.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  p-value = {latencyTest.p_value_ttest.toExponential(2)}
                </div>
              </div>

              <div className="p-3.5 rounded bg-[#111a28] border border-[#1a273b]">
                <div className="text-slate-400">Effect Size & Wilcoxon:</div>
                <div className="text-base font-bold text-purple-400 mt-1">
                  Cohen's d_z = {latencyTest.cohens_d_z.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Wilcoxon p = {latencyTest.p_value_wilcoxon.toExponential(2)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
