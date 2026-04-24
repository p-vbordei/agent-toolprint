import { base64 } from "@scure/base";
import { type Envelope, PAYLOAD_TYPE } from "./types.ts";

export function paeEncode(payloadType: string, body: Uint8Array): Uint8Array {
  const enc = new TextEncoder();
  const head = enc.encode(`DSSEv1 ${payloadType.length} ${payloadType} ${body.length} `);
  const out = new Uint8Array(head.length + body.length);
  out.set(head, 0);
  out.set(body, head.length);
  return out;
}

export function newEnvelope(body: Uint8Array): Envelope & { signatures: [] } {
  return {
    payloadType: PAYLOAD_TYPE,
    payload: base64.encode(body),
    signatures: [],
  } as Envelope & { signatures: [] };
}

export function envelopePayloadBytes(env: Envelope): Uint8Array {
  return base64.decode(env.payload);
}

export function envelopePaeBytes(env: Envelope): Uint8Array {
  return paeEncode(env.payloadType, envelopePayloadBytes(env));
}
