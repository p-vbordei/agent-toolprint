import { describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { ed25519 } from "@noble/curves/ed25519.js";
import { base64 } from "@scure/base";
import { sha256Hash } from "../src/canonical.ts";
import { didKeyFromEd25519Pubkey, didKeyResolver } from "../src/did-key.ts";
import { countersignTool, signAgent } from "../src/sign.ts";
import type { Receipt } from "../src/types.ts";
import { verify } from "../src/verify.ts";

describe("end-to-end: sign → countersign → verify", () => {
  it("round-trips a realistic receipt", async () => {
    const agentSk = ed25519.utils.randomSecretKey();
    const toolSk = ed25519.utils.randomSecretKey();

    const args = { query: "bun documentation", top_k: 5 };
    const response = { results: ["r1", "r2"] };

    const nonceBytes = new Uint8Array(32);
    crypto.getRandomValues(nonceBytes);

    const receipt: Receipt = {
      v: "tp/0.1",
      id: randomUUID(),
      ts: new Date().toISOString(),
      agent: {
        did: didKeyFromEd25519Pubkey(ed25519.getPublicKey(agentSk)),
        key_id: "agent-primary",
      },
      tool: {
        did: didKeyFromEd25519Pubkey(ed25519.getPublicKey(toolSk)),
        key_id: "tool-primary",
      },
      call: { name: "search", args_hash: sha256Hash(args) },
      result: { status: "ok", response_hash: sha256Hash(response) },
      nonce: base64.encode(nonceBytes),
    };

    const envelope = countersignTool(signAgent(receipt, agentSk), toolSk);
    const result = await verify(envelope, {
      resolver: didKeyResolver,
      plaintext: { args, response },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.receipt.id).toBe(receipt.id);
      expect(result.receipt.agent.did).toBe(receipt.agent.did);
    }
  });
});
