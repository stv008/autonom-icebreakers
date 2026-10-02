# Content release 2026.10.3 — typo fixes on the original deck, mirrored in the sheet

Internal Confidential · 2026-10-02 · initiated-by: claude-code · releaseSeq 7 · replaces `2026.10.2` (seq 6)

**Authorisation:** Marius, 2026-10-02: fix the 11 additional English errors "in both" the Google Sheet and the app, then push.

## What changed

`public/data/questions-2026.10.3.json` is 2026.10.2 with **11 English texts** fixed, all among the original 107. The fixes are minimal: spelling and grammar only, same meaning. The full list is in `content/release-2026.10.3/corrections.json`.

| id | Fix |
|---|---|
| ml-015 | guily → guilty |
| ml-016 | What make … though times → What makes … tough times |
| ml-035 | monent → moment |
| pg-013 | "proud." → "proud?" |
| re-003 | firends → friends |
| va-001 | When have you last justified → When did you last justify |
| va-006 | reasonf … wold → reason … would |
| va-008 | challanges → challenges |
| va-019 | would you chose → would you choose |
| va-025 | rolemodel → role model |
| va-027 | emplathy → empathy |

## Editorial sheet: now in sync

The Google Sheet „Joc intrebari”, tab „Versiune actuala”, column C (ENGLEZĂ), was updated through the Google Sheets connector on 2026-10-02, after Marius approved each before/after. The cells changed were:

- **C14, C20, C30:** the three 2026.10.1 typos (ml-007, ml-013, ml-023). This closes the open item in `RELEASE_2026.10.1.md`.
- **C22, C23, C42, C56, C66, C75, C80, C82, C93, C99, C101:** the 11 fixes above.

All 14 cells were re-read after writing and verified. Only that tab was read; the other tabs were not opened. In va-001 the sheet keeps its line break between the quotation and the question. The app keeps its existing space there, as exported since 2026.09.2.

Not mirrored, by design: the 35 English texts of 2026.10.2 belong to questions the sheet does not contain.

## Published

The manifest points at seq 7, sha256 `c6753f2e6f55d0f84f5b3d296b01feb263e6f4a18f3706a4b4a83396569ede45`. `questions.json` is a byte copy of the release. Built with `node scripts/patch-release.mjs 2026.10.3` (`--check` reproduces 2026.10.1–2026.10.3). Gates: validate PASS (1 inherited warning, `va-002`), 95/95 tests, build + check-dist ok.

## Rollback

Publish a manifest with `releaseSeq: 8` pointing at `./questions-2026.10.2.json` (sha256 `b72a79a4…c48b`).
