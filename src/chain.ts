import { envelopePayloadBytes } from "./envelope.ts";
import { type Envelope, ReceiptSchema } from "./types.ts";

export function chain(parent: Envelope, child: Envelope): boolean {
  const p = ReceiptSchema.parse(JSON.parse(new TextDecoder().decode(envelopePayloadBytes(parent))));
  const c = ReceiptSchema.parse(JSON.parse(new TextDecoder().decode(envelopePayloadBytes(child))));
  return c.parent === p.id;
}
