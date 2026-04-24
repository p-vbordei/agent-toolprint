import { ed25519 } from "@noble/curves/ed25519.js";
import { base64 } from "@scure/base";
import { canonicalBytes } from "./canonical.ts";
import { newEnvelope, paeEncode } from "./envelope.ts";
import { PAYLOAD_TYPE, ReceiptSchema, type Envelope, type Receipt } from "./types.ts";

export function signAgent(receipt: Receipt, sk: Uint8Array): Envelope {
  ReceiptSchema.parse(receipt);
  const body = canonicalBytes(receipt);
  const pae = paeEncode(PAYLOAD_TYPE, body);
  const sig = ed25519.sign(pae, sk);
  const env = newEnvelope(body);
  return {
    ...env,
    signatures: [{ keyid: receipt.agent.key_id, sig: base64.encode(sig) }],
  };
}

export function countersignTool(envelope: Envelope, sk: Uint8Array): Envelope {
  if (envelope.signatures.length !== 1) {
    throw new Error(
      `agent-toolprint: countersignTool expects exactly 1 existing signature, got ${envelope.signatures.length}`,
    );
  }
  const payloadBytes = base64.decode(envelope.payload);
  const receipt = ReceiptSchema.parse(JSON.parse(new TextDecoder().decode(payloadBytes)));
  const canonical = canonicalBytes(receipt);
  if (
    payloadBytes.length !== canonical.length ||
    !payloadBytes.every((b, i) => b === canonical[i])
  ) {
    throw new Error("agent-toolprint: envelope payload is not JCS-canonical");
  }
  const pae = paeEncode(PAYLOAD_TYPE, canonical);
  const sig = ed25519.sign(pae, sk);
  return {
    ...envelope,
    signatures: [
      ...envelope.signatures,
      { keyid: receipt.tool.key_id, sig: base64.encode(sig) },
    ],
  };
}
