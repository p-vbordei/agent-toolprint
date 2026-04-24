import { describe, expect, it } from "bun:test";
import { ed25519 } from "@noble/curves/ed25519.js";
import { randomUUID } from "node:crypto";
import { base64 } from "@scure/base";
import { countersignTool, signAgent } from "../src/sign.ts";
import { verify } from "../src/verify.ts";
import { didKeyFromEd25519Pubkey, didKeyResolver } from "../src/did-key.ts";
import { sha256Hash } from "../src/canonical.ts";
import type { Receipt } from "../src/types.ts";

describe("security: replay detection is caller-side, not library-side", () => {
  it("verify accepts the same envelope twice — library holds no state", async () => {
    const agentSk = new Uint8Array(32).fill(1);
    const toolSk = new Uint8Array(32).fill(2);
    const nonceBytes = new Uint8Array(32);
    crypto.getRandomValues(nonceBytes);
    const receipt: Receipt = {
      v: "tp/0.1",
      id: randomUUID(),
      ts: new Date().toISOString(),
      agent: { did: didKeyFromEd25519Pubkey(ed25519.getPublicKey(agentSk)), key_id: "a" },
      tool: { did: didKeyFromEd25519Pubkey(ed25519.getPublicKey(toolSk)), key_id: "t" },
      call: { name: "search", args_hash: sha256Hash({}) },
      result: { status: "ok", response_hash: sha256Hash({}) },
      nonce: base64.encode(nonceBytes),
    };
    const env = countersignTool(signAgent(receipt, agentSk), toolSk);
    const r1 = await verify(env, { resolver: didKeyResolver });
    const r2 = await verify(env, { resolver: didKeyResolver });
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    // Intentional: library is stateless. Consumers tracking replay
    // maintain their own (nonce, id) cache.
  });
});
