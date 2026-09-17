#!/usr/bin/env node
// @ts-check
// CLI content validator — same rules as the client (src/content/validate.js).
// Usage: node scripts/validate-content.mjs <release.json>
// Exit codes: 0 pass (warnings allowed) · 1 rejected or unreadable · 2 usage.
import { readFile } from "node:fs/promises";
import { formatReport, validateDeck } from "../src/content/validate.js";

const file = process.argv[2];
if (!file) {
  process.stderr.write("usage: node scripts/validate-content.mjs <release.json>\n");
  process.exit(2);
}

/** @type {unknown} */
let parsed;
try {
  parsed = JSON.parse(await readFile(file, "utf8"));
} catch (error) {
  process.stderr.write(`REJECTED  cannot read or parse ${file}: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}

const result = validateDeck(parsed);
process.stdout.write(`${file}\n${formatReport(result)}\n`);
process.exit(result.ok ? 0 : 1);
