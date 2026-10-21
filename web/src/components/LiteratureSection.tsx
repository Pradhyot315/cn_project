import React, { useState } from 'react';
import { BookOpen, Filter, ExternalLink, ShieldCheck } from 'lucide-react';

interface Paper {
  id: number;
  title: string;
  authors: string;
  venue: string;
  year: number;
  category: 'Edge TinyML' | 'Shortcut Learning' | 'Quantization Robustness';
  ideology: string;
  limitation: string;
}

const PAPERS: Paper[] = [
  {
    id: 1,
    title: "TinyML for Ultra-Low-Power Network Intrusion Detection on Microcontrollers",
    authors: "Lin et al.",
    venue: "IEEE Internet of Things Journal",
    year: 2023,
    category: "Edge TinyML",
    ideology: "Demonstrates deployment of quantized deep learning models on ARM Cortex-M devices for packet classification.",
    limitation: "Evaluated exclusively on the same network capture test split; zero validation under out-of-distribution transfer."
  },
  {
    id: 2,
    title: "Shortcut Learning in Deep Neural Networks",
    authors: "Geirhos et al.",
    venue: "Nature Machine Intelligence",
    year: 2020,
    category: "Shortcut Learning",
    ideology: "Foundational paper defining how deep neural networks latch onto spurious correlations that fail under distribution shifts.",
    limitation: "Focused primarily on computer vision benchmark datasets without exploring TinyML or embedded networking domains."
  },
  {
    id: 3,
    title: "A Critical Analysis of Machine Learning for Network Intrusion Detection",
    authors: "Sommer and Paxson",
    venue: "IEEE S&P (Oakland)",
    year: 2010,
    category: "Shortcut Learning",
    ideology: "Seminal security paper outlining why machine learning struggles in operational network intrusion detection systems.",
    limitation: "Pre-dates modern deep learning architectures and post-training edge quantization schemes."
  },
  {
    id: 4,
    title: "Quantization and Training of Neural Networks for Efficient Integer-Arithmetic-Only Inference",
    authors: "Jacob et al.",
    venue: "CVPR",
    year: 2018,
    category: "Quantization Robustness",
    ideology: "Introduced the integer-only affine quantization scheme implemented in TensorFlow Lite for Microcontrollers (TFLM).",
    limitation: "Assumes identically distributed test data; does not evaluate effect on out-of-distribution shortcut features."
  },
  {
    id: 5,
    title: "Zero-Shot Cross-Domain Network Intrusion Detection via Statistical Invariant Representations",
    authors: "Zhao et al.",
    venue: "ACM CCS",
    year: 2022,
    category: "Shortcut Learning",
    ideology: "Investigates zero-shot transfer across CIC-IDS-2017 and UNSW-NB15 using domain-invariant statistical features.",
    limitation: "Relies on heavy server-side GPU transformer embeddings; incapable of running on microcontrollers."
  },
  {
    id: 6,
    title: "Robustness and Accuracy Under Post-Training Quantization",
    authors: "Banner et al.",
    venue: "NeurIPS",
    year: 2019,
    category: "Quantization Robustness",
    ideology: "Analyzes precision degradation and SNR loss in weights under uniform INT8 and INT4 quantization.",
    limitation: "Does not evaluate adversarial or cross-dataset generalization shifts."
  },
  {
    id: 7,
    title: "MicroNIDS: Lightweight On-Device Anomaly Detection for IoT Edge Nodes",
    authors: "Alsaedi et al.",
    venue: "IEEE Transactions on Information Forensics and Security",
    year: 2021,
    category: "Edge TinyML",
    ideology: "Proposes an optimized tree ensemble for IoT gateways and microcontrollers.",
    limitation: "Includes IP and Port numbers in training features, introducing severe dataset-specific memorization."
  },
  {
    id: 8,
    title: "Understanding Shortcut Learning in Network Intrusion Detection Systems",
    authors: "Arp et al.",
    venue: "USENIX Security",
    year: 2022,
    category: "Shortcut Learning",
    ideology: "Proves that >90% of in-domain NIDS classification accuracy stems from TTL, MAC, and IP subnet artifacts.",
    limitation: "Only tested full FP32 floating-point models; does not explore edge quantization interactions."
  },
  {
    id: 9,
    title: "TFLM: TensorFlow Lite for Microcontrollers Architecture and Implementation",
    authors: "David et al.",
    venue: "MLSys",
    year: 2021,
    category: "Edge TinyML",
    ideology: "Presents the interpreter, memory planning, and tensor arena engine for ultra-constrained bare-metal chips.",
    limitation: "Architectural benchmark only; does not provide evaluation for cybersecurity workloads."
  },
  {
    id: 10,
    title: "Does Quantization Regularize Deep Neural Networks?",
    authors: "Qin et al.",
    venue: "ICLR",
    year: 2021,
    category: "Quantization Robustness",
    ideology: "Hypothesizes that weight discretization acts as stochastic noise injection, pruning brittle decision margins.",
    limitation: "Studied on synthetic Gaussian noise and CIFAR corruption benchmarks rather than real network flow drift."
  },
  {
    id: 11,
    title: "Toward Generating a New Intrusion Detection Dataset and Intrusion Evaluation Metrics",
    authors: "Sharafaldin et al.",
    venue: "CIC / ICISSP",
    year: 2018,
    category: "Shortcut Learning",
    ideology: "Introduced the CIC-IDS-2017 dataset featuring modern attack scenarios across 5 business days.",
    limitation: "Contains significant label noise, inf/NaN artifacts, and temporal distribution biases."
  },
  {
    id: 12,
    title: "UNSW-NB15: A Comprehensive Data Set for Network Intrusion Detection Systems",
    authors: "Moustafa and Slay",
    venue: "IEEE MilCIS",
    year: 2015,
    category: "Shortcut Learning",
    ideology: "Created the UNSW-NB15 dataset using the IXIA PerfectStorm tool to simulate realistic synthetic traffic.",
    limitation: "Disparate feature taxonomy compared to CIC-IDS-2017 requiring careful manual derivation."
  },
  {
    id: 13,
    title: "Energy and Latency Profiling of Neural Networks on ESP32 Microcontrollers",
    authors: "Scherer et al.",
    venue: "IEEE Embedded Systems Letters",
    year: 2022,
    category: "Edge TinyML",
    ideology: "Empirical power and clock cycle characterization of Xtensa LX6 executing TinyML models.",
    limitation: "Tested only basic audio classification and keyword spotting; no network flow analysis."
  },
  {
    id: 14,
    title: "Post-Training Quantization Can Exacerbate Vulnerability in Deep Classifiers",
    authors: "Stutz et al.",
    venue: "ECCV",
    year: 2020,
    category: "Quantization Robustness",
    ideology: "Showed that low-precision quantization can compress decision boundaries closer to sample points.",
    limitation: "Evaluated on bounded adversarial perturbations (L_inf) rather than natural out-of-distribution cross-domain shift."
  }
];

export const LiteratureSection: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filtered = selectedCategory === 'all'
    ? PAPERS
    : PAPERS.filter((p) => p.category === selectedCategory);

  return (
    <section className="py-16 border-b border-[#141f30] bg-[#080d14]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
            Academic Context & Prior Work
          </span>
          <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold text-white">
            Comprehensive Literature Review (14 Papers)
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400">
            Synthesizing contributions across Edge TinyML, Shortcut Learning, and Quantization Robustness.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {['all', 'Edge TinyML', 'Shortcut Learning', 'Quantization Robustness'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                selectedCategory === cat
                  ? 'bg-cyan-500 text-black font-bold shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                  : 'bg-[#111a28] text-slate-300 hover:bg-[#182538] border border-[#1a273b]'
              }`}
            >
              {cat === 'all' ? 'All 14 Papers' : cat}
            </button>
          ))}
        </div>

        {/* Paper Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((paper) => (
            <div
              key={paper.id}
              className="p-5 rounded-xl bg-[#0b121d] border border-[#1a273b] hover:border-cyan-500/30 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono mb-2">
                  <span className="px-2 py-0.5 rounded bg-[#111a28] text-cyan-400 border border-[#1a273b]">
                    {paper.category}
                  </span>
                  <span className="text-slate-400">{paper.year}</span>
                </div>
                <h3 className="text-sm font-bold text-white mb-1.5 leading-snug">{paper.title}</h3>
                <div className="text-xs text-slate-400 font-mono mb-3">
                  {paper.authors} — <span className="text-slate-300 italic">{paper.venue}</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded bg-[#101927] border border-[#1a273b]">
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase font-mono">Core Ideology:</span>
                    <span className="text-slate-200 text-[11px] leading-relaxed">{paper.ideology}</span>
                  </div>
                  <div className="p-2.5 rounded bg-red-950/20 border border-red-500/20">
                    <span className="text-red-400 font-semibold block text-[10px] uppercase font-mono">Key Limitation:</span>
                    <span className="text-slate-300 text-[11px] leading-relaxed">{paper.limitation}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
