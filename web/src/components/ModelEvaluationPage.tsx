import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Layers,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { MetricsData, AttackCategoryMetric } from '../types';

interface ModelEvaluationPageProps {
  metrics: MetricsData | null;
  perAttack: Record<string, AttackCategoryMetric> | null;
}

export const ModelEvaluationPage: React.FC<ModelEvaluationPageProps> = ({
  metrics,
  perAttack
}) => {
  const [matrixDomain, setMatrixDomain] = useState<'cross' | 'in_domain'>('cross');

  const defaultMetrics = {
    in_domain: {
      fp32: {
        accuracy: 0.9734,
        balanced_accuracy: 0.9800,
        precision: 0.8969,
        recall_tpr: 0.9917,
        f1_score: 0.9419,
        fpr: 0.0318,
        confusion_matrix: { tn: 54221, fp: 1779, fn: 129, tp: 15475 }
      },
      int8: {
        accuracy: 0.9611,
        balanced_accuracy: 0.9717,
        precision: 0.8544,
        recall_tpr: 0.9903,
        f1_score: 0.9174,
        fpr: 0.0470,
        confusion_matrix: { tn: 53367, fp: 2633, fn: 151, tp: 15453 }
      }
    },
    cross_domain: {
      fp32: {
        accuracy: 0.3542,
        balanced_accuracy: 0.4816,
        precision: 0.4080,
        recall_tpr: 0.0235,
        f1_score: 0.0444,
        fpr: 0.0603,
        confusion_matrix: { tn: 87388, fp: 5612, fn: 160805, tp: 3868 }
      },
      int8: {
        accuracy: 0.3651,
        balanced_accuracy: 0.4961,
        precision: 0.5748,
        recall_tpr: 0.0254,
        f1_score: 0.0486,
        fpr: 0.0332,
        confusion_matrix: { tn: 89910, fp: 3090, fn: 160496, tp: 4177 }
      }
    }
  };

  const defaultPerAttack: Record<string, any> = {
    Exploits: { type: 'attack', count: 44525, recall_fp32: 0.0542, recall_int8: 0.0583, detected_fp32: 2413, detected_int8: 2596 },
    Fuzzers: { type: 'attack', count: 24246, recall_fp32: 0.0480, recall_int8: 0.0528, detected_fp32: 1164, detected_int8: 1281 },
    DoS: { type: 'attack', count: 16353, recall_fp32: 0.0164, recall_int8: 0.0168, detected_fp32: 269, detected_int8: 274 },
    Generic: { type: 'attack', count: 58871, recall_fp32: 0.00036, recall_int8: 0.00044, detected_fp32: 21, detected_int8: 26 },
    Reconnaissance: { type: 'attack', count: 13987, recall_fp32: 0.0, recall_int8: 0.0, detected_fp32: 0, detected_int8: 0 },
    Analysis: { type: 'attack', count: 2677, recall_fp32: 0.0, recall_int8: 0.0, detected_fp32: 0, detected_int8: 0 },
    Backdoor: { type: 'attack', count: 2329, recall_fp32: 0.0, recall_int8: 0.0, detected_fp32: 0, detected_int8: 0 },
    Shellcode: { type: 'attack', count: 1511, recall_fp32: 0.0, recall_int8: 0.0, detected_fp32: 0, detected_int8: 0 },
    Worms: { type: 'attack', count: 174, recall_fp32: 0.0057, recall_int8: 0.0057, detected_fp32: 1, detected_int8: 1 }
  };

  const m = metrics || defaultMetrics;
  const attackData = perAttack || defaultPerAttack;

  // Chart data for class-wise recall across attack families
  const classRecallChartData = Object.entries(attackData)
    .filter(([name, data]) => data.type === 'attack')
    .map(([name, data]) => ({
      name,
      count: data.count,
      FP32_Recall: +((data.recall_fp32 || 0) * 100).toFixed(2),
      INT8_Recall: +((data.recall_int8 || 0) * 100).toFixed(2),
      FP32_Detected: data.detected_fp32 || 0,
      INT8_Detected: data.detected_int8 || 0
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#141f30] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800 font-semibold uppercase">
              Step 2 of 6: Model Evaluation
            </span>
            <span className="text-xs text-slate-400 font-mono">Zero-Shot Protocol</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Source vs Unseen Target Domain Evaluation
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Evaluating the trained MLP before and after INT8 post-training quantization without any fine-tuning or retraining on the target dataset.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-3 py-1.5 rounded-lg bg-[#0d1624] text-slate-300 border border-[#1a273b]">
            Source: CIC-IDS-2017 (71.6k rows)
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-cyan-950/60 text-cyan-300 border border-cyan-800">
            Target: UNSW-NB15 (257.6k rows)
          </span>
        </div>
      </div>

      {/* Protocol Integrity Banner */}
      <div className="p-4 rounded-xl bg-[#0b121d] border border-cyan-500/30 flex items-start gap-3.5">
        <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <span className="font-bold text-white uppercase font-mono block">Zero-Shot Evaluation Protocol Guarantee</span>
          <p>
            The model was trained exclusively on the CIC-IDS-2017 source domain. It was never retrained, fine-tuned, or adapted on UNSW-NB15 target samples. Both FP32 and INT8 evaluations reflect strictly unseen zero-shot cross-network transfer under heavy covariate shift.
          </p>
        </div>
      </div>

      {/* Domain Performance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-[#0b121d] border border-[#1a273b]">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">IN-DOMAIN ACCURACY (CIC-IDS)</span>
          <div className="text-2xl font-bold text-white font-mono mt-1">
            {(m.in_domain.fp32.accuracy * 100).toFixed(2)}%
            <span className="text-xs text-purple-400 font-normal ml-2">INT8: {(m.in_domain.int8.accuracy * 100).toFixed(2)}%</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 mt-1 block">
            Preserved 96.11% accuracy after PTQ
          </span>
        </div>

        <div className="p-5 rounded-xl bg-[#0b121d] border border-[#1a273b]">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">UNSEEN TARGET ACCURACY (UNSW)</span>
          <div className="text-2xl font-bold text-white font-mono mt-1">
            {(m.cross_domain.int8.accuracy * 100).toFixed(2)}%
            <span className="text-xs text-blue-400 font-normal ml-2">FP32: {(m.cross_domain.fp32.accuracy * 100).toFixed(2)}%</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 mt-1 block font-semibold">
            +1.09% Quantization Gain in Zero-Shot
          </span>
        </div>

        <div className="p-5 rounded-xl bg-[#0b121d] border border-[#1a273b]">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">UNSEEN PRECISION GAIN</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
            +16.68%
          </div>
          <span className="text-[11px] font-mono text-slate-300 mt-1 block">
            40.80% (FP32) → 57.48% (INT8)
          </span>
        </div>

        <div className="p-5 rounded-xl bg-[#0b121d] border border-[#1a273b]">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">FALSE ALARMS ON BENIGN TRAFFIC</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
            -44.9%
          </div>
          <span className="text-[11px] font-mono text-slate-300 mt-1 block">
            5,612 FPs → 3,090 FPs (-2,522 false alarms)
          </span>
        </div>
      </div>

      {/* 4-Way Confusion Matrices */}
      <div className="p-6 rounded-xl bg-[#0b121d] border border-[#1a273b]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#141f30] pb-4 mb-6">
          <div>
            <h2 className="text-base font-bold text-white">Full Confusion Matrices</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Exact classified sample distributions across true negatives, false positives, false negatives, and true positives.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#070d18] p-1 rounded-lg border border-[#1a273b] text-xs font-mono">
            <button
              onClick={() => setMatrixDomain('cross')}
              className={`px-3 py-1.5 rounded transition-all ${
                matrixDomain === 'cross'
                  ? 'bg-cyan-500 text-black font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Unseen Target (UNSW-NB15)
            </button>
            <button
              onClick={() => setMatrixDomain('in_domain')}
              className={`px-3 py-1.5 rounded transition-all ${
                matrixDomain === 'in_domain'
                  ? 'bg-cyan-500 text-black font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Source Holdout (CIC-IDS-2017)
            </button>
          </div>
        </div>

        {matrixDomain === 'cross' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
            {/* FP32 Cross Matrix */}
            <div className="p-5 rounded-xl bg-[#070c14] border border-blue-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-400 uppercase">FP32 Baseline (257,673 samples)</span>
                <span className="text-slate-400">FAR: 6.03%</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-900/40">
                  <span className="text-[10px] text-slate-400 block uppercase">True Negative (TN)</span>
                  <span className="text-lg font-bold text-white block mt-1">87,388</span>
                  <span className="text-[10px] text-emerald-400">Correct Benign</span>
                </div>
                <div className="p-4 rounded-lg bg-red-950/30 border border-red-900/60">
                  <span className="text-[10px] text-slate-400 block uppercase">False Positive (FP)</span>
                  <span className="text-lg font-bold text-red-400 block mt-1">5,612</span>
                  <span className="text-[10px] text-red-300">False Alarms</span>
                </div>
                <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-900/40">
                  <span className="text-[10px] text-slate-400 block uppercase">False Negative (FN)</span>
                  <span className="text-lg font-bold text-amber-400 block mt-1">160,805</span>
                  <span className="text-[10px] text-amber-300">Missed Attacks</span>
                </div>
                <div className="p-4 rounded-lg bg-cyan-950/20 border border-cyan-900/40">
                  <span className="text-[10px] text-slate-400 block uppercase">True Positive (TP)</span>
                  <span className="text-lg font-bold text-cyan-300 block mt-1">3,868</span>
                  <span className="text-[10px] text-cyan-400">Detected Attacks</span>
                </div>
              </div>
            </div>

            {/* INT8 Cross Matrix */}
            <div className="p-5 rounded-xl bg-[#070c14] border border-purple-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-400 uppercase">INT8 Quantized (257,673 samples)</span>
                <span className="text-emerald-400 font-semibold">-2,522 False Alarms</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-4 rounded-lg bg-emerald-950/30 border border-emerald-900/60">
                  <span className="text-[10px] text-slate-400 block uppercase">True Negative (TN)</span>
                  <span className="text-lg font-bold text-emerald-300 block mt-1">89,910</span>
                  <span className="text-[10px] text-emerald-400">+2,522 Benign Correct</span>
                </div>
                <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-800/40">
                  <span className="text-[10px] text-slate-400 block uppercase">False Positive (FP)</span>
                  <span className="text-lg font-bold text-emerald-400 block mt-1">3,090</span>
                  <span className="text-[10px] text-emerald-300">FAR: 3.32% (-44.9%)</span>
                </div>
                <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-900/40">
                  <span className="text-[10px] text-slate-400 block uppercase">False Negative (FN)</span>
                  <span className="text-lg font-bold text-amber-400 block mt-1">160,496</span>
                  <span className="text-[10px] text-amber-300">-309 Missed</span>
                </div>
                <div className="p-4 rounded-lg bg-purple-950/30 border border-purple-900/60">
                  <span className="text-[10px] text-slate-400 block uppercase">True Positive (TP)</span>
                  <span className="text-lg font-bold text-purple-300 block mt-1">4,177</span>
                  <span className="text-[10px] text-purple-400">+309 Detected (+7.99%)</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
            {/* FP32 In-Domain Matrix */}
            <div className="p-5 rounded-xl bg-[#070c14] border border-blue-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-400 uppercase">FP32 Baseline (71,604 samples)</span>
                <span className="text-slate-400">FAR: 3.18%</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-900/40">
                  <span className="text-[10px] text-slate-400 block uppercase">True Negative (TN)</span>
                  <span className="text-lg font-bold text-white block mt-1">54,221</span>
                  <span className="text-[10px] text-slate-400">96.82% specificity</span>
                </div>
                <div className="p-4 rounded-lg bg-red-950/20 border border-red-900/40">
                  <span className="text-[10px] text-slate-400 block uppercase">False Positive (FP)</span>
                  <span className="text-lg font-bold text-slate-200 block mt-1">1,779</span>
                  <span className="text-[10px] text-slate-400">False Alarms</span>
                </div>
                <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-900/40">
                  <span className="text-[10px] text-slate-400 block uppercase">False Negative (FN)</span>
                  <span className="text-lg font-bold text-slate-200 block mt-1">129</span>
                  <span className="text-[10px] text-slate-400">Missed Attacks</span>
                </div>
                <div className="p-4 rounded-lg bg-cyan-950/20 border border-cyan-900/40">
                  <span className="text-[10px] text-slate-400 block uppercase">True Positive (TP)</span>
                  <span className="text-lg font-bold text-cyan-300 block mt-1">15,475</span>
                  <span className="text-[10px] text-cyan-400">Recall: 99.17%</span>
                </div>
              </div>
            </div>

            {/* INT8 In-Domain Matrix */}
            <div className="p-5 rounded-xl bg-[#070c14] border border-purple-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-400 uppercase">INT8 Quantized (71,604 samples)</span>
                <span className="text-slate-400">Preserved 96.11% Acc</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-900/40">
                  <span className="text-[10px] text-slate-400 block uppercase">True Negative (TN)</span>
                  <span className="text-lg font-bold text-white block mt-1">53,367</span>
                  <span className="text-[10px] text-slate-400">95.30% specificity</span>
                </div>
                <div className="p-4 rounded-lg bg-red-950/20 border border-red-900/40">
                  <span className="text-[10px] text-slate-400 block uppercase">False Positive (FP)</span>
                  <span className="text-lg font-bold text-slate-200 block mt-1">2,633</span>
                  <span className="text-[10px] text-slate-400">FAR: 4.70%</span>
                </div>
                <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-900/40">
                  <span className="text-[10px] text-slate-400 block uppercase">False Negative (FN)</span>
                  <span className="text-lg font-bold text-slate-200 block mt-1">151</span>
                  <span className="text-[10px] text-slate-400">Missed Attacks</span>
                </div>
                <div className="p-4 rounded-lg bg-purple-950/20 border border-purple-900/40">
                  <span className="text-[10px] text-slate-400 block uppercase">True Positive (TP)</span>
                  <span className="text-lg font-bold text-purple-300 block mt-1">15,453</span>
                  <span className="text-[10px] text-purple-400">Recall: 99.03%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Class-Wise Detection Performance Breakdown (9 Attack Families) */}
      <div className="p-6 rounded-xl bg-[#0b121d] border border-[#1a273b] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#141f30] pb-4">
          <div>
            <h2 className="text-base font-bold text-white">Class-Wise Detection Performance (9 Attack Families)</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Evaluating detection recall across individual attack families in the unseen UNSW-NB15 target dataset.
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/50 px-2.5 py-1 rounded border border-cyan-800">
            Total Attacks: 164,673 flows
          </span>
        </div>

        {/* Visual Bar Chart: Per-Attack Recall */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={classRecallChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#162338" />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} angle={-20} textAnchor="end" />
              <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 8]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#070c14',
                  borderColor: '#1e293b',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontFamily: 'monospace'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="FP32_Recall" fill="#3b82f6" name="FP32 Recall (%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="INT8_Recall" fill="#a855f7" name="INT8 Recall (%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Class-Wise Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1a273b] text-slate-400 bg-[#070c14]">
                <th className="py-2.5 px-3">Attack Category</th>
                <th className="py-2.5 px-3">Target Flow Count</th>
                <th className="py-2.5 px-3 text-blue-400">FP32 Recall</th>
                <th className="py-2.5 px-3 text-purple-400">INT8 Recall</th>
                <th className="py-2.5 px-3 text-emerald-400">INT8 Gain (Δ)</th>
                <th className="py-2.5 px-3 text-slate-400">Detected Flows (INT8)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141f30]">
              {classRecallChartData.map((row) => {
                const diff = +(row.INT8_Recall - row.FP32_Recall).toFixed(2);
                return (
                  <tr key={row.name} className="hover:bg-[#070d18] transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-white">{row.name}</td>
                    <td className="py-2.5 px-3 text-slate-300">{row.count.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-blue-300 font-mono">{row.FP32_Recall.toFixed(2)}%</td>
                    <td className="py-2.5 px-3 text-purple-300 font-mono font-bold">{row.INT8_Recall.toFixed(2)}%</td>
                    <td className="py-2.5 px-3 font-mono font-bold">
                      {diff > 0 ? (
                        <span className="text-emerald-400">+{diff}%</span>
                      ) : diff === 0 ? (
                        <span className="text-slate-400">0.00%</span>
                      ) : (
                        <span className="text-amber-400">{diff}%</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-mono">{row.INT8_Detected.toLocaleString()} / {row.count.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
