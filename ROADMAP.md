# Roadmap

Where `agent-toolprint` is and where it's going. Companion to [`CHANGELOG.md`](./CHANGELOG.md) (what shipped) and [`SCOPE.md`](./SCOPE.md) (why v0.1 looks the way it does).

## Current state

**v0.1.0 tagged locally on branch `claude/blissful-elion-286490`.** Not pushed, not published.

- 52 tests green, 12/12 conformance vectors pass in ~0.2s, `bun check` clean.
- 314 LoC across 8 `src/` files, every file under 200 lines.
- Public API: `signAgent`, `countersignTool`, `verify`, `chain` + did:key helpers + schemas.
- SPEC.md status: `1.0 (stable)`.

## Immediate — awaits user decision

| # | Action | Why it's gated on the user |
|---|---|---|
| 1 | Merge worktree branch into `main` | Local-only until merged |
| 2 | Push `main` + tag `v0.1.0` to origin | Modifies shared system |
| 3 | Publish `agent-toolprint@0.1.0` to npm | Modifies shared registry + permanent name claim |

Ask in any new session: "push v0.1.0?" or "publish v0.1.0?" — the answers are independent.

## v0.2 — triggered by a real first-party caller

These were deferred from v0.1 per [SCOPE.md](./SCOPE.md). Each returns when a concrete caller in the 8-repo family (or an outside adopter) needs it. Do NOT add them speculatively.

| Deferred feature | Trigger for promotion |
|---|---|
| `did:web` support | `agent-id` ships historical-state DID resolution |
| Deterministic CBOR + `args_enc` field | A consumer surfaces a concrete binary-first use case |
| `result.bytes?` (inline body ≤1 KiB) | An audit reviewer asks for inline plaintext capture |
| `ext?` opaque extension field | Any IN-V0.2 feature needs it |
| UUID v7 requirement | A consumer surfaces time-ordering need |
| Library-side replay cache | Multiple consumers reimplement the same dedup |

When promoting: update `SPEC.md` grammar first (with scope approval), then add tests, then code. Never the other way around (see [`CLAUDE.md`](./CLAUDE.md) spec-discipline rule).

## Integration milestones (planned)

- **`agent-id`** — once its v0.1 ships, swap the bundled `did:key` resolver for the real `agent-id` resolver in examples/tests. Spec already accommodates this (pluggable `Resolver` type).
- **`agent-scroll`** — canonical transcripts will embed `agent-toolprint` envelopes as tool-call evidence. No changes required here; `agent-scroll` imports the `Envelope` type and `verify`.
- **`agent-cid`** — a single receipt can be referenced by CID. Trivially composes (receipts are JCS-canonical, so `sha256(canonical(envelope))` is stable). No code change here either.

## Operational polish (follow-ups)

None urgent. Listed so future-us remembers what was intentionally skipped.

- **Publishing for Node consumers** — v0.1 exports `./src/index.ts` directly (Bun imports TS natively). If a Node-first consumer appears, add a `tsc --emitDeclarationOnly` step and a `bun build --target node --outdir dist` step to produce `dist/index.js` + `dist/index.d.ts`, then update `package.json` `exports` to route `import`/`require`/`types` accordingly.
- **Browser smoke** — the library has no Node-specific APIs in `src/` (it uses `@noble/*`, `@scure/base`, and `canonicalize` — all portable). Add a one-off smoke to confirm it runs in a browser bundler (esbuild / Vite / Bun.build web target). Only when a browser caller shows up.
- **SPEC cross-repo link** — `SPEC.md §7` links to `../agent-id/SPEC.md`, which only resolves when the repo sits alongside `agent-id`. Fix to a canonical URL once `agent-id` has a stable home.
- **Fuzzing** — add a small property-based test (fast-check or Bun's built-in fuzzing if it lands) exercising the full pipeline against random-but-valid receipts.
- **Benchmarks** — `@noble/curves` is already fast enough for audit logging (thousands of verifies/second on a laptop). A microbenchmark only pays off if a perf-bound caller appears. Would live in `bench/` — not present in v0.1.

## Non-goals (will stay out in v0.2 too unless the world changes)

- A Rust reference implementation (family default is TS + Bun; community contribution welcome post-v0.1).
- Built-in replay cache, rate limiting, or any stateful machinery. Receipts are data; state is the consumer's problem.
- Transport layer. MCP already owns invocation; agent-toolprint captures the receipt.
- Framework integrations (Express, Fastify, Hono middleware, etc). Consumers wrap `signAgent` / `verify` themselves in 5 lines.
