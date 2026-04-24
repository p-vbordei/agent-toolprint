import { describe, expect, it } from "bun:test";
import { ed25519 } from "@noble/curves/ed25519.js";
import { didKeyFromEd25519Pubkey, parseDidKey, didKeyResolver } from "../src/did-key.ts";

describe("did:key round-trip", () => {
  it("encodes and decodes a pubkey", () => {
    const sk = new Uint8Array(32).fill(1);
    const pk = ed25519.getPublicKey(sk);
    const did = didKeyFromEd25519Pubkey(pk);
    expect(did).toMatch(/^did:key:z/);
    const recovered = parseDidKey(did);
    expect(recovered).toEqual(pk);
  });
});

describe("parseDidKey rejects malformed", () => {
  it("rejects non-did:key strings", () => {
    expect(() => parseDidKey("did:web:example.com")).toThrow();
  });

  it("rejects non-'z' multibase prefix", () => {
    expect(() => parseDidKey("did:key:a1234")).toThrow();
  });

  it("rejects non-ed25519 multicodec", () => {
    expect(() =>
      parseDidKey("did:key:zQ3shokFTS3brHcDQrn82RUDfCZESWL1ZdCEJwekUDPQiYBme"),
    ).toThrow();
  });
});

describe("didKeyResolver", () => {
  it("resolves a did:key to its pubkey bytes", async () => {
    const sk = new Uint8Array(32).fill(7);
    const pk = ed25519.getPublicKey(sk);
    const did = didKeyFromEd25519Pubkey(pk);
    const resolved = await didKeyResolver(did, "any-key-id", new Date());
    expect(resolved).toEqual(pk);
  });

  it("returns null for unresolvable DIDs", async () => {
    const resolved = await didKeyResolver("did:web:example.com", "k", new Date());
    expect(resolved).toBeNull();
  });
});
