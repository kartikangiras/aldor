# Aldor Grant Draft

**Project Title**
> Aldor: The X402 Paid HTTP Tool Network

**One Line Description**
> Aldor is a Solana-native X402 network where an orchestrator pays specialist agents over HTTP in Palm USD before retrying requests with on-chain proof.

**TG username**
> t.me/kartikangiras

**Project Details**
> Aldor turns AI agents into paid HTTP services. A central orchestrator calls specialist agents, receives a 402 challenge, settles the task on-chain, and retries with proof.
>
> MVP: 1 orchestrator, 2 specialist services, recursive hiring with max depth and budget headers.
>
> Track integrations: Palm USD for stable pricing, SNS for agent domains, Dune for receipt indexing.

**Deadline**
> May 11, 2026

**Personal GitHub Profile**
> @kartikangiras

**Colosseum Crowdedness**
> Prompt: Been hearing a lot about Automated AI agents workflows,i want to build an autonomous agent
  economy built on Solana. It implements the X402 (Payment Required) protocol to enable recursive
  machine-to-machine (M2M) hiring. Instead of isolated chatbots, allows AI agents to dynamically
  hire specialized sub-agents, automatically negotiating and settling micropayments on-chain
  before returning the computed results.

*GPT 5.4-Codex Solution*

I’ve confirmed the protocol basics from the official x402 docs, including Solana devnet/mainnet
  support and the HTTP 402 payment flow. I’m now turning that into a concrete system design for
  your agent marketplace idea.

• This is a viable direction if you frame it as a paid HTTP tool network, not as “agents sending
  money to each other” in the abstract.

  The clean version is:

  - An orchestrator agent receives a goal.
  - It decomposes the goal into subtasks.
  - It discovers specialist sub-agents through a registry.
  - Each specialist is exposed as an HTTP service that can return 402 Payment Required when unpaid.
  - The orchestrator settles the request on Solana, gets a receipt, and uses the result.
  - The specialist can itself hire another specialist, but only within strict budget and depth
    limits.

  Why this fits x402:

  - x402 is designed for machine-to-machine payments over HTTP.
  - It uses the 402 Payment Required flow.
  - It supports Solana along with SPL Tokens such as Palm USD etc.
  - It is explicitly meant for programmatic access without accounts or session friction.

  What I would build first:

  - One orchestrator agent.
  - Two specialist services, for example research and summarize.
  - A simple on-chain payment flow on Solana USDC.
  - A registry that lists capability, price, and response schema.
  - A hard spend policy: max depth, max total cost, allowlisted services.

  Minimal architecture:

  - agent-orchestrator: plans, budgets, routes, and composes results.
  - agent-registry: searchable catalog of services and pricing.
  - x402-gateway: handles 402 challenge, payment signing, verification, settlement.
  - specialist-agent: any HTTP service that can execute a task after payment.
  - ledger/indexer: stores receipts, service reputation, latency, and failure rates.

  The main risks are:

  - Runaway recursion if you do not cap depth and budget.
  - Micropayment overhead if tasks are too small.
  - Trust and quality if any agent can advertise itself as “specialized.”
  - Refund/dispute handling if a service accepts payment but returns garbage.
  - Latency if every nested step requires a full payment round-trip.

  The best MVP is narrow:

  - One use case only, like “research and produce a report.”
  - One chain, Solana devnet first.
  - Solana USDC support along with SPLs.
  - One payment path.
  - One reputation metric.
  - One failure mode: retry or abort, no complex dispute system yet.

  My recommendation:

  - Treat “recursive hiring” as a controlled workflow primitive.
  - Start with a marketplace for paid agent tools.
  - Add recursion only after the basic pay-to-execute loop is reliable.

  Sources:

  - x402 docs: https://docs.x402.org/
  - x402 network and token support: https://docs.x402.org/core-concepts/network-and-token-support
  - x402 HTTP 402 concept: https://docs.x402.org/core-concepts/http-402

**AI Session Transcript**
> `./codex-session.jsonl`

**Goals and Milestones**

Milestone 1: Multi-Asset On-Chain Foundation

Core Deliverable: Deploy aldor-escrow Anchor program to Devnet.

Sidetrack Deliverable (Palm USD): Implement the PalmUSD_Settlement logic. This specifically requires initializing the program's vault to handle the Palm USD Mint and ensuring the escrow state can track stablecoin balances separately from native SOL.

Key Features: Support for Native SOL and Palm USD; Task-ID locking mechanism.

Milestone 2: The Identity-Aware Handshake (SDK)





Core Deliverable: aldor-sdk TypeScript/Node.js library.



Sidetrack Deliverable (SNS Identity): Integration of the SNS SDK. The deliverable is a resolveAgent() utility that allows the SDK to accept research.aldor.sol as a destination and programmatically fetch the corresponding wallet address via the Solana Name Service.



Key Features: 402 interceptor; Automated signing via local keypair; SNS-to-Pubkey mapping.

Milestone 3: Guarded Recursive Economy





Core Deliverable: Launch Orchestrator + 2 Specialists (Researcher/Summarizer).



Key Features: Implementation of the Hard Spend Policy headers (X-Aldor-Max-Depth, X-Aldor-Budget-Remaining).



Validation: Successful 3-step recursive loop (Manager → Researcher → Summarizer) where each hop is settled via the X402 handshake.

Milestone 4: The Verifiable Data Ledger





Core Deliverable: Integration of the Aldor Operator Dashboard.



Sidetrack Deliverable (Dune Analytics): A public Dune Dashboard indexing your aldor-escrow contract. The deliverable includes SQL queries that track "Agentic GDP" (volume in Palm USD/SOL) and "Economic Velocity" (frequency of handshakes).



Key Features: Real-time indexing of settlement success-to-failure ratios.

Milestone 5: Final Polish & "Frontier" Submission





Core Deliverable: 3-minute technical demo video and GitHub repo.



Sidetrack Deliverable (UX/Visuals): A Cyber-Minimalist Dashboard UI. The deliverable is a functional Next.js interface that visually displays SNS domain resolutions, live Palm USD transfer logs, and the Dune chart embeds for the judges.



**Primary KPI**
> Successful paid agent-to-agent requests per day.