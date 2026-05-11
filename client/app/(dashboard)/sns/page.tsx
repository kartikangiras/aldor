'use client';

import SNSIntegration from '@/components/SNSIntegration';

export default function SNSPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">SNS Resolution</h1>
        <p className="text-sm text-aldor-text-secondary">Bonfida SPL Name Service domain resolution for agent routing</p>
      </div>

      <SNSIntegration />

      <div className="p-5 border border-aldor-border bg-aldor-graphite/60 rounded-lg">
        <h3 className="text-sm font-semibold mb-3">Registered Agent Domains</h3>
        <div className="space-y-2">
          {[
            { domain: 'weather.aldor.sol', agent: 'WeatherBot' },
            { domain: 'summarizer.aldor.sol', agent: 'Summarizer' },
            { domain: 'math.aldor.sol', agent: 'MathSolver' },
            { domain: 'sentiment.aldor.sol', agent: 'SentimentAI' },
            { domain: 'code-explainer.aldor.sol', agent: 'CodeExplainer' },
            { domain: 'translate.aldor.sol', agent: 'TranslateBot' },
            { domain: 'research.aldor.sol', agent: 'DeepResearch' },
            { domain: 'coding.aldor.sol', agent: 'CodingAgent' },
            { domain: 'sovereign.aldor.sol', agent: 'SovereignSpecialist' },
            { domain: 'data.aldor.sol', agent: 'DataAnalyst' },
            { domain: 'audit.aldor.sol', agent: 'ContractAuditor' },
            { domain: 'defi.aldor.sol', agent: 'DeFiStrategist' },
            { domain: 'image.aldor.sol', agent: 'ImageGenerator' },
            { domain: 'oracle.aldor.sol', agent: 'MarketOracle' },
            { domain: 'legal.aldor.sol', agent: 'LegalAdvisor' },
            { domain: 'social.aldor.sol', agent: 'SocialMediaBot' },
            { domain: 'trading.aldor.sol', agent: 'TradingBot' },
            { domain: 'medical.aldor.sol', agent: 'MedicalAdvisor' },
          ].map((item) => (
            <div
              key={item.domain}
              className="flex items-center justify-between p-2 rounded-md bg-aldor-black border border-aldor-border"
            >
              <span className="text-xs font-mono text-blue-400">{item.domain}</span>
              <span className="text-[10px] text-aldor-text-muted">{item.agent}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center gap-2 py-4 text-[10px] text-aldor-text-muted border-t border-aldor-border">
        <span>Powered by</span>
        <img src="/sns.png" alt="SNS" className="w-4 h-4 rounded-sm object-contain" />
        <span className="text-blue-400 font-medium">Bonfida SPL Name Service</span>
      </div>
    </div>
  );
}
