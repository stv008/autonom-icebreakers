// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { clear, defaults, load, parsePersisted, save, STORAGE_KEY } from "../src/state/storage.ts";

describe("defaults", () => {
  it("derives lang from the browser only when nothing is persisted", () => {
    expect(defaults("ro-RO").lang).toBe("ro");
    expect(defaults("en-GB").lang).toBe("en");
    expect(defaults("hu-HU").lang).toBe("en");
    expect(defaults(undefined).lang).toBe("en");
    expect(defaults("ro").scope).toBe("all");
  });
});

describe("parsePersisted", () => {
  it("keeps the persisted lang instead of re-deriving it", () => {
    const p = parsePersisted(JSON.stringify({ lang: "en" }), "ro-RO");
    expect(p.lang).toBe("en");
  });
  it("resets to defaults on parse failure", () => {
    expect(parsePersisted("{not json", "ro")).toEqual(defaults("ro"));
    expect(parsePersisted("[1,2]", "ro")).toEqual(defaults("ro"));
    expect(parsePersisted("null", "ro")).toEqual(defaults("ro"));
  });
  it("sanitises fields individually", () => {
    const p = parsePersisted(
      JSON.stringify({ lang: "xx", scope: "nope", seenIds: ["a", 1, "a", "b"], favorites: "no", lastQuestionId: "", installHintDismissed: "yes" }),
      "en",
    );
    expect(p).toEqual({ lang: "en", scope: "all", seenIds: ["a", "b"], favorites: [], lastQuestionId: null, installHintDismissed: false });
  });
});

describe("localStorage round-trip", () => {
  beforeEach(() => localStorage.clear());

  it("saves and reloads the full state", () => {
    const state = { lang: "ro" as const, scope: "values" as const, seenIds: ["v1"], favorites: ["v1"], lastQuestionId: "v1", installHintDismissed: true };
    expect(save(localStorage, state)).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(load(localStorage, "en")).toEqual(state);
  });

  it("clear() returns to defaults", () => {
    save(localStorage, { ...defaults("ro"), favorites: ["x"] });
    clear(localStorage);
    expect(load(localStorage, "ro")).toEqual(defaults("ro"));
  });

  it("survives a throwing storage", () => {
    const broken = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    expect(load(broken, "ro")).toEqual(defaults("ro"));
    expect(save(broken, defaults("ro"))).toBe(false);
    expect(() => clear(broken)).not.toThrow();
  });
});
