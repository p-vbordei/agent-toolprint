import { ed25519 } from "@noble/curves/ed25519.js";
import { base64 } from "@scure/base";
import { sha256Hash } from "./canonical.ts";
import { envelopePaeBytes, envelopePayloadBytes } from "./envelope.ts";
import type { Resolver } from "./did-key.ts";
import { EnvelopeSchema, ReceiptSchema, type Envelope, type Receipt } from "./types.ts";

export type VerifyOptions = {
  resolver: Resolver;
  now?: Date;
  maxClockSkewMs?: number;
  skipTimestampCheck?: boolean;
  plaintext?: { args?: unknown; response?: unknown };
};

export type VerifyResult = { ok: true; receipt: Receipt } | { ok: false; error: string };

export async function verify(envelope: Envelope, opts: VerifyOptions): Promise<VerifyResult> {
  const envParsed = EnvelopeSchema.safeParse(envelope);
  if (!envParsed.success) {
    return { ok: false, error: `envelope schema: ${envParsed.error.message}` };
  }
  const env = envParsed.data;

  if (env.signatures.length !== 2) {
    return {
      ok: false,
      error: `verify requires exactly 2 signatures, got ${env.signatures.length}`,
    };
  }

  if (env.signatures[0]!.keyid === env.signatures[1]!.keyid) {
    return { ok: false, error: "verify rejects duplicate keyid across signatures" };
  }

  let receiptJson: unknown;
  try {
    receiptJson = JSON.parse(new TextDecoder().decode(envelopePayloadBytes(env)));
  } catch (e) {
    return { ok: false, error: `payload is not valid JSON: ${(e as Error).message}` };
  }
  const recParsed = ReceiptSchema.safeParse(receiptJson);
  if (!recParsed.success) {
    return { ok: false, error: `receipt schema: ${recParsed.error.message}` };
  }
  const receipt = recParsed.data;

  if (!opts.skipTimestampCheck) {
    const now = opts.now ?? new Date();
    const maxSkew = opts.maxClockSkewMs ?? 24 * 3600 * 1000;
    const rts = Date.parse(receipt.ts);
    if (Number.isNaN(rts)) return { ok: false, error: `invalid receipt ts: ${receipt.ts}` };
    const delta = Math.abs(now.getTime() - rts);
    if (delta > maxSkew) {
      return {
        ok: false,
        error: `timestamp window exceeded: |now - ts| = ${delta}ms, max = ${maxSkew}ms`,
      };
    }
  }

  const pae = envelopePaeBytes(env);

  const agentPk = await opts.resolver(
    receipt.agent.did,
    receipt.agent.key_id,
    new Date(receipt.ts),
  );
  if (!agentPk) return { ok: false, error: `agent DID did not resolve: ${receipt.agent.did}` };
  const agentSig = base64.decode(env.signatures[0]!.sig);
  if (!ed25519.verify(agentSig, pae, agentPk)) {
    return { ok: false, error: "agent signature invalid" };
  }

  const toolPk = await opts.resolver(
    receipt.tool.did,
    receipt.tool.key_id,
    new Date(receipt.ts),
  );
  if (!toolPk) return { ok: false, error: `tool DID did not resolve: ${receipt.tool.did}` };
  const toolSig = base64.decode(env.signatures[1]!.sig);
  if (!ed25519.verify(toolSig, pae, toolPk)) {
    return { ok: false, error: "tool signature invalid" };
  }

  if (opts.plaintext) {
    if (opts.plaintext.args !== undefined) {
      const recomputed = sha256Hash(opts.plaintext.args);
      if (recomputed !== receipt.call.args_hash) {
        return {
          ok: false,
          error: `plaintext args_hash mismatch: expected ${receipt.call.args_hash}, got ${recomputed}`,
        };
      }
    }
    if (opts.plaintext.response !== undefined) {
      const recomputed = sha256Hash(opts.plaintext.response);
      if (recomputed !== receipt.result.response_hash) {
        return {
          ok: false,
          error: `plaintext response_hash mismatch: expected ${receipt.result.response_hash}, got ${recomputed}`,
        };
      }
    }
  }

  return { ok: true, receipt };
}
