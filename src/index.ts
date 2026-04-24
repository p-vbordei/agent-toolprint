export { canonical, canonicalBytes, sha256Hash } from "./canonical.ts";
export { chain } from "./chain.ts";
export type { Resolver } from "./did-key.ts";
export { didKeyFromEd25519Pubkey, didKeyResolver, parseDidKey } from "./did-key.ts";
export { countersignTool, signAgent } from "./sign.ts";
export type { Envelope, Receipt } from "./types.ts";
export {
  EnvelopeSchema,
  PAYLOAD_TYPE,
  PROTOCOL_VERSION,
  ReceiptSchema,
} from "./types.ts";
export type { VerifyOptions, VerifyResult } from "./verify.ts";
export { verify } from "./verify.ts";
