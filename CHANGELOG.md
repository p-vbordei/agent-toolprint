# Changelog

All notable changes to `agent-toolprint` are documented here. This project follows [Semantic Versioning](https://semver.org/).

## [0.1.0] — 2026-04-24

First release.

### Added
- Receipt grammar (SPEC §2) — JCS-canonical, seven fields plus optional `parent`.
- DSSE envelope (SPEC §3) — hand-rolled PAE encoding, two signatures (agent first, tool second).
- Public API — `signAgent`, `countersignTool`, `verify`, `chain`.
- Pluggable DID resolver with a bundled `did:key` reference implementation.
- Timestamp window in `verify` — default ±24h, caller can opt out or override.
- Plaintext hash re-check in `verify` — optional `plaintext: { args, response }`.
- Conformance suite (`bun run conformance`) — 12 vectors across (C1)–(C4), runs in <1s.
- 20-line demo in `examples/demo.ts`.

### Deferred to v0.2 (SPEC refinements, documented in SCOPE.md)
- Deterministic CBOR encoding; `args_enc` field.
- Inline `result.bytes?` (≤1 KiB).
- `ext?` opaque extension field.
- DID methods beyond `did:key`.
- UUID v7 requirement.
- Library-side replay detection.
