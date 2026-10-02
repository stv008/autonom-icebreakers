#!/usr/bin/env node
// @ts-check
// Post-build guard: the public build must never contain editorial provenance
// (the repository and site are public). Scans every file under dist/.
// Added after the ChatGPT code review (2026-10-02): the unit test only scanned public/data.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = join(root, "dist");
const FORBIDDEN = [/docs\.google\.com/, /drive\.google\.com/, /resourcekey=/, /spreadsheets\/d\//, /source_url/, /source_title/, /consolidated\.json/, /SOURCES\.private/];
const BAD_NAMES = /\.(xlsx|md|py)$|^outputs\//;

/** @param {string} dir @returns {string[]} */
const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));
const problems = [];
for (const file of walk(dist)) {
  const rel = relative(dist, file);
  if (BAD_NAMES.test(rel)) problems.push(`${rel}: file type must not ship`);
  const text = readFileSync(file, "latin1");
  for (const re of FORBIDDEN) if (re.test(text)) problems.push(`${rel}: matches ${re}`);
}
if (problems.length) {
  process.stderr.write(`check-dist FAILED\n${problems.join("\n")}\n`);
  process.exit(1);
}
process.stdout.write("check-dist ok  no editorial provenance in dist/\n");
