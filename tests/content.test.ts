import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import sample from "../public/data/questions.json";
import { CATEGORY_IDS as RULE_CATEGORIES, formatReport, normaliseWording, RULES, validateDeck } from "../src/content/validate.js";
import { CATEGORY_IDS } from "../src/types.ts";

type Json = Record<string, unknown>;
const clone = (): Json => JSON.parse(JSON.stringify(sample)) as Json;
const questionsOf = (deck: Json): Json[] => deck["questions"] as Json[];

function rulesFailed(input: unknown): string[] {
  return [...new Set(validateDeck(input).errors.map((e) => e.rule))];
}

describe("validate.js ↔ types.ts", () => {
  it("shares the category enum", () => {
    expect([...RULE_CATEGORIES]).toEqual([...CATEGORY_IDS]);
  });
});

describe("sample content (§6, §16.12)", () => {
  it("passes validation", () => {
    const result = validateDeck(sample);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.deck).not.toBeNull();
  });
  it("has ≥36 questions, ≥6 per category, five categories, -sample version, no emoji, RO diacritics", () => {
    const qs = questionsOf(clone());
    expect(qs.length).toBeGreaterThanOrEqual(36);
    for (const c of CATEGORY_IDS) {
      expect(qs.filter((q) => q["category"] === c && q["active"] === true).length).toBeGreaterThanOrEqual(6);
    }
    expect(new Set(qs.map((q) => q["category"])).size).toBe(5);
    expect(String((sample as Json)["contentVersion"])).toMatch(/-sample$/);
    const emoji = /\p{Extended_Pictographic}/u;
    for (const q of qs) {
      expect(emoji.test(String(q["ro"]))).toBe(false);
      expect(emoji.test(String(q["en"]))).toBe(false);
      // Comma-below forms (ș ț), never cedilla (ş ţ).
      expect(/[şţŞŢ]/.test(String(q["ro"]))).toBe(false);
    }
    const withDiacritics = qs.filter((q) => /[ăâîșțĂÂÎȘȚ]/.test(String(q["ro"]))).length;
    expect(withDiacritics).toBeGreaterThan(qs.length / 2);
  });
});

describe("rejection rules (§12)", () => {
  it("unknown top-level field", () => {
    const d = clone();
    d["extra"] = 1;
    expect(rulesFailed(d)).toContain("top_level_fields");
  });
  it("wrong schemaVersion", () => {
    const d = clone();
    d["schemaVersion"] = 2;
    expect(rulesFailed(d)).toEqual(["schema_version"]);
  });
  it("non-integer releaseSeq", () => {
    const d = clone();
    d["releaseSeq"] = 1.5;
    expect(rulesFailed(d)).toEqual(["release_seq"]);
  });
  it("duplicate id", () => {
    const d = clone();
    (questionsOf(d)[1] as Json)["id"] = (questionsOf(d)[0] as Json)["id"];
    expect(rulesFailed(d)).toEqual(["id_unique"]);
  });
  it("unknown category", () => {
    const d = clone();
    (questionsOf(d)[0] as Json)["category"] = "classic";
    expect(rulesFailed(d)).toEqual(["category_known"]);
  });
  it("active not boolean", () => {
    const d = clone();
    (questionsOf(d)[0] as Json)["active"] = "yes";
    expect(rulesFailed(d)).toEqual(["active_boolean"]);
  });
  it("empty / whitespace wording", () => {
    const d = clone();
    (questionsOf(d)[0] as Json)["ro"] = "   ";
    (questionsOf(d)[1] as Json)["en"] = "";
    expect(rulesFailed(d)).toEqual(["wording_present"]);
  });
  it("ro === en", () => {
    const d = clone();
    (questionsOf(d)[0] as Json)["en"] = (questionsOf(d)[0] as Json)["ro"];
    expect(rulesFailed(d)).toEqual(["wording_differs"]);
  });
  it("HTML tag", () => {
    const d = clone();
    (questionsOf(d)[0] as Json)["en"] = "What is <b>bold</b>?";
    expect(rulesFailed(d)).toEqual(["no_html"]);
  });
  it("duplicate normalised wording within a language", () => {
    const d = clone();
    const a = questionsOf(d)[0] as Json;
    (questionsOf(d)[1] as Json)["ro"] = `  ${String(a["ro"]).toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}!! `;
    expect(rulesFailed(d)).toEqual(["wording_unique"]);
  });
  it("zero active questions", () => {
    const d = clone();
    for (const q of questionsOf(d)) q["active"] = false;
    expect(rulesFailed(d)).toEqual(["active_nonzero"]);
  });
  it("warns (does not reject) on wording > 220 characters", () => {
    const d = clone();
    (questionsOf(d)[0] as Json)["en"] = "x ".repeat(120).trim() + "?";
    const r = validateDeck(d);
    expect(r.ok).toBe(true);
    expect(r.warnings.map((w) => w.rule)).toContain("wording_length");
  });
  it("rejects non-objects and non-array questions without throwing", () => {
    expect(validateDeck(null).ok).toBe(false);
    expect(validateDeck("x").ok).toBe(false);
    expect(validateDeck({ ...clone(), questions: {} }).ok).toBe(false);
  });
  it("normaliseWording is case/diacritic/punctuation-insensitive", () => {
    expect(normaliseWording("Ce  înseamnă, pentru tine?")).toBe(normaliseWording("ce inseamna pentru tine"));
  });
  it("prints one line per rule", () => {
    const report = formatReport(validateDeck(sample));
    for (const rule of RULES) expect(report).toContain(rule);
    expect(report).toMatch(/PASS/);
  });
});

describe("scripts/validate-content.mjs (§16.10)", () => {
  const root = resolve(__dirname, "..");
  const script = join(root, "scripts", "validate-content.mjs");
  const run = (file: string): { code: number; out: string } => {
    try {
      return { code: 0, out: execFileSync(process.execPath, [script, file], { cwd: root, encoding: "utf8" }) };
    } catch (error) {
      const e = error as { status: number; stdout: string; stderr: string };
      return { code: e.status, out: `${e.stdout}${e.stderr}` };
    }
  };

  it("passes on the sample", () => {
    const r = run(join(root, "public", "data", "questions.json"));
    expect(r.code).toBe(0);
    expect(r.out).toContain("PASS");
  });
  it("fails on a deliberately broken copy", () => {
    const dir = mkdtempSync(join(tmpdir(), "icebreakers-"));
    const broken = clone();
    (questionsOf(broken)[2] as Json)["category"] = "classic";
    broken["schemaVersion"] = 9;
    const file = join(dir, "broken.json");
    writeFileSync(file, JSON.stringify(broken));
    const r = run(file);
    expect(r.code).toBe(1);
    expect(r.out).toContain("REJECTED");
    expect(r.out).toContain("FAIL  schema_version");
    expect(r.out).toContain("FAIL  category_known");
  });
  it("fails on unparsable JSON", () => {
    const dir = mkdtempSync(join(tmpdir(), "icebreakers-"));
    const file = join(dir, "bad.json");
    writeFileSync(file, "{ nope");
    expect(run(file).code).toBe(1);
  });
});
