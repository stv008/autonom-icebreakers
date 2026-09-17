import type { ContentManifest, Deck } from "../types.ts";
import { validateDeck } from "./validate.js";

/**
 * Startup + update pipeline (§11). Every failure keeps last-known-good silently.
 */

const CACHE_NAME = "autonom-icebreakers-content";
const LOCK_NAME = "autonom-icebreakers-content-commit";
const POINTER_KEY = "content-release";
const BUNDLED_URL = "./data/questions.json";
const MANIFEST_URL = "./data/manifest.json";
/** Release files must live next to the manifest and be version-named (§5.3). */
const RELEASE_FILE = /^questions-[A-Za-z0-9._-]+\.json$/;
const FETCH_TIMEOUT_MS = 4000;
const BUNDLED_TIMEOUT_MS = 8000;
const CHECK_THROTTLE_MS = 10 * 60 * 1000;

export type DeckOrigin = "release" | "bundled";
export interface LoadedDeck {
  deck: Deck;
  origin: DeckOrigin;
}
export type UpdateResult =
  | { kind: "staged"; releaseSeq: number; contentVersion: string }
  | { kind: "none" }
  | { kind: "failed" }
  | { kind: "throttled" };

interface Pointer {
  key: string;
  releaseSeq: number;
}

let lastCheckAt = 0;

function hasCacheStorage(): boolean {
  return typeof caches !== "undefined";
}

/** Cache keys must be same-origin URLs; keep them under the app's own base. */
function keyUrl(key: string): string {
  return new URL(`__content/${key}`, document.baseURI).href;
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), { headers: { "content-type": "application/json" } });
}

function isPointer(value: unknown): value is Pointer {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Pointer).key === "string" &&
    Number.isInteger((value as Pointer).releaseSeq)
  );
}

function isManifest(value: unknown): value is ContentManifest {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Record<string, unknown>;
  return (
    Number.isInteger(m["releaseSeq"]) &&
    typeof m["contentVersion"] === "string" &&
    typeof m["schemaVersion"] === "number" &&
    typeof m["questionsUrl"] === "string" &&
    typeof m["sha256"] === "string"
  );
}

/**
 * Resolve `questionsUrl` and accept it only if it names a version-named file
 * in the app's own `data/` directory on the same origin — no third-party or
 * unrelated requests can be triggered by a manifest (§15).
 */
export function resolveReleaseUrl(questionsUrl: string, baseURI: string = document.baseURI): URL | null {
  const manifestUrl = new URL(MANIFEST_URL, baseURI);
  const dataDir = new URL("./", manifestUrl);
  let url: URL;
  try {
    url = new URL(questionsUrl, manifestUrl);
  } catch {
    return null;
  }
  if (url.origin !== dataDir.origin || url.search !== "" || url.hash !== "") return null;
  if (!url.pathname.startsWith(dataDir.pathname)) return null; // pathname is already normalised (no "..")
  const file = url.pathname.slice(dataDir.pathname.length);
  return RELEASE_FILE.test(file) ? url : null;
}

async function readPointer(cache: Cache): Promise<Pointer | null> {
  const res = await cache.match(keyUrl(POINTER_KEY));
  if (!res) return null;
  const value: unknown = await res.json();
  return isPointer(value) ? value : null;
}

/**
 * GET with a timeout that covers the whole transfer (headers *and* body), not
 * only the time to first byte. Redirects are refused. Returns null on any
 * non-2xx status; throws on abort/network error.
 */
async function fetchBytes(url: string, timeoutMs: number, init: RequestInit = {}): Promise<ArrayBuffer | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, redirect: "error", signal: controller.signal });
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } finally {
    clearTimeout(timer);
  }
}

function parseJson(bytes: ArrayBuffer): unknown {
  return JSON.parse(new TextDecoder().decode(bytes));
}

/** Last saved, validated release from Cache Storage, or null. */
export async function readSavedRelease(): Promise<Deck | null> {
  if (!hasCacheStorage()) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const pointer = await readPointer(cache);
    if (!pointer) return null;
    const res = await cache.match(keyUrl(pointer.key));
    if (!res) return null;
    return validateDeck(await res.json()).deck;
  } catch {
    return null;
  }
}

/** Bundled fallback deck (precached by the service worker). Bounded so a stalled fetch ends in the Retry state, not a blank card. */
export async function readBundledDeck(): Promise<Deck | null> {
  try {
    const bytes = await fetchBytes(BUNDLED_URL, BUNDLED_TIMEOUT_MS);
    return bytes ? validateDeck(parseJson(bytes)).deck : null;
  } catch {
    return null;
  }
}

export async function loadInitialDeck(): Promise<LoadedDeck | null> {
  const saved = await readSavedRelease();
  if (saved) return { deck: saved, origin: "release" };
  const bundled = await readBundledDeck();
  return bundled ? { deck: bundled, origin: "bundled" } : null;
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Commit a validated release: write the entry, then swap the pointer (the
 * commit point), then best-effort prune older entries. Serialised across tabs
 * with a Web Lock where available, and the pointer is re-read inside the
 * critical section so a slower, older download can never overwrite a newer
 * commit. Returns false when a release with an equal or higher seq already won.
 */
async function commitRelease(staged: Deck): Promise<boolean> {
  const run = async (): Promise<boolean> => {
    const cache = await caches.open(CACHE_NAME);
    const current = await readPointer(cache);
    if (current && current.releaseSeq >= staged.releaseSeq) return false;
    const key = `release-${staged.releaseSeq}`;
    await cache.put(keyUrl(key), jsonResponse(staged));
    await cache.put(keyUrl(POINTER_KEY), jsonResponse({ key, releaseSeq: staged.releaseSeq } satisfies Pointer));
    try {
      for (const req of await cache.keys()) {
        const match = /release-(\d+)$/.exec(req.url);
        if (match && Number(match[1]) < staged.releaseSeq) await cache.delete(req);
      }
    } catch {
      // Cleanup is not part of the commit; the pointer already moved.
    }
    return true;
  };
  if (typeof navigator !== "undefined" && "locks" in navigator && navigator.locks) {
    return navigator.locks.request(LOCK_NAME, run);
  }
  return run();
}

/**
 * Check `data/manifest.json`; when it points at a newer release, download,
 * verify, validate and stage it in Cache Storage. Never touches the deck on
 * screen — the caller shows the update banner and the release activates on
 * the next launch (§11 step 4).
 *
 * `currentSeq` is the releaseSeq of the deck currently active on screen.
 */
export async function checkForUpdate(currentSeq: number, options: { force?: boolean } = {}): Promise<UpdateResult> {
  const now = Date.now();
  if (!options.force && now - lastCheckAt < CHECK_THROTTLE_MS) return { kind: "throttled" };
  lastCheckAt = now;
  if (!hasCacheStorage() || typeof crypto === "undefined" || !crypto.subtle) return { kind: "failed" };

  try {
    const manifestBytes = await fetchBytes(MANIFEST_URL, FETCH_TIMEOUT_MS, { cache: "no-store" });
    if (!manifestBytes) return { kind: "failed" };
    const manifest: unknown = parseJson(manifestBytes);
    if (!isManifest(manifest)) return { kind: "failed" };
    if (manifest.schemaVersion !== 1) return { kind: "none" }; // unsupported schema: ignore, keep current deck

    const cache = await caches.open(CACHE_NAME);
    const pointer = await readPointer(cache);
    const knownSeq = Math.max(currentSeq, pointer?.releaseSeq ?? -Infinity);
    if (manifest.releaseSeq <= knownSeq) return { kind: "none" };

    const releaseUrl = resolveReleaseUrl(manifest.questionsUrl);
    if (!releaseUrl) return { kind: "failed" };
    const bytes = await fetchBytes(releaseUrl.href, FETCH_TIMEOUT_MS);
    if (!bytes) return { kind: "failed" };
    if ((await sha256Hex(bytes)) !== manifest.sha256.trim().toLowerCase()) return { kind: "failed" };

    const result = validateDeck(parseJson(bytes));
    if (!result.deck || result.deck.contentVersion !== manifest.contentVersion) return { kind: "failed" };

    // The manifest's releaseSeq is the activation order (a rollback is a higher
    // seq pointing at an older file), so the staged copy carries it.
    const staged: Deck = { ...result.deck, releaseSeq: manifest.releaseSeq };
    if (!(await commitRelease(staged))) return { kind: "none" };
    return { kind: "staged", releaseSeq: staged.releaseSeq, contentVersion: staged.contentVersion };
  } catch {
    return { kind: "failed" };
  }
}

/**
 * True only when a service worker controls the page, the app shell is cached,
 * and a validated deck (saved release or the precached bundled fallback) is
 * available from cache.
 */
export async function isOfflineReady(): Promise<boolean> {
  if (!hasCacheStorage() || !("serviceWorker" in navigator)) return false;
  if (!navigator.serviceWorker.controller) return false;
  try {
    const shell = await caches.match(new URL("index.html", document.baseURI).href, { ignoreSearch: true });
    if (!shell) return false;
    if (await readSavedRelease()) return true;
    const bundled = await caches.match(new URL(BUNDLED_URL, document.baseURI).href, { ignoreSearch: true });
    if (!bundled) return false;
    return validateDeck(await bundled.json()).ok;
  } catch {
    return false;
  }
}
