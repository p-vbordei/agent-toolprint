import { describe, expect, it } from "bun:test";
import { ed25519 } from "@noble/curves/ed25519.js";
import { countersignTool, signAgent } from "../src/sign.ts";
import { verify } from "../src/verify.ts";
import { didKeyFromEd25519Pubkey, didKeyResolver } from "../src/did-key.ts";
import { sha256Hash } from "../src/canonical.ts";
import type { Receipt } from "../src/types.ts";

function fixtureReceipt(tsOverride?: string): Receipt {
  const agentSk = new Uint8Array(32).fill(1);
  const toolSk = new Uint8Array(32).fill(2);
  return {
    v: "tp/0.1",
    id: "0192b6c7-4e58-7a2d-ae9e-6c77f3e20c44",
    ts: tsOverride ?? "2026-04-24T10:00:00Z",
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

const AGENT_SK = new Uint8Array(32).fill(1);
const TOOL_SK = new Uint8Array(32).fill(2);
const NOW = new Date("2026-04-24T10:00:00Z");

describe("verify — signature count + duplicates", () => {
  it("rejects a single-signed envelope", async () => {
    const env = signAgent(fixtureReceipt(), AGENT_SK);
    const r = await verify(env, { resolver: didKeyResolver, now: NOW });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/2 signatures/);
  });

  it("rejects duplicate keyid", async () => {
    const env = signAgent(fixtureReceipt(), AGENT_SK);
    const duped = {
      ...env,
      signatures: [env.signatures[0]!, { ...env.signatures[0]! }],
    };
    const r = await verify(duped, { resolver: didKeyResolver, now: NOW });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/duplicate/i);
  });
});

describe("verify — agent signature", () => {
  it("rejects when agent signature is invalid", async () => {
    const env = countersignTool(signAgent(fixtureReceipt(), AGENT_SK), TOOL_SK);
    const sig = env.signatures[0]!.sig;
    const corrupt = sig.startsWith("A") ? `B${sig.slice(1)}` : `A${sig.slice(1)}`;
    const tampered = {
      ...env,
      signatures: [{ ...env.signatures[0]!, sig: corrupt }, env.signatures[1]!],
    };
    const r = await verify(tampered, { resolver: didKeyResolver, now: NOW });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/agent signature/i);
  });

  it("rejects when agent DID does not resolve", async () => {
    const env = countersignTool(signAgent(fixtureReceipt(), AGENT_SK), TOOL_SK);
    const nullResolver = async () => null;
    const r = await verify(env, { resolver: nullResolver, now: NOW });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/resolve/i);
  });
});

describe("verify — tool signature", () => {
  it("rejects when tool signature is invalid", async () => {
    const env = countersignTool(signAgent(fixtureReceipt(), AGENT_SK), TOOL_SK);
    const sig = env.signatures[1]!.sig;
    const corrupt = sig.startsWith("A") ? `B${sig.slice(1)}` : `A${sig.slice(1)}`;
    const tampered = {
      ...env,
      signatures: [env.signatures[0]!, { ...env.signatures[1]!, sig: corrupt }],
    };
    const r = await verify(tampered, { resolver: didKeyResolver, now: NOW });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/tool signature/i);
  });

  it("accepts a well-formed double-signed envelope", async () => {
    const env = countersignTool(signAgent(fixtureReceipt(), AGENT_SK), TOOL_SK);
    const r = await verify(env, { resolver: didKeyResolver, now: NOW });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.receipt.v).toBe("tp/0.1");
  });
});

describe("verify — timestamp window", () => {
  it("rejects a ts > 24h in the past (default)", async () => {
    const r = fixtureReceipt("2026-04-23T09:00:00Z");
    const env = countersignTool(signAgent(r, AGENT_SK), TOOL_SK);
    const result = await verify(env, { resolver: didKeyResolver, now: NOW });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/timestamp|window|skew/i);
  });

  it("rejects a ts > 24h in the future (default)", async () => {
    const r = fixtureReceipt("2026-04-25T11:00:00Z");
    const env = countersignTool(signAgent(r, AGENT_SK), TOOL_SK);
    const result = await verify(env, { resolver: didKeyResolver, now: NOW });
    expect(result.ok).toBe(false);
  });

  it("accepts when skipTimestampCheck is true", async () => {
    const r = fixtureReceipt("2020-01-01T00:00:00Z");
    const env = countersignTool(signAgent(r, AGENT_SK), TOOL_SK);
    const result = await verify(env, {
      resolver: didKeyResolver,
      now: NOW,
      skipTimestampCheck: true,
    });
    expect(result.ok).toBe(true);
  });

  it("honors custom maxClockSkewMs", async () => {
    const r = fixtureReceipt("2026-04-24T09:59:00Z");
    const env = countersignTool(signAgent(r, AGENT_SK), TOOL_SK);
    const result = await verify(env, {
      resolver: didKeyResolver,
      now: NOW,
      maxClockSkewMs: 30_000,
    });
    expect(result.ok).toBe(false);
  });
});

describe("verify — plaintext hash re-check", () => {
  it("passes when plaintext args hash to the receipt's args_hash", async () => {
    const args = { query: "bun runtime" };
    const response = { results: [] };
    const r: Receipt = {
      ...fixtureReceipt(),
      call: { name: "search", args_hash: sha256Hash(args) },
      result: { status: "ok", response_hash: sha256Hash(response) },
    };
    const env = countersignTool(signAgent(r, AGENT_SK), TOOL_SK);
    const result = await verify(env, {
      resolver: didKeyResolver,
      now: NOW,
      plaintext: { args, response },
    });
    expect(result.ok).toBe(true);
  });

  it("fails when plaintext args do not hash to the receipt's args_hash", async () => {
    const args = { query: "real" };
    const fakeArgs = { query: "fake" };
    const response = { results: [] };
    const r: Receipt = {
      ...fixtureReceipt(),
      call: { name: "search", args_hash: sha256Hash(args) },
      result: { status: "ok", response_hash: sha256Hash(response) },
    };
    const env = countersignTool(signAgent(r, AGENT_SK), TOOL_SK);
    const result = await verify(env, {
      resolver: didKeyResolver,
      now: NOW,
      plaintext: { args: fakeArgs, response },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/args_hash/i);
  });
});

