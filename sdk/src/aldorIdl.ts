const idl = {
  address: "2km5TwkgiaDWfAyojtntyj5Djuz6ivcBVvWR8SSR4DQj",
  metadata: {
    name: "aldor",
    version: "0.1.0",
    spec: "0.1.0",
    description: "Aldor agent economy program",
  },
  instructions: [
    {
      name: "deactivate_agent",
      discriminator: [205, 171, 239, 225, 82, 126, 96, 166],
      accounts: [
        {
          name: "agent",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [97, 103, 101, 110, 116] },
              { kind: "arg", path: "sns_domain" },
            ],
          },
        },
        { name: "owner", signer: true },
      ],
      args: [],
    },
    {
      name: "record_job_outcome",
      discriminator: [110, 63, 150, 59, 135, 75, 121, 49],
      accounts: [
        {
          name: "agent",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [97, 103, 101, 110, 116] },
              { kind: "arg", path: "sns_domain" },
            ],
          },
        },
        { name: "owner", signer: true },
      ],
      args: [{ name: "success", type: "bool" }],
    },
    {
      name: "register_agent",
      discriminator: [135, 157, 66, 195, 2, 113, 175, 30],
      accounts: [
        {
          name: "agent",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [97, 103, 101, 110, 116] },
              { kind: "arg", path: "sns_domain" },
            ],
          },
        },
        { name: "owner", writable: true, signer: true },
        { name: "system_program", address: "11111111111111111111111111111111" },
      ],
      args: [
        { name: "sns_domain", type: "string" },
        { name: "umbra_stealth_key", type: { array: ["u8", 32] } },
        { name: "name", type: "string" },
        { name: "category", type: "string" },
        { name: "price_micro_stablecoin", type: "u64" },
        { name: "is_recursive", type: "bool" },
        { name: "capabilities", type: { vec: "string" } },
      ],
    },
    {
      name: "update_capabilities",
      discriminator: [102, 104, 235, 240, 127, 163, 100, 149],
      accounts: [
        {
          name: "agent",
          writable: true,
          pda: {
            seeds: [
              { kind: "const", value: [97, 103, 101, 110, 116] },
              { kind: "arg", path: "sns_domain" },
            ],
          },
        },
        { name: "owner", signer: true },
      ],
      args: [
        { name: "new_capabilities", type: { vec: "string" } },
        { name: "new_price_micro_stablecoin", type: "u64" },
      ],
    },
  ],
  accounts: [
    { name: "AgentAccount", discriminator: [241, 119, 69, 140, 233, 9, 112, 50] },
  ],
  events: [
    { name: "AgentDeactivated", discriminator: [138, 251, 82, 87, 119, 148, 20, 180] },
    { name: "AgentRegistered", discriminator: [191, 78, 217, 54, 232, 100, 189, 85] },
    { name: "CapabilitiesUpdated", discriminator: [238, 187, 138, 145, 174, 93, 144, 113] },
    { name: "JobOutcomeRecorded", discriminator: [69, 149, 146, 2, 12, 151, 230, 42] },
  ],
  errors: [
    { code: 6000, name: "StringTooLong", msg: "String too long" },
    { code: 6001, name: "Unauthorized", msg: "Unauthorized" },
    { code: 6002, name: "InvalidPrice", msg: "Invalid price" },
    { code: 6003, name: "TooManyCapabilities", msg: "Too many capabilities" },
  ],
  types: [
    {
      name: "AgentAccount",
      type: {
        kind: "struct",
        fields: [
          { name: "owner", type: "pubkey" },
          { name: "sns_domain", type: "string" },
          { name: "umbra_stealth_key", type: { array: ["u8", 32] } },
          { name: "name", type: "string" },
          { name: "category", type: "string" },
          { name: "price_micro_stablecoin", type: "u64" },
          { name: "reputation_bps", type: "u64" },
          { name: "total_jobs", type: "u64" },
          { name: "successful_jobs", type: "u64" },
          { name: "active", type: "bool" },
          { name: "is_recursive", type: "bool" },
          { name: "capabilities", type: { vec: "string" } },
          { name: "registered_at", type: "i64" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "AgentDeactivated",
      type: { kind: "struct", fields: [{ name: "sns_domain", type: "string" }] },
    },
    {
      name: "AgentRegistered",
      type: {
        kind: "struct",
        fields: [
          { name: "sns_domain", type: "string" },
          { name: "umbra_stealth_key", type: { array: ["u8", 32] } },
          { name: "category", type: "string" },
          { name: "price_micro_stablecoin", type: "u64" },
        ],
      },
    },
    {
      name: "CapabilitiesUpdated",
      type: {
        kind: "struct",
        fields: [
          { name: "sns_domain", type: "string" },
          { name: "new_capabilities", type: { vec: "string" } },
          { name: "new_price_micro_stablecoin", type: "u64" },
        ],
      },
    },
    {
      name: "JobOutcomeRecorded",
      type: {
        kind: "struct",
        fields: [
          { name: "sns_domain", type: "string" },
          { name: "success", type: "bool" },
          { name: "new_reputation_bps", type: "u64" },
        ],
      },
    },
  ],
};

export default idl;
