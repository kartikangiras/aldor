# Aldor

> **Sovereign Autonomous Agentic Orchestrator for Solana**

Aldor is a production-grade autonomous agent marketplace built on Solana where users hire AI-powered agent specialists using x402 micropayments. Every agent is registered on-chain via SNS domains, paid through Umbra stealth addresses, and selected through sovereign on-device embeddings (QVAC) or deterministic routing.

---

## Table of Contents

- [What is Aldor?](#what-is-aldor)
- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Why Solana?](#why-solana)
- [Tech Stack](#tech-stack)
- [Integrations](#integrations)
- [Architecture](#architecture)
- [Agent Specialists](#agent-specialists)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Deployment](#deployment)
- [Usage Guide](#usage-guide)
- [Benefits for the Solana Community](#benefits-for-the-solana-community)
- [License](#license)

---

## What is Aldor?

Aldor is an **autonomous agent orchestration platform** that enables:

- **Hire AI agents on-demand** — 18 specialized agents from weather lookup to smart contract audits
- **Pay per request** — x402 micropayments in SOL or Palm USD (0.0001–0.015 USD per request)
- **Privacy by default** — All payments route through Umbra stealth addresses
- **Sovereign routing** — Local QVAC embeddings match queries to agents without external LLM calls
- **Real-time observability** — Live execution trace with session IDs, tx fingerprints, and stealth hashes
- **Fiat on-ramp** — Fund your wallet via Dodo Payments

Think of it as an **open AI agent marketplace** where every agent is a first-class economic citizen on Solana with its own wallet, reputation, and pricing.

---

## The Problem

Current AI agent platforms suffer from:

1. **No native payments** — Agents run for free or require monthly subscriptions, preventing micro-transactions
2. **No privacy** — Payment traces link users directly to AI usage patterns
3. **Centralized routing** — Cloud LLMs decide which agent to call, leaking query data
4. **No on-chain reputation** — Anyone can claim to be a "smart contract auditor" with no verifiable track record
5. **High latency** — Recursive multi-agent chains trigger 5–10 payments per query
6. **Fiat friction** — Getting stablecoins to pay agents requires CEX onboarding

---

## The Solution

Aldor solves these with a **single-shot, privacy-preserving, on-chain agent economy**:

| Problem | Aldor Solution |
|---------|---------------|
| No payments | x402 protocol: per-request micropayments in SOL or Palm USD |
| No privacy | Umbra stealth addresses hide recipient + amount on-chain |
| Centralized routing | QVAC local embeddings run 100% on-device |
| No reputation | On-chain registry with reputation scores per agent |
| High latency | Single-shot agents: 1 payment → 1 LLM call → 1 response |
| Fiat friction | Dodo Payments on-ramp: card → Palm USD in 30 seconds |

---

## Why Solana?

Solana is the only chain that makes this viable:

- **$0.00025 per transaction** — micropayments of $0.001 are actually profitable
- **400ms finality** — user waits <2 seconds from query to result
- **SNS domains** — human-readable agent IDs (`weather.aldor.sol`) with on-chain resolution
- **SPL token standard** — Palm USD stablecoin for denominated agent pricing
- **Rich ecosystem** — Umbra, Bonfida, Jupiter, Helius all production-ready

Other chains charge $0.50–$2.00 per transaction. At Aldor's price point ($0.001–$0.015 per request), only Solana's sub-cent fees work.

---

## Tech Stack

### Backend
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 + TypeScript 5.8 |
| Framework | Express 4.21 |
| Blockchain | @solana/web3.js 1.98 + @solana/spl-token 0.4 |
| Program Framework | Anchor 0.32 |
| Local AI | @qvac/sdk 0.10 (llama.cpp embeddings) |
| Payment SDK | Custom x402 SDK with Umbra integration |

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14.2 (App Router) |
| Language | TypeScript 5.4 |
| Styling | Tailwind CSS 3.4 + shadcn/ui |
| Animation | Framer Motion |
| Charts | Recharts |
| Wallet | @solana/wallet-adapter-react |

### Infrastructure
| Service | Provider |
|---------|----------|
| RPC | Helius (devnet + mainnet) |
| Analytics | Covalent API |
| Fiat On-ramp | Dodo Payments |
| Privacy | Umbra Protocol v4 |
| Domains | Bonfida SPL Name Service |

---

## Integrations

### 1. Umbra Privacy Protocol
All agent payments route through Umbra stealth addresses:
- **Stealth keys** — Ephemeral one-time addresses per transaction
- **Amount hiding** — Observers cannot see how much was paid
- **Fingerprinting** — Each tx shows `FP:XXXXXXXX` + `Stealth:XXXXXXXX` for auditability without exposing real addresses

### 2. Bonfida SNS
Agents are identified by `.sol` domains:
```
weather.aldor.sol → Bonfida SNS → Solana Pubkey → Payment routing
```
This lets agents rotate wallets without changing their public identifier.

### 3. QVAC Embeddings
Local on-device vector similarity for agent routing:
- Model: `nomic-embed-text-v1.5.Q4_K_M.gguf` (84MB)
- Runtime: llama.cpp via @qvac/sdk
- Operation: Cosine similarity between query embedding and agent description vectors
- Fallback: Deterministic keyword routing if QVAC is disabled

### 4. Covalent Analytics
On-chain data indexing for:
- Agent wallet balances (SOL + Palm USD)
- Recent transaction history
- Payment velocity graphs (tx per 5-minute bucket)

### 5. Palm USD SPL Token
Aldor uses **Palm USD** as its primary stablecoin for agent payments:

- **Devnet**: We created a custom Palm USD SPL token (`HU59RWU1di1ez7XD8awcb9WJD1hfHNTYcv67nBDbboxJ`) because no official devnet mint existed. This allows testing the full payment flow without mainnet costs.
- **Mainnet**: Uses the official Palm USD mint (`CZzgUBvxaMLwMhVSLgqJn3npmxoTo6nzMNQPAnwtHF3s`)
- **Pricing**: All Palm USD-denominated agents use `priceAtomic` values that are divided by `1_000_000` to get human-readable amounts
- **Token**: 6 decimals, standard SPL token implementation

> **Note**: The devnet Palm USD is a mock token for testing. In production, always use the mainnet mint or a verified stablecoin.

### 6. Dodo Payments
Fiat on-ramp integration:
- Card / Apple Pay / Google Pay → Palm USD
- Same-tab redirect with success/cancel banners
- Webhook support for payment confirmations

---

## Architecture

```
User Wallet
    │
    ├─ x402 Challenge ──► Orchestrator (Express)
    │                         │
    │                         ├─ SNS Resolution (Bonfida)
    │                         ├─ QVAC Embeddings (local)
    │                         ├─ Umbra Stealth Pay
    │                         │       │
    │                         │       ▼
    │                         │   Agent Specialists (18 agents)
    │                         │       │
    │                         │       ├─ LLM Providers (Groq/Gemini/Anthropic)
    │                         │       └─ Covalent (balance check)
    │                         │
    │                         └─ Payment Ledger (in-memory + on-chain)
    │
    └─ Dodo Payments ◄─── Fiat On-ramp
```

**Key design decisions:**
- **Single-shot agents** — 1 payment = 1 LLM call = 1 response (no recursive chains)
- **Universal payload** — Every request includes `{ text: query }` as fallback
- **Deterministic routing** — `ruleBasedPlanner` in `manager.ts` routes by keyword with no ambiguity
- **Wallet-signed mode** — User approves each payment via wallet popup (not server-signed)

---

## Agent Specialists

| Agent | Domain | Price | Category | Description |
|-------|--------|-------|----------|-------------|
| WeatherBot | weather.aldor.sol | 0.001 SOL | Utility | Real-time weather lookup |
| Summarizer | summarizer.aldor.sol | 0.0001 Palm | NLP | Text summarization |
| MathSolver | math.aldor.sol | 0.0003 Palm | Utility | Step-by-step math solver |
| SentimentAI | sentiment.aldor.sol | 0.0001 Palm | NLP | Sentiment analysis |
| CodeExplainer | code-explainer.aldor.sol | 0.0004 Palm | Code | Explain code in plain English |
| TranslateBot | translate.aldor.sol | 0.0003 Palm | NLP | Multi-language translation |
| **DeepResearch** | research.aldor.sol | **0.008 Palm** | Research | Deep topic analysis |
| **CodingAgent** | coding.aldor.sol | **0.015 Palm** | Code | Code generation + review |
| SovereignSpecialist | sovereign.aldor.sol | 0.0025 Palm | QVAC | Local QVAC inference |
| DataAnalyst | data.aldor.sol | 0.0008 Palm | Analytics | Data analysis + insights |
| ContractAuditor | audit.aldor.sol | 0.0015 Palm | Security | Smart contract audit |
| DeFiStrategist | defi.aldor.sol | 0.0012 Palm | Finance | Yield farming strategies |
| ImageGenerator | image.aldor.sol | 0.002 Palm | Creative | Image prompt generation |
| MarketOracle | oracle.aldor.sol | 0.005 SOL | Finance | Market data + signals |
| LegalAdvisor | legal.aldor.sol | 0.003 Palm | Legal | Contract review |
| SocialMediaBot | social.aldor.sol | 0.0006 Palm | Marketing | Content generation |
| TradingBot | trading.aldor.sol | 0.005 Palm | Finance | Trading signals |
| MedicalAdvisor | medical.aldor.sol | 0.0018 Palm | Health | Symptom analysis |

**Complex agents** (DeepResearch, CodingAgent) charge higher prices but remain single-shot.

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm 10+
- Solana wallet (Phantom, Solflare, Backpack)
- API keys: Groq, Gemini, Dodo, Covalent

### Clone & Install
```bash
git clone <repo-url>
cd aldor

# Install root dependencies (server + shared)
npm install

# Install frontend dependencies
npm run frontend:install
```

### Environment Variables

Create `server/.env`:

```bash
# ── Solana Blockchain ──
ALDOR_PROGRAM_ID=2km5TwkgiaDWfAyojtntyj5Djuz6ivcBVvWR8SSR4DQj
SOLANA_CLUSTER=devnet
SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
PALM_USD_MINT_DEVNET=HU59RWU1di1ez7XD8awcb9WJD1hfHNTYcv67nBDbboxJ
PALM_USD_MINT_MAINNET=CZzgUBvxaMLwMhVSLgqJn3npmxoTo6nzMNQPAnwtHF3s
SERVER_BASE_URL=http://127.0.0.1:3002
ALDOR_PAYMENT_MODE=wallet
MOCK_PAYMENTS=false
UMBRA_ENABLED=true
UMBRA_SDK_MODULE=@umbra-privacy/sdk

# Payer secret (dev only — server signs payments in server mode)
ALDOR_PAYER_SECRET_KEY=[your-secret-array]

# ── LLM Providers ──
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIzaSy...

# ── Integrations ──
COVALENT_API_KEY=cqt_...
DODO_API_KEY=your-dodo-key

# ── Agent Wallets ──
ALDOR_AGENT_WALLET_MAP={"weather.aldor.sol":"A37t...",...}
ALDOR_UMBRA_STEALTH_MAP={"weather.aldor.sol":"A37t...",...}
ALDOR_UMBRA_SECRET_MAP={"weather.aldor.sol":"5JbC...",...}

# ── QVAC (optional) ──
QVAC_EMBED_ENABLED=true
QVAC_EMBED_MODEL_SRC=/path/to/nomic-embed-text-v1.5.Q4_K_M.gguf
```

> **⚠️ Security Note — What to keep secret vs. what is safe to expose:**
>
> **🔒 NEVER expose these (keep in `.env` only):**
> - `ALDOR_PAYER_SECRET_KEY` — This is a private key. If leaked, anyone can drain the payer wallet.
> - `ALDOR_UMBRA_SECRET_MAP` — Contains Umbra stealth private keys. Leaking this breaks privacy guarantees.
> - `GROQ_API_KEY`, `GEMINI_API_KEY`, `COVALENT_API_KEY`, `DODO_API_KEY` — API keys with billing attached.
>
> **✅ SAFE to expose (public information):**
> - `ALDOR_PROGRAM_ID` — On-chain program ID is public on the blockchain.
> - `PALM_USD_MINT_DEVNET` / `PALM_USD_MINT_MAINNET` — Token mint addresses are public.
> - `ALDOR_AGENT_WALLET_MAP` / `ALDOR_UMBRA_STEALTH_MAP` — Agent wallet addresses are public (they receive payments).
> - `SOLANA_CLUSTER`, `SERVER_BASE_URL`, `UMBRA_ENABLED` — Configuration flags, not secrets.
>
> **Recommendation**: Use a secrets manager (e.g., Vercel Env, AWS Secrets Manager, or 1Password) in production. Never commit `.env` to git.

---

## Running Locally

### 1. Build the server
```bash
npm run build
```

### 2. Start the backend
```bash
npm run server:start
# Server runs on http://127.0.0.1:3002
```

### 3. Start the frontend (new terminal)
```bash
npm run client:dev
# Next.js dev server on http://localhost:3000
```

### 4. Open the app
Navigate to `http://localhost:3000/home`

---

## Deployment

### Backend (VPS / Railway / Fly.io)
```bash
npm run build
node --env-file=server/.env dist/server/src/main.js
```

### Frontend (Vercel)
```bash
cd frontend
vercel --prod
```

### Key deployment notes:
- Set `SERVER_BASE_URL` to your production backend URL
- Set `ALDOR_PAYMENT_MODE=wallet` for production (users sign their own payments)
- Set `MOCK_PAYMENTS=false` for real on-chain settlements
- Ensure `ALDOR_AGENT_WALLET_MAP` points to real agent wallets

---

## Usage Guide

### 1. Connect Wallet
Click the wallet button in the sidebar. Aldor supports Phantom, Solflare, Backpack, and any Wallet Standard adapter.

### 2. Fund with Palm USD
- Click **Fund Wallet** → Dodo on-ramp
- Pay with card / Apple Pay / Google Pay
- Return to Aldor with auto-refreshed balance

### 3. Send a Query
Type any request in the Agent Terminal:
```
"Research the latest Solana ecosystem trends"
"Write a Solana Anchor program for an NFT marketplace"
"Analyze best yield farming strategies on Solana"
"What is the weather in San Francisco?"
```

### 4. Observe Execution
The terminal shows:
- Your query
- Orchestrator planning (internal)
- **Final result only** (markdown stripped for readability)

### 5. Monitor Privacy
Navigate to **Privacy Integration** to see:
- Shielded tx count
- Total Palm USD volume
- Stealth address fingerprints
- Per-tx stealth hashes

### 6. Browse Analytics
- **Live Analytics** — Covalent-powered volume charts
- **Economic Topology** — Agent balance network + platform architecture diagram
- **Execution Trace** — Real-time SSE event stream

---

## Benefits for the Solana Community

### 1. Proves Solana is the Best Chain for AI Payments
Aldor demonstrates that Solana's sub-cent fees make **per-request micropayments viable**. At $0.001 per request, agents can charge per-use instead of monthly subscriptions. This is impossible on Ethereum ($2–$50 per tx) or even L2s ($0.10–$0.50).

### 2. Privacy-Preserving AI Economy
By integrating Umbra, Aldor shows that **AI usage can be private**. Users don't have to leak their query patterns + payment history to a central company. Every agent payment is shielded.

### 3. Open Agent Marketplace
Aldor is a template for anyone to launch their own agent. Add your agent to `agents.ts`, give it an SNS domain, set a price, and it's live. No gatekeepers.

### 4. Real-World x402 Adoption
x402 is an emerging payment standard. Aldor is one of the first production implementations showing **x402 + wallet-signed + stealth** working end-to-end.

### 5. Local Sovereign Compute (QVAC)
QVAC proves that **routing doesn't need cloud LLMs**. Embeddings run on-device with llama.cpp, keeping query data local. This is critical for regulated industries (healthcare, legal, finance).

### 6. Developer Tooling
Aldor ships with:
- Live execution trace for debugging
- Integration diagnostics endpoint
- Payment activity API
- Agent balance monitoring
- Dodo webhook handler

These tools make it easy for developers to build **their own** agentic apps on Solana.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agent/query` | Submit query to orchestrator |
| GET | `/api/agent/events?session=` | SSE event stream |
| GET | `/api/agents` | List registered agents |
| GET | `/api/analytics/payment-activity` | Live volume + balances |
| POST | `/api/dodo/fund` | Create fiat on-ramp |
| GET | `/api/integrations/diagnostics` | Health check |

---

## Project Structure

```
aldor/
├── frontend/                 # Next.js 14 dashboard
│   ├── app/(dashboard)/      # Dashboard pages
│   │   ├── home/             # Agent terminal
│   │   ├── agents/           # Agent marketplace
│   │   ├── analytics/        # Covalent analytics
│   │   ├── privacy/          # Umbra tx log
│   │   ├── topology/         # Platform diagram
│   │   ├── trace/            # Execution trace
│   │   ├── sns/              # SNS resolution
│   │   ├── qvac/             # QVAC embeddings
│   │   └── docs/             # Documentation
│   ├── components/           # Reusable components
│   └── public/               # Static assets
├── server/src/               # Express backend
│   ├── agents.ts             # Agent registry + pricing
│   ├── manager.ts            # Orchestrator + planner
│   ├── specialists.ts        # Agent handlers
│   ├── qvac.ts               # Local embeddings
│   ├── diagnostics.ts        # Integration health
│   ├── analytics.ts          # Payment activity
│   └── app.ts                # Express routes
├── sdk/                      # x402 payment SDK
├── agent/                    # Rust agent (optional)
└── models/                   # QVAC model files
```

---

## License

MIT — Built for the Solana community.

---

## Acknowledgments

- **Helius** — RPC infrastructure
- **Umbra** — Privacy protocol
- **Bonfida** — SNS resolution
- **Covalent** — Blockchain analytics
- **Dodo Payments** — Fiat on-ramp
- **QVAC** — Local embeddings
- **x402** — Payment protocol

**Built with ❤️ on Solana.**

**Note:** This project currently supports **devnet only** (tested on devnet). It can support **mainnet** if you provide real mainnet API keys and configure the appropriate mainnet RPC endpoints and token mints.
