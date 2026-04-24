import { ed25519 } from "@noble/curves/ed25519.js";
import { sha256Hash } from "../src/canonical.ts";
import { didKeyFromEd25519Pubkey } from "../src/did-key.ts";

const agentDid = didKeyFromEd25519Pubkey(ed25519.getPublicKey(new Uint8Array(32).fill(1)));
const toolDid = didKeyFromEd25519Pubkey(ed25519.getPublicKey(new Uint8Array(32).fill(2)));

const ZERO_HASH = "sha256:0000000000000000000000000000000000000000000000000000000000000000";

const minimal = {
  v: "tp/0.1",
  id: "0192b6c7-4e58-7a2d-ae9e-6c77f3e20c44",
  ts: "2026-04-24T10:00:00Z",
  agent: { did: agentDid, key_id: "agent" },
  tool: { did: toolDid, key_id: "tool" },
  call: { name: "search", args_hash: ZERO_HASH },
  result: { status: "ok", response_hash: ZERO_HASH },
  nonce: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
};

const unicode = {
  ...minimal,
  id: "0192b6c7-4e58-7a2d-ae9e-6c77f3e20c45",
  call: { name: "søk", args_hash: ZERO_HASH },
};

const withParent = {
  ...minimal,
  id: "0192b6c7-4e58-7a2d-ae9e-6c77f3e20c46",
  parent: "0192b6c7-4e58-7a2d-ae9e-6c77f3e20c44",
};

console.log("agentDid:", agentDid);
console.log("toolDid:", toolDid);
console.log("minimal.sha:", sha256Hash(minimal));
console.log("unicode.sha:", sha256Hash(unicode));
console.log("withParent.sha:", sha256Hash(withParent));
