import { describe, expect, it } from "vitest";
import { getOrCreateIdentity, loadIdentity, saveIdentity } from "./identity.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

describe("identity persistence", () => {
  it("creates and persists a local identity without logging secrets", () => {
    const storage = memoryStorage();
    const identity = getOrCreateIdentity(storage, {
      secret: new Uint8Array(32).fill(1),
      trapdoor: new Uint8Array(32).fill(2),
    });

    expect(identity.identitySecret).toBe("01".repeat(32));
    expect(identity.identityTrapdoor).toBe("02".repeat(32));
    expect(loadIdentity(storage)).toEqual(identity);
  });

  it("loads an existing identity instead of replacing it", () => {
    const storage = memoryStorage();
    const identity = { identitySecret: "a", identityTrapdoor: "b", createdAt: "now" };
    saveIdentity(storage, identity);

    expect(getOrCreateIdentity(storage)).toEqual(identity);
  });
});
