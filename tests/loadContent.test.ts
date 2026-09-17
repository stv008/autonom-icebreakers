// @vitest-environment jsdom
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sample from "../public/data/questions.json";
import type { Deck } from "../src/types.ts";

/**
 * Exercises the §11 update pipeline against a fake Cache Storage and a fake
 * network: upgrade, rollback, every "keep last-known-good" failure, the
 * manifest URL policy, the commit point, and an interleaved older download.
 */

type Json = Record<string, unknown>;
const clone = (): Json => JSON.parse(JSON.stringify(sample)) as Json;
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const BASE_SEQ = sample.releaseSeq; // the bundled sample's own seq
const NEXT = BASE_SEQ + 1;
const BASE_VERSION = sample.contentVersion; // the bundled deck's own version / file name

// ---- fake Cache Storage ----------------------------------------------------
class FakeCache {
  store = new Map<string, string>();
  failKeys = false;
  async match(req: string | Request): Promise<Response | undefined> {
    const url = typeof req === "string" ? req : req.url;
    const body = this.store.get(url);
    return body === undefined ? undefined : new Response(body, { headers: { "content-type": "application/json" } });
  }
  async put(req: string | Request, res: Response): Promise<void> {
    this.store.set(typeof req === "string" ? req : req.url, await res.text());
  }
  async keys(): Promise<Request[]> {
    if (this.failKeys) throw new Error("keys() failed");
    return [...this.store.keys()].map((u) => new Request(u));
  }
  async delete(req: string | Request): Promise<boolean> {
    return this.store.delete(typeof req === "string" ? req : req.url);
  }
  names(): string[] {
    return [...this.store.keys()].map((k) => k.split("/").pop() as string);
  }
}
const cache = new FakeCache();

// ---- fake network ------------------------------------------------------------
// The app resolves relative URLs against document.baseURI (jsdom's default origin).
const abs = (path: string) => new URL(path, document.baseURI).href;
type Route = { status: number; body: string | ReadableStream<Uint8Array>; gate?: Promise<void> };
const routes = new Map<string, Route>();
function serve(path: string, body: Route["body"], status = 200, gate?: Promise<void>) {
  routes.set(abs(path), { status, body, gate });
}
const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const route = routes.get(abs(url));
  if (!route) return new Response("not found", { status: 404 });
  if (route.gate) await route.gate;
  let body = route.body;
  // Like a real fetch, an aborted request errors its body stream.
  if (typeof body !== "string") {
    const source = body;
    body = new ReadableStream<Uint8Array>({
      start(controller) {
        init?.signal?.addEventListener("abort", () => controller.error(new DOMException("aborted", "AbortError")));
        void source.cancel();
      },
    });
  }
  return new Response(body, { status: route.status, headers: { "content-type": "application/json" } });
});

let mod: typeof import("../src/content/loadContent.ts");

beforeEach(async () => {
  cache.store.clear();
  cache.failKeys = false;
  routes.clear();
  vi.stubGlobal("caches", { open: async () => cache, match: async () => undefined });
  vi.stubGlobal("fetch", fetchMock);
  if (!globalThis.crypto?.subtle) vi.stubGlobal("crypto", (await import("node:crypto")).webcrypto);
  vi.resetModules(); // fresh throttle state per test
  mod = await import("../src/content/loadContent.ts");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function publish(seq: number, version: string, file: string, deck: Json | string, opts: { sha?: string; schema?: number; gate?: Promise<void> } = {}) {
  const body = typeof deck === "string" ? deck : JSON.stringify(deck);
  serve(`/data/${file}`, body, 200, opts.gate);
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
function release(version: string, mutate?: (d: Json) => void): Json {
  const d = clone();
  d["contentVersion"] = version;
  mutate?.(d);
  return d;
}

describe("resolveReleaseUrl (manifest URL policy)", () => {
  const base = "https://host.example/app/";
  it("accepts version-named files in the app's data directory", () => {
    expect(mod.resolveReleaseUrl("./questions-2026.10.0.json", base)?.href).toBe("https://host.example/app/data/questions-2026.10.0.json");
    expect(mod.resolveReleaseUrl("questions-1.json", base)).not.toBeNull();
  });
  it("rejects other origins, traversal, other directories, other names, queries and fragments", () => {
    for (const bad of [
      "https://elsewhere.invalid/data/questions-x.json",
      "//elsewhere.invalid/data/questions-x.json",
      "../questions-x.json",
      "../../etc/questions-x.json",
      "./sub/questions-x.json",
      "./manifest.json",
      "./questions.json",
      "./questions-x.json?x=1",
      "./questions-x.json#f",
      "./questions-x.txt",
      "javascript:alert(1)",
      "",
    ]) {
      expect(mod.resolveReleaseUrl(bad, base), bad).toBeNull();
    }
  });
});

describe("checkForUpdate", () => {
  it("stages a newer release and points the cache at it", async () => {
    publish(NEXT, "2026.10.0", "questions-2026.10.0.json", release("2026.10.0"));
    expect(await mod.checkForUpdate(BASE_SEQ, { force: true })).toEqual({ kind: "staged", releaseSeq: NEXT, contentVersion: "2026.10.0" });
    const saved = await mod.readSavedRelease();
    expect(saved?.contentVersion).toBe("2026.10.0");
    expect(saved?.releaseSeq).toBe(NEXT);
    expect(cache.names().sort()).toEqual(["content-release", `release-${NEXT}`]);
  });

  it("does nothing when the manifest is not newer than the active or staged release", async () => {
    publish(BASE_SEQ, BASE_VERSION, `questions-${BASE_VERSION}.json`, clone());
    expect(await mod.checkForUpdate(BASE_SEQ, { force: true })).toEqual({ kind: "none" });
    expect(cache.store.size).toBe(0);
  });

  it("activates a rollback: higher seq pointing at an older file; the staged copy carries the manifest seq", async () => {
    publish(NEXT, "2026.10.0", "questions-2026.10.0.json", release("2026.10.0"));
    expect((await mod.checkForUpdate(BASE_SEQ, { force: true })).kind).toBe("staged");
    // Roll back to the current sample file (its embedded releaseSeq is lower) with a higher seq.
    publish(NEXT + 1, BASE_VERSION, `questions-${BASE_VERSION}.json`, clone());
    expect((await mod.checkForUpdate(NEXT, { force: true })).kind).toBe("staged");
    const saved = await mod.readSavedRelease();
    expect(saved?.contentVersion).toBe(BASE_VERSION);
    expect(saved?.releaseSeq).toBe(NEXT + 1);
    expect(cache.names().sort()).toEqual(["content-release", `release-${NEXT + 1}`]); // older entry pruned
  });

  it("ignores a checksum mismatch", async () => {
    publish(NEXT, "x", "questions-x.json", release("x"), { sha: "deadbeef" });
    expect(await mod.checkForUpdate(BASE_SEQ, { force: true })).toEqual({ kind: "failed" });
    expect(cache.store.size).toBe(0);
  });

  it("ignores an unsupported schemaVersion without touching the cache", async () => {
    publish(NEXT, "x", "questions-x.json", release("x"), { schema: 2 });
    expect(await mod.checkForUpdate(BASE_SEQ, { force: true })).toEqual({ kind: "none" });
    expect(cache.store.size).toBe(0);
  });

  it("ignores content that fails validation even with a correct checksum", async () => {
    const broken = release("x", (d) => {
      ((d["questions"] as Json[])[0] as Json)["category"] = "classic";
    });
    publish(NEXT, "x", "questions-x.json", broken);
    expect(await mod.checkForUpdate(BASE_SEQ, { force: true })).toEqual({ kind: "failed" });
    expect(cache.store.size).toBe(0);
  });

  it("ignores a release whose contentVersion differs from the manifest's", async () => {
    publish(NEXT, "2026.10.0", "questions-2026.10.0.json", release("2026.10.1"));
    expect(await mod.checkForUpdate(BASE_SEQ, { force: true })).toEqual({ kind: "failed" });
    expect(cache.store.size).toBe(0);
  });

  it("never fetches a questionsUrl outside the app's data directory or origin", async () => {
    const body = JSON.stringify(release("x"));
    for (const url of ["https://elsewhere.invalid/data/questions-x.json", "../questions-x.json", "./questions.json"]) {
      fetchMock.mockClear();
      serve("/data/manifest.json", JSON.stringify({ releaseSeq: NEXT, contentVersion: "x", schemaVersion: 1, questionsUrl: url, sha256: sha(body) }));
      expect(await mod.checkForUpdate(BASE_SEQ, { force: true }), url).toEqual({ kind: "failed" });
      expect(fetchMock).toHaveBeenCalledTimes(1); // the manifest only
    }
    expect(cache.store.size).toBe(0);
  });

  it("ignores malformed manifest JSON, a manifest with missing fields, and HTTP errors", async () => {
    serve("/data/manifest.json", "{ nope");
    expect((await mod.checkForUpdate(BASE_SEQ, { force: true })).kind).toBe("failed");
    serve("/data/manifest.json", JSON.stringify({ releaseSeq: NEXT }));
    expect((await mod.checkForUpdate(BASE_SEQ, { force: true })).kind).toBe("failed");
    serve("/data/manifest.json", "", 503);
    expect((await mod.checkForUpdate(BASE_SEQ, { force: true })).kind).toBe("failed");
    publish(NEXT, "x", "questions-missing.json", release("x"));
    routes.delete(abs("/data/questions-missing.json"));
    expect((await mod.checkForUpdate(BASE_SEQ, { force: true })).kind).toBe("failed");
    expect(cache.store.size).toBe(0);
  });

  it("times out a release body that stalls after the headers", async () => {
    vi.useFakeTimers();
    const stalled = new ReadableStream<Uint8Array>({ start() {} }); // never closes
    const body = JSON.stringify(release("x"));
    serve("/data/questions-x.json", stalled);
    serve("/data/manifest.json", JSON.stringify({ releaseSeq: NEXT, contentVersion: "x", schemaVersion: 1, questionsUrl: "./questions-x.json", sha256: sha(body) }));
    const pending = mod.checkForUpdate(BASE_SEQ, { force: true });
    await vi.advanceTimersByTimeAsync(4100);
    expect(await pending).toEqual({ kind: "failed" });
    expect(cache.store.size).toBe(0);
  });

  it("throttles non-forced checks to one per 10 minutes", async () => {
    publish(BASE_SEQ, BASE_VERSION, `questions-${BASE_VERSION}.json`, clone());
    expect((await mod.checkForUpdate(BASE_SEQ)).kind).toBe("none");
    expect((await mod.checkForUpdate(BASE_SEQ)).kind).toBe("throttled");
    expect((await mod.checkForUpdate(BASE_SEQ, { force: true })).kind).toBe("none");
  });

  it("keeps a previously staged release when a later check fails", async () => {
    publish(NEXT, "2026.10.0", "questions-2026.10.0.json", release("2026.10.0"));
    expect((await mod.checkForUpdate(BASE_SEQ, { force: true })).kind).toBe("staged");
    publish(NEXT + 2, "bad", "questions-bad.json", release("bad"), { sha: "00" });
    expect((await mod.checkForUpdate(BASE_SEQ, { force: true })).kind).toBe("failed");
    expect((await mod.readSavedRelease())?.contentVersion).toBe("2026.10.0");
  });

  it("reports staged once the pointer moved, even if cleanup fails afterwards", async () => {
    publish(NEXT, "2026.10.0", "questions-2026.10.0.json", release("2026.10.0"));
    cache.failKeys = true;
    expect((await mod.checkForUpdate(BASE_SEQ, { force: true })).kind).toBe("staged");
    expect((await mod.readSavedRelease())?.releaseSeq).toBe(NEXT);
  });

  it("an older download that finishes last cannot overwrite a newer commit", async () => {
    let openGate!: () => void;
    const gate = new Promise<void>((resolve) => {
      openGate = resolve;
    });
    // Check A: seq NEXT, its release file is held back.
    publish(NEXT, "2026.10.0", "questions-2026.10.0.json", release("2026.10.0"), { gate });
    const a = mod.checkForUpdate(BASE_SEQ, { force: true });
    await Promise.resolve();
    // Check B: seq NEXT+1 completes while A is still downloading.
    publish(NEXT + 1, "2026.10.1", "questions-2026.10.1.json", release("2026.10.1"));
    expect((await mod.checkForUpdate(BASE_SEQ, { force: true })).kind).toBe("staged");
    openGate();
    expect((await a).kind).toBe("none");
    const saved = await mod.readSavedRelease();
    expect(saved?.releaseSeq).toBe(NEXT + 1);
    expect(cache.names().sort()).toEqual(["content-release", `release-${NEXT + 1}`]);
  });

  it("stores canonical fields only", async () => {
    publish(NEXT, "2026.10.0", "questions-2026.10.0.json", release("2026.10.0"));
    await mod.checkForUpdate(BASE_SEQ, { force: true });
    const raw = JSON.parse(cache.store.get(abs("__content/release-" + NEXT)) as string) as Json;
    expect(Object.keys(raw).sort()).toEqual(["contentVersion", "publishedAt", "questions", "releaseSeq", "schemaVersion"]);
    expect(Object.keys((raw["questions"] as Json[])[0] as Json).sort()).toEqual(["active", "category", "en", "hu", "id", "presentationSafe", "ro", "source"]);
  });
});

describe("loadInitialDeck", () => {
  it("prefers the saved release, falls back to the bundled deck, and returns null when both are unusable", async () => {
    serve("/data/questions.json", JSON.stringify(clone()));
    expect((await mod.loadInitialDeck())?.origin).toBe("bundled");

    publish(NEXT, "2026.10.0", "questions-2026.10.0.json", release("2026.10.0"));
    await mod.checkForUpdate(BASE_SEQ, { force: true });
    const loaded = await mod.loadInitialDeck();
    expect(loaded?.origin).toBe("release");
    expect((loaded?.deck as Deck).contentVersion).toBe("2026.10.0");

    cache.store.clear();
    serve("/data/questions.json", "{ nope");
    expect(await mod.loadInitialDeck()).toBeNull();
  });

  it("bounds a stalled bundled fetch so the app can show Retry instead of a blank card", async () => {
    vi.useFakeTimers();
    serve("/data/questions.json", new ReadableStream<Uint8Array>({ start() {} }));
    const pending = mod.loadInitialDeck();
    await vi.advanceTimersByTimeAsync(8100);
    expect(await pending).toBeNull();
  });
});
