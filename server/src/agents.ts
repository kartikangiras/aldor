import type { AgentDefinition } from './eventtypes.js';

export const AGENTS: AgentDefinition[] = [
  {
    name: 'WeatherBot',
    domain: 'weather.aldor.sol',
    path: '/api/weather',
    category: 'utility',
    token: 'SOL',
    priceAtomic: 1_000_000,
    recursive: false,
    reputation: 7_500,
    description: 'Weather lookup utility',
  },
  {
    name: 'Summarizer',
    domain: 'summarizer.aldor.sol',
    path: '/api/summarize',
    category: 'nlp',
    token: 'PALM_USD',
    priceAtomic: 100,
    recursive: false,
    reputation: 8_000,
    description: 'Text summarization',
  },
  {
    name: 'MathSolver',
    domain: 'math.aldor.sol',
    path: '/api/math-solve',
    category: 'utility',
    token: 'PALM_USD',
    priceAtomic: 300,
    recursive: false,
    reputation: 7_700,
    description: 'Math problem solver',
  },
  {
    name: 'SentimentAI',
    domain: 'sentiment.aldor.sol',
    path: '/api/sentiment',
    category: 'nlp',
    token: 'PALM_USD',
    priceAtomic: 100,
    recursive: false,
    reputation: 8_200,
    description: 'Sentiment classifier',
  },
  {
    name: 'CodeExplainer',
    domain: 'code-explainer.aldor.sol',
    path: '/api/code-explain',
    category: 'code',
    token: 'PALM_USD',
    priceAtomic: 400,
    recursive: false,
    reputation: 8_100,
    description: 'Explain source code',
  },
  {
    name: 'TranslateBot',
    domain: 'translate.aldor.sol',
    path: '/api/agent/translate',
    category: 'nlp',
    token: 'PALM_USD',
    priceAtomic: 300,
    recursive: false,
    reputation: 7_900,
    description: 'Translate text',
  },
  {
    name: 'DeepResearch',
    domain: 'research.aldor.sol',
    path: '/api/agent/research',
    category: 'research',
    token: 'PALM_USD',
    priceAtomic: 1_000,
    recursive: true,
    reputation: 8_700,
    description: 'Recursive research orchestrator',
  },
  {
    name: 'CodingAgent',
    domain: 'coding.aldor.sol',
    path: '/api/agent/code',
    category: 'code',
    token: 'PALM_USD',
    priceAtomic: 2_000,
    recursive: true,
    reputation: 8_500,
    description: 'Recursive coding orchestrator',
  },
  {
    name: 'SovereignSpecialist',
    domain: 'sovereign.aldor.sol',
    path: '/api/agent/sovereign',
    category: 'qvac',
    token: 'PALM_USD',
    priceAtomic: 2_500,
    recursive: false,
    reputation: 8_400,
    description: 'Local-first QVAC specialist for sovereign inference',
  },
];

export function formatPrice(agent: AgentDefinition): string {
  if (agent.token === 'SOL') {
    return `${agent.priceAtomic / 1_000_000_000} SOL`;
  }
  return `${(agent.priceAtomic / 1_000_000).toFixed(4)} Palm USD`;
}

export function byName(name: string): AgentDefinition | undefined {
  return AGENTS.find((agent) => agent.name === name);
}
