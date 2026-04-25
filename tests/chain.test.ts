import { describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { ed25519 } from "@noble/curves/ed25519.js";
import { base64 } from "@scure/base";
import { sha256Hash } from "../src/canonical.ts";
import { chain } from "../src/chain.ts";
import { didKeyFromEd25519Pubkey } from "../src/did-key.ts";
import { countersignTool, signAgent } from "../src/sign.ts";
import type { Receipt } from "../src/types.ts";

const AGENT_SK = new Uint8Array(32).fill(1);
const TOOL_SK = new Uint8Array(32).fill(2);

function mkReceipt(parent?: string): Receipt {
  const nonceBytes = new Uint8Array(32);
  crypto.getRandomValues(nonceBytes);
  return {
    v: "tp/0.1",
    id: randomUUID(),
    ts: "2026-04-24T10:00:00Z",
    agent: {
      did: didKeyFromEd25519Pubkey(ed25519.getPublicKey(AGENT_SK)),
      key_id: "agent",
    },
    tool: {
      did: didKeyFromEd25519Pubkey(ed25519.getPublicKey(TOOL_SK)),
      key_id: "tool",
    },
    call: { name: "search", args_hash: sha256Hash({}) },
    result: { status: "ok", response_hash: sha256Hash({}) },
    nonce: base64.encode(nonceBytes),
    ...(parent ? { parent } : {}),
  };
}

function envelope(receipt: Receipt) {
  return countersignTool(signAgent(receipt, AGENT_SK), TOOL_SK);
}

describe("chain", () => {
  it("returns true when child.parent === parent.id", () => {
    const p = mkReceipt();
    const c = mkReceipt(p.id);
    expect(chain(envelope(p), envelope(c))).toBe(true);
  });

  it("returns false when child has no parent", () => {
    const p = mkReceipt();
    const c = mkReceipt();
    expect(chain(envelope(p), envelope(c))).toBe(false);
  });

  it("returns false when child.parent points to another id", () => {
    const p = mkReceipt();
    const c = mkReceipt(randomUUID());
    expect(chain(envelope(p), envelope(c))).toBe(false);
  });

  it("returns false (does not throw) when given a malformed envelope", () => {
    const p = mkReceipt();
    const malformed = {
      payloadType: "application/vnd.agent-toolprint+json",
      payload: "AAAA",
      signatures: [{ keyid: "a", sig: "BB" }],
    };
    expect(() => chain(envelope(p), malformed as never)).not.toThrow();
    expect(chain(envelope(p), malformed as never)).toBe(false);
  });
});
