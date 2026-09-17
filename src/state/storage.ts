import { isScope, type Lang, type Persisted } from "../types.ts";

export const STORAGE_KEY = "autonom-icebreakers-v1";

/** The subset of the Web Storage API we use; injectable for tests. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function defaults(navigatorLanguage: string | undefined): Persisted {
  const lang: Lang = (navigatorLanguage ?? "").toLowerCase().startsWith("ro") ? "ro" : "en";
  return {
    lang,
    scope: "all",
    seenIds: [],
    favorites: [],
    lastQuestionId: null,
    installHintDismissed: false,
  };
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && !out.includes(item)) out.push(item);
  }
  return out;
}

/**
 * Parse a raw storage value. Anything malformed resets to defaults (§7).
 * Individual fields are sanitised so a partially corrupted record still yields
 * a usable state rather than throwing.
 */
export function parsePersisted(raw: string | null, navigatorLanguage: string | undefined): Persisted {
  const base = defaults(navigatorLanguage);
  if (raw === null) return base;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return base;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return base;
  const rec = parsed as Record<string, unknown>;
  const lang: Lang = rec["lang"] === "ro" || rec["lang"] === "en" ? rec["lang"] : base.lang;
  const scope = typeof rec["scope"] === "string" && isScope(rec["scope"]) ? rec["scope"] : "all";
  const last = rec["lastQuestionId"];
  return {
    lang,
    scope,
    seenIds: stringArray(rec["seenIds"]),
    favorites: stringArray(rec["favorites"]),
    lastQuestionId: typeof last === "string" && last.length > 0 ? last : null,
    installHintDismissed: rec["installHintDismissed"] === true,
  };
}

export function load(storage: StorageLike, navigatorLanguage: string | undefined): Persisted {
  try {
    return parsePersisted(storage.getItem(STORAGE_KEY), navigatorLanguage);
  } catch {
    return defaults(navigatorLanguage);
  }
}

/** Returns false when storage is unavailable or full; the app keeps running in memory. */
export function save(storage: StorageLike, state: Persisted): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clear(storage: StorageLike): void {
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // ignore — nothing to clear or storage denied
  }
}
