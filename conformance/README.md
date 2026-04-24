# agent-toolprint conformance suite

Standalone JSON vectors exercised by `conformance/run.ts`. A conforming
implementation must produce PASS for every vector.

## Run

```bash
bun run conformance
```

Full suite runs in <30s.

## Vector shape

```json
{
  "clause": "C1" | "C2" | "C3" | "C4",
  "name": "<short-name>",
  "description": "<what this tests>",
  "input": { ... },
  "expected": { "verify_ok": true | false, ... }
}
```

Seeds: `agent_sk_seed` / `tool_sk_seed` ∈ [1, 255]. The runner derives
deterministic Ed25519 keys from `new Uint8Array(32).fill(seed)`.

## Clauses

- **C1** — byte-identical canonical encoding across implementations.
- **C2** — single-byte mutation of any field causes verify to fail.
- **C3** — single-signed envelope rejected; double-signed accepted.
- **C4** — `parent.id == child.parent`; mismatch rejected.
