# Independent review by ChatGPT — code, graphics, translation

Internal Confidential · v1.0 · 2026-10-02 · initiated-by: claude-code · reviewer: ChatGPT (gpt-6-astra, high reasoning, via the local Codex CLI)

**Why:** Marius asked to "use ChatGPT as a reviewer for code, graphics and translation" (2026-10-02). The reviewer had no repository or web access, so every prompt carried its material inline. All material was public (L1): the repo and site are public, and no private provenance was sent. Jobs: code `cx_20261002114554_efd1cf94`, graphics `cx_20261002114636_2eeb642a`, translation `cx_20261002114826_29434cbd` (batch A) and `cx_20261002115007_29a830b3` (batch B).

Claude assessed every finding before acting. Where a claim could be measured, it was measured, and three of the reviewer's claims were rejected on evidence.

## Code

| Finding | Disposition | Evidence / change |
|---|---|---|
| Importer does not check source membership (could emit 480) | **Adopted** | `import-collection.mjs`: unique source ids, every published id present, output length = 479. 2026.10.0 still reproduces byte-for-byte |
| Presentation-safety override on a published id silently ignored | **Adopted** | The importer rejects any override on the verbatim-copied 107 |
| Leak scan covered only `public/data`, not the build | **Adopted** | New `scripts/check-dist.mjs`, chained into `npm run build` (so also CI). Fails on Google Doc/Drive links, private file names, or `.xlsx/.md/.py` in `dist/` |
| Logo may overflow/distort (`width="553"` attr) | **Rejected — measured** | `.card__logo` sets `width: auto`. Rendered 65×22 px at both 360 and 390 px (ratio 2.95 = 553:187) |
| Rollback deletes favourites of removed questions | **Kept as designed** | That is BUILD_PROMPT §8 behaviour (drop inactive ids on activation), not introduced by this work |
| Missing test: old 5-category bundle → reject → SW activation → retry | **Noted, not added** | Needs a two-bundle service-worker harness. Rejection of an unknown category is already tested |

## Graphics

| Finding | Disposition | Evidence / change |
|---|---|---|
| Me: Life & Dreams fails 7:1 behind text | **Adopted, different cause** | The reviewer blamed the glow. Measured with the motif off: 10.9–12.4:1, so the arcs are the cause. Fix: the two outermost arcs dropped, stroke .16 → .14, inner dot moved to the corner. Now ≥ 7:1 everywhere |
| Pill label illegible over green (estimated 2.9–3.4:1); use 80 % dark backing | **Rejected — measured** | Label area (border and dot excluded), worst pixel vs white, 360 px light/dark: ≥ 5.86:1 in all 8 categories (Relationships/Professional lowest), above WCAG AA 4.5:1. No change |
| Thinking: chosen route too faint; dangling branch | **Partly adopted** | End node added on the open branch, nodes enlarged. Stronger strokes were tried, measured 5.7:1 at 360 px and reverted. Tree reduced (scale .5) and lowered to stay clear of long questions |
| Move Thinking to top-right, rotated | **Not adopted** | Three motifs already sit top-right. Shrinking and lowering kept it bottom-left with ≥ 7:1 |
| Balance waves end abruptly | **Adopted** | Horizontal fade on the last 20 % of each wave |
| Reduce pill tracking .14 → .08 em | **Not needed** | The longest label ("ECHILIBRU ȘI PREZENȚĂ") fits beside the star at 360 px |
| Grain .14 → .06; SVG stars instead of ☆/★ glyphs | **Deferred** | Changes the approved v0.1.2 look across all cards; a CEO call |
| Family coherence; category labels | Positive | Reviewer: a coherent decorative family; "Curiosity & Play", "Thinking & Decisions", "Balance & Presence" are natural |

**Final measurement** (headless Chrome, question text hidden, brightest pixel in the text box vs white; 360×740, 390×780, 1280×800; light and dark; 8 categories): worst **7.44:1** (Values, an existing, unchanged motif). New categories ≥ 7.9:1. Me: Life & Dreams now passes.

## Translation (368 English texts drafted by Claude)

Flagged 36 (24 of 184 in batch A, 12 of 184 in batch B). **35 adopted**, some reworded (e.g. SRC-122, FE-055, OTHER-059). **1 rejected:** FE-037, where "Unde ai progresat mai mult" reads as "the most" in context. Systematic issues named by the reviewer: malformed coordination ("What X did you do and were…"), literal renderings, and occasional meaning shifts (added necessity, lost "together"). Published as content release 2026.10.2. The full from/to/reason list is in `content/release-2026.10.2/corrections.json`.
