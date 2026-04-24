import { z } from "zod";

const HashHex = /^sha256:[0-9a-f]{64}$/;
const Base64 = /^[A-Za-z0-9+/]*={0,2}$/;
const DidKey = /^did:key:z[1-9A-HJ-NP-Za-km-z]+$/;
const Uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const PartySchema = z
  .object({
    did: z.string().regex(DidKey),
    key_id: z.string().min(1),
  })
  .strict();

export const ReceiptSchema = z
  .object({
    v: z.literal("tp/0.1"),
    id: z.string().regex(Uuid),
    ts: z.string().datetime({ offset: true }),
    agent: PartySchema,
    tool: PartySchema,
    call: z
      .object({
        name: z.string().min(1),
        args_hash: z.string().regex(HashHex),
      })
      .strict(),
    result: z
      .object({
        status: z.enum(["ok", "error"]),
        response_hash: z.string().regex(HashHex),
      })
      .strict(),
    nonce: z.string().regex(Base64),
    parent: z.string().regex(Uuid).optional(),
  })
  .strict();

export type Receipt = z.infer<typeof ReceiptSchema>;

const SignatureSchema = z
  .object({
    keyid: z.string().min(1),
    sig: z.string().regex(Base64),
  })
  .strict();

export const EnvelopeSchema = z
  .object({
    payloadType: z.literal("application/vnd.agent-toolprint+json"),
    payload: z.string().regex(Base64),
    signatures: z.array(SignatureSchema).min(1).max(2),
  })
  .strict();

export type Envelope = z.infer<typeof EnvelopeSchema>;

export const PAYLOAD_TYPE = "application/vnd.agent-toolprint+json";
export const PROTOCOL_VERSION = "tp/0.1";
