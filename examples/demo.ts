import { randomUUID } from "node:crypto";
import { ed25519 } from "@noble/curves/ed25519.js";
import { base64 } from "@scure/base";
import {
  countersignTool,
  didKeyFromEd25519Pubkey,
  didKeyResolver,
  type Receipt,
  sha256Hash,
  signAgent,
  verify,
} from "../src/index.ts";

const agentSk = ed25519.utils.randomSecretKey();
const toolSk = ed25519.utils.randomSecretKey();
const args = { query: "bun runtime docs" };
const response = { results: ["https://bun.sh/docs"] };

const receipt: Receipt = {
  v: "tp/0.1",
  id: randomUUID(),
  ts: new Date().toISOString(),
  agent: { did: didKeyFromEd25519Pubkey(ed25519.getPublicKey(agentSk)), key_id: "agent" },
  tool: { did: didKeyFromEd25519Pubkey(ed25519.getPublicKey(toolSk)), key_id: "tool" },
  call: { name: "search", args_hash: sha256Hash(args) },
  result: { status: "ok", response_hash: sha256Hash(response) },
  nonce: base64.encode(crypto.getRandomValues(new Uint8Array(32))),
};

const envelope = countersignTool(signAgent(receipt, agentSk), toolSk);
const ok = await verify(envelope, { resolver: didKeyResolver, plaintext: { args, response } });
console.log("verify:", ok);

const tampered = { ...envelope, payload: `A${envelope.payload.slice(1)}` };
const bad = await verify(tampered, { resolver: didKeyResolver });
console.log("verify (after 1-byte tamper):", bad);
