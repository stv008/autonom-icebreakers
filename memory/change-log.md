# Project change log

Internal Confidential · v1.3 · initiated-by: codex; v1.3 entry claude-code

## 2026-10-02 — App content release 2026.10.0 [NOU]

- Invocation: explicit user authorisation (2026-10-02) to implement the completed 479-question collection and the three proposed categories in the app, verify, document and commit locally. No push, merge or deploy.
- Paths: `src/types.ts`, `src/content/validate.js` (taxonomy 5 → 8); `scripts/import-collection.mjs` (new); `content/release-2026.10.0/` (EN translations, presentation-safety decisions); `public/data/questions-2026.10.0.json` (new, immutable), `questions.json` (fallback = release), `manifest.json` (seq 4); `tests/release.test.ts` (new), `tests/loadContent.test.ts`, `tests/content.test.ts`; `content/RELEASE_2026.10.0.md` (new), `README.md` documentation v1.5, `content/SOURCES.md` v1.3, `DECISIONS.md` 51–57, `src/styles.css` (motifs), `src/i18n.ts` (RO title), this log v1.3; local session handoff `session-logs/2026-10-02_app-release-2026.10.0_claude-code_v1.0.md` (ignored by Git).
- Result: 479 questions / 8 categories (73 · 74 · 84 · 85 · 85 · 30 · 33 · 15); original 107 byte-identical; 368 EN drafted by Claude + 1 documented correction (SRC-118); 10 new questions `presentationSafe: false` (field still unused by v1).
- Verification: `npm run validate` PASS (1 inherited warning); `npm test` 86/86; `npm run build` exit 0; `dist/` provenance scan clean; local browser smoke test desktop + mobile incl. upgrade from a seeded 2026.09.2 device. Real phone and live site not tested.
- Public-repo redaction (Marius's decision, 2026-10-02): the four unpushed local commits (a53e4b9, 4735738, c76297b, 6d7dcc8) were rewritten into a public-safe history. `outputs/` and `content/SOURCES.private.md` (Sheet/Drive links, email ids) are git-ignored and stay local; the original history is kept on local-only branch `backup/local-main-pre-redaction-2026-10-02` (never push it). Then merged `origin/main` (v0.1.2/v0.1.3) and added motifs for the three new categories (v0.1.4). No OS-layer files changed; F4 not triggered.

## 2026-10-02 — Education consolidation v1.1 [NOU]

- Invocation: explicit user extension relayed by the coordinating chat: consolidate final TRAINING, Resurse and CASES HBS ARTICLES lots into v1.1, preserve v1.0, update documentation, and report reading versus inventory; no new agents, external writes or publication.
- Paths: `outputs/01a0fb5d-c648-7313-908b-50a3c76fb269/v1.1/` (new workbook and reusable support), `README.md` documentation v1.3, `content/SOURCES.md` v1.2, this log v1.2, local session handoff. The existing v1.0 `support/other-REPORT.md` received only the requested trailing-blank-line cleanup; v1.0 XLSX is byte-identical.
- Result: 479 questions = 347 preserved + 132 Education additions (TRAINING 45, Resurse 45, Cases 42); 21 semantic variants excluded from 153 final candidates. Cumulative inventory: 1,704 distinct entries, including 1,201 Education files; 389 Education files with actual reading, largely selective, separately from triage and duplicates.
- Verification: all three final markers/reports/inventories read and hashed; original 347 rows retain all 11 values, fonts, alignments and heights; previous 179 exclusion records preserved; unique normalized text/IDs; source-ID traceability; five filter tables; original panes/controls preserved; saved formula counts reconciled independently; five sheets visually inspected; v1.0 and application SHA-256 unchanged. Native Excel UI not tested.
- Recovery: wildcard-based counting returned zero in the artifact engine and was replaced by independently reconciled snapshot counts; totals of reading categories remain formulas. Style comparisons use actual copied style objects rather than proxy equality. Final verification passes. Cases report has a historical ID/text mismatch; the final candidate text was checked and EDU-CASE-024 excluded against SRC-112.
- Diff: local commit titled `docs: add Education workbook v1.1 (initiated-by: codex)`, based on `4735738`. No OS-layer files changed; F4 not triggered. No push, app/source-sheet modification or deployment.

## 2026-10-02 — YPO question expansion snapshot [NOU]

- Invocation: explicit user authorization relayed by the coordinating chat to consolidate three completed reader lots into a local workbook, preserve the 107-question baseline, document source discovery and prepare a later Education extension.
- Paths: `outputs/01a0fb5d-c648-7313-908b-50a3c76fb269/` (workbook and reusable support), `README.md` documentation v1.2, `content/SOURCES.md` v1.1, this log v1.1; separate local session handoff.
- Result: 347 questions = 107 preserved + 14 adapted from the native-sheet source + 226 newly inspired by YPO. Inventory: 502 YPO files plus native-sheet tab. Exclusions: 178 duplicate/semantic variants plus one thematic exclusion; 419 candidates reconciled to 240 retained additions + 179 exclusions.
- Validation: all three final completion markers read; normalized uniqueness; existing ID/RO/EN/category retained exactly; every question links to an inventoried source; workbook reopened and checked independently; category formula recalculation changed and restored; four sheets rendered; no formula errors; application baseline SHA-256 unchanged.
- Diff: local commit titled `docs: add YPO workbook and continuation source (initiated-by: codex)`, based on `a53e4b9`; `git show` exposes the complete saved diff. No OS-layer files changed, so F4 is not triggered.
- Limits: selective text reading in parts of YPO, 24 files with incomplete usable access, 371 omitted by triage, nine other source tabs unread. Education is pending. Native Excel UI was not tested. No source Google Sheet/app/deployment change and no push.

## 2026-10-02 — Question-source documentation [NOU]

- Invocation: explicit user request relayed by the coordinating conversation to update this project and its support files for immediate source discovery in a new chat.
- Paths: `README.md` (documentation v1.1), `content/SOURCES.md` (v1.0), this log; local handoff `session-logs/2026-10-02_question-source_codex_v1.0.md` (ignored by Git).
- Evidence: local release note and JSON/manifest checks; native-sheet URL and email identifiers (now in local `content/SOURCES.private.md`) supplied as verified evidence by the coordinating conversation, explicitly distinguished from reads performed here.
- Diff: local Git commit titled `docs: record confirmed question source (initiated-by: codex)`; inspect with `git show` at that commit. Baseline `11fab520966277a02aff6106ffaa0a03add6293f`.
- Scope: documentation only; no question, application, spreadsheet or deployment changes. No OS-layer contract/policy files changed; F4 OS-layer audit gate is not triggered.
