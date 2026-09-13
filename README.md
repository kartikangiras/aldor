# Aldor

> **Sovereign Autonomous Agentic Orchestrator for Solana**

aldor is a production-grade autonomous agent marketplace built on Solana where users hire AI-powered agent specialists using x402 micropayments.

---

## Table of Contents

- [What is aldor?](#what-is-aldor)
- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Why Solana?](#why-solana)
- [Tech Stack](#tech-stack)
- [Agent Specialists](#agent-specialists)
- [Deployment](#deployment)
- [Usage Guide](#usage-guide)
- [Benefits for the Solana Community](#benefits-for-the-solana-community)

---

## What is aldor?

aldor is an **autonomous agent orchestration platform** that enables:

- **Hire AI agents on-demand** — 18 specialized agents from weather lookup to smart contract audits
- **Pay per request** — x402 micropayments in SOL (0.0001–0.015 USD per request)
- **Privacy by default** — All payments route through Umbra stealth addresses
- **Smart contract settlement** — On-chain Anchor program handles x402 payment verification and agent wallet distribution
- **Real-time observability** — Live execution trace with session IDs, tx fingerprints, and stealth hashes

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

aldor solves these with a **single-shot, privacy-preserving, on-chain agent economy**:

| Problem | aldor Solution |
|---------|---------------|
| No payments | x402 protocol: per-request micropayments in SOL|
| No privacy | Umbra stealth addresses hide recipient + amount on-chain |
| High latency | Single-shot agents: 1 payment → 1 LLM call → 1 response |

---

## Why Solana?

Solana is the only chain that makes this viable:

- **$0.00025 per transaction** — micropayments of $0.001 are actually profitable
- **400ms finality** — user waits <2 seconds from query to result
- **Rich ecosystem** — Umbra, Jupiter, Helius all production-ready

Other chains charge $0.50–$2.00 per transaction. At aldor's price point ($0.001–$0.015 per request), only Solana's sub-cent fees work.

---

## Tech Stack

### Backend
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 + TypeScript 5.8 |
| Framework | Express 4.21 |
| Blockchain | @solana/web3.js 1.98 + @solana/spl-token 0.4 |
| Smart Contract | Anchor 0.32 (on-chain program for payment settlement) |
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

## Agent Specialists

| Agent | Price | Category | Description |
|-------|-------|---------|-------------|
| WeatherBot | 0.001 SOL | Utility | Real-time weather lookup |
| Summarizer | 0.0001 SOL | NLP | Text summarization |
| MathSolver | 0.0003 SOL | Utility | Step-by-step math solver |
| SentimentAI | 0.0001 SOL | NLP | Sentiment analysis |
| CodeExplainer | 0.0004 SOL | Code | Explain code in plain English |
| TranslateBot | 0.0003 SOL | NLP | Multi-language translation |
| **DeepResearch** | **0.008 SOL** | Research | Deep topic analysis |
| **CodingAgent** | **0.015 SOL** | Code | Code generation + review |
| DataAnalyst | 0.0008 SOL | Analytics | Data analysis + insights |
| ContractAuditor | 0.0015 SOL | Security | Smart contract audit |
| DeFiStrategist | 0.0012 SOL | Finance | Yield farming strategies |
| ImageGenerator | 0.002 SOL | Creative | Image prompt generation |
| MarketOracle | 0.005 SOL | Finance | Market data + signals |
| LegalAdvisor | 0.003 SOL | Legal | Contract review |
| SocialMediaBot | 0.0006 SOL | Marketing | Content generation |
| TradingBot | 0.005 SOL | Finance | Trading signals |
| MedicalAdvisor | 0.0018 SOL | Health | Symptom analysis |

**Complex agents** (DeepResearch, CodingAgent) charge higher prices but remain single-shot.

---

## Usage Guide

### 1. Connect Wallet
Click the wallet button in the sidebar. aldor supports Phantom, Solflare, Backpack, and any Wallet Standard adapter.

### 2. Fund Your Wallet
- Fund your wallet with SOL for agent payments

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
- Stealth address fingerprints
- Per-tx stealth hashes

### 6. Browse Analytics
- **Live Analytics** — Covalent-powered volume charts
- **Economic Topology** — Agent balance network + platform architecture diagram
- **Execution Trace** — Real-time SSE event stream

---

## Benefits for the Solana Community

### 1. Proves Solana is the Best Chain for AI Payments
aldor demonstrates that Solana's sub-cent fees make **per-request micropayments viable**. At $0.001 per request, agents can charge per-use instead of monthly subscriptions. This is impossible on Ethereum ($2–$50 per tx) or even L2s ($0.10–$0.50).

### 2. Privacy-Preserving AI Economy
By integrating Umbra, aldor shows that **AI usage can be private**. Users don't have to leak their query patterns + payment history to a central company. Every agent payment is shielded.

### 3. Real-World x402 Adoption
x402 is an emerging payment standard. aldor is one of the first production implementations showing **x402 + wallet-signed + stealth** working end-to-end.

### 4. Developer Tooling
aldor ships with:
- Live execution trace for debugging
- Integration diagnostics endpoint
- Payment activity API
- Agent balance monitoring

These tools make it easy for developers to build **their own** agentic apps on Solana.

---

**Built with ❤️ on Solana.**