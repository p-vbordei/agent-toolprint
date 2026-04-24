import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import canonicalize from "canonicalize";

export function canonical(value: unknown): string {
  const s = canonicalize(value);
  if (s === undefined) throw new Error("agent-toolprint: value is not JSON-serializable");
  return s;
}

export function canonicalBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(canonical(value));
}

export function sha256Hash(value: unknown): string {
  return `sha256:${bytesToHex(sha256(canonicalBytes(value)))}`;
}
