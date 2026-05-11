'use client';

import QVACIntegration from '@/components/QVACIntegration';

export default function QVACPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">QVAC Embeddings</h1>
        <p className="text-sm text-aldor-text-secondary">Quantum Vector Agent Compute — local on-device similarity routing</p>
      </div>

      <QVACIntegration />

      <div className="p-5 border border-aldor-border bg-aldor-graphite/60 rounded-lg">
        <h3 className="text-sm font-semibold mb-3">Agent Embedding Catalog</h3>
        <p className="text-xs text-aldor-text-secondary mb-3">
          Each agent description is embedded into a high-dimensional vector. When a query arrives,
          QVAC computes cosine similarity between the query vector and all agent vectors to find the best match.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            { agent: 'WeatherBot', category: 'utility', desc: 'Real-time weather lookup for any location' },
            { agent: 'Summarizer', category: 'nlp', desc: 'Concise text summarization with key extraction' },
            { agent: 'MathSolver', category: 'utility', desc: 'Advanced math problem solver with step-by-step reasoning' },
            { agent: 'SentimentAI', category: 'nlp', desc: 'Sentiment classification and emotional tone analysis' },
            { agent: 'CodeExplainer', category: 'code', desc: 'Explain source code in plain English' },
            { agent: 'TranslateBot', category: 'nlp', desc: 'Multi-language text translation' },
            { agent: 'DeepResearch', category: 'research', desc: 'Deep research assistant with comprehensive topic analysis' },
            { agent: 'CodingAgent', category: 'code', desc: 'Senior coding agent for code generation and review' },
            { agent: 'SovereignSpecialist', category: 'qvac', desc: 'Local-first QVAC specialist for sovereign inference' },
            { agent: 'DataAnalyst', category: 'analytics', desc: 'Structured data analysis and insight generation' },
            { agent: 'ContractAuditor', category: 'security', desc: 'Smart contract security audit and vulnerability detection' },
            { agent: 'DeFiStrategist', category: 'finance', desc: 'DeFi yield optimization and strategy recommendations' },
            { agent: 'ImageGenerator', category: 'creative', desc: 'AI image generation from text prompts' },
            { agent: 'MarketOracle', category: 'finance', desc: 'Real-time crypto market data and price feeds' },
            { agent: 'LegalAdvisor', category: 'legal', desc: 'Contract review and legal document analysis' },
            { agent: 'SocialMediaBot', category: 'marketing', desc: 'Social media content generation and scheduling' },
            { agent: 'TradingBot', category: 'finance', desc: 'Automated trading signals and execution strategies' },
            { agent: 'MedicalAdvisor', category: 'health', desc: 'Medical information retrieval and symptom analysis' },
          ].map((item) => (
            <div
              key={item.agent}
              className="flex flex-col p-2 rounded-md bg-aldor-black border border-aldor-border"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">{item.agent}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-aldor-surface text-aldor-text-muted">
                  {item.category}
                </span>
              </div>
              <span className="text-[10px] text-aldor-text-muted mt-1">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center gap-2 py-4 text-[10px] text-aldor-text-muted border-t border-aldor-border">
        <span>Powered by</span>
        <img src="/qvac.png" alt="QVAC" className="w-4 h-4 rounded-sm object-contain" />
        <span className="text-purple-400 font-medium">QVAC Quantum Vector Agent Compute</span>
      </div>
    </div>
  );
}
