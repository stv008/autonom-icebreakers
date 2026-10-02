#!/usr/bin/env node
// @ts-check
// Builds content release 2026.10.1 from the published 2026.10.0 by applying
// whole-text English corrections. Ids, order, categories, Romanian and every
// flag are unchanged, so favourites and history stay valid.
//
// Usage: node scripts/patch-release.mjs [--check]
//   (no flag)  write public/data/questions-<contentVersion>.json (refuses to overwrite a different file)
//   --check    rebuild in memory and exit non-zero if the published file differs
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { formatReport, validateDeck } from "../src/content/validate.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_VERSION = "2026.10.1";
const RELEASE_SEQ = 5;
const PUBLISHED_AT = "2026-10-02T10:30:00Z";
const BASE = join(root, "public/data/questions-2026.10.0.json");
const CORRECTIONS = join(root, `content/release-${CONTENT_VERSION}/corrections.json`);
const OUT = join(root, `public/data/questions-${CONTENT_VERSION}.json`);

/** @param {string} path */
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const base = readJson(BASE);
/** @type {Record<string, { from: string; to: string }>} */
const corrections = readJson(CORRECTIONS).corrections;

const used = new Set();
const questions = base.questions.map((/** @type {any} */ q) => {
  const c = corrections[q.id];
  if (!c) return { ...q };
  if (q.en !== c.from) throw new Error(`${q.id}: correction no longer matches the base English`);
  used.add(q.id);
  return { ...q, en: c.to };
});
for (const id of Object.keys(corrections)) if (!used.has(id)) throw new Error(`unknown correction id ${id}`);

const deck = { schemaVersion: 1, contentVersion: CONTENT_VERSION, releaseSeq: RELEASE_SEQ, publishedAt: PUBLISHED_AT, questions };
const result = validateDeck(deck);
if (!result.ok) {
  process.stderr.write(`${formatReport(result)}\n`);
  process.exit(1);
}
const text = `${JSON.stringify(deck, null, 2)}\n`;

if (process.argv.includes("--check")) {
  const same = existsSync(OUT) && readFileSync(OUT, "utf8") === text;
  process.stdout.write(same ? `ok  ${OUT} reproduces from ${BASE}\n` : `DIFF  ${OUT} does not match a rebuild\n`);
  process.exit(same ? 0 : 1);
}
if (existsSync(OUT) && readFileSync(OUT, "utf8") !== text) {
  process.stderr.write(`refusing to overwrite published release ${OUT} (release files are immutable)\n`);
  process.exit(1);
}
writeFileSync(OUT, text);
process.stdout.write(`wrote ${OUT}: ${questions.length} questions, ${used.size} corrected\n${formatReport(result)}\n`);
