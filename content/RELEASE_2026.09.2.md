# Content release 2026.09.2 — first real deck

Internal Confidential · 2026-09-17 · initiated-by: claude-code · releaseSeq 3 · replaces `2026.09.1-sample`

**Source:** editorial sheet "Joc intrebari", the tab with columns `CATEGORIE | ROMANA | ENGLEZĂ | Reformulari / modificari`, as read on 2026-09-17 (sheet last modified 2026-09-17 07:23). The sheet remains the source of truth; corrections go there and are republished, never edited in the JSON.

**Authorisation:** CEO instruction 2026-09-17 to load the sheet and publish to the test site, ahead of the editorial audit (D5). Items below marked *review* are for that audit.

## What shipped

- **107 questions**, all `active`, `source: "2026"`: Me: Life & Dreams 35 · Values 32 · Personal Growth 19 · Relationships 11 · Professional 10.
- Ids are `<prefix>-<nnn>` in sheet order per category (`ml`, `va`, `pg`, `re`, `pr`). They are now stable: never renumber; retire with `active: false`.

## Not shipped (from the same tab)

- **19 rows under old category names** ("Me, My Life & My Dreams" ×14, "Self development, actualization / Objectives" ×2, "Me, Myself & I", "Decision / Decision Making", "Dreams") — left in the sheet for a later mapping decision. 15 of them also lack English.
- **1 exact duplicate**: "Unde și când te simți cel mai liber să fii tu însuți?" appears under both Me: Life & Dreams and Personal Growth; kept once as `pg-001` (the Me: Life & Dreams copy was dropped, so `ml-036` does not exist).
- **Other tabs of the workbook** (stoicism list, numbered lists, proposals, card texts, and one tab of personal contact details) — out of scope. *The contact-details tab holds personal data and should not live in a sheet that feeds a publishing pipeline.*

## Edits applied to sheet text — *review*

| id | Change | Reason |
|---|---|---|
| pg-001 | `sa fi tu însuți` → `să fii tu însuți` | diacritics + grammar |
| ml-005 | `te vor ruga copii` → `te vor ruga copiii` | definite article |
| pg-019 | `îndeplinesti` → `îndeplinești` | diacritic |

Markdown escapes introduced by the export (`\_`, `\.`) were removed; no other wording was touched.

## English drafted by Claude (sheet had Romanian only) — *review and correct in the sheet*

| id | RO (sheet) | EN (draft) |
|---|---|---|
| pg-015 | Ce talent ți-ai dori să ai? Ce te împiedică să îl dobândești? | What talent would you like to have? What is stopping you from acquiring it? |
| pg-016 | Ce obiective merită orice grad de efort? | Which goals are worth any amount of effort? |
| pg-017 | Ce îți dorești cel mai mult de la viață? | What do you want most from life? |
| pg-018 | Ce știi să faci cel mai bine? | What do you do best? |
| pg-019 | Ce obiectiv îți dorești să îndeplinești anul acesta? | What goal do you want to achieve this year? |
| pr-007 | Pentru ce ar trebui să te angajeze cineva? | Why should someone hire you? |
| pr-008 | Ce faci mai bine decât ceilalți? Dar mai prost? | What do you do better than others? And worse? |
| pr-009 | Ești din nou în punctul de a alege ce facultate să urmezi. Ai face aceeași alegere sau alta? De ce? | You are back at the point of choosing what to study. Would you make the same choice or a different one? Why? |
| pr-010 | Din ce unghiuri te uiți la o problemă? | From which angles do you look at a problem? |

## Flags for the editorial audit (kept as written)

- **Length:** `va-002` is 234 characters in Romanian (quote + question); validator warning only. Consider splitting the quotation from the question.
- **Topic sensitivity** (the sample-content rules excluded health, family status and similar; the real deck is the content owner's call): `ml-002` (last time you cried), `re-009` (who would raise your children if you died), `ml-023` / `re-010` (family), `ml-005` (old age / children).
- **Double-barrelled questions:** 18 rows ask two things; house style, unchanged.
- **English quality:** several sheet translations are literal (e.g. `ml-007` "What is you favorite joke?" typo, `ml-013` "aroung"). Not corrected here — the sheet is the source of truth; fix there and republish.

## How this was published

`public/data/questions-2026.09.2.json` (immutable) · `public/data/manifest.json` → `releaseSeq 3`, sha256 of the file · bundled fallback `public/data/questions.json` updated to the same content · `npm run validate` PASS with 1 warning (`va-002` length).
