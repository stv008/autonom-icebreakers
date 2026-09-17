// @ts-check
/**
 * Content validation rules (§12). Plain ESM JavaScript (JSDoc-typed, checked
 * by tsc via `checkJs`) so the exact same module runs in the browser client
 * and in `scripts/validate-content.mjs` under plain Node — no build step.
 */

/** @typedef {import("../types.ts").Deck} Deck */
/** @typedef {import("../types.ts").Question} Question */
/** @typedef {{ rule: string; message: string }} Finding */
/** @typedef {{ ok: boolean; errors: Finding[]; warnings: Finding[]; deck: Deck | null }} ValidationResult */

export const SCHEMA_VERSION = 1;
export const MAX_WORDING_LENGTH = 220;

/** Keep in sync with `CATEGORIES` in src/types.ts (tests/content.test.ts asserts it). */
export const CATEGORY_IDS = Object.freeze([
  "me_life_dreams",
  "values",
  "personal_growth",
  "relationships",
  "professional",
]);

export const SOURCES = Object.freeze(["2026", "legacy"]);

export const TOP_LEVEL_FIELDS = Object.freeze([
  "schemaVersion",
  "contentVersion",
  "releaseSeq",
  "publishedAt",
  "questions",
]);

export const QUESTION_FIELDS = Object.freeze([
  "id",
  "category",
  "active",
  "source",
  "presentationSafe",
  "ro",
  "en",
  "hu",
]);

/** Ordered rule ids; the CLI prints one line per rule. */
export const RULES = Object.freeze([
  "top_level_fields",
  "schema_version",
  "release_seq",
  "questions_array",
  "question_fields",
  "question_shape",
  "id_unique",
  "category_known",
  "active_boolean",
  "wording_present",
  "wording_differs",
  "no_html",
  "wording_unique",
  "active_nonzero",
  "wording_length", // warning only
]);

export const WARNING_RULES = Object.freeze(["wording_length"]);

const HTML_TAG = /<\s*\/?\s*[a-z!?][^>]*>/i;

/**
 * Case-, diacritic- and punctuation-insensitive form used for duplicate detection.
 * @param {string} text
 * @returns {string}
 */
export function normaliseWording(text) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Rebuild a validated deck with the canonical fields only. The validator
 * already rejects unknown fields; this is the client-side belt to the
 * publish-gate braces, so nothing beyond the schema is ever cached.
 * @param {Deck} deck
 * @returns {Deck}
 */
export function canonicalDeck(deck) {
  return {
    schemaVersion: deck.schemaVersion,
    contentVersion: deck.contentVersion,
    releaseSeq: deck.releaseSeq,
    publishedAt: deck.publishedAt,
    questions: deck.questions.map((q) => ({
      id: q.id,
      category: q.category,
      active: q.active,
      source: q.source,
      presentationSafe: q.presentationSafe,
      ro: q.ro,
      en: q.en,
      hu: q.hu,
    })),
  };
}

/**
 * Validate a parsed JSON value against the §12 rules.
 * Rejection is all-or-nothing: `deck` is only returned when `ok` is true,
 * and then only with canonical fields.
 * @param {unknown} input
 * @returns {ValidationResult}
 */
export function validateDeck(input) {
  /** @type {Finding[]} */
  const errors = [];
  /** @type {Finding[]} */
  const warnings = [];
  /** @param {string} rule @param {string} message */
  const fail = (rule, message) => {
    errors.push({ rule, message });
  };
  /** @param {string} rule @param {string} message */
  const warn = (rule, message) => {
    warnings.push({ rule, message });
  };
  /** "No HTML anywhere" (§5.1): every string field, not only the wordings.
   * @param {string} where @param {unknown} value */
  const checkHtml = (where, value) => {
    if (typeof value === "string" && HTML_TAG.test(value)) fail("no_html", `${where} contains an HTML tag`);
  };

  if (!isRecord(input)) {
    fail("top_level_fields", "release is not a JSON object");
    return { ok: false, errors, warnings, deck: null };
  }

  for (const key of Object.keys(input)) {
    if (!TOP_LEVEL_FIELDS.includes(key)) fail("top_level_fields", `unknown top-level field "${key}"`);
  }
  for (const key of TOP_LEVEL_FIELDS) {
    if (!(key in input)) fail("top_level_fields", `missing top-level field "${key}"`);
  }

  if (input["schemaVersion"] !== SCHEMA_VERSION) {
    fail("schema_version", `schemaVersion must be ${SCHEMA_VERSION}, got ${JSON.stringify(input["schemaVersion"])}`);
  }
  if (!Number.isSafeInteger(input["releaseSeq"]) || /** @type {number} */ (input["releaseSeq"]) < 1) {
    fail("release_seq", `releaseSeq must be a positive integer, got ${JSON.stringify(input["releaseSeq"])}`);
  }
  if (typeof input["contentVersion"] !== "string" || input["contentVersion"].trim() === "") {
    fail("top_level_fields", "contentVersion must be a non-empty string");
  }
  checkHtml("contentVersion", input["contentVersion"]);
  if (typeof input["publishedAt"] !== "string" || Number.isNaN(Date.parse(input["publishedAt"]))) {
    fail("top_level_fields", "publishedAt must be an ISO-8601 date string");
  }
  checkHtml("publishedAt", input["publishedAt"]);

  const questions = input["questions"];
  if (!Array.isArray(questions)) {
    fail("questions_array", "questions must be an array");
    return { ok: false, errors, warnings, deck: null };
  }

  /** @type {Set<string>} */
  const ids = new Set();
  /** @type {Map<string, string>} */
  const seenRo = new Map();
  /** @type {Map<string, string>} */
  const seenEn = new Map();
  let activeCount = 0;

  questions.forEach((raw, index) => {
    const where = `questions[${index}]`;
    if (!isRecord(raw)) {
      fail("question_shape", `${where} is not an object`);
      return;
    }
    const label = typeof raw["id"] === "string" ? `${where} (${raw["id"]})` : where;

    // Editorial columns (alternatives, notes, owner…) must never ship (§5.4).
    for (const key of Object.keys(raw)) {
      if (!QUESTION_FIELDS.includes(key)) fail("question_fields", `${label}: unknown field "${key}"`);
    }
    for (const key of QUESTION_FIELDS) {
      if (!(key in raw)) fail("question_shape", `${label}: missing field "${key}"`);
    }

    const id = raw["id"];
    if (typeof id !== "string" || id.trim() === "") {
      fail("question_shape", `${where}: id must be a non-empty string`);
    } else if (ids.has(id)) {
      fail("id_unique", `${label}: duplicate id`);
    } else {
      ids.add(id);
    }
    checkHtml(`${label}: id`, id);

    const category = raw["category"];
    if (typeof category !== "string" || !CATEGORY_IDS.includes(category)) {
      fail("category_known", `${label}: unknown category ${JSON.stringify(category)}`);
    }

    if (typeof raw["active"] !== "boolean") fail("active_boolean", `${label}: active must be boolean`);
    else if (raw["active"]) activeCount += 1;

    if (typeof raw["source"] !== "string" || !SOURCES.includes(raw["source"])) {
      fail("question_shape", `${label}: source must be one of ${SOURCES.join(", ")}`);
    }
    if (typeof raw["presentationSafe"] !== "boolean") {
      fail("question_shape", `${label}: presentationSafe must be boolean`);
    }
    if (raw["hu"] !== null && typeof raw["hu"] !== "string") {
      fail("question_shape", `${label}: hu must be a string or null`);
    }
    checkHtml(`${label}: hu`, raw["hu"]);

    const ro = raw["ro"];
    const en = raw["en"];
    /** @type {{ lang: string; value: unknown; seen: Map<string, string> }[]} */
    const wordings = [
      { lang: "ro", value: ro, seen: seenRo },
      { lang: "en", value: en, seen: seenEn },
    ];
    for (const { lang, value, seen } of wordings) {
      if (typeof value !== "string" || value.trim() === "") {
        fail("wording_present", `${label}: ${lang} must be a non-empty string`);
        continue;
      }
      checkHtml(`${label}: ${lang}`, value);
      if (value.length > MAX_WORDING_LENGTH) {
        warn("wording_length", `${label}: ${lang} is ${value.length} characters (> ${MAX_WORDING_LENGTH})`);
      }
      const key = normaliseWording(value);
      const other = seen.get(key);
      if (other !== undefined) fail("wording_unique", `${label}: ${lang} duplicates wording of ${other}`);
      else seen.set(key, label);
    }
    if (typeof ro === "string" && typeof en === "string" && ro.trim() !== "" && ro === en) {
      fail("wording_differs", `${label}: ro and en are identical`);
    }
  });

  if (activeCount === 0) fail("active_nonzero", "release has zero active questions");

  const ok = errors.length === 0;
  return {
    ok,
    errors,
    warnings,
    deck: ok ? canonicalDeck(/** @type {Deck} */ (/** @type {unknown} */ (input))) : null,
  };
}

/**
 * Human-readable per-rule report (used by the CLI).
 * @param {ValidationResult} result
 * @returns {string}
 */
export function formatReport(result) {
  const lines = [];
  for (const rule of RULES) {
    const errs = result.errors.filter((f) => f.rule === rule);
    const warns = result.warnings.filter((f) => f.rule === rule);
    const status = errs.length > 0 ? "FAIL" : warns.length > 0 ? "WARN" : "ok  ";
    lines.push(`${status}  ${rule}`);
    for (const f of [...errs, ...warns]) lines.push(`        - ${f.message}`);
  }
  lines.push(
    result.ok
      ? `PASS  ${result.warnings.length} warning(s)`
      : `REJECTED  ${result.errors.length} error(s), ${result.warnings.length} warning(s)`,
  );
  return lines.join("\n");
}
