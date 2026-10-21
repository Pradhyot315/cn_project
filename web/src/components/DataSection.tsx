import React, { useState } from 'react';
import { Database, Filter, AlertOctagon, TrendingUp, Info } from 'lucide-react';
import { FeatureMapData, DriftMetric } from '../types';

interface DataSectionProps {
  featureMap: FeatureMapData | null;
  driftData: DriftMetric[] | null;
  datasetStats: any | null;
}

export const DataSection: React.FC<DataSectionProps> = ({
  featureMap,
  driftData,
  datasetStats,
}) => {
  const [activeTab, setActiveTab] = useState<'features' | 'drift' | 'exclusions'>('features');

  return (
    <section className="py-16 border-b border-[#141f30] bg-[#06090e]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
            Data Engineering & Alignment
          </span>
          <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold text-white">
            16 Harmonized Features & Domain Drift Analysis
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400">
            Aligning network telemetry across heterogeneous topologies while stripping environment-specific shortcut artifacts.
          </p>
        </div>

        {/* Dataset Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Source Dataset */}
          <div className="p-6 rounded-xl bg-[#0b121d] border border-[#1a273b]">
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                SOURCE DOMAIN (TRAINING)
              </span>
              <span className="text-xs font-mono text-slate-400">ISCX / UNB</span>
            </div>
            <h3 className="text-xl font-bold text-white">CIC-IDS-2017</h3>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded bg-[#111a28] border border-[#1a273b]">
                <div className="text-slate-400">Raw Rows</div>
                <div className="text-base font-bold text-white">2,830,743</div>
              </div>
              <div className="p-2.5 rounded bg-[#111a28] border border-[#1a273b]">
                <div className="text-slate-400">Cleaned Subset</div>
                <div className="text-base font-bold text-cyan-400">358,017</div>
              </div>
              <div className="p-2.5 rounded bg-[#111a28] border border-[#1a273b]">
                <div className="text-slate-400">Benign Flows</div>
                <div className="text-base font-bold text-emerald-400">280,000</div>
              </div>
              <div className="p-2.5 rounded bg-[#111a28] border border-[#1a273b]">
                <div className="text-slate-400">Attack Flows</div>
                <div className="text-base font-bold text-red-400">78,017</div>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-300 leading-relaxed">
              Contains 8 CSVs (Monday to Friday). Features cleaned of whitespace, infinities, and NaNs. Destination Port dropped to avoid port-binding artifacts.
            </p>
          </div>

          {/* Target Dataset */}
          <div className="p-6 rounded-xl bg-[#0b121d] border border-[#1a273b]">
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                TARGET DOMAIN (ZERO-SHOT)
              </span>
              <span className="text-xs font-mono text-slate-400">UNSW / ADFA</span>
            </div>
            <h3 className="text-xl font-bold text-white">UNSW-NB15</h3>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded bg-[#111a28] border border-[#1a273b]">
                <div className="text-slate-400">Total Rows</div>
                <div className="text-base font-bold text-white">257,673</div>
              </div>
              <div className="p-2.5 rounded bg-[#111a28] border border-[#1a273b]">
                <div className="text-slate-400">Attack Types</div>
                <div className="text-base font-bold text-purple-400">9 Categories</div>
              </div>
              <div className="p-2.5 rounded bg-[#111a28] border border-[#1a273b]">
                <div className="text-slate-400">Normal Flows</div>
                <div className="text-base font-bold text-emerald-400">93,000</div>
              </div>
              <div className="p-2.5 rounded bg-[#111a28] border border-[#1a273b]">
                <div className="text-slate-400">Attack Ratio</div>
                <div className="text-base font-bold text-amber-400">63.9%</div>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-300 leading-relaxed">
              Concatenated into a single zero-shot target set. Never touched during model training or MinMax scaler fitting.
            </p>
          </div>
        </div>

        {/* Sub-Tabs: Features, Drift, Exclusions */}
        <div className="flex border-b border-[#1a273b] mb-6">
          <button
            onClick={() => setActiveTab('features')}
            className={`px-4 py-2 text-xs font-mono font-semibold border-b-2 transition-colors ${
              activeTab === 'features'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            16 Harmonized Features
          </button>
          <button
            onClick={() => setActiveTab('drift')}
            className={`px-4 py-2 text-xs font-mono font-semibold border-b-2 transition-colors ${
              activeTab === 'drift'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Domain Drift Metric (% Out of Bounds)
          </button>
          <button
            onClick={() => setActiveTab('exclusions')}
            className={`px-4 py-2 text-xs font-mono font-semibold border-b-2 transition-colors ${
              activeTab === 'exclusions'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Excluded Artifacts (Anti-Shortcut)
          </button>
        </div>

        {/* Tab 1: Feature Table */}
        {activeTab === 'features' && featureMap && (
          <div className="overflow-x-auto rounded-xl border border-[#1a273b] bg-[#0b121d]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#1a273b] bg-[#0e1726] font-mono text-slate-300">
                  <th className="p-3 w-8">#</th>
                  <th className="p-3">Harmonized Feature</th>
                  <th className="p-3">CIC-IDS-2017 Column</th>
                  <th className="p-3">UNSW-NB15 Derivation</th>
                  <th className="p-3">Transform</th>
                  <th className="p-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141f30] font-mono text-slate-300">
                {featureMap.features.map((f, i) => (
                  <tr key={f.name} className="hover:bg-slate-800/30">
                    <td className="p-3 text-slate-500">{i + 1}</td>
                    <td className="p-3 font-semibold text-cyan-400">{f.name}</td>
                    <td className="p-3 text-slate-300">{f.cic_col}</td>
                    <td className="p-3 text-amber-300">{f.unsw_derivation}</td>
                    <td className="p-3">
                      {f.log_transform ? (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px]">
                          log1p
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 text-[10px]">
                          linear
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-400 font-sans text-xs">{f.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Drift Table */}
        {activeTab === 'drift' && driftData && (
          <div className="overflow-x-auto rounded-xl border border-[#1a273b] bg-[#0b121d]">
            <div className="p-4 bg-[#0e1726] border-b border-[#1a273b] flex items-center gap-2 text-xs text-amber-300 font-mono">
              <Info className="w-4 h-4 shrink-0" />
              <span>
                Domain Drift represents the percentage of UNSW-NB15 feature values that fall outside the [min, max] range established solely on CIC-IDS-2017 training flows.
              </span>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#1a273b] bg-[#0e1726] font-mono text-slate-300">
                  <th className="p-3">Feature</th>
                  <th className="p-3">Source Min</th>
                  <th className="p-3">Source Max</th>
                  <th className="p-3">Source Median</th>
                  <th className="p-3">Target Median</th>
                  <th className="p-3">Out-of-Bounds Drift %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141f30] font-mono text-slate-300">
                {driftData.map((d) => (
                  <tr key={d.feature} className="hover:bg-slate-800/30">
                    <td className="p-3 font-semibold text-white">{d.feature}</td>
                    <td className="p-3 text-slate-400">{d.source_min.toFixed(2)}</td>
                    <td className="p-3 text-slate-400">{d.source_max.toFixed(2)}</td>
                    <td className="p-3 text-cyan-400">{d.source_median.toFixed(2)}</td>
                    <td className="p-3 text-purple-400">{d.target_median.toFixed(2)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 rounded bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full ${
                              d.out_of_bounds_pct > 10 ? 'bg-red-400' : 'bg-emerald-400'
                            }`}
                            style={{ width: `${Math.min(100, d.out_of_bounds_pct)}%` }}
                          ></div>
                        </div>
                        <span className={d.out_of_bounds_pct > 10 ? 'text-red-400 font-bold' : 'text-slate-300'}>
                          {d.out_of_bounds_pct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Exclusions */}
        {activeTab === 'exclusions' && featureMap && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featureMap.excluded_artifacts.map((ex) => (
              <div key={ex.name} className="p-4 rounded-xl bg-[#0b121d] border border-[#1a273b]">
                <div className="flex items-center gap-2 text-red-400 font-mono text-xs font-bold mb-1">
                  <AlertOctagon className="w-4 h-4 shrink-0" />
                  <span>{ex.name}</span>
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">{ex.reason}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
