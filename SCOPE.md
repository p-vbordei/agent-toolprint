# SCOPE.md — v0.1 feature decisions

Output of Stage 1 (scope compression). Approved 2026-04-24.

This file is the authoritative list of what `agent-toolprint` v0.1 will and will not ship. If README.md, SPEC.md, or any other file disagrees with SCOPE.md, SCOPE.md wins until the other file is updated to match.

## One-line problem statement

Produce a double-signed, hash-binding, byte-canonical receipt for every tool invocation an AI agent makes, verifiable offline by any third party.

If a feature sits outside that statement, it does not belong in v0.1.

## IN-V0.1

- **Receipt schema** — canonical JSON with fields: `v, id, ts, agent, tool, call{name, args_hash}, result{status, response_hash}, nonce, parent?`.
- **JCS canonical encoding** ([RFC 8785](https://www.rfc-editor.org/rfc/rfc8785)) for hashing inputs and for envelope payload bytes.
- **SHA-256 hashes** over `JCS(args)` and `JCS(response)`.
- **DSSE envelope** — hand-rolled (~50 LoC); agent signature first, tool signature second.
- **Two-signature enforcement** — duplicate signers rejected; single-signed envelopes rejected.
- **Public API (4 functions)**: `signAgent`, `countersignTool`, `verify`, `chain`.
- **`parent` chaining** — optional field + `chain(parent, child)` equality helper.
- **Timestamp window check** — default ±24h from "now"; caller can opt out via `verify` options.
- **Pluggable DID resolver interface** — ~5-line type; `did:key` reference resolver bundled.
- **Conformance vectors** in `conformance/` — JSON files, standalone, full suite runs in <30s. Covers (C1)–(C4).
- **20-line demo** in `examples/` showing: create receipt → sign as agent → countersign as tool → verify → reject after single-byte tamper.

## DEFERRED-TO-V0.2 (removed from v0.1 SPEC)

- **`args_enc` field + deterministic CBOR encoding** — JCS alone is sufficient for v0.1 interop. CBOR may return in a future version as an alternative `payloadType`.
- **`result.bytes?` (inline response body ≤1 KiB)** — hash alone provides non-repudiation; plaintext for audit stays out-of-band.
- **`ext?` opaque extension field** — no extension points for v0.1.
- **`did:web` and other DID methods** — v0.1 is `did:key`-only. Historical-state lookup for mutable DID documents is deferred until `agent-id` ships.
- **UUID v7 requirement** — accept any RFC 4122 UUID; generator uses v4 via `crypto.randomUUID()` (zero deps on Bun).
- **Replay cache / nonce-dedup helper** — library holds no state. `nonce` and `ts` remain mandatory; detection is the consumer's responsibility.

## CUT

- **Rust reference implementation** — family default is TypeScript + Bun. Community contributions welcome post-v0.1; not a maintainer deliverable.

## Stack

- **Runtime**: Bun
- **Language**: TypeScript (strict)
- **Testing**: `bun test`
- **Crypto**: `@noble/ed25519`, `@noble/hashes`
- **Canonical JSON**: `canonicalize` (RFC 8785)
- **Validation**: `zod` at public API boundaries
- **DSSE**: hand-rolled (no DSSE library)
- **DID resolver**: pluggable interface; `did:key` resolver inline (no `did-resolver` package needed for v0.1)
- **Build**: `bun build --compile` for the demo binary; library publishes as TS/ESM
- **Lint/format**: Biome

## Conformance clauses covered

Each (Cn) in SPEC §6 has a vector file in `conformance/` and a test that loads it:

- (C1) Byte-identical JCS canonical encoding across implementations.
- (C2) Single-byte mutation of any receipt field causes `verify` to fail.
- (C3) Single-signed envelope rejected; double-signed accepted.
- (C4) `parent.id == child.parent`; mismatch rejected.
