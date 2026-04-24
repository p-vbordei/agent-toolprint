import { describe, expect, it } from "bun:test";
import { base64 } from "@scure/base";
import { paeEncode, envelopePayloadBytes, newEnvelope } from "../src/envelope.ts";
import { PAYLOAD_TYPE } from "../src/types.ts";

describe("paeEncode (DSSE pre-authenticated encoding)", () => {
  it("matches 'DSSEv1 <lenType> <type> <lenBody> <body>' per DSSE v1.0", () => {
    const body = new TextEncoder().encode("hello");
    const encoded = paeEncode("text/plain", body);
    const decoded = new TextDecoder().decode(encoded);
    expect(decoded).toBe("DSSEv1 10 text/plain 5 hello");
  });

  it("handles empty body", () => {
    const encoded = paeEncode("application/x-empty", new Uint8Array());
    expect(new TextDecoder().decode(encoded)).toBe("DSSEv1 19 application/x-empty 0 ");
  });
});

describe("envelope round-trip", () => {
  it("newEnvelope sets payloadType and base64 payload, no signatures", () => {
    const body = new TextEncoder().encode('{"a":1}');
    const env = newEnvelope(body);
    expect(env.payloadType).toBe(PAYLOAD_TYPE);
    expect(base64.decode(env.payload)).toEqual(body);
    expect(env.signatures).toEqual([]);
  });

  it("envelopePayloadBytes round-trips via base64", () => {
    const body = new TextEncoder().encode('{"z":true}');
    const env = newEnvelope(body);
    expect(envelopePayloadBytes(env)).toEqual(body);
  });
});
