import { describe, expect, it } from "bun:test";
import { canonical, canonicalBytes, sha256Hash } from "../src/canonical.ts";

describe("canonical", () => {
  it("sorts object keys (JCS)", () => {
    expect(canonical({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
  });

  it("handles nested objects", () => {
    expect(canonical({ b: { y: 2, x: 1 }, a: 0 })).toBe('{"a":0,"b":{"x":1,"y":2}}');
  });

  it("canonicalBytes returns UTF-8 bytes of canonical string", () => {
    const bytes = canonicalBytes({ a: 1 });
    expect(new TextDecoder().decode(bytes)).toBe('{"a":1}');
  });
});

describe("sha256Hash", () => {
  it("returns sha256:<64-hex>", () => {
    expect(sha256Hash({ a: 1 })).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("is deterministic for equivalent inputs", () => {
    expect(sha256Hash({ a: 1, b: 2 })).toBe(sha256Hash({ b: 2, a: 1 }));
  });

  it("differs for different inputs", () => {
    expect(sha256Hash({ a: 1 })).not.toBe(sha256Hash({ a: 2 }));
  });
});
