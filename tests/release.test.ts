import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CATEGORY_IDS as RULE_CATEGORIES, validateDeck } from "../src/content/validate.js";
import { ui } from "../src/i18n.ts";
import { applyRelease, initialDeckState, next, remaining, restart } from "../src/state/deck.ts";
import { parsePersisted } from "../src/state/storage.ts";
import { CATEGORIES, CATEGORY_IDS, type Deck, type Question } from "../src/types.ts";

/**
 * Content release 2026.10.0 (releaseSeq 4): the expanded 479-question,
 * eight-category deck imported from editorial collection v1.1.
 */

const root = resolve(__dirname, "..");
const data = join(root, "public", "data");
const read = (file: string) => readFileSync(join(data, file), "utf8");
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const SOURCE = join(root, "outputs/01a0fb5d-c648-7313-908b-50a3c76fb269/v1.1/support/consolidated.json");

const manifest = JSON.parse(read("manifest.json")) as Record<string, unknown>;
const releaseText = read("questions-2026.10.0.json");
const release = JSON.parse(releaseText) as Deck;
const previous = JSON.parse(read("questions-2026.09.2.json")) as Deck;
const qs = release.questions;
const patchText = read("questions-2026.10.1.json");
const patch = JSON.parse(patchText) as Deck;
const patch2Text = read("questions-2026.10.2.json");
const patch2 = JSON.parse(patch2Text) as Deck;

const EXPECTED_BY_CATEGORY: Record<string, number> = {
  me_life_dreams: 73,
  values: 74,
  personal_growth: 84,
  relationships: 85,
  professional: 85,
  curiosity_play: 30,
  thinking_decisions: 33,
  balance_presence: 15,
};

describe("taxonomy", () => {
  it("has the eight approved categories, in order, shared by types and validator", () => {
    expect([...CATEGORY_IDS]).toEqual(Object.keys(EXPECTED_BY_CATEGORY));
    expect([...RULE_CATEGORIES]).toEqual([...CATEGORY_IDS]);
  });
  it("labels every category in both languages, distinctly", () => {
    expect(CATEGORIES.find((c) => c.id === "curiosity_play")).toMatchObject({ ro: "Curiozitate și joacă", en: "Curiosity & Play" });
    expect(CATEGORIES.find((c) => c.id === "thinking_decisions")).toMatchObject({ ro: "Gândire și decizii", en: "Thinking & Decisions" });
    expect(CATEGORIES.find((c) => c.id === "balance_presence")).toMatchObject({ ro: "Echilibru și prezență", en: "Balance & Presence" });
    for (const lang of ["ro", "en"] as const) {
      const labels = CATEGORIES.map((c) => c[lang]);
      expect(new Set(labels).size).toBe(8);
      for (const label of labels) {
        expect(label.trim()).not.toBe("");
        expect(Object.values(ui[lang])).not.toContain(label); // never collides with All / Favourites
      }
    }
  });
});

describe("release 2026.10.0", () => {
  it("passes validation with 479 uniquely identified active questions", () => {
    const result = validateDeck(release);
    expect(result.errors).toEqual([]);
    expect(qs).toHaveLength(479);
    expect(new Set(qs.map((q) => q.id)).size).toBe(479);
    expect(qs.every((q) => q.active && q.source === "2026" && q.hu === null)).toBe(true);
    expect(release).toMatchObject({ schemaVersion: 1, contentVersion: "2026.10.0", releaseSeq: 4 });
  });

  it("reconciles category totals", () => {
    const counts: Record<string, number> = {};
    for (const q of qs) counts[q.category] = (counts[q.category] ?? 0) + 1;
    expect(counts).toEqual(EXPECTED_BY_CATEGORY);
  });

  it("keeps the published 107 byte-for-byte (id, text, category and every flag)", () => {
    expect(previous.questions).toHaveLength(107);
    expect(qs.slice(0, 107)).toEqual(previous.questions);
  });

  it("gives every question usable Romanian and English (no blank card in either language)", () => {
    for (const q of qs) {
      for (const lang of ["ro", "en"] as const) {
        expect(q[lang].trim().length, `${q.id} ${lang}`).toBeGreaterThan(8);
        expect(q[lang], `${q.id} ${lang}`).toBe(q[lang].trim());
      }
      expect(/[şţŞŢ]/.test(q.ro), q.id).toBe(false); // comma-below diacritics only
      expect(/[ăâîșțĂÂÎȘȚ]/.test(q.en), `${q.id} en still Romanian`).toBe(false);
    }
  });

  it("marks only the reviewed family/money prompts as not presentation-safe", () => {
    const unsafe = qs.filter((q) => !q.presentationSafe).map((q) => q.id).sort();
    const decisions = JSON.parse(readFileSync(join(root, "content/release-2026.10.0/presentation-safety.json"), "utf8")) as {
      notPresentationSafe: Record<string, string>;
    };
    expect(unsafe).toEqual(Object.keys(decisions.notPresentationSafe).sort());
    expect(unsafe).toHaveLength(10);
  });

  it.skipIf(!existsSync(SOURCE))("matches the editorial consolidation's retained questions", () => {
    const source = JSON.parse(readFileSync(SOURCE, "utf8")) as { questions: { id: string; ro: string; en: string; category: string }[] };
    expect(source.questions).toHaveLength(479);
    const byId = new Map(qs.map((q) => [q.id, q]));
    for (const s of source.questions) {
      const q = byId.get(s.id);
      expect(q, s.id).toBeDefined();
      expect(q?.ro).toBe(s.ro.trim());
      expect(q?.category).toBe(s.category);
      if (s.en.trim() !== "" && s.id !== "SRC-118") expect(q?.en).toBe(s.en.trim()); // SRC-118: documented correction
    }
  });

  it.skipIf(!existsSync(SOURCE))("is reproducible from the editorial source by the import script", () => {
    const out = execFileSync(process.execPath, [join(root, "scripts/import-collection.mjs"), "--check"], { cwd: root, encoding: "utf8" });
    expect(out).toContain("reproduces");
  });
});

describe("release 2026.10.1 (English typo fixes)", () => {
  const corrections = JSON.parse(readFileSync(join(root, "content/release-2026.10.1/corrections.json"), "utf8")) as {
    corrections: Record<string, { from: string; to: string }>;
  };

  it("passes validation as releaseSeq 5", () => {
    expect(validateDeck(patch).errors).toEqual([]);
    expect(patch).toMatchObject({ schemaVersion: 1, contentVersion: "2026.10.1", releaseSeq: 5 });
  });

  it("differs from 2026.10.0 only in the corrected English texts", () => {
    expect(patch.questions).toHaveLength(qs.length);
    patch.questions.forEach((q, i) => {
      const c = corrections.corrections[q.id];
      const base = qs[i]!;
      expect(q, q.id).toEqual(c ? { ...base, en: c.to } : base);
      if (c) expect(base.en).toBe(c.from);
    });
    expect(Object.keys(corrections.corrections).sort()).toEqual(["ml-007", "ml-013", "ml-023"]);
  });

  it("is reproducible from 2026.10.0 by the patch script", () => {
    const out = execFileSync(process.execPath, [join(root, "scripts/patch-release.mjs"), "2026.10.1", "--check"], { cwd: root, encoding: "utf8" });
    expect(out).toContain("reproduces");
  });
});

describe("release 2026.10.2 (ChatGPT-reviewed English corrections)", () => {
  const corrections = JSON.parse(readFileSync(join(root, "content/release-2026.10.2/corrections.json"), "utf8")) as {
    corrections: Record<string, { from: string; to: string }>;
  };
  const drafted = JSON.parse(readFileSync(join(root, "content/release-2026.10.0/en-translations.json"), "utf8")) as {
    translations: Record<string, string>;
    corrections: Record<string, unknown>;
  };

  it("passes validation as releaseSeq 6", () => {
    expect(validateDeck(patch2).errors).toEqual([]);
    expect(patch2).toMatchObject({ schemaVersion: 1, contentVersion: "2026.10.2", releaseSeq: 6 });
  });

  it("differs from 2026.10.1 only in the 35 corrected English texts, all on new questions", () => {
    expect(Object.keys(corrections.corrections)).toHaveLength(35);
    expect(patch2.questions).toHaveLength(patch.questions.length);
    patch2.questions.forEach((q, i) => {
      const c = corrections.corrections[q.id];
      const base = patch.questions[i]!;
      expect(q, q.id).toEqual(c ? { ...base, en: c.to } : base);
      if (c) expect(base.en).toBe(c.from);
    });
    // Only Claude-drafted (or source-corrected) English is touched; the published 107 stay as they were.
    for (const id of Object.keys(corrections.corrections)) {
      expect(id in drafted.translations || id in drafted.corrections || !previous.questions.some((q) => q.id === id), id).toBe(true);
    }
  });

  it("is reproducible from 2026.10.1 by the patch script", () => {
    const out = execFileSync(process.execPath, [join(root, "scripts/patch-release.mjs"), "2026.10.2", "--check"], { cwd: root, encoding: "utf8" });
    expect(out).toContain("reproduces");
  });
});

describe("manifest and published files", () => {
  it("points at the latest release with its version, seq and SHA-256", () => {
    expect(manifest).toEqual({
      releaseSeq: 6,
      contentVersion: "2026.10.2",
      schemaVersion: 1,
      questionsUrl: "./questions-2026.10.2.json",
      sha256: sha(patch2Text),
    });
  });
  it("ships the same deck as the bundled fallback", () => {
    expect(read("questions.json")).toBe(patch2Text);
  });
  it("keeps historical releases intact for rollback", () => {
    expect(sha(read("questions-2026.09.2.json"))).toBe("bc0a991b76707e7abd5a4556ab62ae91944fb9346dacc4f559451ad431781852");
    expect(sha(releaseText)).toBe("3fcd072a9186ea75ecda163fa093e33513e0735e22cbe223701954a92ab37a9a");
    expect(previous.releaseSeq).toBeLessThan(release.releaseSeq);
    expect(release.releaseSeq).toBeLessThan(patch.releaseSeq);
    expect(sha(patchText)).toBe("d7b6e60d42e93a297b7c0f9129f9bd12ee729a0aecaa8cfa75e5471206f140ec");
    expect(patch.releaseSeq).toBeLessThan(patch2.releaseSeq);
  });
  it("exposes no editorial provenance in any public file", () => {
    const publicFiles = readdirSync(data).map((f) => read(f));
    for (const text of publicFiles) {
      expect(text).not.toMatch(/https?:\/\//);
      expect(text).not.toMatch(/drive\.google|docs\.google|source_title|source_url|locator|inventory|notes|origin/);
    }
  });
});

describe("app behaviour with the expanded deck", () => {
  const rng = (() => {
    let s = 7;
    return () => ((s = (s * 16807) % 2147483647) / 2147483647);
  })();

  it("draws from each new category only within that category, without repeats until exhausted", () => {
    for (const category of ["curiosity_play", "thinking_decisions", "balance_presence"] as const) {
      let state = initialDeckState([], null);
      const shown = new Set<string>();
      for (;;) {
        const r = next(qs, category, state, rng);
        state = r.state;
        if (r.kind !== "shown") {
          expect(r.kind).toBe("exhausted");
          break;
        }
        expect(qs.find((q) => q.id === r.id)?.category).toBe(category);
        expect(shown.has(r.id)).toBe(false);
        shown.add(r.id);
      }
      expect(shown.size).toBe(EXPECTED_BY_CATEGORY[category]);
      // Restart from exhaustion draws again from the same category.
      const again = restart(qs, category, state, rng);
      expect(again.kind).toBe("shown");
    }
  });

  it("walks the whole 479-question deck in All without a repeat", () => {
    let state = initialDeckState([], null);
    const shown = new Set<string>();
    for (let i = 0; i < 479; i++) {
      const r = next(qs, "all", state, rng);
      expect(r.kind).toBe("shown");
      if (r.kind !== "shown") break;
      expect(shown.has(r.id)).toBe(false);
      shown.add(r.id);
      state = r.state;
    }
    expect(next(qs, "all", state, rng).kind).toBe("exhausted");
  });

  it("upgrades a user who had exhausted the 107-question deck: history and favourites kept, new questions available", () => {
    const oldIds = previous.questions.map((q) => q.id);
    const persisted = parsePersisted(
      JSON.stringify({ lang: "en", scope: "values", seenIds: oldIds, favorites: ["ml-001", "pr-010"], lastQuestionId: "va-007", installHintDismissed: true }),
      "ro",
    );
    expect(persisted.scope).toBe("values");
    const applied = applyRelease(qs, initialDeckState(persisted.seenIds, persisted.lastQuestionId), persisted.favorites);
    expect(applied.state.seenIds).toEqual(oldIds);
    expect(applied.favorites).toEqual(["ml-001", "pr-010"]);
    expect(applied.lastQuestionLost).toBe(false);
    expect(remaining(qs, "all", applied.state.seenIds)).toHaveLength(479 - 107);
    expect(remaining(qs, "values", applied.state.seenIds)).toHaveLength(74 - 32);
  });

  it("accepts a persisted new-category scope and drops an unknown one", () => {
    for (const scope of ["curiosity_play", "thinking_decisions", "balance_presence"]) {
      expect(parsePersisted(JSON.stringify({ scope }), "ro").scope).toBe(scope);
    }
    expect(parsePersisted(JSON.stringify({ scope: "classic" }), "ro").scope).toBe("all");
  });

  it("degrades to an empty state (not a crash) for a new category after a rollback to 2026.09.2", () => {
    expect(next(previous.questions as Question[], "balance_presence", initialDeckState([], null), rng).kind).toBe("empty");
  });
});
