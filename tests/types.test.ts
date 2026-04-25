import { describe, expect, it } from "bun:test";
import { EnvelopeSchema, ReceiptSchema } from "../src/types.ts";

const validReceipt = {
  v: "tp/0.1",
  id: "0192b6c7-4e58-7a2d-ae9e-6c77f3e20c44",
  ts: "2026-04-24T10:00:00Z",
  agent: {
    did: "did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH",
    key_id: "agent-1",
  },
  tool: {
    did: "did:key:z6MkfrQrerDEwEYXzG9qLyVPH3Kq9KfoSqzL2xk3QFTRPoP6",
    key_id: "tool-1",
  },
  call: {
    name: "search",
    args_hash: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  },
  result: {
    status: "ok",
    response_hash: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  },
  nonce: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
};

describe("ReceiptSchema", () => {
  it("accepts a minimal valid receipt", () => {
    const parsed = ReceiptSchema.parse(validReceipt);
    expect(parsed.v).toBe("tp/0.1");
  });

  it("rejects unknown fields (strict)", () => {
    const rogue = { ...validReceipt, ext: { foo: 1 } };
    expect(() => ReceiptSchema.parse(rogue)).toThrow();
  });

  it("rejects args_hash without sha256: prefix", () => {
    const bad = {
      ...validReceipt,
      call: { ...validReceipt.call, args_hash: "abc" },
    };
    expect(() => ReceiptSchema.parse(bad)).toThrow();
  });

  it("accepts parent (optional)", () => {
    const withParent = {
      ...validReceipt,
      parent: "0192b6c7-4e58-7a2d-ae9e-6c77f3e20c45",
    };
    expect(() => ReceiptSchema.parse(withParent)).not.toThrow();
  });

  it("rejects a nonce that is not exactly 32 bytes (44-char base64)", () => {
    const tooShort = { ...validReceipt, nonce: "AAA=" };
    expect(() => ReceiptSchema.parse(tooShort)).toThrow();

    const empty = { ...validReceipt, nonce: "" };
    expect(() => ReceiptSchema.parse(empty)).toThrow();

    const tooLong = { ...validReceipt, nonce: `AAAAAAAA${validReceipt.nonce}` };
    expect(() => ReceiptSchema.parse(tooLong)).toThrow();
  });
});

describe("EnvelopeSchema", () => {
  const env = {
    payloadType: "application/vnd.agent-toolprint+json",
    payload: "eyJhIjoxfQ==",
    signatures: [{ keyid: "agent-1", sig: "AAAA" }],
  };

  it("accepts a single-signed envelope (1 sig)", () => {
    expect(() => EnvelopeSchema.parse(env)).not.toThrow();
  });

  it("accepts a double-signed envelope (2 sigs)", () => {
    const doubled = {
      ...env,
      signatures: [...env.signatures, { keyid: "tool-1", sig: "BBBB" }],
    };
    expect(() => EnvelopeSchema.parse(doubled)).not.toThrow();
  });

  it("rejects 3 signatures", () => {
    const tripled = {
      ...env,
      signatures: [
        { keyid: "a", sig: "AA" },
        { keyid: "b", sig: "BB" },
        { keyid: "c", sig: "CC" },
      ],
    };
    expect(() => EnvelopeSchema.parse(tripled)).toThrow();
  });

  it("rejects unknown payloadType", () => {
    const bad = { ...env, payloadType: "application/json" };
    expect(() => EnvelopeSchema.parse(bad)).toThrow();
  });
});
