import { describe, expect, it } from "bun:test";
import { ed25519 } from "@noble/curves/ed25519.js";
import { base64 } from "@scure/base";
import { countersignTool, signAgent } from "../src/sign.ts";
import { envelopePaeBytes, envelopePayloadBytes } from "../src/envelope.ts";
import { didKeyFromEd25519Pubkey } from "../src/did-key.ts";
import type { Receipt } from "../src/types.ts";

function fixtureReceipt(): Receipt {
  const agentSk = new Uint8Array(32).fill(1);
  const toolSk = new Uint8Array(32).fill(2);
  return {
    v: "tp/0.1",
    id: "0192b6c7-4e58-7a2d-ae9e-6c77f3e20c44",
    ts: "2026-04-24T10:00:00Z",
    agent: {
      did: didKeyFromEd25519Pubkey(ed25519.getPublicKey(agentSk)),
      key_id: "agent-1",
    },
    tool: {
      did: didKeyFromEd25519Pubkey(ed25519.getPublicKey(toolSk)),
      key_id: "tool-1",
    },
    call: {
      name: "search",
      args_hash: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
    },
    result: {
      status: "ok",
      response_hash: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
    },
    nonce: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  };
}

describe("signAgent", () => {
  it("produces an envelope with exactly 1 signature", () => {
    const receipt = fixtureReceipt();
    const agentSk = new Uint8Array(32).fill(1);
    const env = signAgent(receipt, agentSk);
    expect(env.signatures).toHaveLength(1);
    expect(env.signatures[0]!.keyid).toBe("agent-1");
  });

  it("payload bytes equal JCS(receipt)", () => {
    const receipt = fixtureReceipt();
    const agentSk = new Uint8Array(32).fill(1);
    const env = signAgent(receipt, agentSk);
    const decoded = JSON.parse(new TextDecoder().decode(envelopePayloadBytes(env)));
    expect(decoded).toEqual(receipt);
  });

  it("signature verifies against PAE bytes using agent pubkey", () => {
    const receipt = fixtureReceipt();
    const agentSk = new Uint8Array(32).fill(1);
    const agentPk = ed25519.getPublicKey(agentSk);
    const env = signAgent(receipt, agentSk);
    const sig = base64.decode(env.signatures[0]!.sig);
    const ok = ed25519.verify(sig, envelopePaeBytes(env), agentPk);
    expect(ok).toBe(true);
  });
});

describe("countersignTool", () => {
  it("appends a second signature", () => {
    const receipt = fixtureReceipt();
    const agentSk = new Uint8Array(32).fill(1);
    const toolSk = new Uint8Array(32).fill(2);
    const partial = signAgent(receipt, agentSk);
    const complete = countersignTool(partial, toolSk);
    expect(complete.signatures).toHaveLength(2);
    expect(complete.signatures[1]!.keyid).toBe("tool-1");
  });

  it("both signatures verify against the same PAE bytes", () => {
    const receipt = fixtureReceipt();
    const agentSk = new Uint8Array(32).fill(1);
    const toolSk = new Uint8Array(32).fill(2);
    const agentPk = ed25519.getPublicKey(agentSk);
    const toolPk = ed25519.getPublicKey(toolSk);
    const env = countersignTool(signAgent(receipt, agentSk), toolSk);
    const pae = envelopePaeBytes(env);
    const agentOk = ed25519.verify(base64.decode(env.signatures[0]!.sig), pae, agentPk);
    const toolOk = ed25519.verify(base64.decode(env.signatures[1]!.sig), pae, toolPk);
    expect(agentOk).toBe(true);
    expect(toolOk).toBe(true);
  });

  it("rejects if envelope already has 2 signatures", () => {
    const receipt = fixtureReceipt();
    const agentSk = new Uint8Array(32).fill(1);
    const toolSk = new Uint8Array(32).fill(2);
    const env = countersignTool(signAgent(receipt, agentSk), toolSk);
    expect(() => countersignTool(env, toolSk)).toThrow();
  });

  it("rejects if envelope has 0 signatures", () => {
    const toolSk = new Uint8Array(32).fill(2);
    const bad = {
      payloadType: "application/vnd.agent-toolprint+json",
      payload: "AAAA",
      signatures: [] as { keyid: string; sig: string }[],
    };
    expect(() => countersignTool(bad as never, toolSk)).toThrow();
  });
});
