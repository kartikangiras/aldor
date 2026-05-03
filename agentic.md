# ALDOR — Complete Implementation Plan
## x402 Paid HTTP Tool Network · Solana Native
### Colosseum Hackathon · Deadline: May 11, 2026

---

> **Purpose of this document:** This is a complete architectural implementation plan to be used as an LLM build prompt. It contains no code. It contains system design, component responsibilities, data flows, inter-service contracts, and phase-by-phase verification checklists. Every section is written to be directly actionable by an LLM generating the actual implementation.

---

## Reference Architecture

Aldor's `aldor-escrow` Anchor program
Aldor's `x402-solana` middleware using `@solana/web3.js`
 Aldor's SOL/Palm USD SPL dual-token settlement
Aldor's `explorer.solana.com` links
 Aldor's CLI agent with SNS resolution
 Aldor's frontend with identical layout, Solana-native data, plus a new Dune Analytics embed component

Everything that does at the application layer — recursive hiring, autonomous cost evaluation, reputation scoring, live topology graph, protocol trace inspector, transaction log — is replicated exactly. Only the blockchain layer changes.

---

## System Overview

Aldor is a network where a central orchestrator agent receives a natural-language goal, decomposes it into subtasks using an LLM, discovers specialist agents through a registry, pays each specialist over HTTP using the x402 Payment Required protocol settled on Solana, and composes results. Specialists can themselves recursively hire sub-specialists, but only within strict budget and depth limits enforced through HTTP headers.

The three categories of participants are:

**Orchestrator (Manager Agent):** The entry point. Receives a user query. Uses an LLM to plan which specialists to hire. Evaluates each specialist by a value score (reputation squared divided by price times ten thousand, mirroring exactly). Initiates x402 payment flows. Enforces hard spend policy. Emits every decision and payment event over Server-Sent Events so the frontend topology graph updates in real time.

**Specialist Agents (Worker Services):** Exposed as HTTP services behind x402 middleware. Any HTTP request to a specialist without a valid payment proof receives a 402 Payment Required response containing the Solana payment challenge. After the client settles on-chain and retries with the X-Payment header, the middleware verifies the transaction signature on Solana and allows the request through. Specialists that are marked recursive can themselves act as orchestrators for their own sub-tasks.

**Aldor Escrow Program (Anchor/Rust):** The on-chain arbiter. Handles agent registration, job lifecycle (pending → completed or failed), SOL and Palm USD SPL escrow, reputation updates in basis points, and emits events that Dune Analytics indexes.

---

## Monorepo Structure

The project is organized as an npm workspaces monorepo with the following top-level folders:

**contracts/** — The Anchor/Rust smart contract workspace. Contains the `aldor-escrow` program, its Anchor.toml configuration targeting Solana Devnet, and a TypeScript test suite using Mocha and Chai via `ts-mocha`.

**server/** — The Express.js + TypeScript server. This is the runtime home of both the orchestrator (manager agent) and all specialist agents. It exposes a REST API and a Server-Sent Events stream. It contains the x402 middleware, the Solana payment facilitator, the manager planning logic, individual specialist route handlers, and the SNS resolution utility.

**agent/** — A standalone Node.js CLI. Allows a developer to send queries directly from the terminal, observe the full x402 handshake in the console, and test recursive hiring without the frontend.

**client/** — A Next.js 14 App Router application. Contains the live dashboard with all seven UI components and the Dune Analytics embed. Communicates with the backend exclusively via REST POST and SSE GET.

**sdk/** — The `aldor-sdk` TypeScript library. Contains the Axios 402 interceptor, the keypair-based Solana payment signer, and the SNS-to-public-key resolution utility. Both the backend and the CLI agent import from this package.

The root `package.json` defines npm workspaces covering all five directories and top-level scripts for installing all dependencies, running each service in development mode, and building and testing the contract.

---

## Phase 1 — On-Chain Foundation (Anchor Escrow Program)

### What This Phase Delivers

A deployed Anchor program on Solana Devnet that serves as the financial backbone of the network. Every payment, job, and reputation update flows through this program. It replaces `agent-registry.clar` Clarity contract with equivalent functionality in Rust/Anchor.

### Account Structures

The program manages two primary account types:

**AgentAccount** stores permanent metadata about a registered specialist. Its fields are: the owner public key, a human-readable name (up to 64 characters), a category string (up to 32 characters, e.g. "research", "nlp", "utility"), the price in lamports for SOL-denominated agents, a boolean flag for Palm USD acceptance, the SNS domain string (e.g. "research.aldor.sol"), a reputation score stored as a u64 in basis points (0 to 10,000), total jobs completed, successful jobs completed, an active flag, and a Unix timestamp for registration. Account size must be calculated to include all string maximums plus Anchor discriminator (8 bytes).

**JobAccount** stores the lifecycle state of a single paid task. Its fields are: a 32-byte task ID (derived as a keccak256 hash of orchestrator public key concatenated with a nonce), the orchestrator public key, the specialist public key, a description string, the SOL payment amount in lamports, the Palm USD payment amount in micro-units, an optional parent task ID for recursive jobs, the current depth as a u8, a status enum (Pending, Completed, or Failed), an optional 32-byte result hash, a creation timestamp, and an optional completion timestamp.

### Program Instructions

**register_agent** initializes an AgentAccount PDA for a given owner. Seeds for the PDA are `[b"agent", owner_pubkey]`. The instruction validates that the SNS domain string is within length limits and sets initial reputation to 5,000 basis points (50%).

**create_job** initializes a JobAccount PDA using seeds `[b"job", task_id]` and a companion escrow PDA using seeds `[b"escrow", task_id]`. It enforces that depth does not exceed the constant MAX_DEPTH (3). For SOL payments it transfers lamports from the orchestrator to the escrow PDA using the System Program CPI. For Palm USD payments it transfers SPL tokens from the orchestrator's associated token account to an escrow vault token account using the Token Program CPI. It emits a JobCreated event containing all fields needed by Dune.

**complete_job** is callable only by the specialist who is the designated recipient of the job. It transitions JobAccount status from Pending to Completed, records the result hash, adds REPUTATION_REWARD (50 basis points) to the agent's reputation (clamped to 10,000 maximum), and releases the escrowed funds to the specialist. It emits a JobCompleted event.

**fail_job** transitions JobAccount status from Pending to Failed, subtracts REPUTATION_PENALTY (100 basis points) from the agent's reputation (clamped to 0 minimum), and refunds the escrowed funds to the orchestrator. It emits a JobFailed event.

**update_price** allows the agent owner to update their price in lamports. It requires that the signer is the account owner and emits a PriceUpdated event.

### On-Chain Events

The program emits structured events using Anchor's `#[event]` macro. These are the events that get parsed by the backend indexer and pushed to Dune: JobCreated (task_id, orchestrator, specialist, payment_sol, payment_palm_usd, depth), JobCompleted (task_id, result_hash, reputation), JobFailed (task_id, reason string), PriceUpdated (agent, new_price). All public keys and byte arrays must be serializable to base58 strings for the Dune pipeline.

### Phase 1 Verification Checklist

- `anchor build` succeeds with no warnings
- `anchor deploy --provider.cluster devnet` produces a program ID
- Anchor test suite runs `register_agent` and reads back all fields correctly from the AgentAccount
- Anchor test suite creates a job with SOL payment and confirms the escrow PDA holds the correct lamport balance
- Anchor test suite creates a job with Palm USD SPL payment and confirms the escrow vault token account holds the correct token amount
- Anchor test suite calls `complete_job` and confirms SOL or SPL tokens moved to the specialist wallet
- Anchor test suite calls `fail_job` and confirms refund to orchestrator and reputation penalty applied
- Anchor test suite confirms that a `create_job` call with depth=4 fails with the MaxDepthExceeded error
- Program ID is recorded in Anchor.toml and in the backend `.env` file

---

## Phase 2 — SDK and Identity Layer

### What This Phase Delivers

The `aldor-sdk` package: a reusable TypeScript library that abstracts the x402 payment handshake, keypair signing, and SNS domain resolution. Both the backend orchestrator and the CLI agent import from this SDK. This mirrors internal SDK utilities but targets Solana.

### SDK Modules

**x402 Interceptor** (`interceptor.ts`) — An Axios request interceptor that wraps any outbound HTTP call. When the response status is 402, it reads the challenge body, calls the payment signer, builds the X-Payment header, and automatically retries the original request with that header attached. It also appends the X-Aldor-Max-Depth and X-Aldor-Budget-Remaining headers to every request so specialists can enforce the spend policy. The interceptor exposes a factory function that accepts a keypair and a budget configuration object and returns a configured Axios instance.

**Payment Signer** (`signer.ts`) — Accepts a 402 challenge object (containing the payment target, amount, asset type, and resource URL), builds the appropriate Solana transaction (SOL transfer or Palm USD SPL transferChecked instruction), signs it using the provided Keypair, broadcasts it to the configured RPC endpoint with `sendRawTransaction`, confirms it with `confirmTransaction`, and returns a base64-encoded proof object containing the transaction signature, payer public key, amount, and asset mint address. The proof object is what goes into the X-Payment header.

**SNS Resolver** (`sns.ts`) — Exports a single `resolveAgent(domain: string): Promise<string>` function. It calls `@bonfida/spl-name-service`'s `resolve` function to look up the owner public key of a `.sol` domain. For Devnet where subdomain resolution for `aldor.sol` subdomains may not yet be registered, the function falls back to a static map read from environment variables. The function returns the public key as a base58 string. The manager uses this before every x402 payment to obtain the specialist's wallet address.

**Palm USD Transfer Builder** (`palmUsd.ts`) — Exports a function that accepts a from public key, to public key, and amount in dollars (as a float), and returns an unsigned Solana Transaction containing a `transferChecked` instruction for the Palm USD SPL mint using the correct decimal precision (6 decimals). The signer module calls this when the 402 challenge specifies the Palm USD asset.

### Phase 2 Verification Checklist

- `resolveAgent('research.aldor.sol')` returns the expected devnet wallet address (either via SNS or fallback map)
- The Axios interceptor correctly detects a 402 response, calls the signer, and retries with the X-Payment header without any manual intervention from the calling code
- The payment signer builds a valid Palm USD `transferChecked` instruction and the resulting transaction can be simulated on Devnet without error using `simulateTransaction`
- The payment signer builds a valid SOL transfer instruction and that transaction can also be simulated on Devnet
- Both transaction types can be confirmed on Devnet and the resulting signature can be looked up on `explorer.solana.com?cluster=devnet`
- The SDK compiles as a TypeScript library with no errors and can be imported into both the backend and agent packages

---

## Phase 3 — Backend Orchestrator and Specialist Services

### What This Phase Delivers

The full Express.js server with the manager agent, all specialist routes behind x402 middleware, SSE event streaming, and the agent registry endpoint. This is the direct equivalent `backend/src/index.ts` and associated logic.

### x402 Middleware

The middleware is a factory function called `x402Required` that accepts a configuration object containing: price (in lamports or Palm USD micro-units), token type (SOL or PALM_USD), recipient public key, and a task description string. It returns an Express middleware function with the following behavior:

When a request arrives without an X-Payment header, the middleware reads the X-Aldor-Max-Depth and X-Aldor-Budget-Remaining headers. If depth exceeds 3, it returns HTTP 400 with an error code of MAX_DEPTH_EXCEEDED. Otherwise it returns HTTP 402 with a JSON body structured exactly per the x402 specification: an `x402Version` field set to 1, an `accepts` array containing one entry with scheme, network (solana-devnet), maxAmountRequired as a string, resource URL, description, mimeType, payTo as a base58 public key, maxTimeoutSeconds, and asset (either "SOL" or the Palm USD mint address as a base58 string).

When a request arrives with an X-Payment header, the middleware decodes the base64 proof, calls the `verifyPayment` function from the facilitator module, and either calls `next()` (attaching the proof and depth to the request object for logging) or returns HTTP 402 with PAYMENT_INVALID if verification fails.

### Payment Facilitator (Verification Side)

The `verifyPayment` function in `facilitator.ts` accepts the raw X-Payment header string and the middleware configuration. It decodes the base64 JSON proof to extract the transaction signature, payer, amount, and asset. It calls `getParsedTransaction` on the Solana connection. It checks that the transaction has no error in `meta.err`. For SOL payments it looks for a parsed `transfer` instruction where the destination matches the recipient and the lamports are greater than or equal to the configured price. For Palm USD payments it looks for a parsed `transferChecked` instruction where the mint matches `PALM_USD_MINT`, the destination matches the recipient ATA, and the token amount is sufficient. Returns a boolean.

### Manager Agent

The manager is implemented in `manager.ts` and exports a single `runOrchestrator` function that accepts a query string, an EventEmitter for SSE, a budget in Palm USD (defaulting to 0.01), and a recursion depth (defaulting to 0).

**Step 1 — Emit planning event.** The function immediately emits a MANAGER_PLANNING step event with the query and depth.

**Step 2 — LLM decomposition.** It calls the configured LLM (Groq llama-3.3-70b as primary, Claude claude-haiku as fallback, matching approach). The LLM receives the query and a system prompt describing all available specialists, their capabilities, domains, prices, and token types. The LLM returns a JSON array of tasks, each with an agent name, a route suffix, and the input payload for that specialist. The system prompt instructs the LLM to return only JSON with no preamble.

**Step 3 — Autonomous hiring decision.** For each task in the plan, the manager calls `calculateValueScore(reputation, price)` which is exactly `reputation² / (price × 10_000)`. If multiple specialists could handle the same task type, the one with the highest value score is chosen. This function is pure and deterministic given its inputs.

**Step 4 — Budget and depth enforcement.** Before hiring each specialist, the manager checks that adding the specialist's price to `spent` does not exceed `budget`. If it would, a BUDGET_EXCEEDED step event is emitted for that agent and it is skipped.

**Step 5 — SNS resolution.** For each specialist being hired, the manager calls `resolveAgent(specialist.domain)` from the SDK and emits an SNS_RESOLVED step event with the domain and resolved public key.

**Step 6 — x402 hire.** The manager uses the SDK's configured Axios instance (with the 402 interceptor) to POST to the specialist's endpoint. It sets the X-Aldor-Max-Depth and X-Aldor-Budget-Remaining headers. The interceptor handles the full 402 → sign → retry cycle transparently. After a successful response, an X402_SETTLED step event is emitted with the agent name, transaction signature, cost, and total spent so far.

**Step 7 — Result composition.** All specialist results are collected into an array. The manager emits a RESULT_COMPOSED event and returns the concatenated result string.

### Specialist Agents

Each specialist is a route handler in the backend. All follow the same pattern: they are wrapped with `x402Required` middleware configured for their specific price and token type, and their handler function executes the actual task after payment is verified.

The full list of specialists, their endpoint paths, prices, tokens, and recursive capabilities:

**WeatherBot** at `/api/weather` — price 0.001 SOL — not recursive — calls a weather API or returns mock data for the requested location.

**Summarizer** at `/api/summarize` — price 0.0001 Palm USD — not recursive — accepts a text body and returns a condensed summary using an LLM call.

**MathSolver** at `/api/math-solve` — price 0.0003 Palm USD — not recursive — accepts a mathematical expression or word problem and returns the solution.

**SentimentAI** at `/api/sentiment` — price 0.0001 Palm USD — not recursive — accepts text and returns a sentiment label (positive, negative, neutral) with a confidence score.

**CodeExplainer** at `/api/code-explain` — price 0.0004 Palm USD — not recursive — accepts a code snippet and language tag and returns a plain-English explanation.

**TranslateBot** at `/api/agent/translate` — price 0.0003 Palm USD — not recursive — accepts text and a target language code and returns the translation.

**DeepResearch** at `/api/agent/research` — price 0.001 Palm USD — **recursive** — accepts a research topic. After its own payment is verified it acts as a sub-orchestrator: it calls `runOrchestrator` with the topic, its own emitter, its remaining budget (which it receives from the X-Aldor-Budget-Remaining header minus its own cost), and depth incremented by one. This triggers the Manager to hire Summarizer and SentimentAI as sub-agents. It is the primary demonstration of recursive A2A hiring.

**CodingAgent** at `/api/agent/code` — price 0.002 Palm USD — **recursive** — accepts a coding task. After payment it recursively hires CodeExplainer for review.

### SSE Endpoint

The backend exposes a GET `/api/agent/events` endpoint that returns a `text/event-stream` response. The connection is kept alive. An EventEmitter instance is stored on the request object. Each time `runOrchestrator` emits a step event on that emitter, the handler writes it to the SSE stream as `data: <JSON>\n\n`. The frontend subscribes to this endpoint with `new EventSource(...)` on component mount and routes each received event to the appropriate component via React state.

### Agent Registry Endpoint

GET `/api/agents` returns a JSON array of all registered agents with their name, SNS domain, price (formatted as a human-readable string including token type), recursive flag, and current reputation score. This is consumed by the ToolCatalog frontend component.

### Phase 3 Verification Checklist

- Calling POST `/api/agent/research` without any headers returns HTTP 402 with a valid x402 challenge body containing the correct `payTo` address and `asset` (Palm USD mint)
- Calling the same endpoint with a mock X-Payment header containing a real Devnet transaction signature that paid the correct amount returns HTTP 200 with a result
- Calling the same endpoint with a fake transaction signature returns HTTP 402 with PAYMENT_INVALID
- Calling POST `/api/agent/query` with a natural-language research query causes the SSE stream to emit the following events in order: MANAGER_PLANNING, PLAN_CREATED, SNS_RESOLVED, X402_INITIATED, X402_SETTLED, and RESULT_COMPOSED
- The recursive path works: a query that triggers DeepResearch causes DeepResearch to emit its own X402_INITIATED events for Summarizer and SentimentAI, and both of those transactions appear in the SSE stream with depth=1
- Calling POST `/api/agent/query` with depth forced to 4 via the X-Aldor-Max-Depth header causes the backend to return HTTP 400 with MAX_DEPTH_EXCEEDED and no payment attempt is made
- Calling POST `/api/agent/query` with a budget so small that no specialist can be hired causes BUDGET_EXCEEDED events to be emitted for every agent and the response returns an empty result gracefully
- GET `/api/agents` returns a correctly shaped JSON array with all seven specialists and their current reputation scores
- All five Devnet transaction signatures from a full end-to-end run are verifiable on `explorer.solana.com?cluster=devnet`

---

## Phase 4 — Agent CLI

### What This Phase Delivers

A terminal-based client that exercises the full x402 hiring loop without the frontend. Useful for rapid iteration during development and for demonstrating the protocol to judges in the CLI.

### CLI Behavior

The CLI reads from stdin in a REPL loop. When the user types a query and presses enter, the CLI calls the backend `/api/agent/query` endpoint using the SDK's Axios interceptor instance (which handles 402 automatically). It prints each SSE event as it arrives to stdout using a separate SSE client connection. After the result is returned it prints the full result, the total amount spent (in SOL and Palm USD), the number of A2A hires made, and a list of all transaction signatures with their Solana Explorer URLs.

The CLI accepts command-line flags for `--budget`, `--max-depth`, and `--mock-payments`. When `--mock-payments` is set, the payment signer returns a hardcoded simulated signature instead of broadcasting a real transaction, which allows the full hiring loop to be demonstrated without requiring a funded Devnet wallet.

The CLI prints structured output showing each step of the hiring decision: which agent was evaluated, what its value score was, whether it was selected or skipped due to budget, what the SNS domain resolved to, whether the 402 handshake succeeded, and the resulting transaction link.

### Phase 4 Verification Checklist

- Running the CLI with `--mock-payments` and a research query prints all expected steps in order without hanging
- Running the CLI with `--mock-payments` and a query that triggers recursion prints steps at depth=1 indented differently from depth=0 steps
- Running the CLI without `--mock-payments` using a funded Devnet keypair completes the full loop and all transaction signatures are real and verifiable
- Typing "exit" cleanly terminates the process
- Passing `--budget 0.0001` causes all expensive agents to be skipped and BUDGET_EXCEEDED to be printed for each

---

## Phase 5 — Frontend Dashboard

### What This Phase Delivers

The Aldor operator dashboard: a Next.js 14 App Router application that is a direct visual and structural port of frontend. All components are replicated. Solana-specific adapters. An eighth component, DuneEmbed, is added for the Dune Analytics integration.

### Page Routes

**`/` (Dashboard)** — The main view. Contains the header with wallet status, four status badge pills, a 2×2 grid (EconomyGraph top-left, AgentChat top-right, TransactionLog bottom-left, ProtocolTrace bottom-right), the DuneEmbed section below, and the ToolCatalog at the bottom.

**`/agents`** — A dedicated page listing all registered agents with their full metadata, value scores, job history counts, success rates, and SNS domain links.

**`/tools`** — The agent marketplace. Identical in layout to Tools page. Shows each specialist as a card with name, description, price, token, endpoint, recursive flag, and a "Hire" button that opens a modal to send a direct query.

**`/docs`** — A documentation page explaining the x402 flow, the SNS domain system, the Palm USD payment path, and links to the Anchor program on Devnet Explorer and the Dune dashboard.

### Component Specifications

**`EconomyGraph.tsx`** renders a `<canvas>` element that runs a 60fps animation loop using `requestAnimationFrame`. The canvas renders five nodes: User (leftmost), Manager (center-left), DeepResearch (top-right), Summarizer (center-right), and SentimentAI (bottom-right). Nodes are circles with a monospace label below. Edges between nodes are animated lines with a moving dot traveling along each edge at a speed driven by `Math.sin` of a running `pulse` variable. When a payment event arrives via SSE, the corresponding edge briefly highlights in bright green. Edge labels show the payment amount in SOL or Palm USD (e.g. "0.001 ◎" for SOL, "0.0001 PALM" for Palm USD). Below the canvas, four counters show total payments, total Palm USD volume, total A2A hires, and total active agents. This component receives the full step array and payment array as props and re-derives its visual state from them. It uses a dirty flag to avoid re-drawing on every React render; only new events trigger canvas updates.

**`AgentChat.tsx`** is the primary user interaction component. It contains a text input and a submit button. On submit it POSTs to `/api/agent/query` and simultaneously subscribes to the SSE stream if not already subscribed. As steps arrive from SSE, it renders them as a scrolling log of execution steps with colored labels (MANAGER_PLANNING in blue, X402_INITIATED in orange, X402_SETTLED in green, SNS_RESOLVED in purple, RESULT_COMPOSED in bright green). At the bottom it displays the final composed result when the RESULT_COMPOSED event arrives. The component also shows the running cost in real time as X402_SETTLED events accumulate.

**`TransactionLog.tsx`** renders a scrollable list of all completed payments. Each payment entry shows: the from agent name and to agent name connected by an arrow, the amount and token type, an A2A depth badge (shown only when depth is greater than zero, styled in orange like badges), and a clickable transaction signature link that opens `explorer.solana.com/tx/<sig>?cluster=devnet` in a new tab. New entries appear at the top.

**`ToolCatalog.tsx`** fetches GET `/api/agents` on mount and renders each agent as a card. Each card shows: the agent name (in large monospace text), the SNS domain in smaller gray text, the price formatted as "X.XXX Palm USD" or "X.XXX SOL", the reputation score as a percentage, whether the agent is recursive (shown as an orange "RECURSIVE" badge), and the agent's category. Cards are arranged in a 4-column grid on desktop. On hover, the card border brightens and shows the agent's endpoint path.

**`ProtocolTrace.tsx`** shows a filtered view of all SSE events of types X402_INITIATED, X402_SETTLED, and SNS_RESOLVED. Each event is rendered as a log line with a timestamp, a colored type label, and the relevant details: for SNS_RESOLVED it shows the domain and the first 12 characters of the resolved public key; for X402_INITIATED it shows the agent name, price, token, and current depth; for X402_SETTLED it shows a checkmark and the first 20 characters of the transaction signature. This component is the "raw protocol transparency" view, equivalent to what shows as its Protocol Trace panel.

**`ExecutionSteps.tsx`** renders all SSE events in chronological order as a flat list with step numbers. Each step shows its type, a human-readable description auto-generated from the event data, and how many milliseconds elapsed since the previous step. This gives a full linear audit trail of everything the manager did, in sequence.

**`WalletInfo.tsx`** fetches the SOL balance of the agent wallet public key from the configured Devnet RPC on mount and on a 30-second polling interval. It displays: the network label "SOLANA DEVNET", the agent public key truncated to first 8 and last 6 characters with an ellipsis, the SOL balance, and the Palm USD balance (fetched via `getTokenAccountBalance` on the agent's Palm USD ATA). It also shows a green "CONNECTED" or red "DISCONNECTED" indicator based on whether the last RPC call succeeded.

**`DuneEmbed.tsx`** (Aldor-only renders two side-by-side `<iframe>` elements embedding Dune chart visualizations. The two charts are "Agentic GDP" (total Palm USD volume through the aldor-escrow program per hour) and "Economic Velocity" (number of successful x402 handshakes per hour). Each iframe uses the Dune embed URL format `https://dune.com/embeds/<chart-id>/visualization`. The chart IDs are read from environment variables `NEXT_PUBLIC_DUNE_CHART_1` and `NEXT_PUBLIC_DUNE_CHART_2`. While those environment variables are not set (during early development), each iframe slot renders a styled placeholder box with the chart name and instructions to configure the variable.

### Visual Design System

The Aldor dashboard uses the same cyber-minimalist aesthetic as Background is pure black. Primary text is terminal green (`#00ff41`). Secondary text is muted green (`#4a7c59`). Accent for payments and warnings is orange (`#ff6b00`). All text is monospace (font-family: monospace or a monospace system font). Borders are dark green (`#1a3a1a`). Buttons have green text on black background with a green border that brightens on hover. No rounded corners. No shadows. No animations except for the canvas topology graph and the SSE step log append animation (new items fade in from opacity 0 to 1).

Status badges at the top of the dashboard display: "RECURSIVE DELEGATION: ON", "X402 PAYMENTS: VERIFIED", "SNS DOMAINS: ACTIVE", and "PALM USD: LIVE".

### Frontend Data Flow

The frontend establishes a single SSE connection when the dashboard mounts. All step events are stored in a single React state array at the page level. This array is passed as props to all components that need it. The EconomyGraph derives its payment flow data from the step array. The ProtocolTrace filters the step array for protocol events. The ExecutionSteps renders all steps. The TransactionLog derives its payment list from steps where type is X402_SETTLED.

The AgentChat component does not manage its own SSE connection; it uses the shared one from the page level. When the user submits a query, the AgentChat calls the page-level `onSteps` callback and also triggers the REST POST. Steps arrive from the SSE connection and are appended to the page-level array, which propagates to all components simultaneously. This means the topology graph, the protocol trace, and the execution steps all update in real time as the orchestrator works.

### Phase 5 Verification Checklist

- The dashboard loads at `http://localhost:3000` with no console errors
- All four status badges are visible at the top
- The EconomyGraph canvas renders and animates the five nodes and four edges before any query is submitted
- Submitting a research query in AgentChat causes the SSE stream to populate the execution steps log in real time
- The EconomyGraph edge between Manager and DeepResearch highlights when the X402_INITIATED event for DeepResearch arrives
- The TransactionLog shows entries for both the Manager→DeepResearch payment and the recursive DeepResearch→Summarizer and DeepResearch→SentimentAI payments, each with correct depth badges
- The ProtocolTrace shows SNS_RESOLVED, X402_INITIATED, and X402_SETTLED entries for each hop in the correct order
- All transaction signature links open valid Solana Explorer pages on Devnet
- The WalletInfo component shows a non-zero SOL balance and a Palm USD balance
- The DuneEmbed shows placeholder boxes (since chart IDs are not yet configured) with no errors
- Navigating to `/agents` shows all seven specialists with correct metadata
- Navigating to `/tools` shows the agent marketplace cards

---

## Phase 6 — Track Integrations

### Palm USD Integration

Palm USD is a stablecoin SPL token on Solana. All Palm USD payments in Aldor use the `transferChecked` SPL instruction to ensure the correct mint and decimal precision are enforced at the instruction level. The Palm USD mint address is stored in a single environment variable (`PALM_USD_MINT`) and used in three places: the x402 middleware challenge body (as the `asset` field), the payment signer (to build the correct ATA addresses), and the payment facilitator (to verify the correct mint in received transactions).

The Anchor program's `create_job` instruction initializes the escrow Palm USD vault as a token account owned by the escrow PDA (using PDA signing). The `complete_job` instruction releases tokens from this vault to the specialist's ATA using a PDA-signed CPI to the Token Program.

The frontend displays all Palm USD amounts with 4 decimal places and the label "PALM" or "Palm USD" depending on context. The WalletInfo component fetches the Palm USD balance separately from the SOL balance.

### SNS Integration

The Solana Name Service (SNS) integration is used to give every specialist agent a human-readable `.sol` domain. The production target is that each specialist registers a subdomain under `aldor.sol` (e.g. `research.aldor.sol`, `summarize.aldor.sol`).

The SDK's `resolveAgent` function is the single entry point for all SNS lookups. During Devnet development, domain registration under `aldor.sol` may not be feasible, so the function includes a hardcoded fallback map from domain strings to public keys loaded from environment variables. The function's interface is identical regardless of whether the real SNS or the fallback is used, so the rest of the codebase does not need to change when moving from fallback to real SNS.

The ToolCatalog and agent page in the frontend display the SNS domain for each agent. The ProtocolTrace shows SNS_RESOLVED events when the manager resolves a domain before making a payment. The `/agents` page links each domain to `naming.bonfida.org/#/<domain>` for verification.

### Dune Analytics Integration

The Dune integration has two parts: an indexer that collects on-chain events and a public Dune dashboard that visualizes them.

The indexer runs as a periodic job (every 5 minutes) in the backend. It calls `getSignaturesForAddress` on the Anchor program ID to fetch recent transaction signatures. For each signature it calls `getParsedTransaction` and extracts the Anchor event data from the transaction logs (Anchor events are encoded in the base64 log messages prefixed with "Program data:"). The extracted events are normalized into structured rows and stored in a local SQLite database (or pushed directly to the Dune API if using Dune's data upload endpoint).

The two Dune SQL queries to build and publish are: (1) Agentic GDP — aggregated Palm USD and SOL volume through the escrow program per hour, and (2) Economic Velocity — count of successful x402 handshakes (JobCreated events) per hour. A third chart showing success-to-failure ratio (JobCompleted count divided by total JobCreated count) is optional but adds credibility to the submission.

Once the Dune dashboard is published, the two embed chart IDs are configured in the frontend environment variables and the DuneEmbed component will display them as live iframes.

### Phase 6 Verification Checklist

- A Palm USD SPL transfer on Devnet (for any amount) can be verified on Solana Explorer showing the correct mint address
- The `resolveAgent('research.aldor.sol')` call returns the correct public key (either via real SNS or via the fallback map, consistently)
- After a full end-to-end run with real Devnet transactions, the indexer successfully extracts at least one JobCreated event from the transaction logs
- The Dune dashboard is publicly accessible and shows at least one data point for both charts
- Setting `NEXT_PUBLIC_DUNE_CHART_1` and `NEXT_PUBLIC_DUNE_CHART_2` causes the DuneEmbed component to show live chart iframes without errors

---

## Phase 7 — End-to-End Demo and Submission

### Demo Script (3-Minute Video)

**Minute 1 — Setup.** Show the terminal with the backend, frontend, and agent CLI all running. Show the Devnet wallet with a non-zero SOL balance. Open the dashboard in a browser. Point out the four status badges. Walk over the EconomyGraph showing the static topology.

**Minute 2 — Live query.** Type the query "Research quantum computing and summarize the findings" into the AgentChat. Narrate each event as it appears: Manager plans, SNS resolves research.aldor.sol, 402 challenge issued, payment signed on Solana, retry with proof, DeepResearch fires sub-agents for Summarizer and SentimentAI, both complete. Show the EconomyGraph animating with payment flows. Show the TransactionLog with A2A depth badges. Show the ProtocolTrace with raw 402 headers.

**Minute 3 — On-chain proof.** Click one of the transaction signature links in the TransactionLog. It opens Solana Explorer on Devnet showing a real transaction to the escrow program. Switch to the Dune dashboard and show the Agentic GDP chart updating with the new volume. Show the agent page on the dashboard with updated reputation scores for all three agents that participated. End on the CLI agent running the same query and showing the same steps in the terminal.

### Submission Checklist

- GitHub repository is public under `@kartikangiras`
- Repository contains all five workspace directories with no placeholder files
- `README.md` contains a clear one-line description, architecture diagram in ASCII, quick-start instructions (three commands: install, configure, run), and links to the Devnet program ID, the Dune dashboard, and the deployed Vercel frontend
- Anchor program is deployed and its program ID is recorded in `Anchor.toml`, in `README.md`, and in `.env.example`
- `.env.example` contains all required variable names with no real secrets
- The 3-minute demo video is either embedded in the README or linked from it
- The Dune dashboard is publicly accessible and linked from the README
- The Vercel deployment of the frontend is live and linked from the README
- The primary KPI (paid agent-to-agent requests per day) is demonstrated in the video and evidenced by the Dune Economic Velocity chart

---

## Cross-Cutting Concerns

### Hard Spend Policy

The hard spend policy is enforced at three layers simultaneously. At the HTTP layer, every request carries `X-Aldor-Max-Depth` and `X-Aldor-Budget-Remaining` headers. The x402 middleware reads these and rejects any request that would exceed the depth limit. At the application layer, the manager checks remaining budget before initiating each hire. At the on-chain layer, the Anchor program enforces the depth constant as an immutable constraint that cannot be bypassed by a misconfigured client.

### Error Handling and Failure Modes

Every specialist route must handle three failure categories: payment verification failure (return 402), internal execution failure (return 500 with a structured error body), and timeout (return 408). The manager must handle all three: on 402 it retries once after re-signing; on 500 it emits a SPECIALIST_FAILED event and continues with remaining specialists if budget allows; on 408 it emits a TIMEOUT event and skips. The CLI and frontend must both surface these errors visually.

### Mock Payments Flag

The environment variable `MOCK_PAYMENTS=true` causes the payment signer to return a fake transaction signature and the payment facilitator to skip on-chain verification and return true automatically. This allows the full hiring loop to be exercised without a funded wallet. The x402 middleware must check this flag and log a warning when it is active. The frontend must display a "MOCK MODE" badge when this flag is set (passed via `NEXT_PUBLIC_MOCK_PAYMENTS`).

### Reputation Calculation

The reputation system: all agents start at 5,000 basis points (50%). Each successful job adds 50 basis points. Each failed job subtracts 100 basis points. Reputation is clamped between 0 and 10,000. The value score used for hiring decisions is `reputation² / (price × 10,000)`. Higher reputation and lower price both increase the score. When multiple specialists offer the same capability, the one with the highest value score is chosen. The manager logs the value score for each evaluated specialist in the PLAN_CREATED step event so it is visible in the ProtocolTrace.

### Solana RPC Configuration

All three runtime components (backend, agent CLI, SDK) must use the same Solana RPC URL configured in the environment. For Devnet development this is `https://api.devnet.solana.com`. For the hackathon submission a paid RPC provider endpoint (Helius, QuickNode, or Alchemy Solana) is strongly recommended to avoid rate limiting during the live demo. The RPC URL is loaded from `SOLANA_RPC_URL` and all three components must respect this variable rather than hard-coding any URL.

---

## Day-by-Day Build Schedule

**Day 1 (May 2)** — Scaffold the full monorepo. Create all five workspace directories with their `package.json` files. Configure npm workspaces. Install all dependencies. Write the Anchor program skeleton with account structs and instruction signatures but no logic yet. Confirm `anchor build` passes.

**Day 2 (May 3)** — Implement all Anchor instructions with full PDA logic, SPL token CPI, reputation math, event emission, and error codes. Write and pass the full Anchor test suite covering all instructions and all error paths. Deploy to Devnet. Record the program ID.

**Day 3 (May 4)** — Implement the SDK: payment signer, SNS resolver, Palm USD transfer builder, and the Axios 402 interceptor. Write unit tests for the SNS resolver (with mock fallback) and for the payment builder (using `simulateTransaction`).

**Day 4 (May 5)** — Implement the backend x402 middleware and facilitator. Implement four non-recursive specialists (WeatherBot, Summarizer, MathSolver, SentimentAI). Test each endpoint with `curl` confirming the 402 → pay → 200 cycle.

**Day 5 (May 6)** — Implement the manager orchestrator with LLM planning, value score evaluation, SNS resolution, x402 hiring, and SSE event emission. Implement the SSE endpoint. Test the full query flow for a simple non-recursive query via `curl` with mock payments.

**Day 6 (May 7)** — Implement the two recursive specialists (DeepResearch, CodingAgent) and the remaining two non-recursive ones (CodeExplainer, TranslateBot). Test the full 3-hop recursive loop: Manager → DeepResearch → Summarizer + SentimentAI. Verify depth enforcement. Implement the CLI agent.

**Day 7 (May 8)** — Build all seven frontend components. Wire them to the SSE stream and the backend REST API. The topology graph must animate and all components must populate correctly from a live query.

**Day 8 (May 9)** — Set up the Dune indexer. Write and publish the two SQL queries. Get the chart embed IDs. Configure DuneEmbed. Do a full end-to-end run with real Devnet payments and verify all transactions on Solana Explorer. Deploy frontend to Vercel.

**Day 9 (May 10)** — Polish README with architecture diagram, quick start, and all links. Record the 3-minute demo video. Run the full end-to-end verification checklist. Submit.

---

*ALDOR — Autonomous. On-chain. Solana-native.*