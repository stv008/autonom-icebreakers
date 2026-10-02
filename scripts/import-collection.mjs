#!/usr/bin/env node
// @ts-check
// Builds an app release file from the editorial consolidation (v1.1, 479 questions).
// The consolidation is an editorial format with private provenance (source titles,
// Drive URLs, locators, notes); only the canonical app fields are emitted.
//
// Usage: node scripts/import-collection.mjs [--check]
//   (no flag)  write public/data/questions-<contentVersion>.json (refuses to overwrite a different file)
//   --check    rebuild in memory and exit non-zero if the published file differs
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { formatReport, validateDeck } from "../src/content/validate.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_VERSION = "2026.10.0";
const RELEASE_SEQ = 4;
const PUBLISHED_AT = "2026-10-02T09:00:00Z";
const SOURCE = join(root, "outputs/01a0fb5d-c648-7313-908b-50a3c76fb269/v1.1/support/consolidated.json");
const BASE = join(root, "public/data/questions-2026.09.2.json");
const DECISIONS = join(root, "content/release-2026.10.0");
const OUT = join(root, `public/data/questions-${CONTENT_VERSION}.json`);
const EXPECTED_TOTAL = 479;

/** @param {string} path */
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const source = readJson(SOURCE);
const base = readJson(BASE);
const { translations, corrections } = readJson(join(DECISIONS, "en-translations.json"));
const { notPresentationSafe } = readJson(join(DECISIONS, "presentation-safety.json"));

/** @type {{ id: string; ro: string; en: string; category: string }[]} */
const retained = source.questions; // retained collection only — never exclusions/inventory
if (retained.length !== EXPECTED_TOTAL) throw new Error(`expected ${EXPECTED_TOTAL} retained questions, got ${retained.length}`);

const baseById = new Map(base.questions.map((/** @type {any} */ q) => [q.id, q]));
const used = new Set();

// Membership guards (ChatGPT code review 2026-10-02): unique source ids, every
// published id present in the source, and no presentation-safety override on a
// published question (the published 107 are copied verbatim).
const sourceIds = new Set(retained.map((q) => q.id));
if (sourceIds.size !== retained.length) throw new Error("duplicate ids in the editorial source");
for (const id of baseById.keys()) if (!sourceIds.has(id)) throw new Error(`${id}: published question missing from the editorial source`);
for (const id of Object.keys(notPresentationSafe)) if (baseById.has(id)) throw new Error(`${id}: presentation-safety override on a published question (copied verbatim)`);

// 1. The published 107, verbatim and in their published order.
/** @type {import("../src/types.ts").Question[]} */
const questions = base.questions.map((/** @type {any} */ q) => ({ ...q }));
for (const q of retained) {
  const b = baseById.get(q.id);
  if (!b) continue;
  if (b.ro !== q.ro || b.en !== q.en || b.category !== q.category) throw new Error(`${q.id}: editorial source differs from the published deck`);
}

// 2. Every other retained question, in consolidation order.
for (const q of retained) {
  if (baseById.has(q.id)) continue;
  let en = q.en.trim();
  if (corrections[q.id]) {
    if (en !== corrections[q.id].from) throw new Error(`${q.id}: correction no longer matches source English`);
    en = corrections[q.id].to;
    used.add(`c:${q.id}`);
  }
  if (en === "") {
    en = translations[q.id] ?? "";
    if (en === "") throw new Error(`${q.id}: no English in source and no translation`);
    used.add(`t:${q.id}`);
  } else if (translations[q.id]) {
    throw new Error(`${q.id}: source already has English; translation would overwrite it`);
  }
  questions.push({
    id: q.id,
    category: /** @type {import("../src/types.ts").CategoryId} */ (q.category),
    active: true,
    source: "2026",
    presentationSafe: !(q.id in notPresentationSafe),
    ro: q.ro.trim(),
    en,
    hu: null,
  });
}

for (const id of Object.keys(translations)) if (!used.has(`t:${id}`)) throw new Error(`unused translation ${id}`);
for (const id of Object.keys(corrections)) if (!used.has(`c:${id}`)) throw new Error(`unused correction ${id}`);
for (const id of Object.keys(notPresentationSafe)) if (!questions.some((q) => q.id === id)) throw new Error(`unknown presentation-safety id ${id}`);

if (questions.length !== EXPECTED_TOTAL) throw new Error(`expected ${EXPECTED_TOTAL} questions in the release, got ${questions.length}`);

const deck = { schemaVersion: 1, contentVersion: CONTENT_VERSION, releaseSeq: RELEASE_SEQ, publishedAt: PUBLISHED_AT, questions };
const result = validateDeck(deck);
if (!result.ok) {
  process.stderr.write(`${formatReport(result)}\n`);
  process.exit(1);
}
const text = `${JSON.stringify(deck, null, 2)}\n`;

if (process.argv.includes("--check")) {
  const same = existsSync(OUT) && readFileSync(OUT, "utf8") === text;
  process.stdout.write(same ? `ok  ${OUT} reproduces from the editorial source\n` : `DIFF  ${OUT} does not match a rebuild\n`);
  process.exit(same ? 0 : 1);
}
if (existsSync(OUT) && readFileSync(OUT, "utf8") !== text) {
  process.stderr.write(`refusing to overwrite published release ${OUT} (release files are immutable)\n`);
  process.exit(1);
}
writeFileSync(OUT, text);
process.stdout.write(`wrote ${OUT}: ${questions.length} questions\n${formatReport(result)}\n`);
