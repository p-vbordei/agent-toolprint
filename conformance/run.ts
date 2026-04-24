import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sha256Hash } from "../src/canonical.ts";
import { chain as chainCheck } from "../src/chain.ts";
import { didKeyResolver } from "../src/did-key.ts";
import { countersignTool, signAgent } from "../src/sign.ts";
import { type Envelope, type Receipt, ReceiptSchema } from "../src/types.ts";
import { verify } from "../src/verify.ts";

export type Vector = {
  clause: "C1" | "C2" | "C3" | "C4";
  name: string;
  description: string;
  input: Record<string, unknown>;
  expected: Record<string, unknown>;
};

export type Outcome = { pass: boolean; error?: string; vector: Vector };

function seedSk(seed: number): Uint8Array {
  return new Uint8Array(32).fill(seed);
}

function buildSignedEnvelope(receipt: Receipt, agentSeed: number, toolSeed: number): Envelope {
  return countersignTool(signAgent(receipt, seedSk(agentSeed)), seedSk(toolSeed));
}

export async function runVectorFile(v: Vector): Promise<Outcome> {
  try {
    switch (v.clause) {
      case "C1":
        return await runC1(v);
      case "C2":
        return await runC2(v);
      case "C3":
        return await runC3(v);
      case "C4":
        return await runC4(v);
    }
  } catch (err) {
    return { pass: false, error: (err as Error).message, vector: v };
  }
}

async function runC1(v: Vector): Promise<Outcome> {
  const receipt = ReceiptSchema.parse(v.input.receipt);
  const canonicalSha = sha256Hash(receipt);
  const expected = (v.expected as { canonical_payload_sha256?: string }).canonical_payload_sha256;
  if (expected && canonicalSha !== expected) {
    return {
      pass: false,
      error: `canonical sha mismatch: got ${canonicalSha}, expected ${expected}`,
      vector: v,
    };
  }
  if (v.expected.verify_ok === true) {
    const env = buildSignedEnvelope(
      receipt,
      v.input.agent_sk_seed as number,
      v.input.tool_sk_seed as number,
    );
    const res = await verify(env, { resolver: didKeyResolver, skipTimestampCheck: true });
    if (!res.ok) return { pass: false, error: res.error, vector: v };
  }
  return { pass: true, vector: v };
}

async function runC2(v: Vector): Promise<Outcome> {
  const receipt = ReceiptSchema.parse(v.input.receipt);
  const env = buildSignedEnvelope(
    receipt,
    v.input.agent_sk_seed as number,
    v.input.tool_sk_seed as number,
  );
  const mutation = v.input.mutation as {
    target: "payload" | "signature" | "swap-sigs";
    index?: number;
  };
  const mutated = applyMutation(env, mutation);
  const res = await verify(mutated, { resolver: didKeyResolver, skipTimestampCheck: true });
  return res.ok === false
    ? { pass: true, vector: v }
    : {
        pass: false,
        error: "mutation was accepted by verify (should have been rejected)",
        vector: v,
      };
}

async function runC3(v: Vector): Promise<Outcome> {
  const receipt = ReceiptSchema.parse(v.input.receipt);
  const role = (v.input.role as "agent-only" | "tool-only") ?? "agent-only";
  if (role === "agent-only") {
    const partial = signAgent(receipt, seedSk(v.input.agent_sk_seed as number));
    const res = await verify(partial, { resolver: didKeyResolver, skipTimestampCheck: true });
    return res.ok
      ? { pass: false, error: "agent-only envelope accepted", vector: v }
      : { pass: true, vector: v };
  }
  const full = buildSignedEnvelope(
    receipt,
    v.input.agent_sk_seed as number,
    v.input.tool_sk_seed as number,
  );
  const toolOnly = { ...full, signatures: [full.signatures[1]!] };
  const res = await verify(toolOnly, { resolver: didKeyResolver, skipTimestampCheck: true });
  return res.ok
    ? { pass: false, error: "tool-only envelope accepted", vector: v }
    : { pass: true, vector: v };
}

async function runC4(v: Vector): Promise<Outcome> {
  const parent = ReceiptSchema.parse(v.input.parent);
  const child = ReceiptSchema.parse(v.input.child);
  const parentEnv = buildSignedEnvelope(
    parent,
    v.input.agent_sk_seed as number,
    v.input.tool_sk_seed as number,
  );
  const childEnv = buildSignedEnvelope(
    child,
    v.input.agent_sk_seed as number,
    v.input.tool_sk_seed as number,
  );
  const linked = chainCheck(parentEnv, childEnv);
  const expected = (v.expected as { chain_ok: boolean }).chain_ok;
  return linked === expected
    ? { pass: true, vector: v }
    : { pass: false, error: `chain() returned ${linked}, expected ${expected}`, vector: v };
}

function applyMutation(
  env: Envelope,
  mut: { target: "payload" | "signature" | "swap-sigs"; index?: number },
): Envelope {
  if (mut.target === "swap-sigs") {
    return {
      ...env,
      signatures: [env.signatures[1]!, env.signatures[0]!] as Envelope["signatures"],
    };
  }
  if (mut.target === "payload") {
    const flipped = env.payload.startsWith("A")
      ? `B${env.payload.slice(1)}`
      : `A${env.payload.slice(1)}`;
    return { ...env, payload: flipped };
  }
  const i = mut.index ?? 0;
  const sig = env.signatures[i]!.sig;
  const flipped = sig.startsWith("A") ? `B${sig.slice(1)}` : `A${sig.slice(1)}`;
  const sigs = [...env.signatures];
  sigs[i] = { ...sigs[i]!, sig: flipped };
  return { ...env, signatures: sigs as Envelope["signatures"] };
}

async function collectVectors(root: string): Promise<Vector[]> {
  const out: Vector[] = [];
  const entries = await readdir(root, { withFileTypes: true });
  for (const e of entries) {
    const p = join(root, e.name);
    if (e.isDirectory()) {
      out.push(...(await collectVectors(p)));
    } else if (e.name.endsWith(".json")) {
      const raw = await Bun.file(p).text();
      out.push(JSON.parse(raw));
    }
  }
  return out;
}

if (import.meta.main) {
  const here = dirname(fileURLToPath(import.meta.url));
  const vectors = await collectVectors(join(here, "vectors"));
  let fails = 0;
  for (const v of vectors) {
    const out = await runVectorFile(v);
    const mark = out.pass ? "PASS" : "FAIL";
    console.log(`[${mark}] (${v.clause}) ${v.name}${out.error ? ` — ${out.error}` : ""}`);
    if (!out.pass) fails++;
  }
  console.log(`\n${vectors.length - fails}/${vectors.length} passed`);
  process.exit(fails === 0 ? 0 : 1);
}
