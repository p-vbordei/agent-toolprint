# Changelog

All notable changes to `agent-toolprint` are documented here. This project follows [Semantic Versioning](https://semver.org/).

## [0.1.0] — 2026-04-25

First release.

### Added
- Receipt grammar (SPEC §2) — JCS-canonical, seven fields plus optional `parent`.
- DSSE envelope (SPEC §3) — hand-rolled PAE encoding, two signatures (agent first, tool second).
- Public API — `signAgent`, `countersignTool`, `verify`, `chain`.
- Pluggable DID resolver with a bundled `did:key` reference implementation.
- `verify` enforces all of SPEC §4: signature count, **keyid binding**, **JCS-canonical payload**, agent signature, tool signature, optional plaintext re-hash, timestamp window (default ±24h, opt-out via `skipTimestampCheck`, override via `maxClockSkewMs`).
- `chain(parent, child)` returns `false` on malformed input rather than throwing — safe for one-line use in audit pipelines.
- Strict `nonce` validator (exactly 32-byte base64).
- Conformance suite (`bun run conformance`) — 15 vectors across (C1)–(C4), runs in <1s.
- 20-line demo in `examples/demo.ts`.
- CI smoke for the README Quickstart.

### Deferred to v0.2 (SPEC refinements, documented in SCOPE.md)
- Deterministic CBOR encoding; `args_enc` field.
- Inline `result.bytes?` (≤1 KiB).
- `ext?` opaque extension field.
- DID methods beyond `did:key`.
- UUID v7 requirement.
- Library-side replay detection.
