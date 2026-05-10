;; agent-registry.clar
;; Sovereign Agent Registry for x402-stacks Agentic Economy
;; Stacks Testnet / Mainnet

;; ── Constants ──
(define-constant ERR_UNAUTHORIZED (err u100))
(define-constant ERR_ALREADY_REGISTERED (err u101))
(define-constant ERR_NOT_FOUND (err u102))
(define-constant ERR_INSUFFICIENT_FUNDS (err u103))
(define-constant ERR_INVALID_PRICE (err u104))
(define-constant ERR_JOB_NOT_FOUND (err u105))
(define-constant ERR_INVALID_STATE (err u106))
(define-constant ERR_DISPUTE (err u107))

(define-constant CONTRACT_OWNER tx-sender)
(define-constant REPUTATION_SCALE u10000) ;; 0-10000 = 0.00-100.00%
(define-constant DEFAULT_REPUTATION u7500) ;; 75.00%
(define-constant MIN_PRICE u1)

;; ── Data Maps ──

;; Agent registry: principal -> agent info
(define-map agents principal
  {
    name: (string-ascii 64),
    domain: (string-ascii 128),
    category: (string-ascii 32),
    price-atomic: uint,
    token: (string-ascii 8), ;; "STX" or "PALM"
    recursive: bool,
    reputation: uint,
    description: (string-ascii 256),
    active: bool,
    jobs-completed: uint,
    jobs-failed: uint,
    total-earned: uint,
    registered-at: uint
  }
)

;; Reverse lookup: domain -> principal
(define-map domain-to-agent (string-ascii 128) principal)

;; Job tracking: job-id -> job info
(define-map jobs uint
  {
    client: principal,
    agent: principal,
    amount: uint,
    token: (string-ascii 8),
    status: (string-ascii 16), ;; "pending" | "completed" | "disputed" | "refunded"
    result-hash: (buff 32),
    created-at: uint,
    completed-at: uint,
    rating: uint ;; 0-10000
  }
)

;; Job counter
(define-data-var job-counter uint u0)

;; ── Read-Only Functions ──

(define-read-only (get-agent (agent-principal principal))
  (map-get? agents agent-principal)
)

(define-read-only (get-agent-by-domain (domain (string-ascii 128)))
  (match (map-get? domain-to-agent domain)
    agent-principal (get-agent agent-principal)
    none
  )
)

(define-read-only (get-job (job-id uint))
  (map-get? jobs job-id)
)

(define-read-only (get-job-counter)
  (var-get job-counter)
)

(define-read-only (calculate-value-score (reputation uint) (price-atomic uint))
  ;; value = reputation^2 / (price * 10000)
  ;; Higher reputation, lower price = better value
  (if (is-eq price-atomic u0)
    u0
    (/ (* reputation reputation) (* price-atomic u10000))
  )
)

(define-read-only (get-all-agents)
  ;; Returns a list of up to 50 agents
  ;; In production, use pagination or off-chain indexing
  (list)
)

;; ── Public Functions ──

;; Register a new agent
(define-public (register-agent
  (name (string-ascii 64))
  (domain (string-ascii 128))
  (category (string-ascii 32))
  (price-atomic uint)
  (token (string-ascii 8))
  (recursive bool)
  (description (string-ascii 256))
)
  (begin
    ;; Validate inputs
    (asserts! (>= price-atomic MIN_PRICE) ERR_INVALID_PRICE)
    (asserts! (is-none (map-get? agents tx-sender)) ERR_ALREADY_REGISTERED)
    (asserts! (is-none (map-get? domain-to-agent domain)) ERR_ALREADY_REGISTERED)

    ;; Register agent
    (map-set agents tx-sender {
      name: name,
      domain: domain,
      category: category,
      price-atomic: price-atomic,
      token: token,
      recursive: recursive,
      reputation: DEFAULT_REPUTATION,
      description: description,
      active: true,
      jobs-completed: u0,
      jobs-failed: u0,
      total-earned: u0,
      registered-at: block-height
    })

    ;; Set reverse lookup
    (map-set domain-to-agent domain tx-sender)

    (ok true)
  )
)

;; Update agent price
(define-public (update-price (new-price-atomic uint))
  (let ((agent (unwrap! (map-get? agents tx-sender) ERR_NOT_FOUND)))
    (asserts! (>= new-price-atomic MIN_PRICE) ERR_INVALID_PRICE)
    (map-set agents tx-sender (merge agent { price-atomic: new-price-atomic }))
    (ok true)
  )
)

;; Update agent active status
(define-public (set-active (active bool))
  (let ((agent (unwrap! (map-get? agents tx-sender) ERR_NOT_FOUND)))
    (map-set agents tx-sender (merge agent { active: active }))
    (ok true)
  )
)

;; Deregister agent (admin or self)
(define-public (deregister-agent (agent-principal principal))
  (begin
    (asserts! (or (is-eq tx-sender CONTRACT_OWNER) (is-eq tx-sender agent-principal)) ERR_UNAUTHORIZED)
    (let ((agent (unwrap! (map-get? agents agent-principal) ERR_NOT_FOUND)))
      (map-delete agents agent-principal)
      (map-delete domain-to-agent (get domain agent))
      (ok true)
    )
  )
)

;; Create a job with STX escrow
(define-public (create-job
  (agent-principal principal)
  (amount uint)
  (result-hash (buff 32))
)
  (let (
    (agent (unwrap! (map-get? agents agent-principal) ERR_NOT_FOUND))
    (job-id (+ (var-get job-counter) u1))
  )
    ;; Validate
    (asserts! (get active agent) ERR_INVALID_STATE)
    (asserts! (>= amount (get price-atomic agent)) ERR_INSUFFICIENT_FUNDS)

    ;; Transfer STX to contract as escrow
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))

    ;; Create job record
    (var-set job-counter job-id)
    (map-set jobs job-id {
      client: tx-sender,
      agent: agent-principal,
      amount: amount,
      token: (get token agent),
      status: "pending",
      result-hash: result-hash,
      created-at: block-height,
      completed-at: u0,
      rating: u0
    })

    (ok job-id)
  )
)

;; Complete job and release payment (client or contract owner)
(define-public (complete-job (job-id uint) (rating uint))
  (let (
    (job (unwrap! (map-get? jobs job-id) ERR_JOB_NOT_FOUND))
    (agent (unwrap! (map-get? agents (get agent job)) ERR_NOT_FOUND))
  )
    ;; Authorization
    (asserts! (or (is-eq tx-sender (get client job)) (is-eq tx-sender CONTRACT_OWNER)) ERR_UNAUTHORIZED)
    ;; State check
    (asserts! (is-eq (get status job) "pending") ERR_INVALID_STATE)
    ;; Rating bounds
    (asserts! (<= rating REPUTATION_SCALE) ERR_INVALID_PRICE)

    ;; Release escrow to agent
    (try! (as-contract (stx-transfer? (get amount job) tx-sender (get agent job))))

    ;; Update job
    (map-set jobs job-id (merge job {
      status: "completed",
      completed-at: block-height,
      rating: rating
    }))

    ;; Update agent stats and reputation
    (let (
      (completed (+ (get jobs-completed agent) u1))
      (earned (+ (get total-earned agent) (get amount job)))
      ;; Exponential moving average for reputation: new_rep = (old_rep * 9 + rating) / 10
      (new-reputation (/ (+ (* (get reputation agent) u9) rating) u10))
    )
      (map-set agents (get agent job) (merge agent {
        jobs-completed: completed,
        total-earned: earned,
        reputation: new-reputation
      }))
    )

    (ok true)
  )
)

;; Dispute a job (client or owner)
(define-public (dispute-job (job-id uint) (reason (string-ascii 256)))
  (let ((job (unwrap! (map-get? jobs job-id) ERR_JOB_NOT_FOUND)))
    (asserts! (or (is-eq tx-sender (get client job)) (is-eq tx-sender CONTRACT_OWNER)) ERR_UNAUTHORIZED)
    (asserts! (is-eq (get status job) "pending") ERR_INVALID_STATE)

    ;; Mark as disputed - funds remain in escrow
    (map-set jobs job-id (merge job { status: "disputed" }))

    (ok true)
  )
)

;; Resolve dispute (owner only) - refund or complete
(define-public (resolve-dispute (job-id uint) (refund bool))
  (let (
    (job (unwrap! (map-get? jobs job-id) ERR_JOB_NOT_FOUND))
    (agent (unwrap! (map-get? agents (get agent job)) ERR_NOT_FOUND))
  )
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (asserts! (is-eq (get status job) "disputed") ERR_INVALID_STATE)

    (if refund
      (begin
        ;; Refund client
        (try! (as-contract (stx-transfer? (get amount job) tx-sender (get client job))))
        ;; Update agent failed count
        (map-set agents (get agent job) (merge agent {
          jobs-failed: (+ (get jobs-failed agent) u1)
        }))
        (map-set jobs job-id (merge job { status: "refunded" }))
      )
      (begin
        ;; Release to agent
        (try! (as-contract (stx-transfer? (get amount job) tx-sender (get agent job))))
        (map-set jobs job-id (merge job { status: "completed" }))
      )
    )
    (ok true)
  )
)

;; Admin: Update agent reputation directly (for external oracle integration)
(define-public (set-reputation (agent-principal principal) (new-reputation uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (asserts! (<= new-reputation REPUTATION_SCALE) ERR_INVALID_PRICE)
    (let ((agent (unwrap! (map-get? agents agent-principal) ERR_NOT_FOUND)))
      (map-set agents agent-principal (merge agent { reputation: new-reputation }))
      (ok true)
    )
  )
)

;; ── STX Utility ──

(define-read-only (get-contract-balance)
  (stx-get-balance (as-contract tx-sender))
)

;; Allow owner to withdraw accidental STX deposits
(define-public (withdraw-excess (amount uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (try! (as-contract (stx-transfer? amount tx-sender CONTRACT_OWNER)))
    (ok true)
  )
)
