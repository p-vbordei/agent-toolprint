import { describe, expect, it } from "bun:test";
import * as api from "../src/index.ts";

describe("public API surface", () => {
  it("exports the 4 core functions", () => {
    expect(typeof api.signAgent).toBe("function");
    expect(typeof api.countersignTool).toBe("function");
    expect(typeof api.verify).toBe("function");
    expect(typeof api.chain).toBe("function");
  });

  it("exports the bundled did:key helpers", () => {
    expect(typeof api.didKeyFromEd25519Pubkey).toBe("function");
    expect(typeof api.parseDidKey).toBe("function");
    expect(typeof api.didKeyResolver).toBe("function");
  });

  it("exports schemas and constants", () => {
    expect(api.ReceiptSchema).toBeDefined();
    expect(api.EnvelopeSchema).toBeDefined();
    expect(api.PAYLOAD_TYPE).toBe("application/vnd.agent-toolprint+json");
    expect(api.PROTOCOL_VERSION).toBe("tp/0.1");
  });
});
