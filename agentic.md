# ALDOR — Complete Implementation Plan (Updated)
## x402 Paid HTTP Tool Network · Solana Native
### Colosseum Hackathon · Deadline: May 11, 2026

---

> **Purpose of this document:** This is a complete architectural implementation plan to be used as an LLM build prompt. It contains no code. It contains system design, component responsibilities, data flows, inter-service contracts, and phase-by-phase verification checklists. Every section is written to be directly actionable by an LLM generating the actual implementation.

---

## Change Log From Previous Version

The following track integrations have been updated:

**Added:**
- Umbra SDK (Privacy Track) — x402 payment settlement now uses Umbra confidential/shielded stablecoin transfers between agents instead of plain on-chain SPL transfers
- Dodo Payments API (Finance Track) — the Orchestrator funds its wallet via Dodo fiat-to-crypto, and specialist agents off-ramp their stablecoin earnings automatically using the Dodo invoicing API
- Covalent GoldRush API (Data Track) — replaces Dune entirely; the dashboard uses Covalent's structured REST API to fetch wallet histories, decoded transactions, and stablecoin movement velocity without writing any SQL

SNS remains as the identity layer. Palm USD remains as the stablecoin denomination. The Anchor escrow program is simplified because Umbra handles value transfer client-side; the program now focuses on agent identity registry and capability metadata rather than holding funds in escrow PDAs.

---

## Reference Architecture

This project is a Solana-native. The structural mapping is as follows:

-  Aldor's `aldor-registry` Anchor program (identity and capability registry only; no escrow PDAs because Umbra handles value transfer)
- aldor's `x402` payment middleware → Aldor's `x402-solana` middleware where the settlement step calls the Umbra SDK for a confidential transfer rather than a plain SPL transfer
- aldor's STX/sBTC dual-token settlement → Aldor's Umbra-shielded stablecoin settlement with fiat on-ramp via Dodo Payments
- aldor's Explorer links → Aldor's Covalent GoldRush decoded transaction views (since Umbra obscures amounts on the base explorer, Covalent provides the structured public metadata safely)
- aldor's CLI agent → Aldor's CLI agent using the AldorClient SDK which wraps Axios with the full 402 → SNS → Umbra → retry cycle
- aldor's frontend (Next.js, Canvas topology, SSE, 7 components) → Aldor's frontend with identical layout, Covalent-powered data panels, and a new Umbra privacy proof display panel

Everything that aldor does at the application layer — recursive hiring, autonomous cost evaluation, reputation scoring, live topology graph, protocol trace inspector, transaction log — is replicated exactly. The blockchain settlement layer and analytics layer are replaced by the new integrations above.

---

## System Overview

Aldor is a network where a central orchestrator agent receives a natural-language goal, decomposes it into subtasks using an LLM, discovers specialist agents through a registry, pays each specialist over HTTP using the x402 Payment Required protocol settled via Umbra confidential transfers on Solana, and composes results. Specialists can themselves recursively hire sub-specialists, but only within strict budget and depth limits enforced through HTTP headers.

The four participant categories are:

**Orchestrator (Manager Agent):** The entry point. Receives a user query. Its wallet is funded via the Dodo Payments fiat-to-crypto API. Uses an LLM to plan which specialists to hire. Evaluates each specialist by a value score (reputation squared divided by price times ten thousand). Initiates x402 payment flows where settlement is a Umbra confidential transfer. Enforces hard spend policy via headers. Emits every decision and payment event over Server-Sent Events so the frontend topology graph updates in real time.

**Specialist Agents (Worker Services):** Exposed as HTTP services behind x402 middleware. Any HTTP request without a valid payment proof receives a 402 Payment Required challenge. The challenge specifies the specialist's SNS domain (not raw public key) as the recipient identifier. After the client resolves the SNS domain, executes the Umbra confidential transfer, and retries with the Umbra transaction signature in the X-Aldor-Payment-Signature header, the middleware verifies the transfer and allows the request through. Specialists can off-ramp their accumulated stablecoin earnings to fiat using the Dodo Payments invoicing API.

**Aldor Registry Program (Anchor/Rust):** The on-chain identity store. Handles agent registration mapping SNS domains to Umbra stealth-compatible public keys, capability metadata, reputation in basis points, and pricing. Does not hold funds. All value transfer is handled client-side via Umbra.

**Analytics Layer (Covalent GoldRush):** The dashboard data source. Since Umbra conceals transfer amounts on the base Solana explorer, Covalent's structured API is used to fetch decoded transaction metadata, wallet history for all agent addresses, and stablecoin movement frequency. This powers the Agentic GDP counter and Economic Velocity display on the dashboard.

---

## Integration Responsibilities

### SNS — Agent Identity

Every specialist agent is identified in the registry by a `.sol` domain rather than a raw public key. The format is `<role>.aldor.sol` (e.g. `researcher.aldor.sol`, `summarizer.aldor.sol`). The Anchor registry maps each SNS domain to the agent's Umbra stealth-compatible public key. When the orchestrator hires a specialist, it reads the recipient SNS domain from the x402 challenge's `X-Aldor-Recipient` header, resolves it via `@bonfida/spl-name-service`, obtains the stealth public key from the Anchor registry, and passes that key to Umbra for the confidential transfer.

SNS resolution happens in the AldorClient SDK inside the 402 interceptor. It is transparent to the rest of the codebase. The SNS domain is the canonical, human-readable identifier throughout: in the registry, in x402 challenge headers, in the frontend ToolCatalog, in the ProtocolTrace panel, and in SSE events.

### Umbra SDK — Confidential Payment Settlement

Umbra is a stealth address protocol that allows the sender to transfer tokens to a recipient without revealing the recipient's address or the transfer amount on the public blockchain explorer. In Aldor, every x402 payment settlement uses Umbra instead of a plain SPL transfer. This serves two purposes: it prevents competitors from observing which agents are being hired and at what rates (business logic privacy), and it qualifies the project for the Umbra Privacy Track in the hackathon.

The settlement flow when a specialist issues a 402 challenge is as follows. The client receives the 402 challenge body which includes the recipient SNS domain in the `X-Aldor-Recipient` field and the amount. The AldorClient resolves the SNS domain to a public key, then looks up the agent's stealth-compatible public key from the Anchor registry. It calls the Umbra SDK's `send` function with the stealth key, the stablecoin mint address, and the payment amount. Umbra generates a one-time stealth address derived from the recipient's stealth key and the sender's ephemeral key, executes the transfer to that stealth address, and returns a transaction signature. The client retries the original HTTP request with the Umbra transaction signature in the `X-Aldor-Payment-Signature` header and the ephemeral public key in `X-Aldor-Ephemeral-Key`. The specialist's middleware verifies that the Umbra transfer landed on-chain with the correct amount before allowing the request through.

On the receiving side, each specialist agent runs a background process that periodically calls Umbra's `scan` function using its own private key to discover and claim all incoming stealth transfers. Claimed balances accumulate in the agent's wallet and can then be off-ramped via Dodo.

### Dodo Payments API — Finance On-Ramp and Off-Ramp

Dodo Payments is a fiat-to-crypto and crypto-to-fiat payment API. In Aldor, it is used in two directions:

**On-ramp (Orchestrator funding):** The orchestrator agent exposes a utility method `fundAgentViaDodo(amountUsd)` that calls the Dodo Payments API to initiate a fiat payment. The Dodo API returns a stablecoin deposit to the orchestrator's wallet on Solana Devnet. This means the orchestrator can be refilled from a credit card or bank transfer without the operator needing to manually acquire crypto. In the dashboard, a "Fund Orchestrator" button triggers this flow.

**Off-ramp (Specialist earnings):** Each specialist agent tracks its claimed Umbra balance. When the balance exceeds a configurable threshold, the agent automatically calls the Dodo Payments API's invoicing endpoint to convert its stablecoin earnings to fiat and transfer to a configured bank account or card. In the dashboard, each agent card shows its pending Umbra balance and a "Request Off-ramp" button that triggers this flow manually.

The Dodo integration is encapsulated in a single utility module in the SDK (`dodo.ts`) that exports `fundAgentViaDodo(amountUsd, walletAddress)` and `offRampEarnings(agentAddress, amountStablecoin, destinationDetails)`. These are called from the orchestrator manager and from each specialist's background balance scanner respectively.

### Covalent GoldRush API — On-Chain Data and Dashboard Analytics

Covalent GoldRush replaces Dune entirely. Instead of writing SQL queries against indexed blockchain data, the dashboard makes structured REST API calls to Covalent's endpoints. Covalent supports Solana and returns decoded, human-readable transaction data without requiring any SQL knowledge or custom indexing infrastructure.

The three Covalent utilities used in Aldor are:

**Wallet transaction history** — Calls `GET /v1/solana-mainnet/address/{address}/transactions_v3/` (or the Devnet equivalent) for each agent's wallet address. Returns a list of decoded transactions with timestamps, instruction types, and counterparty addresses. Used by the dashboard to populate each agent's job history panel and to verify that Dodo top-ups have landed.

**Token balances** — Calls `GET /v1/solana-devnet/address/{address}/balances_v2/` for each agent wallet. Returns all SPL token balances including the stablecoin being used for payments. Used by the WalletInfo component to display live balances without direct RPC calls.

**Agentic GDP counter** — Polls Covalent's decoded transaction endpoint filtering for transactions involving the Umbra program address on Solana. Extracts the frequency and inferred volume of stablecoin movements (since Umbra conceals the exact amounts on the base explorer, Covalent provides the public metadata such as timestamps and transaction counts that can be used to calculate Economic Velocity: the number of x402 handshakes per hour). The dashboard displays this as the "AGENTIC GDP" counter and an "ECONOMIC VELOCITY" chart without requiring any SQL.

All Covalent calls use the `@covalenthq/client-sdk` package and are encapsulated in a `covalent.ts` utility module in the frontend. The Covalent API key is stored in `NEXT_PUBLIC_COVALENT_API_KEY`. All calls target the Devnet chain ID.

---

## Monorepo Structure

The project is organized as an npm workspaces monorepo with the following top-level folders:

**contracts/** — The Anchor/Rust smart contract workspace. Contains the `aldor-registry` program (identity and capability registry, no escrow logic), its Anchor.toml configuration targeting Solana Devnet, and a TypeScript test suite using ts-mocha.

**backend/** — The Express.js + TypeScript server. Runtime home of the orchestrator and all specialist agents. Exposes REST endpoints and an SSE stream. Contains the x402 middleware, the Umbra verification logic, the manager planning logic, individual specialist route handlers, the SNS resolution utility, the Covalent indexing calls used by the backend (for emitting enriched SSE events), and the Dodo utility.

**agent/** — A standalone Node.js CLI. Allows direct queries from the terminal, exercises the full x402 → Umbra handshake in the console, and tests recursive hiring without the frontend.

**frontend/** — A Next.js 14 App Router application. Contains the live dashboard with all eight UI components, the Covalent-powered data panels, and the Umbra privacy proof display panel. Communicates with the backend via REST POST and SSE GET.

**sdk/** — The `aldor-sdk` TypeScript library. Exports the `AldorClient` class which contains the Axios 402 interceptor, the SNS resolver, the Umbra transfer caller, and the Dodo utility functions. Both the backend and the CLI agent import from this package.

---

## Phase 1 — Architecture Blueprint and Data Structures

### What This Phase Delivers

A locked-down architectural specification before any code is written. This phase produces the request lifecycle diagram, all TypeScript interfaces, and the security and privacy verification checklist. The purpose is to have a concrete reference that all subsequent phases implement against, preventing LLMs from drifting into ad-hoc designs.

### Request Lifecycle Sequence

The canonical flow for one x402 hiring transaction is as follows, in order:

The Orchestrator receives a natural-language query from the user. It calls its LLM planning function and receives a task plan with the target specialist. It constructs an HTTP POST request to the specialist's endpoint using the AldorClient, setting X-Aldor-Max-Depth and X-Aldor-Budget-Remaining headers.

The specialist's x402 middleware intercepts the request, finds no X-Aldor-Payment-Signature header, and returns HTTP 402 with a challenge body containing: the specialist's SNS domain in X-Aldor-Recipient, the stablecoin amount required, the stablecoin mint address, and an expiry timestamp.

The AldorClient's 402 interceptor activates. It reads the X-Aldor-Recipient domain from the challenge body. It calls SNS resolution via `@bonfida/spl-name-service` to obtain the specialist's public key. It queries the Anchor registry to obtain the specialist's Umbra stealth-compatible public key associated with that SNS domain. It calls the Umbra SDK's `send` function with the stealth key and payment amount. Umbra generates a one-time stealth address, executes the confidential transfer, and returns a transaction signature.

The AldorClient retries the original HTTP POST, adding the Umbra transaction signature as X-Aldor-Payment-Signature and the Umbra ephemeral public key as X-Aldor-Ephemeral-Key.

The specialist's middleware calls the Umbra verification function, confirms the transfer is valid and of sufficient amount, attaches proof metadata to the request object, and calls `next()`.

The specialist executes its task, emits completion events, and returns the result in the HTTP response body.

The orchestrator receives the result, emits an X402_SETTLED SSE event with the Umbra transaction signature (not the amount, which is private), decrements its budget tracker, and continues to the next task in the plan.

### TypeScript Interface Specifications

The following interfaces must be defined before any implementation begins. They form the shared contract between all modules.

**AgentRegistryEntry** — the shape of data stored in the Anchor program and also returned by the GET `/api/agents` backend endpoint. Fields: `snsDomain` (string), `umbraSteathPublicKey` (string), `name` (string), `category` (string), `priceMicroStablecoin` (number), `reputation` (number, 0–10000 basis points), `totalJobs` (number), `successfulJobs` (number), `isActive` (boolean), `isRecursive` (boolean), `capabilities` (string array).

**X402Challenge** — the shape of the HTTP 402 response body that specialists return. Fields: `x402Version` (number, always 1), `recipient` (string, an SNS domain like `researcher.aldor.sol`), `amount` (string, micro-unit stablecoin amount as a string to avoid float precision issues), `asset` (string, stablecoin mint address), `network` (string, `solana-devnet`), `expiresAt` (number, Unix timestamp), `description` (string), `resource` (string, the original request URL).

**X402PaymentProof** — the shape carried in the retry request headers. Fields: `umbraSignature` (string, the Umbra transaction signature), `umbraEphemeralKey` (string, the ephemeral public key used to derive the stealth address), `payer` (string, orchestrator's public key), `timestamp` (number).

**AldorStepEvent** — the shape of every SSE event emitted by the manager. Fields: `type` (string enum: MANAGER_PLANNING, PLAN_CREATED, SNS_RESOLVING, SNS_RESOLVED, UMBRA_TRANSFER_INITIATED, UMBRA_TRANSFER_CONFIRMED, X402_SETTLED, SPECIALIST_FAILED, BUDGET_EXCEEDED, RESULT_COMPOSED), `agent` (string, optional), `depth` (number), `timestamp` (number), `data` (object, type-specific payload).

**OrchestratorConfig** — configuration passed to the manager. Fields: `budget` (number, in micro-stablecoin units), `maxDepth` (number, hard limit 3), `mockPayments` (boolean), `llmProvider` (string, `groq` or `anthropic`).

### Architecture Security and Privacy Verification Checklist

Before proceeding to Phase 2, the following must be true of the designed architecture:

- No specialist's wallet address appears in any HTTP response or log output. Only SNS domains appear in challenge bodies and SSE events.
- No payment amount appears in any SSE event. X402_SETTLED events carry only the Umbra transaction signature, the agent name, and the depth.
- The Umbra stealth address used for each payment is one-time and derived fresh per transaction. It is never reused.
- The Anchor registry stores Umbra stealth-compatible public keys, not regular Solana public keys, for the payment recipient field.
- The depth enforcement at the HTTP header layer is stateless and cannot be bypassed by a specialist that ignores its own recursive depth tracking.
- The Dodo on-ramp and off-ramp calls are isolated in a single utility module and never share API keys with the frontend environment (only server-side environment variables).
- The Covalent API key is the only analytics credential. It is read-only and safe to expose as a `NEXT_PUBLIC_` variable since Covalent's read-only scope is rate-limited but not security-sensitive.

---

## Phase 2 — Anchor Registry Program

### What This Phase Delivers

A deployed Anchor program on Solana Devnet that serves as the identity and capability registry for the network. Because Umbra handles value transfer client-side, this program does not hold escrow funds. Its sole responsibilities are storing agent metadata, mapping SNS domains to Umbra stealth keys, tracking reputation, and emitting events that Covalent can observe.

### Account Structures

The program manages one primary account type:

**AgentAccount** stores permanent metadata about a registered specialist. Its fields are: the owner public key (the agent operator's wallet, used for authority checks), the SNS domain string (up to 128 characters, e.g. "researcher.aldor.sol"), the Umbra stealth-compatible public key as a 32-byte array (stored separately from the owner key; this is what the Umbra SDK uses to derive the one-time stealth address for each payment), the name string (up to 64 characters), the category string (up to 32 characters), the price in micro-stablecoin units as a u64, a reputation score in basis points (u64, 0–10000), total jobs as a u64, successful jobs as a u64, an active boolean, a registered-at Unix timestamp as i64, and a capabilities array (up to 8 strings of 32 characters each describing what the agent can do, e.g. "web-research", "text-summarization").

The PDA seed for each AgentAccount is `[b"agent", sns_domain_bytes]`. Using the SNS domain as the seed ensures that each domain maps to exactly one on-chain account and prevents duplicate registrations.

### Program Instructions

**register_agent** initializes an AgentAccount PDA for a given SNS domain and owner. It validates that the SNS domain string is within the length limit, that the Umbra stealth key is a valid 32-byte value, that the price is greater than zero, and that no account already exists at the PDA (enforced by Anchor's `init` constraint). It sets initial reputation to 5,000 basis points. It emits an AgentRegistered event.

**update_capabilities** allows the agent owner to update the capabilities array and price. It requires that the signer is the account owner. It emits a CapabilitiesUpdated event.

**record_job_outcome** is called by the agent owner after each completed or failed job to update reputation. It accepts a boolean `success` parameter. On success it adds 50 basis points (clamped to 10,000 maximum). On failure it subtracts 100 basis points (clamped to 0 minimum). It increments total_jobs and conditionally successful_jobs. It emits a JobOutcomeRecorded event. Note: this instruction is called by the agent operator's backend after each x402 settlement. It is not called automatically by the payment flow because Umbra handles the payment separately. This is an honest-reporting system appropriate for a hackathon MVP; a production system would require a more trustless oracle.

**deactivate_agent** sets the active flag to false. Requires owner signature.

### On-Chain Events

The program emits these events: AgentRegistered (sns_domain, umbra_stealth_key, category, price), CapabilitiesUpdated (sns_domain, new_capabilities, new_price), JobOutcomeRecorded (sns_domain, success, new_reputation). These events are observable by Covalent's decoded transaction endpoint and are used to populate the dashboard's reputation history charts.

### Phase 2 Verification Checklist

- `anchor build` succeeds with no warnings
- `anchor deploy --provider.cluster devnet` produces a program ID
- Anchor test suite calls `register_agent` with a sample SNS domain and Umbra stealth key and reads back all fields correctly from the resulting AgentAccount PDA
- Anchor test suite confirms that registering the same SNS domain twice fails with an account-already-exists error
- Anchor test suite calls `record_job_outcome` with success=true and confirms reputation increments by exactly 50 basis points
- Anchor test suite calls `record_job_outcome` with success=false and confirms reputation decrements by exactly 100 basis points
- Anchor test suite confirms reputation does not go below 0 or above 10,000 regardless of inputs
- Anchor test suite confirms that calling `update_capabilities` with a non-owner signer fails
- Program ID is recorded in Anchor.toml and backend environment file
- All emitted events are visible in Solana Explorer's transaction log for the Devnet deployment

---

## Phase 3 — AldorClient SDK

### What This Phase Delivers

The `aldor-sdk` package: a TypeScript library that exports the `AldorClient` class. This class is the single entry point for all x402 interactions. It encapsulates the Axios 402 interceptor, SNS resolution, Umbra confidential transfer execution, Dodo funding and off-ramp utilities, and the Anchor registry read utility. Both the backend orchestrator and the CLI agent import and instantiate this class.

### AldorClient Class Design

**Constructor** accepts a configuration object containing: a Solana `Keypair` (the agent's signing identity), the Solana RPC URL, a Dodo API key, an Umbra SDK configuration object (containing the Umbra program address and any required credentials), the Anchor registry program ID, and an optional `mockPayments` boolean.

**Internal Axios instance** is created in the constructor with a response interceptor attached. The interceptor checks the HTTP status of every response. If the status is 402, it triggers the payment resolution cycle. All other statuses pass through unmodified.

**Payment resolution cycle** (triggered by 402 status): reads the challenge body from the response data, validates that it conforms to the X402Challenge interface, calls `resolveRecipient(challenge.recipient)` to get the Umbra stealth key, calls `executeUmbraTransfer(stealthKey, challenge.amount, challenge.asset)`, builds the X402PaymentProof object from the Umbra result, retries the original request with the proof headers, and returns the retry response to the original caller. If `mockPayments` is true, the `executeUmbraTransfer` step is skipped and a synthetic proof object is returned immediately.

**resolveRecipient(snsDomain: string): Promise<string>** resolves the SNS domain to a public key using `@bonfida/spl-name-service`. Then queries the Anchor registry's AgentAccount PDA (derived from the same SNS domain) to retrieve the stored Umbra stealth-compatible public key. Returns the stealth key as a base58 string. Uses a local in-memory cache keyed by SNS domain to avoid redundant lookups within a single orchestrator session. Falls back to the environment variable map when SNS resolution fails on Devnet.

**executeUmbraTransfer(stealthKey: string, amount: string, assetMint: string): Promise<string>** calls the Umbra SDK's send function with the provided stealth key, amount parsed as a BigInt from the micro-unit string, and the asset mint. Returns the Umbra transaction signature as a string. The Umbra SDK handles deriving the one-time stealth address, building the SPL transfer instruction to that address, and broadcasting the transaction.

**verifyUmbraTransfer(proof: X402PaymentProof, expectedAmount: string, stealthKey: string): Promise<boolean>** is used by the middleware on the specialist side. It calls the Umbra SDK's scan utility with the specialist's private key to check whether the Umbra signature in the proof corresponds to an actual received transfer of the expected amount to a stealth address derived from the specialist's stealth key and the ephemeral key in the proof. Returns a boolean.

**fundAgentViaDodo(amountUsd: number, destinationWallet: string): Promise<string>** calls the Dodo Payments API to initiate a fiat-to-crypto top-up. Returns the Dodo payment URL that the operator must visit to complete the fiat payment, or the transaction signature if using Dodo's direct API mode. This is used by the orchestrator's backend and surfaced as a button in the dashboard.

**offRampEarnings(amountStablecoin: number, destinationDetails: object): Promise<string>** calls the Dodo Payments API invoicing endpoint to convert a specified stablecoin amount to fiat and send it to the provided destination. Returns the Dodo invoice ID. Used by specialist agents' background balance scanners.

**get(url, config)** and **post(url, data, config)** are the public HTTP methods that wrap the internal Axios instance. These are what the orchestrator and specialists use to make all external HTTP calls. The 402 interception is transparent through these methods.

### SDK Module Structure

The SDK is organized into four internal files that the `AldorClient` class imports:

**interceptor.ts** — contains the Axios response interceptor logic and the retry mechanism. Exports a factory function that accepts the AldorClient instance and attaches the interceptor to an Axios instance.

**umbra.ts** — wraps the Umbra SDK's `send`, `scan`, and verification utilities. Exports `executeUmbraTransfer` and `verifyUmbraTransfer` as standalone async functions. Handles all Umbra-specific error cases (insufficient balance, expired ephemeral key, invalid stealth key format).

**sns.ts** — wraps `@bonfida/spl-name-service` resolution and the Anchor registry query. Exports `resolveRecipient` with the in-memory cache and the Devnet fallback map.

**dodo.ts** — wraps the Dodo Payments REST API. Exports `fundAgentViaDodo` and `offRampEarnings`. Reads the Dodo API key from the environment variable `DODO_API_KEY`. Never exposes the API key in any response or log.

### Phase 3 Verification Checklist

- Instantiating AldorClient with `mockPayments: true` and calling `post()` on a URL that returns 402 causes the interceptor to activate, generate a synthetic proof, and retry with the correct headers without any manual intervention
- Instantiating AldorClient with `mockPayments: false` and calling `executeUmbraTransfer` with valid devnet parameters produces a real Umbra transaction signature that is verifiable on Solana Explorer
- Calling `verifyUmbraTransfer` with the signature, ephemeral key, and the receiving specialist's private key returns true
- Calling `verifyUmbraTransfer` with a tampered signature returns false
- Calling `resolveRecipient('researcher.aldor.sol')` returns the Umbra stealth key stored in the corresponding Anchor AgentAccount
- Calling `fundAgentViaDodo` returns a valid Dodo payment URL (in sandbox mode)
- The in-memory SNS cache is populated after the first resolution and subsequent calls for the same domain do not make additional network requests
- The SDK compiles as a TypeScript library with no errors and its exports are importable into the backend and agent packages

---

## Phase 4 — Backend Orchestrator and Specialist Services

### What This Phase Delivers

The full Express.js server: the manager orchestrator with LLM planning and autonomous hiring, all specialist route handlers behind x402 middleware, SSE streaming, the agent registry endpoint, and the Covalent enrichment calls. This replaces aldor's backend architecture with Solana/Umbra-native equivalents.

### x402 Middleware

The middleware is a factory function called `x402Required` that accepts a configuration object containing: the price in micro-stablecoin units, the stablecoin mint address, the specialist's SNS domain, a task description string, the AldorClient instance (used for Umbra verification), and the specialist's Keypair (used for Umbra scan).

When a request arrives without an X-Aldor-Payment-Signature header: the middleware reads X-Aldor-Max-Depth and X-Aldor-Budget-Remaining. If depth exceeds 3, it returns HTTP 400 with MAX_DEPTH_EXCEEDED. Otherwise it returns HTTP 402 with a response body conforming exactly to the X402Challenge interface: recipient as the specialist's SNS domain (never the raw public key), amount as a micro-unit string, asset as the stablecoin mint address, network as `solana-devnet`, expiresAt as current time plus 60 seconds, description, and resource.

When a request arrives with X-Aldor-Payment-Signature and X-Aldor-Ephemeral-Key headers: the middleware builds an X402PaymentProof object from the headers, calls `AldorClient.verifyUmbraTransfer` with the proof, the expected amount, and the specialist's stealth key. On success it attaches the proof and depth to the request object and calls `next()`. On failure it returns HTTP 402 with PAYMENT_INVALID. On Umbra SDK error it returns HTTP 500 with VERIFICATION_ERROR.

### Manager Orchestrator

The manager is in `manager.ts` and exports `runOrchestrator(query, emitter, config)`.

**Step 1 — Emit planning event.** Immediately emits MANAGER_PLANNING with the query and current depth.

**Step 2 — LLM decomposition.** Calls the configured LLM (Groq llama-3.3-70b as primary, Claude claude-haiku as fallback). The LLM receives the query and a system prompt listing all registered agents with their SNS domains, capabilities, prices, and reputation scores. It returns a JSON array of tasks each with an agent name, endpoint route, and input payload. The system prompt instructs the LLM to return only valid JSON with no preamble.

**Step 3 — Autonomous hiring decision.** For each task, computes the value score as `reputation² / (price × 10,000)`. Emits PLAN_CREATED with the task list and all computed value scores. Selects the agent with the highest value score for each required capability.

**Step 4 — Budget and depth enforcement.** Before each hire checks remaining budget and depth. Emits BUDGET_EXCEEDED or skips if over limit.

**Step 5 — SNS resolution.** Calls `AldorClient.resolveRecipient(specialist.snsDomain)` and emits SNS_RESOLVING then SNS_RESOLVED with the domain. The emitted SNS_RESOLVED event includes the domain but not the resolved stealth key (preserving privacy in the SSE stream).

**Step 6 — Umbra hire.** Uses AldorClient to POST to the specialist endpoint. The AldorClient interceptor handles the full 402 → Umbra → retry cycle. Emits UMBRA_TRANSFER_INITIATED when the interceptor activates and UMBRA_TRANSFER_CONFIRMED when Umbra returns a signature.

**Step 7 — Settlement and tracking.** After a successful response, emits X402_SETTLED with the Umbra signature (not the amount) and increments `spent` by the specialist's price. Calls `anchor.methods.record_job_outcome(true)` on the Anchor registry to update the specialist's reputation on-chain.

**Step 8 — Result composition.** Emits RESULT_COMPOSED and returns the concatenated result string.

### Specialist Agents

All eight specialists follow the same pattern: wrapped with `x402Required`, executing their task with an LLM call or external API call after payment verification, and returning a JSON result body with a `result` string and an `umbraSignature` string for logging.

**WeatherBot** at `/api/weather` — price 0.001 SOL-equivalent in stablecoin — not recursive — queries a weather API for the requested location.

**Summarizer** at `/api/summarize` — price 0.0001 stablecoin — not recursive — calls an LLM to summarize the provided text.

**MathSolver** at `/api/math-solve` — price 0.0003 stablecoin — not recursive — evaluates a mathematical expression or word problem.

**SentimentAI** at `/api/sentiment` — price 0.0001 stablecoin — not recursive — returns sentiment label and confidence score for provided text.

**CodeExplainer** at `/api/code-explain` — price 0.0004 stablecoin — not recursive — returns a plain-English explanation of a code snippet.

**TranslateBot** at `/api/agent/translate` — price 0.0003 stablecoin — not recursive — translates text to a target language.

**DeepResearch** at `/api/agent/research` — price 0.001 stablecoin — **recursive** — after its payment is verified, calls `runOrchestrator` with the research topic, its own emitter reference (so recursive SSE events are merged into the same stream), its remaining budget from the header minus its own price, and depth incremented by one. This recursive call will hire Summarizer and SentimentAI as sub-agents. The Umbra payments for those sub-hires are made by the DeepResearch agent using its own AldorClient instance funded by the amount it received from the orchestrator's payment.

**CodingAgent** at `/api/agent/code` — price 0.002 stablecoin — **recursive** — after payment, recursively hires CodeExplainer.

### SSE Endpoint

GET `/api/agent/events` returns `text/event-stream`. An EventEmitter is stored in a session map keyed by a session ID provided as a query parameter. The manager and all specialists share this emitter reference. Every `emitter.emit('step', data)` call writes to the SSE stream as `data: <JSON>\n\n`. The frontend subscribes with `new EventSource('/api/agent/events?session=<id>')` and routes events to React state.

### Agent Registry REST Endpoint

GET `/api/agents` reads all registered AgentAccounts from the Anchor program using `getProgramAccounts` filtered by the AgentAccount discriminator. Returns a JSON array conforming to the AgentRegistryEntry interface. Also calls Covalent's balance endpoint for each agent wallet to enrich the response with current stablecoin balances.

### Phase 4 Verification Checklist

- POST to `/api/agent/research` without payment headers returns HTTP 402 with a body where `recipient` is `researcher.aldor.sol` (an SNS domain, not a public key) and `amount` is a micro-unit string
- POST to the same endpoint with a valid Umbra proof (using `mockPayments: true`) returns HTTP 200 with a result
- POST with a tampered Umbra signature returns HTTP 402 with PAYMENT_INVALID
- POST with `X-Aldor-Max-Depth: 4` returns HTTP 400 with MAX_DEPTH_EXCEEDED and no payment attempt is made
- POST with a budget smaller than the specialist price causes BUDGET_EXCEEDED to be emitted and the endpoint returns gracefully
- A query that triggers DeepResearch causes SSE events at depth=0 (Manager → DeepResearch) and depth=1 (DeepResearch → Summarizer and SentimentAI) in the correct order
- All SSE events with type UMBRA_TRANSFER_CONFIRMED contain a real Umbra transaction signature (in non-mock mode) verifiable on Solana Explorer
- No SSE event or log output contains a raw public key or payment amount
- GET `/api/agents` returns all eight specialists with their SNS domains, reputations, and Covalent-enriched stablecoin balances
- After a successful 3-hop recursive run, calling `record_job_outcome` on the Anchor registry updates the reputation for DeepResearch, Summarizer, and SentimentAI

---

## Phase 5 — Agent CLI

### What This Phase Delivers

A terminal-based client that exercises the full x402 → Umbra hiring loop from the command line. Used for rapid development iteration and for demonstrating the protocol to judges in a pure CLI context.

### CLI Behavior

The CLI reads from stdin in a REPL loop. For each query, it opens an SSE connection to the backend's events endpoint and a separate REST POST connection to the query endpoint. It prints each SSE step event to stdout with a visual hierarchy: depth=0 events are unindented, depth=1 events are indented by two spaces, depth=2 events by four spaces.

The output format for each step is: `[TYPE] agent_name · detail`. For example: `[UMBRA_TRANSFER_INITIATED] researcher.aldor.sol · 0.001 stablecoin`, `[UMBRA_TRANSFER_CONFIRMED] researcher.aldor.sol · sig:AbC123…`, `[X402_SETTLED] researcher.aldor.sol · depth=0 · remaining=0.009`, and the indented sub-lines for recursive hires.

After the result is returned, the CLI prints: total amount spent (derived from accumulating the price of each settled hire), number of unique agents hired, number of Umbra transfers executed, and a list of all Umbra transaction signatures with their Solana Explorer Devnet links.

**CLI flags:**
- `--budget <number>` — sets the orchestrator budget in stablecoin units (default 0.01)
- `--max-depth <number>` — overrides the max depth header (default 3, capped at 3)
- `--mock-payments` — activates mock mode; interceptor returns synthetic proofs; useful for demonstrating flow without a funded wallet

### Phase 5 Verification Checklist

- Running with `--mock-payments` and a research query prints all expected steps including recursive depth=1 steps for Summarizer and SentimentAI
- Running without `--mock-payments` with a funded Devnet keypair produces real Umbra signatures for every hire
- All printed Solana Explorer links resolve to valid Devnet transactions
- Running with `--budget 0.0001` causes all specialists to be skipped with BUDGET_EXCEEDED printed for each
- Running with `--max-depth 1` causes DeepResearch's recursive sub-hires to fail with MAX_DEPTH_EXCEEDED printed
- Typing `exit` cleanly closes both the SSE connection and the process

---

## Phase 6 — Frontend Dashboard

### What This Phase Delivers

The Aldor operator dashboard: a Next.js 14 App Router application that is a structural port of aldor's frontend. All seven aldor components are replicated and adapted for Solana/Umbra. Two new components are added: UmbraPrivacyProof (showing the privacy evidence for each payment) and CovalentDataPanel (replacing the Dune embed with Covalent-powered analytics). The mock payments badge replaces the Dune chart placeholder.

### Page Routes

**`/`** — Main dashboard. Header with wallet status. Four status badges. A 2×2 grid (EconomyGraph top-left, AgentChat top-right, TransactionLog bottom-left, ProtocolTrace bottom-right). Below the grid: UmbraPrivacyProof panel and CovalentDataPanel side by side. ToolCatalog at the bottom.

**`/agents`** — Full agent registry with Covalent-enriched metadata, job history, reputation history chart (from JobOutcomeRecorded events), and SNS domain links.

**`/tools`** — Agent marketplace with cards for all eight specialists. Each card has a "Hire" button that opens a modal for direct queries and a "Request Off-ramp" button that calls the Dodo off-ramp utility.

**`/docs`** — Documentation page explaining the x402 flow, Umbra privacy model, SNS domain system, Covalent data layer, and Dodo payment flows. Links to the Anchor program on Devnet Explorer.

### Component Specifications

**`EconomyGraph.tsx`** — identical to aldor's Canvas-based 60fps topology graph. Five nodes: User, Manager, DeepResearch, Summarizer, SentimentAI. Animated payment-dot edges. Edge labels show "UMBRA" instead of an amount (since amounts are private). When an UMBRA_TRANSFER_CONFIRMED event arrives, the corresponding edge briefly flashes purple (Umbra's brand color). Below the canvas: payment count, number of unique agents hired, current depth of active hire, and a "PRIVACY: ON" indicator.

**`AgentChat.tsx`** — identical to aldor's chat component. Text input, submit button, scrolling SSE step log. Each step type has a distinct color: MANAGER_PLANNING blue, UMBRA_TRANSFER_INITIATED purple, UMBRA_TRANSFER_CONFIRMED bright purple, SNS_RESOLVED teal, X402_SETTLED green, SPECIALIST_FAILED red, BUDGET_EXCEEDED orange. Final result displayed at the bottom when RESULT_COMPOSED arrives.

**`TransactionLog.tsx`** — scrollable list of settled payments. Each entry shows: from-agent SNS domain → to-agent SNS domain, the word "PRIVATE" where the amount would be (since Umbra conceals it), the A2A depth badge (orange, shown only when depth > 0), and a clickable Umbra transaction signature link to Solana Explorer. No amounts are shown anywhere in this component.

**`ToolCatalog.tsx`** — fetches GET `/api/agents` and renders each agent as a card with SNS domain, price, reputation as a percentage, capabilities tags, recursive badge if applicable, and a Covalent-fetched current stablecoin balance. The "Request Off-ramp" button on each card calls the Dodo off-ramp utility for that agent's balance.

**`ProtocolTrace.tsx`** — filtered view of all SNS_RESOLVING, SNS_RESOLVED, UMBRA_TRANSFER_INITIATED, UMBRA_TRANSFER_CONFIRMED, and X402_SETTLED events. For SNS_RESOLVED: shows the domain and "→ stealth key resolved (hidden)". For UMBRA_TRANSFER_INITIATED: shows the SNS domain and amount. For UMBRA_TRANSFER_CONFIRMED: shows the Umbra signature truncated to 20 characters. For X402_SETTLED: shows a checkmark, agent name, and depth.

**`ExecutionSteps.tsx`** — chronological list of all SSE events with step numbers, type labels, human-readable descriptions, and elapsed-since-previous-step timings. Full audit trail in sequence.

**`WalletInfo.tsx`** — fetches stablecoin balance for the orchestrator wallet using Covalent's token balance endpoint (not direct RPC). Shows network label, truncated orchestrator public key, SOL balance via Covalent, stablecoin balance via Covalent, and a "Fund via Dodo" button that calls `fundAgentViaDodo` and opens the returned Dodo payment URL. Connected/disconnected indicator.

**`UmbraPrivacyProof.tsx`** (new Aldor-only component) — displays a panel showing the privacy guarantees for each completed payment. For each X402_SETTLED event in the session: shows the Umbra transaction signature, the ephemeral key (truncated), a note that the amount is not visible on-chain, and a link to the Umbra protocol documentation. This panel is the "judge-facing evidence" that Umbra is actively being used for private settlement. It also shows a count of "Privacy-Protected Transfers" for the session and the total number of unique stealth addresses generated.

**`CovalentDataPanel.tsx`** (replaces DuneEmbed) — uses `@covalenthq/client-sdk` to display two live data panels. The left panel is "Agentic GDP": fetches the decoded transaction history for the Anchor program address from Covalent, counts the total number of JobOutcomeRecorded events (as a proxy for completed agent hires), and displays this count as a live counter refreshed every 30 seconds. The right panel is "Economic Velocity": fetches the Covalent transaction history filtered to the last hour and displays a bar chart (rendered in pure Canvas, no chart library, matching the brutalist aesthetic) showing transactions per 5-minute bucket. Below both panels: a Covalent-fetched table of the most recent five transactions involving any registered agent wallet, showing timestamp, transaction type (decoded), and agent SNS domain.

### Frontend Data Flow

A single SSE connection is established on dashboard mount using a session ID generated client-side. The session ID is sent as a query parameter to both the SSE endpoint and the query POST endpoint so the backend routes events to the correct emitter. All step events are stored in a `steps` array in React state at the page level. This array is passed as props to all components. The EconomyGraph, ProtocolTrace, ExecutionSteps, TransactionLog, and UmbraPrivacyProof all derive their display state from the same `steps` array. The CovalentDataPanel polls independently on its own 30-second interval. The AgentChat calls the page-level `setSteps` callback when it receives new steps and also triggers the REST POST on submit.

### Visual Design System

Same cyber-minimalist aesthetic as aldor: black background, terminal green primary text, muted green secondary text, orange for budget/warnings, purple for Umbra-related events (unique to Aldor), monospace font throughout, no rounded corners, no shadows, no animations except the canvas topology and SSE append fade-in. Status badges at the top show: "RECURSIVE DELEGATION: ON", "UMBRA PRIVACY: ACTIVE", "SNS DOMAINS: ACTIVE", "COVALENT DATA: LIVE".

### Phase 6 Verification Checklist

- Dashboard loads at `http://localhost:3000` with no console errors
- Submitting a research query causes the topology graph to animate and all four step-list components to populate in real time
- The UmbraPrivacyProof panel shows a non-zero count of privacy-protected transfers after a query completes
- The TransactionLog shows "PRIVATE" where amounts would be and all links open valid Solana Explorer Devnet pages
- The CovalentDataPanel's Agentic GDP counter increments after a completed query (after the Anchor `record_job_outcome` call lands on-chain and Covalent indexes it)
- The "Fund via Dodo" button in WalletInfo opens a valid Dodo payment URL (in sandbox mode)
- The "Request Off-ramp" button on a ToolCatalog agent card triggers the Dodo invoicing API (in sandbox mode) and shows a returned invoice ID
- The MOCK MODE badge is visible when `NEXT_PUBLIC_MOCK_PAYMENTS=true` is set
- All eight specialist agents appear in the ToolCatalog with Covalent-fetched balances
- Navigating to `/agents` shows reputation history for each agent derived from Covalent-decoded JobOutcomeRecorded events

---

## Phase 7 — End-to-End Demo and Submission

### Demo Script (3-Minute Video)

**Minute 1 — Setup and architecture.** Show the terminal with backend and frontend running. Open the dashboard. Walk through the four status badges emphasizing "UMBRA PRIVACY: ACTIVE". Show WalletInfo with a non-zero balance. Open the ToolCatalog and point out that all eight specialists are identified by SNS domains, not public keys.

**Minute 2 — Live recursive query.** Type "Research quantum computing trends and summarize the key findings" into AgentChat. Narrate: Manager plans → SNS resolves researcher.aldor.sol → Umbra transfer initiated (purple flash on topology edge) → DeepResearch receives payment and fires sub-agents → SNS resolves summarizer.aldor.sol → second Umbra transfer → Summarizer returns result → RESULT_COMPOSED. Show the EconomyGraph animating with purple payment dots. Show the UmbraPrivacyProof panel with two entries, each showing "Amount: PRIVATE".

**Minute 3 — On-chain evidence and analytics.** Click the Umbra signature in the TransactionLog. Show Solana Explorer Devnet with a real transaction. Switch to the CovalentDataPanel and show the Agentic GDP counter at 3 (for the 3 JobOutcomeRecorded calls made during the recursive run). Show the Economic Velocity chart with a spike in the last 5-minute bucket. Click "Fund via Dodo" in WalletInfo and show the Dodo payment page opening. Click "Request Off-ramp" on the DeepResearch card and show the Dodo invoice ID returned.

### Submission Checklist

- GitHub repository is public under `@kartikangiras`
- Repository contains all five workspace directories with no placeholder files
- README.md contains: one-line description, ASCII architecture diagram, quick-start in three commands, links to the Devnet program ID, the Vercel frontend URL, the Umbra protocol documentation, and the Covalent GoldRush dashboard
- Anchor program is deployed; program ID recorded in Anchor.toml, README, and `.env.example`
- `.env.example` contains all variable names with no real secrets: `SOLANA_RPC_URL`, `AGENT_PRIVATE_KEY`, `AGENT_WALLET_PUBKEY`, `UMBRA_PROGRAM_ADDRESS`, `STABLECOIN_MINT`, `DODO_API_KEY`, `COVALENT_API_KEY`, `ALDOR_REGISTRY_PROGRAM_ID`, `GROQ_API_KEY`, `NEXT_PUBLIC_MOCK_PAYMENTS`, `NEXT_PUBLIC_COVALENT_API_KEY`, `NEXT_PUBLIC_BACKEND_URL`
- 3-minute demo video embedded in README or linked from it
- Vercel frontend deployment is live
- Submission notes explicitly call out: lines of code where Umbra SDK is initialized (Privacy Track), lines where Dodo API is called (Finance Track), lines where Covalent GoldRush SDK is initialized (Data Track), and lines where `@bonfida/spl-name-service` is called (SNS Identity)
- Primary KPI (paid agent-to-agent requests per day) is evidenced by the Covalent Economic Velocity chart in the demo video

---

## Cross-Cutting Concerns

### Hard Spend Policy

Enforced at three layers. HTTP layer: every request carries X-Aldor-Max-Depth and X-Aldor-Budget-Remaining; middleware rejects anything exceeding depth 3. Application layer: manager checks remaining budget before each hire. On-chain layer: the Anchor registry's `record_job_outcome` instruction requires the caller to be the agent owner, preventing unauthorized reputation manipulation.

### Privacy Preservation Rules

No raw public keys appear in HTTP response bodies or SSE events. Only SNS domains. No payment amounts appear in SSE events or the TransactionLog. Umbra transaction signatures can be shown (they are public) but they reveal nothing about amount or recipient. The UmbraPrivacyProof panel explicitly explains this to judges.

### Error Handling

Payment verification failure → 402. Umbra SDK error → 500 with UMBRA_ERROR. SNS resolution failure → fall back to env map; if map also fails → 400 with SNS_RESOLUTION_FAILED. Specialist execution failure → 500; manager emits SPECIALIST_FAILED and continues with remaining budget. Dodo API failure → logged but non-fatal; UI shows error toast. Covalent API failure → CovalentDataPanel shows cached last-known values and a "stale data" badge.

### Mock Payments Mode

`MOCK_PAYMENTS=true` in backend env: skips Umbra SDK calls; returns synthetic signatures; Umbra verification always returns true. `NEXT_PUBLIC_MOCK_PAYMENTS=true` in frontend env: shows a "MOCK MODE" badge in the header; UmbraPrivacyProof panel shows "(MOCK)" suffix on each entry. The full hiring loop, SSE streaming, Anchor reputation updates, and Covalent polling all function identically in mock mode.

### Reputation and Value Score

Identical to aldor. Start at 5,000 basis points. +50 on success, -100 on failure, clamped 0–10,000. Value score = `reputation² / (price × 10,000)`. Higher reputation and lower price both improve score. Manager logs all computed value scores in PLAN_CREATED event so they are visible in ProtocolTrace.

### Covalent Chain ID

All Covalent API calls use the Solana Devnet chain identifier. Covalent's GoldRush SDK's chain ID for Solana Devnet must be verified against Covalent's current chain list at build time since chain IDs change between Covalent API versions.

---

## Day-by-Day Build Schedule

**Day 1 (May 2)** — Scaffold monorepo, all package.json files, npm workspaces, install all dependencies. Write Anchor program skeleton with account structs and instruction signatures only. Confirm `anchor build` passes.

**Day 2 (May 3)** — Implement all Anchor instructions with PDA seeds, reputation math, and event emission. Write and pass full Anchor test suite. Deploy to Devnet. Record program ID.

**Day 3 (May 4)** — Implement SDK modules: Umbra wrapper (`umbra.ts`), SNS resolver with Devnet fallback (`sns.ts`), Dodo utilities (`dodo.ts`). Verify Umbra transfer simulation on Devnet.

**Day 4 (May 5)** — Implement AldorClient class with Axios interceptor, payment resolution cycle, and all public methods. Write the mock-payments demo script verifying the full 402 → resolve → transfer → retry cycle end-to-end.

**Day 5 (May 6)** — Implement backend x402 middleware, Umbra verification side, and six non-recursive specialists. Test each with curl confirming the 402 → UMBRA → 200 cycle.

**Day 6 (May 7)** — Implement manager orchestrator with LLM planning, value score evaluation, SSE emission, budget enforcement, and Anchor reputation updates. Implement two recursive specialists (DeepResearch, CodingAgent). Test the full 3-hop recursive loop.

**Day 7 (May 8)** — Build all nine frontend components. Wire SSE stream. Implement CovalentDataPanel with `@covalenthq/client-sdk`. Implement UmbraPrivacyProof panel.

**Day 8 (May 9)** — Full end-to-end run with real Devnet: real Umbra transfers, real Anchor reputation updates, real Covalent data refresh. Test Dodo sandbox on-ramp and off-ramp. Deploy frontend to Vercel. Validate all Covalent calls against Devnet chain ID.

**Day 9 (May 10)** — Write README with ASCII diagram and all required links. Annotate submission with exact file/line references for each track integration. Record 3-minute demo video. Run full verification checklist. Submit.

---

*ALDOR — Private. On-chain. Solana-native.*