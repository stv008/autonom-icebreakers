# Content release 2026.10.0 — expanded collection, eight categories

Internal Confidential · 2026-10-02 · initiated-by: claude-code · releaseSeq 4 · replaces `2026.09.2` (seq 3)

**Status:** see "Deploy" below. Shipped with app v0.1.4: the merge of v0.1.3, card motifs for the three new categories (decision 56) and the Romanian title "Icebreakers" (decision 57).

**Authorisation:** Marius's instruction of 2026-10-02 to implement the completed collection in the app, including the three proposed categories. This supersedes the earlier workbook-only scope recorded in `content/SOURCES.md` and `memory/change-log.md` (those entries stay as history).

**Source:** the retained `questions` array of the editorial consolidation `outputs/01a0fb5d-c648-7313-908b-50a3c76fb269/v1.1/support/consolidated.json` (479 questions; matches workbook `…/v1.1/Autonom_Icebreakers_extins_codex_2026-10-02_v1.1.xlsx`). Exclusions and the inventory were not used. No Drive research was repeated; the Google Sheet and the v1.0/v1.1 workbooks were not modified.

## What shipped

`public/data/questions-2026.10.0.json` — **479 questions**, all `active: true`, `source: "2026"`, `hu: null`.

| Category | id | RO | EN | 2026.09.2 | New | Total |
|---|---|---|---|---:|---:|---:|
| Me: Life & Dreams | `me_life_dreams` | Eu: viață și vise | Me: Life & Dreams | 35 | 38 | 73 |
| Values | `values` | Valori | Values | 32 | 42 | 74 |
| Personal Growth | `personal_growth` | Creștere personală | Personal Growth | 19 | 65 | 84 |
| Relationships | `relationships` | Relații | Relationships | 11 | 74 | 85 |
| Professional | `professional` | Profesional | Professional | 10 | 75 | 85 |
| Curiosity & Play **[new]** | `curiosity_play` | Curiozitate și joacă | Curiosity & Play | 0 | 30 | 30 |
| Thinking & Decisions **[new]** | `thinking_decisions` | Gândire și decizii | Thinking & Decisions | 0 | 33 | 33 |
| Balance & Presence **[new]** | `balance_presence` | Echilibru și prezență | Balance & Presence | 0 | 15 | 15 |
| **Total** | | | | **107** | **372** | **479** |

Totals reconcile with the source `stats.categories`. The 372 new = 14 adapted from the source sheet (`SRC-*`) + 358 newly written (`FE-*`, `OTHER-*`, `RF-*`, `TR-*`, `RES-*`, `EDU-CASE-*`).

- **The original 107 are byte-identical** to 2026.09.2 (id, ro, en, category, active, source, presentationSafe, hu) and come first, in their published order. No migration: every existing favourite, seen id and last-card id stays valid.
- **New ids are the editorial ids, unchanged** (e.g. `FE-084`, `EDU-CASE-036`). They are valid under the schema and now frozen like the 2026.09.2 ids. They carry only a stage code, no title or link.
- English category labels follow the existing "A & B" style. They were drafted by Claude for review.

## English: 368 translations drafted by Claude (review)

The source had 368 empty English fields. All are filled in `content/release-2026.10.0/en-translations.json` (`translations`), written to keep the Romanian meaning, the second-person conversational tone and any double question ("…? Why?"). British spelling follows the existing deck ("favourite", "recognise"). Guillemets « » in Romanian became “ ” double quotes in English. The 107 existing English texts and the 4 existing English texts of new questions were kept, with one exception:

| id | Source EN | Shipped EN | Reason |
|---|---|---|---|
| SRC-118 | What languages do you wish you could speak? | Which foreign languages would you like to speak? Why? | The source English dropped the second question ("De ce?") and "străine". This is a concrete omission, recorded in `corrections` |

Hungarian is unchanged: `hu` stays `null` and there is no HU UI (README non-goal). RO and EN are both required by the validator, so neither language can show a blank card.

## presentationSafe

In app v1 the field is **reserved and not read** (README; BUILD_PROMPT §5.1), so present mode shows every active question, as before. The flag records editorial judgement for a future present-mode filter:

- The original 107 keep their published `true`. The 2026.09.2 note already flags `ml-002`, `re-009`, `ml-023`, `re-010` and `ml-005` as sensitive. Changing them is an editorial decision outside this release.
- New questions: `false` for **10** that assume or probe family/partner status or personal finances (the BUILD_PROMPT §6 exclusions). They are RF-002, RF-006, RF-022, RF-027, RES-022, RES-008, RES-009, RES-010, RES-011 and EDU-CASE-010. Reasons per id are in `content/release-2026.10.0/presentation-safety.json`. All other new questions are `true`. A keyword scan found no health, death, grief, politics, religion, alcohol or dating prompts among the new questions.

## Compatibility

- **Old app code + new content:** a device still running the v0.1.1 bundle validates with the five-category list. It **rejects** release 4 as a whole (unknown category) and keeps its last good deck silently, then retries on later checks. A deploy also ships a new service worker, because the precached `data/questions.json` and the JS change. Once the user taps "Reload" on the update banner, or relaunches after all tabs close, the new code accepts release 4. No blank card at any step.
- **New code + persisted state:** a stored scope of any of the eight categories is honoured; an unknown scope falls back to "All". After a rollback to 2026.09.2, the three new categories stay in the picker with 0 questions and show the standard empty state.

## How this was produced

`node scripts/import-collection.mjs` reads the consolidation and keeps only `id, category, ro, en`. It adds translations and safety flags from `content/release-2026.10.0/` and validates the result. It writes the immutable file and refuses to overwrite a different one. `--check` proves the published file is reproducible. Then:

- `public/data/questions.json` = byte copy of the release (decision 41: the bundled fallback tracks the latest release)
- `public/data/manifest.json` → `releaseSeq 4`, `contentVersion 2026.10.0`, `questionsUrl ./questions-2026.10.0.json`, `sha256 3fcd072a9186ea75ecda163fa093e33513e0735e22cbe223701954a92ab37a9a`
- Historical files `questions-2026.09.0-sample.json`, `-09.1-sample.json` and `-09.2.json` are unchanged (2026.09.2 sha256 `bc0a991b…1852`)
- `npm run validate`: PASS, 1 warning (`va-002` is 234 characters, carried over from 2026.09.2)

## Deploy

Approved by Marius on 2026-10-02 ("push when it's green"), after these steps:

1. **Public-repo redaction.** The four unpushed local commits were rewritten into one public-safe commit. `outputs/` and `content/SOURCES.private.md` (Sheet/Drive links, email ids) are git-ignored and never left the machine. The original history is on the local-only branch `backup/local-main-pre-redaction-2026-10-02`. **Never push that branch.**
2. **Merged `origin/main`** (v0.1.2 card backgrounds, v0.1.3 card logo). The conflicts were only in README and DECISIONS. Version set to 0.1.4.
3. Card motifs for the three new categories (decision 56) and the Romanian title (decision 57).
4. Gates green, then `git push origin main` → GitHub Actions `deploy-pages` → https://stv008.github.io/autonom-icebreakers/. The live verification result is in the session handoff.

## Rollback

Publish a new `data/manifest.json` with `releaseSeq: 5`, `contentVersion: "2026.09.2"`, `questionsUrl: "./questions-2026.09.2.json"` and `sha256: "bc0a991b76707e7abd5a4556ab62ae91944fb9346dacc4f559451ad431781852"`. Leave the 2026.10.0 file in place. Devices activate it on the next check plus Reload (tested in `tests/loadContent.test.ts`).
