// @vitest-environment jsdom
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sample from "../public/data/questions.json";
import type { Deck } from "../src/types.ts";

/**
 * Exercises the §11 update pipeline against a fake Cache Storage and a fake
 * network: upgrade, rollback, and every "keep last-known-good" failure.
 */

type Json = Record<string, unknown>;
const clone = (): Json => JSON.parse(JSON.stringify(sample)) as Json;
const sha = (text: string) => createHash("sha256").update(text).digest("hex");

// ---- fake Cache Storage ----------------------------------------------------
class FakeCache {
  store = new Map<string, string>();
  async match(req: string | Request): Promise<Response | undefined> {
    const url = typeof req === "string" ? req : req.url;
    const body = this.store.get(url);
    return body === undefined ? undefined : new Response(body, { headers: { "content-type": "application/json" } });
  }
  async put(req: string | Request, res: Response): Promise<void> {
    this.store.set(typeof req === "string" ? req : req.url, await res.text());
  }
  async keys(): Promise<Request[]> {
    return [...this.store.keys()].map((u) => new Request(u));
  }
  async delete(req: string | Request): Promise<boolean> {
    return this.store.delete(typeof req === "string" ? req : req.url);
  }
}
const cache = new FakeCache();

// ---- fake network ------------------------------------------------------------
// The app resolves relative URLs against document.baseURI (jsdom's default origin).
const abs = (path: string) => new URL(path, document.baseURI).href;
const routes = new Map<string, { status: number; body: string }>();
function serve(path: string, body: string, status = 200) {
  routes.set(abs(path), { status, body });
}
const fetchMock = vi.fn(async (input: string | URL | Request) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const route = routes.get(abs(url));
  if (!route) return new Response("not found", { status: 404 });
  return new Response(route.body, { status: route.status, headers: { "content-type": "application/json" } });
});

let mod: typeof import("../src/content/loadContent.ts");

beforeEach(async () => {
  cache.store.clear();
  routes.clear();
  vi.stubGlobal("caches", { open: async () => cache, match: async () => undefined });
  vi.stubGlobal("fetch", fetchMock);
  if (!globalThis.crypto?.subtle) vi.stubGlobal("crypto", (await import("node:crypto")).webcrypto);
  vi.resetModules(); // fresh throttle state per test
  mod = await import("../src/content/loadContent.ts");
});
afterEach(() => vi.unstubAllGlobals());

function publish(seq: number, version: string, file: string, deck: Json | string, opts: { sha?: string; schema?: number } = {}) {
  const body = typeof deck === "string" ? deck : JSON.stringify(deck);
  serve(`/data/${file}`, body);
  serve(
    "/data/manifest.json",
    JSON.stringify({
      releaseSeq: seq,
      contentVersion: version,
      schemaVersion: opts.schema ?? 1,
      questionsUrl: `./${file}`,
      sha256: opts.sha ?? sha(body),
    }),
  );
}

describe("checkForUpdate", () => {
  it("stages a newer release and points the cache at it", async () => {
    const r2 = clone();
    r2["contentVersion"] = "2026.09.1-sample";
    r2["releaseSeq"] = 2;
    publish(2, "2026.09.1-sample", "questions-2026.09.1-sample.json", r2);

    expect(await mod.checkForUpdate(1, { force: true })).toBe("staged");
    const saved = await mod.readSavedRelease();
    expect(saved?.contentVersion).toBe("2026.09.1-sample");
    expect(saved?.releaseSeq).toBe(2);
    expect([...cache.store.keys()].map((k) => k.split("/").pop())).toEqual(["release-2", "content-release"]);
  });

  it("does nothing when the manifest is not newer than the active or staged release", async () => {
    publish(1, "2026.09.0-sample", "questions-2026.09.0-sample.json", clone());
    expect(await mod.checkForUpdate(1, { force: true })).toBe("none");
    expect(cache.store.size).toBe(0);
  });

  it("activates a rollback: higher seq pointing at an older file; the staged copy carries the manifest seq", async () => {
    const r2 = clone();
    r2["contentVersion"] = "2026.09.1-sample";
    r2["releaseSeq"] = 2;
    publish(2, "2026.09.1-sample", "questions-2026.09.1-sample.json", r2);
    expect(await mod.checkForUpdate(1, { force: true })).toBe("staged");

    // Roll back to the 2026.09.0 file (its embedded releaseSeq is 1) with seq 3.
    publish(3, "2026.09.0-sample", "questions-2026.09.0-sample.json", clone());
    expect(await mod.checkForUpdate(2, { force: true })).toBe("staged");
    const saved = await mod.readSavedRelease();
    expect(saved?.contentVersion).toBe("2026.09.0-sample");
    expect(saved?.releaseSeq).toBe(3);
    expect([...cache.store.keys()].some((k) => k.endsWith("release-2"))).toBe(false); // pruned
  });

  it("ignores a checksum mismatch", async () => {
    publish(2, "x", "questions-x.json", clone(), { sha: "deadbeef" });
    expect(await mod.checkForUpdate(1, { force: true })).toBe("failed");
    expect(cache.store.size).toBe(0);
  });

  it("ignores an unsupported schemaVersion without touching the cache", async () => {
    publish(2, "x", "questions-x.json", clone(), { schema: 2 });
    expect(await mod.checkForUpdate(1, { force: true })).toBe("none");
    expect(cache.store.size).toBe(0);
  });

  it("ignores content that fails validation even with a correct checksum", async () => {
    const broken = clone();
    ((broken["questions"] as Json[])[0] as Json)["category"] = "classic";
    publish(2, "x", "questions-x.json", broken);
    expect(await mod.checkForUpdate(1, { force: true })).toBe("failed");
    expect(cache.store.size).toBe(0);
  });

  it("ignores malformed manifest JSON, a manifest with missing fields, and HTTP errors", async () => {
    serve("/data/manifest.json", "{ nope");
    expect(await mod.checkForUpdate(1, { force: true })).toBe("failed");
    serve("/data/manifest.json", JSON.stringify({ releaseSeq: 2 }));
    expect(await mod.checkForUpdate(1, { force: true })).toBe("failed");
    serve("/data/manifest.json", "", 503);
    expect(await mod.checkForUpdate(1, { force: true })).toBe("failed");
    publish(2, "x", "missing.json", clone());
    routes.delete(abs("/data/missing.json"));
    expect(await mod.checkForUpdate(1, { force: true })).toBe("failed");
    expect(cache.store.size).toBe(0);
  });

  it("throttles non-forced checks to one per 10 minutes", async () => {
    publish(1, "2026.09.0-sample", "questions-2026.09.0-sample.json", clone());
    expect(await mod.checkForUpdate(1)).toBe("none");
    expect(await mod.checkForUpdate(1)).toBe("throttled");
    expect(await mod.checkForUpdate(1, { force: true })).toBe("none");
  });

  it("keeps a previously staged release when a later check fails", async () => {
    const r2 = clone();
    r2["contentVersion"] = "2026.09.1-sample";
    publish(2, "2026.09.1-sample", "questions-2026.09.1-sample.json", r2);
    expect(await mod.checkForUpdate(1, { force: true })).toBe("staged");
    publish(4, "bad", "questions-bad.json", clone(), { sha: "00" });
    expect(await mod.checkForUpdate(1, { force: true })).toBe("failed");
    expect((await mod.readSavedRelease())?.contentVersion).toBe("2026.09.1-sample");
  });
});

describe("loadInitialDeck", () => {
  it("prefers the saved release, falls back to the bundled deck, and returns null when both are unusable", async () => {
    serve("/data/questions.json", JSON.stringify(clone()));
    expect((await mod.loadInitialDeck())?.origin).toBe("bundled");

    const r2 = clone();
    r2["contentVersion"] = "2026.09.1-sample";
    publish(2, "2026.09.1-sample", "questions-2026.09.1-sample.json", r2);
    await mod.checkForUpdate(1, { force: true });
    const loaded = await mod.loadInitialDeck();
    expect(loaded?.origin).toBe("release");
    expect((loaded?.deck as Deck).contentVersion).toBe("2026.09.1-sample");

    cache.store.clear();
    serve("/data/questions.json", "{ nope");
    expect(await mod.loadInitialDeck()).toBeNull();
  });
});
