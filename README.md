# agent-toolprint

> **Double-signed receipts for every tool invocation by an AI agent.** Portable, hash-binding, byte-canonical, verifiable offline by any third party.

`agent-toolprint` is the format that answers one audit question, cleanly: *"yes, agent **X** called tool **Y** with these args at time **T**, and both sides agree."* The agent signs. The tool counter-signs. Anyone with their public keys can verify — no host, no service, no chain.

It is a TypeScript library, a small spec, and a [conformance suite](./conformance/) other implementations validate against.

```
┌────────┐                                  ┌───────┐
│ agent  │ ── call(args) ──────────────────►│ tool  │
│        │ ◄── response ─────────────────── │       │
└───┬────┘                                  └───┬───┘
    │                                           │
    │  signAgent(receipt, agentSk)              │
    │  ─────────────────────────────────────────►
    │            envelope (1 sig)               │
    │                                           │ countersignTool(env, toolSk)
    │  ◄─────────────────────────────────────────
    │            envelope (2 sigs)              │
    ▼
verify(envelope, resolver) ──► { ok: true, receipt } | { ok: false, error }
```

---

## Quickstart

```bash
git clone <repo-url> agent-toolprint
cd agent-toolprint
bun install
bun run demo
```

Expected: `verify: { ok: true, ... }` followed by `verify (after 1-byte tamper): { ok: false, ... }`. **Under five minutes from `git clone` to verified receipt.** The same Quickstart runs in CI on every PR — see [`.github/workflows/ci.yml`](./.github/workflows/ci.yml).

## 30-second example

```ts
import {
  signAgent,
  countersignTool,
  verify,
  didKeyFromEd25519Pubkey,
  didKeyResolver,
  sha256Hash,
  type Receipt,
} from "agent-toolprint";
import { ed25519 } from "@noble/curves/ed25519.js";
import { randomUUID } from "node:crypto";
import { base64 } from "@scure/base";

const agentSk = ed25519.utils.randomSecretKey();
const toolSk = ed25519.utils.randomSecretKey();
const args = { query: "bun docs" };
const response = { results: ["https://bun.sh/docs"] };

const receipt: Receipt = {
  v: "tp/0.1",
  id: randomUUID(),
  ts: new Date().toISOString(),
  agent: { did: didKeyFromEd25519Pubkey(ed25519.getPublicKey(agentSk)), key_id: "agent" },
  tool:  { did: didKeyFromEd25519Pubkey(ed25519.getPublicKey(toolSk)),  key_id: "tool"  },
  call:   { name: "search", args_hash: sha256Hash(args) },
  result: { status: "ok", response_hash: sha256Hash(response) },
  nonce:  base64.encode(crypto.getRandomValues(new Uint8Array(32))),
};

const envelope = countersignTool(signAgent(receipt, agentSk), toolSk);
const result = await verify(envelope, { resolver: didKeyResolver, plaintext: { args, response } });
// → { ok: true, receipt }
```

## Why agent-toolprint?

- **Both sides on record.** Agent and tool sign the same canonical bytes. Neither can later claim "that wasn't me" or "that wasn't them".
- **Verifies offline.** A public key and the envelope are enough — no calls to a host, ledger, or central service.
- **Plays with what you have.** [DSSE](https://github.com/secure-systems-lab/dsse) wire format, [Ed25519](https://www.rfc-editor.org/rfc/rfc8032) signatures, [JCS](https://www.rfc-editor.org/rfc/rfc8785) canonical JSON, [`did:key`](https://w3c-ccg.github.io/did-method-key/) identities. No new crypto.

### Compared to alternatives

| | Tool-call audit? | Both sides sign? | Offline verify? | Wire format |
|---|---|---|---|---|
| **agent-toolprint** | ✓ | ✓ | ✓ | DSSE + JCS |
| MCP | invocation only — defers audit | — | — | JSON-RPC |
| OTel GenAI | observability — trusted telemetry | — | — | spans |
| SigStore / in-toto / SLSA | build provenance | one signer per step | ✓ | DSSE |
| EAS off-chain | attestation | single signer | requires EVM | EIP-712 |
| Biscuit / Macaroons | authorization, not audit | — | ✓ | bearer token |

**`agent-toolprint` does not replace MCP** — it captures what happened on top of any transport. **It does not replace OTel** — it adds non-repudiation OTel doesn't claim to provide.

## Public API

The library exports four functions and a small surface of helpers:

| | Signature | What it does |
|---|---|---|
| `signAgent` | `(receipt, sk) → Envelope` | Validates receipt, JCS-canonicalizes, returns DSSE envelope with the agent signature |
| `countersignTool` | `(envelope, sk) → Envelope` | Verifies the envelope is well-formed, appends the tool signature |
| `verify` | `(envelope, opts) → Promise<{ok, ...}>` | Runs all five SPEC §4 checks |
| `chain` | `(parent, child) → boolean` | Returns `child.parent === parent.id` |
| `didKeyResolver` | `Resolver` | Bundled `did:key` resolver — pluggable |
| `didKeyFromEd25519Pubkey` | `(pk) → string` | Encode an Ed25519 pubkey as a `did:key` |
| `parseDidKey` | `(did) → Uint8Array` | Decode a `did:key` to its Ed25519 pubkey |
| `sha256Hash` | `(value) → "sha256:<hex>"` | SHA-256 over JCS-canonical bytes |
| `canonical` / `canonicalBytes` | `(value) → string \| bytes` | RFC 8785 JCS |
| `ReceiptSchema` / `EnvelopeSchema` | Zod | Strict validators for both shapes |
| `PAYLOAD_TYPE`, `PROTOCOL_VERSION` | constants | DSSE `payloadType` and the `v` field value |

### `verify` options

```ts
type VerifyOptions = {
  resolver: Resolver;                 // pluggable DID resolver — required
  now?: Date;                         // default: new Date()
  maxClockSkewMs?: number;            // default: 24h
  skipTimestampCheck?: boolean;       // default: false
  plaintext?: { args?: unknown; response?: unknown };  // optional re-hash check
};
```

## Receipt grammar (excerpt)

Full normative grammar in [SPEC.md](./SPEC.md). The shape:

```jsonc
{
  "v":  "tp/0.1",
  "id": "<RFC 4122 UUID>",
  "ts": "<RFC 3339>",
  "agent":  { "did": "did:key:z…", "key_id": "…" },
  "tool":   { "did": "did:key:z…", "key_id": "…" },
  "call":   { "name": "search", "args_hash":     "sha256:…" },
  "result": { "status": "ok",   "response_hash": "sha256:…" },
  "nonce":  "<base64 32-byte random>",
  "parent": "<receipt id, optional>"
}
```

Wrapped in a DSSE envelope with **exactly two** Ed25519 signatures (agent first, tool second), over the same canonical payload bytes.

## Conformance

```bash
bun run conformance
# 12/12 passed in ~0.2s
```

The vectors in [`conformance/vectors/`](./conformance/vectors/) are the contract with other implementations. Cover all four SPEC §6 clauses:

- **(C1)** byte-identical canonical encoding across implementations (3 vectors)
- **(C2)** single-byte mutation of any field fails verify (4 vectors)
- **(C3)** single-signed envelope rejected (2 vectors)
- **(C4)** `parent.id == child.parent` enforced (3 vectors)

Each vector is JSON, language-agnostic, runs standalone. See [`conformance/README.md`](./conformance/README.md) for the format and how to add new vectors.

## Project layout

```
src/                                  # 8 files, each <200 LoC, 314 total
├── index.ts        public API re-exports
├── types.ts        Receipt + Envelope Zod schemas (strict)
├── canonical.ts    JCS + sha256
├── did-key.ts      bundled did:key resolver + Resolver type
├── envelope.ts     DSSE PAE encoding + envelope helpers
├── sign.ts         signAgent + countersignTool
├── verify.ts       5-check verifier
└── chain.ts        chain(parent, child)

examples/demo.ts                      the 20-line demo
conformance/                          12 JSON vectors + runner
tests/                                bun:test, 52 tests across 11 files
docs/superpowers/plans/               internal — implementation history

SPEC.md                               normative grammar
SCOPE.md                              v0.1 feature decisions
ROADMAP.md                            what's next, what triggers v0.2
CHANGELOG.md                          release notes
CONTRIBUTING.md                       setup + workflow + spec discipline
```

## Security

- **Replay is caller-side.** The library is stateless. Consumers track `(id, nonce)` themselves to detect replays. See [`tests/security-replay.test.ts`](./tests/security-replay.test.ts).
- **Revocation is out-of-band.** A receipt remains cryptographically valid even after a party repudiates it; consumers consult an external revocation list.
- **Plaintext is out-of-band.** Receipts carry only `sha256:<hex>` of JCS-canonical args/responses. Pass plaintext to `verify` (`{ plaintext: { args, response } }`) to re-hash and compare.
- **Key rotation on `did:key` is a no-op.** The verification key is derived from the DID itself.

## Roadmap & versioning

Current: **v0.1.0**. See [ROADMAP.md](./ROADMAP.md) for what's deferred to v0.2 and the trigger conditions for promoting each item. v0.1 is **`did:key`-only**, **JCS-only**, **hash-only payloads**. No CBOR, no inline bytes, no extension points — by design ([SCOPE.md](./SCOPE.md) explains why).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Short version: TDD only, Biome handles style, every code change is either a SPEC refinement or brings the impl in line with SPEC.

## License

Apache 2.0 — see [LICENSE](./LICENSE).
