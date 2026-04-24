# agent-toolprint — v0.1 specification (DRAFT)

**Status:** draft, not yet implemented.
**Scope:** see [SCOPE.md](./SCOPE.md) for the v0.1 feature decisions that shaped the grammar below.

## Abstract

`agent-toolprint` defines a double-signed receipt format for tool invocations by an AI agent. Each receipt binds the agent DID, tool DID, call name, args hash, and response hash, and is signed by both parties. Verification proves, to any third party, that a specific tool invocation happened as described.

## 1. Terminology

- **Agent** — the party issuing a tool call, identified by a DID (see [`agent-id`](../agent-id/)).
- **Tool** — the party responding to the tool call, identified by a DID.
- **Receipt** — the signed record of one invocation.
- **DSSE envelope** — [Dead Simple Signing Envelope](https://github.com/secure-systems-lab/dsse), used as the wire format.

For **v0.1**, both agent and tool DIDs MUST use `did:key`. Support for `did:web` and other DID methods is deferred to a future version.

## 2. Receipt schema

```
{
  "v": "tp/0.1",
  "id": "<RFC 4122 UUID>",
  "ts": "<RFC 3339>",
  "agent": { "did": "...", "key_id": "..." },
  "tool":  { "did": "...", "key_id": "..." },
  "call": {
    "name": "...",                    // e.g. "search", "fetch_url"
    "args_hash": "sha256:..."         // over JCS(args)
  },
  "result": {
    "status": "ok" | "error",
    "response_hash": "sha256:..."     // over JCS(response)
  },
  "nonce": "<base64 32-byte random>",
  "parent?": "<receipt id>"           // chain into prior receipt
}
```

Canonical encoding: JCS ([RFC 8785](https://www.rfc-editor.org/rfc/rfc8785)). Deterministic CBOR is out of scope for v0.1.

## 3. Envelope

The receipt is wrapped in a DSSE envelope:

```
{
  "payloadType": "application/vnd.agent-toolprint+json",
  "payload": "<base64 of canonical(receipt)>",
  "signatures": [
    { "keyid": "<agent key id>", "sig": "<base64 Ed25519>" },
    { "keyid": "<tool key id>",  "sig": "<base64 Ed25519>" }
  ]
}
```

Both signatures MUST cover the same payload bytes. The order inside `signatures[]` is agent first, tool second. Duplicate signers are rejected.

## 4. API (reference)

```
sign_agent(receipt, sk) -> Envelope           // adds the agent's signature
countersign_tool(envelope, sk) -> Envelope    // adds the tool's signature
verify(envelope, did_resolver) -> Result
chain(parent_envelope, child_envelope) -> bool    // parent.id == child.receipt.parent
```

`verify` MUST check:

1. Envelope has exactly 2 signatures.
2. First signature verifies under the receipt's `agent.did` → `key_id`.
3. Second signature verifies under `tool.did` → `key_id`.
4. Hashes of args / response match (if plaintext is supplied for audit).
5. Timestamp is within a configured window (default: ±24h from "now" unless caller opts out).

## 5. Security considerations

- **Single-signed receipts are invalid.** A tool issuing a receipt alone does not attest agent participation; likewise an agent alone does not attest tool participation. Both-or-nothing.
- **Replay**: `nonce` (32 random bytes) and `ts` MUST be present in every receipt. Replay detection is the receipt consumer's responsibility; the library holds no state.
- **Args / response privacy**: receipts carry only hashes (`sha256:...`). Plaintext for audit review is requested out-of-band and re-hashed by the verifier.
- **Key rotation**: for `did:key` (v0.1), the verification key is derived deterministically from the DID string, so "state at `ts`" equals "state now". For future DID methods with mutable documents, verifiers MUST use the DID Document state at `ts`, not "now".
- **Revocation**: tools wishing to repudiate must do so via an out-of-band revocation list; receipts remain cryptographically valid.

## 6. Conformance

A conforming implementation MUST:

- (C1) Produce byte-identical canonical encoding across implementations for the same receipt.
- (C2) Reject tampering: a single-byte mutation of args / response / any other field must cause `verify` to fail.
- (C3) Reject a single-signed envelope; accept only double-signed envelopes.
- (C4) Chain correctly: `parent.id == child.parent`; otherwise reject.

Test vectors live in `conformance/`.

## 7. References

- [DSSE v1.0](https://github.com/secure-systems-lab/dsse)
- [RFC 8785 JCS](https://www.rfc-editor.org/rfc/rfc8785)
- [RFC 4122 UUID](https://www.rfc-editor.org/rfc/rfc4122)
- [RFC 8032 EdDSA](https://www.rfc-editor.org/rfc/rfc8032)
- [did:key spec](https://w3c-ccg.github.io/did-method-key/)
- [`agent-id` spec](../agent-id/SPEC.md)
