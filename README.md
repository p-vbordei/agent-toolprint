# agent-toolprint

> Double-signed receipts for every tool invocation by an AI agent.

## What

`agent-toolprint` defines a small, signed receipt format for every external tool invocation an agent makes. Each receipt binds: agent DID, tool DID, tool name, args hash, response hash, timestamp, nonce — signed by **both** the agent **and** the tool. Portable, stackable, verifiable offline by any third party.

It answers the audit question cleanly: "yes, agent X called tool Y with these args at time T, and both sides agree."

## Status

**v0.1.0 — first release.** TypeScript ref impl, 12 conformance vectors, 20-line demo.

## Quickstart

```bash
git clone <repo-url> agent-toolprint
cd agent-toolprint
bun install
bun run demo
```

You'll see one receipt flow `signAgent → countersignTool → verify` (prints `ok: true`), then the same envelope with a single-byte tamper (prints `ok: false`).

## Usage

```ts
import {
  signAgent,
  countersignTool,
  verify,
  didKeyResolver,
  sha256Hash,
  type Receipt,
} from "agent-toolprint";

const receipt: Receipt = { /* see examples/demo.ts */ };
const envelope = countersignTool(signAgent(receipt, agentSk), toolSk);
const result = await verify(envelope, { resolver: didKeyResolver });
// result: { ok: true, receipt } | { ok: false, error }
```

See [`SPEC.md`](./SPEC.md) for the normative grammar, [`SCOPE.md`](./SCOPE.md) for v0.1 feature decisions, and [`conformance/`](./conformance/) for the vector suite (`bun run conformance`).

## The gap

MCP defines tool discovery and invocation but explicitly defers audit to the host. OTel GenAI captures tool-call spans but trusts the telemetry — no non-repudiation. in-toto / SigStore ship a DSSE envelope and SLSA predicates but assume **one signer per step** (build-time). EAS off-chain is single-signer, EVM-leaning. Biscuit / Macaroons authorize actions but don't record invocations.

No standard, lightweight, **double-signed** receipt format exists specifically for agent↔tool invocations.

## Scope

**In scope (v0.1 — see [SCOPE.md](./SCOPE.md))**

- Receipt schema (JCS canonical)
- DSSE envelope with two signatures (agent + tool)
- Hash-binding of args and response
- Chaining via `parent` receipt id
- Reference TypeScript library
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

> Original design sketch. The authoritative v0.1 grammar lives in [SPEC.md](./SPEC.md); scope decisions in [SCOPE.md](./SCOPE.md).

**Receipt v0.1 (original sketch):**

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

## Security notes

- **Replay is caller-side.** The library is stateless. Consumers that need uniqueness track `(id, nonce)` themselves. See `tests/security-replay.test.ts`.
- **Revocation is out-of-band.** If an agent or tool later repudiates a receipt, the receipt remains cryptographically valid; consumers must consult an external revocation list.
- **Plaintext is out-of-band.** Receipts carry `sha256:<hex>` of JCS-canonical args and responses. Audit reviewers request plaintext separately and re-hash it — `verify(..., { plaintext: { args, response } })` performs this check.
- **Key rotation on `did:key` is a no-op.** The verification key is derived from the DID string; it cannot change without changing the DID.

## License

Apache 2.0 — see [LICENSE](./LICENSE).

## Research

Landscape, prior art, scoring rationale: [`../research/`](../research/).
