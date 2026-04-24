import { describe, expect, it } from "bun:test";
import { ed25519 } from "@noble/curves/ed25519.js";
import { didKeyFromEd25519Pubkey } from "../src/did-key.ts";
import { runVectorFile } from "../conformance/run.ts";

describe("conformance runner", () => {
  it("resolves against a trivially-valid vector inline", async () => {
    const agentDid = didKeyFromEd25519Pubkey(
      ed25519.getPublicKey(new Uint8Array(32).fill(1)),
    );
    const toolDid = didKeyFromEd25519Pubkey(
      ed25519.getPublicKey(new Uint8Array(32).fill(2)),
    );
    const vector = {
      clause: "C1" as const,
      name: "inline-sanity",
      description: "runner wiring check",
      input: {
        receipt: {
          v: "tp/0.1",
          id: "0192b6c7-4e58-7a2d-ae9e-6c77f3e20c44",
          ts: "2026-04-24T10:00:00Z",
          agent: { did: agentDid, key_id: "a" },
          tool: { did: toolDid, key_id: "t" },
          call: {
            name: "noop",
            args_hash:
              "sha256:44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
          },
          result: {
            status: "ok",
            response_hash:
              "sha256:44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
          },
          nonce: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
        },
        agent_sk_seed: 1,
        tool_sk_seed: 2,
      },
      expected: { verify_ok: true },
    };
    const outcome = await runVectorFile(vector);
    expect(outcome.pass).toBe(true);
  });
});
