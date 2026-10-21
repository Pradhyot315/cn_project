import React, { useState, useEffect } from 'react';
import { Sidebar, NavTabId } from './components/Sidebar';
import { ImplementationDashboard } from './components/ImplementationDashboard';
import { DatasetEvaluationPage } from './components/DatasetEvaluationPage';
import { ModelEvaluationPage } from './components/ModelEvaluationPage';
import { QuantizationComparisonPage } from './components/QuantizationComparisonPage';
import { EdgeSimulationPage } from './components/EdgeSimulationPage';
import { ResultsPage } from './components/ResultsPage';

import {
  fetchHealth,
  fetchDatasetStats,
  fetchFeatureMap,
  fetchDrift,
  fetchMetrics,
  fetchPerAttack,
  fetchPermutationImportance,
  fetchSeeds,
  fetchStats,
  fetchVerdict,
  fetchBenchmark,
} from './api/client';
import {
  MetricsData,
  FeatureMapData,
  DriftMetric,
  AttackCategoryMetric,
  ShortcutAnalysisItem,
  SeedsData,
  ProfilingData,
  VerdictData,
} from './types';
import { WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTabId>('dashboard');
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [runningEval, setRunningEval] = useState<boolean>(false);

  // Data states
  const [datasetStats, setDatasetStats] = useState<any | null>(null);
  const [featureMap, setFeatureMap] = useState<FeatureMapData | null>(null);
  const [driftData, setDriftData] = useState<DriftMetric[] | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [perAttack, setPerAttack] = useState<Record<string, AttackCategoryMetric> | null>(null);
  const [importance, setImportance] = useState<{ analysis: ShortcutAnalysisItem[] } | null>(null);
  const [seedsData, setSeedsData] = useState<SeedsData | null>(null);
  const [statsData, setStatsData] = useState<any | null>(null);
  const [verdict, setVerdict] = useState<VerdictData | null>(null);
  const [profiling, setProfiling] = useState<ProfilingData | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Health check
      try {
        const health = await fetchHealth();
        setBackendOnline(health.status === 'healthy' || health.pipeline_ready);
      } catch {
        setBackendOnline(false);
      }

      // 2. Parallel fetch (backend if available, static fallback if not)
      const [
        dStats,
        fMap,
        dDrift,
        mMetrics,
        pAttack,
        pImport,
        sSeeds,
        sStats,
        vVerdict,
        bBench,
      ] = await Promise.all([
        fetchDatasetStats().catch(() => fetch('/data/dataset_stats.json').then((r) => r.json())),
        fetchFeatureMap().catch(() => fetch('/data/feature_map.json').then((r) => r.json())),
        fetchDrift().catch(() => fetch('/data/drift.json').then((r) => r.json())),
        fetchMetrics().catch(() => fetch('/data/metrics.json').then((r) => r.json())),
        fetchPerAttack().catch(() => fetch('/data/per_attack.json').then((r) => r.json())),
        fetchPermutationImportance().catch(() => fetch('/data/permutation_importance.json').then((r) => r.json())),
        fetchSeeds().catch(() => fetch('/data/seeds.json').then((r) => r.json())),
        fetchStats().catch(() => fetch('/data/stats.json').then((r) => r.json())),
        fetchVerdict().catch(() => fetch('/data/verdict.json').then((r) => r.json())),
        fetchBenchmark().catch(() => fetch('/data/profiling.json').then((r) => r.json())),
      ]);

      setDatasetStats(dStats);
      setFeatureMap(fMap);
      setDriftData(dDrift);
      setMetrics(mMetrics);
      setPerAttack(pAttack);
      setImportance(pImport);
      setSeedsData(sSeeds);
      setStatsData(sStats);
      setVerdict(vVerdict);
      setProfiling(bBench);
      setErrorMsg(null);
    } catch (err: any) {
      console.error('Data initialization error:', err);
      setErrorMsg('Failed to load project telemetry. Ensure web/public/data/*.json or FastAPI is active.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunEvaluation = async () => {
    setRunningEval(true);
    try {
      await loadData();
      await new Promise((res) => setTimeout(res, 800));
    } finally {
      setRunningEval(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06090e] text-slate-100 flex">
      {/* 6-Stage Software Workflow Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        backendOnline={backendOnline}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Offline Banner if backend is not reachable */}
        {!backendOnline && (
          <div className="bg-amber-950/80 border-b border-amber-500/40 px-4 py-2 text-xs font-mono text-amber-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>FASTAPI OFFLINE:</strong> Running on exported static dataset telemetry. Dynamic model inference endpoints (<code className="bg-black/40 px-1 py-0.5 rounded text-amber-300">/api/predict</code>, <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300">/api/benchmark/run</code>) require the local backend server.
              </span>
            </div>
            <span className="hidden sm:inline text-amber-300">
              Run: <code className="bg-black/60 px-2 py-0.5 rounded font-bold text-white">.\venv\Scripts\uvicorn backend.main:app --reload</code>
            </span>
          </div>
        )}

        {/* Top Minimal Utility Header */}
        <header className="sticky top-0 z-30 bg-[#070c14]/90 backdrop-blur-md border-b border-[#141f30] px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-semibold text-white tracking-wider uppercase">
              ZeroEdge-NIDS
            </span>
            <span className="text-[10px] font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800">
              Software Implementation
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0d1624] hover:bg-[#132034] text-slate-300 border border-[#1a273b] transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#0a101b] border border-[#141f30]">
              <span className="text-slate-400 text-[11px]">Workflow:</span>
              <span className="text-emerald-400 font-semibold text-[11px]">6-Step Software Ready</span>
            </div>
          </div>
        </header>

        {/* Dynamic Software Implementation View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40">
              <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
              <div className="mt-4 font-mono text-sm text-cyan-400">Loading implementation metrics...</div>
            </div>
          ) : errorMsg ? (
            <div className="flex flex-col items-center justify-center py-32 text-center px-4">
              <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Telemetry Error</h2>
              <p className="text-sm text-slate-400 max-w-md font-mono">{errorMsg}</p>
              <button
                onClick={loadData}
                className="mt-4 px-4 py-2 rounded bg-cyan-500 text-black font-semibold text-xs font-mono"
              >
                Retry Fetch
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <ImplementationDashboard
                  metrics={metrics}
                  profiling={profiling}
                  verdict={verdict}
                  backendOnline={backendOnline}
                  onNavigate={setActiveTab}
                  onRunEvaluation={handleRunEvaluation}
                  runningEval={runningEval}
                />
              )}

              {activeTab === 'dataset-processing' && (
                <DatasetEvaluationPage
                  metrics={metrics}
                  featureMap={featureMap}
                  backendOnline={backendOnline}
                  onRefreshData={loadData}
                />
              )}

              {activeTab === 'model-eval' && (
                <ModelEvaluationPage
                  metrics={metrics}
                  perAttack={perAttack}
                />
              )}

              {activeTab === 'quant-compare' && (
                <QuantizationComparisonPage
                  metrics={metrics}
                  profiling={profiling}
                  statsData={statsData}
                />
              )}

              {activeTab === 'edge-simulation' && (
                <EdgeSimulationPage
                  backendOnline={backendOnline}
                />
              )}

              {activeTab === 'results' && (
                <ResultsPage
                  metrics={metrics}
                  statsData={statsData}
                  verdict={verdict}
                />
              )}
            </>
          )}
        </main>

        {/* Minimal Footer */}
        <footer className="border-t border-[#141f30] px-6 py-4 text-xs font-mono text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#06090e]">
          <div>
            ZeroEdge-NIDS &middot; Complete Software-Only Implementation &middot; Zero Physical Hardware
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Zero-Shot Cross-Domain (CIC-IDS-2017 → UNSW-NB15)</span>
            <span className="text-cyan-400 font-semibold">McNemar p &lt; 10⁻¹⁵</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
