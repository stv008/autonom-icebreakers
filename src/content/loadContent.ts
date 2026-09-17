import type { ContentManifest, Deck } from "../types.ts";
import { validateDeck } from "./validate.js";

/**
 * Startup + update pipeline (§11). Every failure keeps last-known-good silently.
 */

const CACHE_NAME = "autonom-icebreakers-content";
const POINTER_KEY = "content-release";
const BUNDLED_URL = "./data/questions.json";
const MANIFEST_URL = "./data/manifest.json";
const FETCH_TIMEOUT_MS = 4000;
const CHECK_THROTTLE_MS = 10 * 60 * 1000;

export type DeckOrigin = "release" | "bundled";
export interface LoadedDeck {
  deck: Deck;
  origin: DeckOrigin;
}
export type UpdateOutcome = "staged" | "none" | "failed" | "throttled";

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

async function readPointer(cache: Cache): Promise<Pointer | null> {
  const res = await cache.match(keyUrl(POINTER_KEY));
  if (!res) return null;
  const value: unknown = await res.json();
  return isPointer(value) ? value : null;
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
    const result = validateDeck(await res.json());
    return result.deck;
  } catch {
    return null;
  }
}

/** Bundled fallback deck (precached by the service worker). */
export async function readBundledDeck(): Promise<Deck | null> {
  try {
    const res = await fetch(BUNDLED_URL);
    if (!res.ok) return null;
    const result = validateDeck(await res.json());
    return result.deck;
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

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Check `data/manifest.json`; when it points at a newer release, download,
 * verify, validate and stage it in Cache Storage. Never touches the deck on
 * screen — the caller shows the update banner and the release activates on
 * the next launch (§11 step 4).
 *
 * `currentSeq` is the releaseSeq of the deck currently active on screen.
 */
export async function checkForUpdate(currentSeq: number, options: { force?: boolean } = {}): Promise<UpdateOutcome> {
  const now = Date.now();
  if (!options.force && now - lastCheckAt < CHECK_THROTTLE_MS) return "throttled";
  lastCheckAt = now;
  if (!hasCacheStorage() || typeof crypto === "undefined" || !crypto.subtle) return "failed";

  try {
    const manifestRes = await fetchWithTimeout(MANIFEST_URL, { cache: "no-store" });
    if (!manifestRes.ok) return "failed";
    const manifest: unknown = await manifestRes.json();
    if (!isManifest(manifest)) return "failed";
    if (manifest.schemaVersion !== 1) return "none"; // unsupported schema: ignore, keep current deck

    const cache = await caches.open(CACHE_NAME);
    const pointer = await readPointer(cache);
    const knownSeq = Math.max(currentSeq, pointer?.releaseSeq ?? -Infinity);
    if (manifest.releaseSeq <= knownSeq) return "none";

    const questionsUrl = new URL(manifest.questionsUrl, new URL(MANIFEST_URL, document.baseURI)).href;
    const contentRes = await fetchWithTimeout(questionsUrl, {});
    if (!contentRes.ok) return "failed";
    const bytes = await contentRes.arrayBuffer();
    if ((await sha256Hex(bytes)) !== manifest.sha256.trim().toLowerCase()) return "failed";

    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    const result = validateDeck(parsed);
    if (!result.deck) return "failed";

    // The manifest's releaseSeq is the activation order (a rollback is a higher
    // seq pointing at an older file), so the staged copy carries it.
    const staged: Deck = { ...result.deck, releaseSeq: manifest.releaseSeq };
    const key = `release-${manifest.releaseSeq}`;
    const headers = { "content-type": "application/json" };
    // Atomic swap: write the new entry, then move the pointer, then prune.
    await cache.put(keyUrl(key), new Response(JSON.stringify(staged), { headers }));
    const newPointer: Pointer = { key, releaseSeq: manifest.releaseSeq };
    await cache.put(keyUrl(POINTER_KEY), new Response(JSON.stringify(newPointer), { headers }));
    for (const req of await cache.keys()) {
      if (req.url !== keyUrl(key) && req.url !== keyUrl(POINTER_KEY)) await cache.delete(req);
    }
    return "staged";
  } catch {
    return "failed";
  }
}

/**
 * True only when the app shell is controlled by a service worker AND a
 * validated deck (saved release or precached bundled fallback) is cached.
 */
export async function isOfflineReady(): Promise<boolean> {
  if (!hasCacheStorage() || !("serviceWorker" in navigator)) return false;
  if (!navigator.serviceWorker.controller) return false;
  try {
    if (await readSavedRelease()) return true;
    const bundled = await caches.match(new URL(BUNDLED_URL, document.baseURI).href, { ignoreSearch: true });
    return bundled !== undefined;
  } catch {
    return false;
  }
}
