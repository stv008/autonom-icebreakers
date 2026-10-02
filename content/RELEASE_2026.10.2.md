# Content release 2026.10.2 — ChatGPT-reviewed English

Internal Confidential · 2026-10-02 · initiated-by: claude-code · releaseSeq 6 · replaces `2026.10.1` (seq 5)

**Authorisation:** Marius, 2026-10-02: "use ChatGPT as a reviewer for code, graphics and translation". The review and its disposition are in `reviews/2026-10-02_review_chatgpt_v1.0.md`.

## What changed

`public/data/questions-2026.10.2.json` is 2026.10.1 with **35 English texts** replaced: the corrections adopted from ChatGPT's review of the 368 English texts Claude drafted for 2026.10.0. Ids, order, categories, Romanian, flags and the count (479) are unchanged, so favourites and history stay valid. The full list with reasons is in `content/release-2026.10.2/corrections.json`. None of the published 107 questions is touched.

Examples: FE-114 "What did you have to unlearn…" → "What did you unlearn…" (added necessity removed). RF-040 "…put things right after a misunderstanding?" → "…put things right together…" (the Romanian is plural). FE-021, FE-028, FE-039 and FE-118 had malformed question structures.

## How this was produced

`node scripts/patch-release.mjs 2026.10.2`. The script is now generic over patch releases, each built from the previous immutable file. `--check` reproduces both 2026.10.1 and 2026.10.2. Then:

- `questions.json` is a byte copy of the release.
- The manifest points at seq 6, sha256 `b72a79a4313bbf0ad07547d7c10d3ad1b6cd6c1ef6209853f1ff542e7f08c48b`.
- 2026.10.1 and the older releases are unchanged.

Gates: validate PASS (1 inherited warning, `va-002`), 92/92 tests, build with the dist leak check.

## Note

These English texts exist only in the app's release files. The Google Sheet holds none of the 368 drafts, so there is nothing to mirror there. The three 2026.10.1 typo fixes, however, are still owed to the sheet.

## Rollback

Publish a manifest with `releaseSeq: 7` pointing at `./questions-2026.10.1.json` (sha256 `d7b6e60d…140ec`).
