# agent-toolprint

> Double-signed receipts for every tool invocation by an AI agent.

## What

`agent-toolprint` defines a small, signed receipt format for every external tool invocation an agent makes. Each receipt binds: agent DID, tool DID, tool name, args hash, response hash, timestamp, nonce — signed by **both** the agent **and** the tool. Portable, stackable, verifiable offline by any third party.

It answers the audit question cleanly: "yes, agent X called tool Y with these args at time T, and both sides agree."

## Status

**0.0 — design phase.** Draft spec in [SPEC.md](./SPEC.md). No code yet.

## The gap

MCP defines tool discovery and invocation but explicitly defers audit to the host. OTel GenAI captures tool-call spans but trusts the telemetry — no non-repudiation. in-toto / SigStore ship a DSSE envelope and SLSA predicates but assume **one signer per step** (build-time). EAS off-chain is single-signer, EVM-leaning. Biscuit / Macaroons authorize actions but don't record invocations.

No standard, lightweight, **double-signed** receipt format exists specifically for agent↔tool invocations.

## Scope

**In scope**

- Receipt schema (CBOR / JCS, canonical)
- DSSE envelope with two signatures (agent + tool)
- Hash-binding of args and response
- Chaining via `parent` receipt id
- Reference Rust + TypeScript libraries
- Conformance vectors

**Out of scope**

- Tool discovery or invocation transport (MCP does this)
- Internal request logging
- Provider-specific audit systems
- Full agent telemetry SDKs (OTel GenAI covers that)

## Dependencies and companions

- **Depends on:** `agent-id` (for agent + tool DIDs as signers).
- **Can be embedded in:** `agent-scroll` transcripts as tool-call evidence.

## Validation scoring

| Criterion | Score |
|---|---|
| Scope | 5 |
| Composes primitives | 5 |
| Standalone | 5 |
| Clear gap | 4 |
| Light deps | 5 |
| Testable | 5 |
| **Total** | **29/30** |

Verdict: **EASY**. Full validation: [`../research/validations/agent-toolprint.md`](../research/validations/agent-toolprint.md).

## Prior art

- **MCP** — tool invocation, no receipts.
- **OTel GenAI** — observability, no non-repudiation.
- **SigStore / in-toto / SLSA** — single-signer attestations; reusable envelope but not counter-signing.
- **EAS off-chain** — single-signer, EVM-leaning.
- **Biscuit / Macaroons** — authorization, not audit.
- **C2PA** — media provenance; similar pattern, different domain.
- **W3C VC-DM 2.0** — supports multi-proof documents; viable substrate.

## Implementation skeleton

**Receipt v0.1 (CBOR / JCS):**

```
{
  v: "tp/0.1",
  id: uuid,
  ts: rfc3339,
  agent: {did, key_id},
  tool: {did, key_id},
  call: {name, args_hash: "sha256:...", args_enc: "jcs"},
  result: {status, response_hash: "sha256:...", bytes?: <=1KiB},
  nonce,
  parent?: receipt_id,
  ext?: {}
}
```

Wrapped in a DSSE envelope carrying **two** signatures over the same payload bytes.

**API:**

- `sign_agent(receipt, sk) → partial`
- `countersign_tool(partial, sk) → complete`
- `verify(receipt, resolver) → Result`
- `chain(parent, child)` enforces `parent.id == child.parent`

**Dependencies:** `ed25519-dalek`, `serde_cbor`, `serde_jcs`, a `did-resolver` trait.

**Repo layout:**

- `toolprint-spec/` — ~15 pages markdown
- `toolprint-rs/` — ~1.5k LoC
- `toolprint-ts/` — ~800 LoC
- `conformance/` — JSON vectors

## Conformance tests

1. Canonical-encoding determinism across implementations.
2. Tampering args or response hash → verify fails.
3. Single-signed receipt rejected; double-signed chain verifies end-to-end.

## License

Apache 2.0 — see [LICENSE](./LICENSE).

## Research

Landscape, prior art, scoring rationale: [`../research/`](../research/).
