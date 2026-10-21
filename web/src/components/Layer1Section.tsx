import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  CartesianGrid, LineChart, Line, ErrorBar
} from 'recharts';
import { Shield, AlertTriangle, Crosshair, BarChart3, HelpCircle } from 'lucide-react';
import { MetricsData, AttackCategoryMetric, ShortcutAnalysisItem, SeedsData } from '../types';

interface Layer1SectionProps {
  metrics: MetricsData | null;
  perAttack: Record<string, AttackCategoryMetric> | null;
  importance: { analysis: ShortcutAnalysisItem[] } | null;
  seedsData: SeedsData | null;
}

export const Layer1Section: React.FC<Layer1SectionProps> = ({
  metrics,
  perAttack,
  importance,
  seedsData,
}) => {
  if (!metrics) return null;

  // Comparison Data for Bar Chart
  const comparisonData = [
    {
      metric: 'Accuracy',
      'In-Domain FP32': +(metrics.in_domain.fp32.accuracy * 100).toFixed(1),
      'In-Domain INT8': +(metrics.in_domain.int8.accuracy * 100).toFixed(1),
      'Cross-Domain FP32': +(metrics.cross_domain.fp32.accuracy * 100).toFixed(1),
      'Cross-Domain INT8': +(metrics.cross_domain.int8.accuracy * 100).toFixed(1),
    },
    {
      metric: 'Balanced Acc',
      'In-Domain FP32': +(metrics.in_domain.fp32.balanced_accuracy * 100).toFixed(1),
      'In-Domain INT8': +(metrics.in_domain.int8.balanced_accuracy * 100).toFixed(1),
      'Cross-Domain FP32': +(metrics.cross_domain.fp32.balanced_accuracy * 100).toFixed(1),
      'Cross-Domain INT8': +(metrics.cross_domain.int8.balanced_accuracy * 100).toFixed(1),
    },
    {
      metric: 'Recall (TPR)',
      'In-Domain FP32': +(metrics.in_domain.fp32.recall_tpr * 100).toFixed(1),
      'In-Domain INT8': +(metrics.in_domain.int8.recall_tpr * 100).toFixed(1),
      'Cross-Domain FP32': +(metrics.cross_domain.fp32.recall_tpr * 100).toFixed(1),
      'Cross-Domain INT8': +(metrics.cross_domain.int8.recall_tpr * 100).toFixed(1),
    },
    {
      metric: 'F1 Score',
      'In-Domain FP32': +(metrics.in_domain.fp32.f1_score * 100).toFixed(1),
      'In-Domain INT8': +(metrics.in_domain.int8.f1_score * 100).toFixed(1),
      'Cross-Domain FP32': +(metrics.cross_domain.fp32.f1_score * 100).toFixed(1),
      'Cross-Domain INT8': +(metrics.cross_domain.int8.f1_score * 100).toFixed(1),
    },
    {
      metric: 'FPR (False Pos)',
      'In-Domain FP32': +(metrics.in_domain.fp32.fpr * 100).toFixed(1),
      'In-Domain INT8': +(metrics.in_domain.int8.fpr * 100).toFixed(1),
      'Cross-Domain FP32': +(metrics.cross_domain.fp32.fpr * 100).toFixed(1),
      'Cross-Domain INT8': +(metrics.cross_domain.int8.fpr * 100).toFixed(1),
    },
  ];

  // Attack Category Breakdown Data
  const attackData = perAttack
    ? Object.entries(perAttack).map(([cat, val]) => ({
        category: cat,
        'Recall FP32': val.type === 'attack' ? +(val.recall_fp32! * 100).toFixed(1) : +(100 - val.fpr_fp32! * 100).toFixed(1),
        'Recall INT8': val.type === 'attack' ? +(val.recall_int8! * 100).toFixed(1) : +(100 - val.fpr_int8! * 100).toFixed(1),
        isNormal: val.type === 'normal',
      }))
    : [];

  // Shortcut Importance Chart Data
  const shortcutData = importance
    ? importance.analysis.map((item) => ({
        feature: item.feature,
        'In-Domain (CIC)': +(item.cic_fp32_importance * 100).toFixed(2),
        'Cross-Domain (UNSW)': +(item.unsw_fp32_importance * 100).toFixed(2),
        isShortcut: item.is_candidate_shortcut,
      }))
    : [];

  return (
    <section className="py-16 border-b border-[#141f30] bg-[#080d14]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
            Layer 1 Evaluation
          </span>
          <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold text-white">
            Zero-Shot Cross-Domain Results & Shortcut Probe
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400">
            Real calculated metrics on CIC-IDS-2017 holdout vs UNSW-NB15 zero-shot target.
          </p>
        </div>

        {/* Big Chart: In vs Cross Domain */}
        <div className="p-6 rounded-xl bg-[#0b121d] border border-[#1a273b] mb-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="text-base font-bold text-white">In-Domain vs Cross-Domain Generalization Collapse</h3>
              <p className="text-xs text-slate-400">Comparing FP32 and INT8 performance across evaluation regimes.</p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Computed from Real Data
            </span>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a273b" />
                <XAxis dataKey="metric" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b121d', borderColor: '#1a273b', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="In-Domain FP32" fill="#00ff88" radius={[4, 4, 0, 0]} />
                <Bar dataKey="In-Domain INT8" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Cross-Domain FP32" fill="#ff3366" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Cross-Domain INT8" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4 Confusion Matrices */}
        <div className="mb-12">
          <div className="mb-4">
            <h3 className="text-base font-bold text-white">Confusion Matrices (FP32 vs INT8 across Domains)</h3>
            <p className="text-xs text-slate-400">Showing TN, FP, FN, TP distribution.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Matrix 1 */}
            <div className="p-4 rounded-xl bg-[#0b121d] border border-[#1a273b]">
              <div className="text-xs font-mono text-emerald-400 font-semibold mb-2">In-Domain FP32</div>
              <div className="grid grid-cols-2 gap-2 text-center font-mono text-xs">
                <div className="p-2 bg-[#111a28] rounded border border-emerald-500/20">
                  <div className="text-[10px] text-slate-400">TN</div>
                  <div className="font-bold text-white">{metrics.in_domain.fp32.confusion_matrix.tn.toLocaleString()}</div>
                </div>
                <div className="p-2 bg-[#111a28] rounded border border-red-500/20">
                  <div className="text-[10px] text-slate-400">FP</div>
                  <div className="font-bold text-red-400">{metrics.in_domain.fp32.confusion_matrix.fp.toLocaleString()}</div>
                </div>
                <div className="p-2 bg-[#111a28] rounded border border-red-500/20">
                  <div className="text-[10px] text-slate-400">FN</div>
                  <div className="font-bold text-red-400">{metrics.in_domain.fp32.confusion_matrix.fn.toLocaleString()}</div>
                </div>
                <div className="p-2 bg-[#111a28] rounded border border-emerald-500/20">
                  <div className="text-[10px] text-slate-400">TP</div>
                  <div className="font-bold text-white">{metrics.in_domain.fp32.confusion_matrix.tp.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Matrix 2 */}
            <div className="p-4 rounded-xl bg-[#0b121d] border border-[#1a273b]">
              <div className="text-xs font-mono text-emerald-400 font-semibold mb-2">In-Domain INT8</div>
              <div className="grid grid-cols-2 gap-2 text-center font-mono text-xs">
                <div className="p-2 bg-[#111a28] rounded border border-emerald-500/20">
                  <div className="text-[10px] text-slate-400">TN</div>
                  <div className="font-bold text-white">{metrics.in_domain.int8.confusion_matrix.tn.toLocaleString()}</div>
                </div>
                <div className="p-2 bg-[#111a28] rounded border border-red-500/20">
                  <div className="text-[10px] text-slate-400">FP</div>
                  <div className="font-bold text-red-400">{metrics.in_domain.int8.confusion_matrix.fp.toLocaleString()}</div>
                </div>
                <div className="p-2 bg-[#111a28] rounded border border-red-500/20">
                  <div className="text-[10px] text-slate-400">FN</div>
                  <div className="font-bold text-red-400">{metrics.in_domain.int8.confusion_matrix.fn.toLocaleString()}</div>
                </div>
                <div className="p-2 bg-[#111a28] rounded border border-emerald-500/20">
                  <div className="text-[10px] text-slate-400">TP</div>
                  <div className="font-bold text-white">{metrics.in_domain.int8.confusion_matrix.tp.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Matrix 3 */}
            <div className="p-4 rounded-xl bg-[#0b121d] border border-red-500/30">
              <div className="text-xs font-mono text-red-400 font-semibold mb-2">Cross-Domain FP32 (UNSW)</div>
              <div className="grid grid-cols-2 gap-2 text-center font-mono text-xs">
                <div className="p-2 bg-[#111a28] rounded border border-emerald-500/20">
                  <div className="text-[10px] text-slate-400">TN</div>
                  <div className="font-bold text-white">{metrics.cross_domain.fp32.confusion_matrix.tn.toLocaleString()}</div>
                </div>
                <div className="p-2 bg-[#111a28] rounded border border-red-500/20">
                  <div className="text-[10px] text-slate-400">FP</div>
                  <div className="font-bold text-red-400">{metrics.cross_domain.fp32.confusion_matrix.fp.toLocaleString()}</div>
                </div>
                <div className="p-2 bg-[#111a28] rounded border border-red-500/20">
                  <div className="text-[10px] text-slate-400">FN</div>
                  <div className="font-bold text-red-400">{metrics.cross_domain.fp32.confusion_matrix.fn.toLocaleString()}</div>
                </div>
                <div className="p-2 bg-[#111a28] rounded border border-emerald-500/20">
                  <div className="text-[10px] text-slate-400">TP</div>
                  <div className="font-bold text-white">{metrics.cross_domain.fp32.confusion_matrix.tp.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Matrix 4 */}
            <div className="p-4 rounded-xl bg-[#0b121d] border border-amber-500/30">
              <div className="text-xs font-mono text-amber-400 font-semibold mb-2">Cross-Domain INT8 (UNSW)</div>
              <div className="grid grid-cols-2 gap-2 text-center font-mono text-xs">
                <div className="p-2 bg-[#111a28] rounded border border-emerald-500/20">
                  <div className="text-[10px] text-slate-400">TN</div>
                  <div className="font-bold text-white">{metrics.cross_domain.int8.confusion_matrix.tn.toLocaleString()}</div>
                </div>
                <div className="p-2 bg-[#111a28] rounded border border-red-500/20">
                  <div className="text-[10px] text-slate-400">FP</div>
                  <div className="font-bold text-red-400">{metrics.cross_domain.int8.confusion_matrix.fp.toLocaleString()}</div>
                </div>
                <div className="p-2 bg-[#111a28] rounded border border-red-500/20">
                  <div className="text-[10px] text-slate-400">FN</div>
                  <div className="font-bold text-red-400">{metrics.cross_domain.int8.confusion_matrix.fn.toLocaleString()}</div>
                </div>
                <div className="p-2 bg-[#111a28] rounded border border-emerald-500/20">
                  <div className="text-[10px] text-slate-400">TP</div>
                  <div className="font-bold text-white">{metrics.cross_domain.int8.confusion_matrix.tp.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Per-Attack Category Breakdown */}
        <div className="p-6 rounded-xl bg-[#0b121d] border border-[#1a273b] mb-12">
          <div className="mb-6">
            <h3 className="text-base font-bold text-white">Per-Attack Category Recall Breakdown (UNSW-NB15)</h3>
            <p className="text-xs text-slate-400">
              Examining zero-shot detection rate across individual attack families. Normal is plotted as Specificity (1 - FPR).
            </p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attackData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a273b" />
                <XAxis dataKey="category" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b121d', borderColor: '#1a273b', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Recall FP32" fill="#ff3366" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Recall INT8" fill="#00f0ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Shortcut Probe: Permutation Feature Importance */}
        <div className="p-6 rounded-xl bg-[#0b121d] border border-[#1a273b] mb-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="text-base font-bold text-white">Shortcut Learning Probe (Permutation Importance Drop)</h3>
              <p className="text-xs text-slate-400">
                Features with high in-domain drop but near-zero cross-domain drop represent brittle shortcut dependencies.
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Candidate Shortcuts Flagged
            </span>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shortcutData} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a273b" />
                <XAxis type="number" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis dataKey="feature" type="category" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b121d', borderColor: '#1a273b', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="In-Domain (CIC)" fill="#00ff88" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Cross-Domain (UNSW)" fill="#ff3366" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5-Seed Robustness Validation */}
        {seedsData && (
          <div className="p-6 rounded-xl bg-[#0b121d] border border-[#1a273b]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">5-Seed Multi-Initialization Robustness</h3>
                <p className="text-xs text-slate-400">
                  Verifying that quantization effect is consistent across random weight initializations.
                </p>
              </div>
              <div className="text-xs font-mono text-slate-300">
                Paired t-test across seeds: <span className="text-cyan-400 font-bold">p = {seedsData.summary.p_value.toFixed(4)}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#1a273b] bg-[#0e1726] text-slate-300">
                    <th className="p-3">Seed</th>
                    <th className="p-3">In-Domain FP32</th>
                    <th className="p-3">In-Domain INT8</th>
                    <th className="p-3">Cross-Domain FP32</th>
                    <th className="p-3">Cross-Domain INT8</th>
                    <th className="p-3">Quantization Effect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141f30] text-slate-300">
                  {seedsData.seeds.map((s) => (
                    <tr key={s.seed} className="hover:bg-slate-800/30">
                      <td className="p-3 font-bold text-white">{s.seed}</td>
                      <td className="p-3 text-emerald-400">{(s.in_domain.fp32_acc * 100).toFixed(2)}%</td>
                      <td className="p-3 text-emerald-300">{(s.in_domain.int8_acc * 100).toFixed(2)}%</td>
                      <td className="p-3 text-red-400">{(s.cross_domain.fp32_acc * 100).toFixed(2)}%</td>
                      <td className="p-3 text-amber-400">{(s.cross_domain.int8_acc * 100).toFixed(2)}%</td>
                      <td className="p-3 text-cyan-300 font-bold">
                        {s.collapse_drop.quantization_effect >= 0 ? '+' : ''}
                        {(s.collapse_drop.quantization_effect * 100).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
