import { base58 } from "@scure/base";

export type Resolver = (
  did: string,
  keyId: string,
  atTime: Date,
) => Promise<Uint8Array | null>;

const MC_ED25519_PUB = Uint8Array.of(0xed, 0x01);

export function parseDidKey(did: string): Uint8Array {
  const prefix = "did:key:";
  if (!did.startsWith(prefix)) {
    throw new Error("agent-toolprint: not a did:key");
  }
  const mb = did.slice(prefix.length);
  if (!mb.startsWith("z")) {
    throw new Error("agent-toolprint: did:key must use 'z' (base58btc) multibase prefix");
  }
  const decoded = base58.decode(mb.slice(1));
  if (
    decoded.length !== 34 ||
    decoded[0] !== MC_ED25519_PUB[0] ||
    decoded[1] !== MC_ED25519_PUB[1]
  ) {
    throw new Error(
      "agent-toolprint: did:key must encode an Ed25519 public key (multicodec 0xed01)",
    );
  }
  return decoded.slice(2);
}

export function didKeyFromEd25519Pubkey(pk: Uint8Array): string {
  if (pk.length !== 32) {
    throw new Error("agent-toolprint: Ed25519 public key must be 32 bytes");
  }
  const mc = new Uint8Array(34);
  mc.set(MC_ED25519_PUB, 0);
  mc.set(pk, 2);
  return `did:key:z${base58.encode(mc)}`;
}

export const didKeyResolver: Resolver = async (did) => {
  try {
    return parseDidKey(did);
  } catch {
    return null;
  }
};
