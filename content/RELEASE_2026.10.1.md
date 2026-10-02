# Content release 2026.10.1 — English typo fixes

Internal Confidential · 2026-10-02 · initiated-by: claude-code · releaseSeq 5 · replaces `2026.10.0` (seq 4)

**Authorisation:** Marius's instruction of 2026-10-02 to correct the English typos ("corectează greșeala"; scope extended to all three flagged rows on his answer). In the same exchange he confirmed the 15 sensitive prompts (the 10 `presentationSafe: false` and the 5 flagged in 2026.09.2) stay as they are.

## What changed

`public/data/questions-2026.10.1.json` is 2026.10.0 with three English texts replaced. Ids, order, categories, Romanian, flags and the count (479) are unchanged, so favourites, history and the last card all stay valid.

| id | 2026.10.0 | 2026.10.1 |
|---|---|---|
| ml-007 | What is you favorite joke? | What is your favourite joke? |
| ml-013 | What song do you listen to when no one is aroung or with your headpones on? | What song do you listen to when no one is around or with your headphones on? |
| ml-023 | How would your famiy describe you in 3 words? | How would your family describe you in 3 words? |

`headpones` was not in the 2026.09.2 audit list. It was found while checking ml-013. "favourite" follows the deck's British spelling.

## How this was produced

`node scripts/patch-release.mjs` reads the immutable 2026.10.0 file and applies `content/release-2026.10.1/corrections.json`. Each `from` must match exactly or the build fails. The script validates the result and writes the new immutable file; `--check` proves it is reproducible. Then:

- `public/data/questions.json` = byte copy of 2026.10.1 (decision 41)
- `public/data/manifest.json` → `releaseSeq 5`, `contentVersion 2026.10.1`, sha256 `d7b6e60d42e93a297b7c0f9129f9bd12ee729a0aecaa8cfa75e5471206f140ec`
- 2026.10.0 (sha256 `3fcd072a…ab37a9a`) and the older releases are unchanged and stay available for rollback
- Gates: `npm run validate` PASS (1 inherited warning, `va-002`) · `npx vitest run` 89/89 · `npm run build` exit 0

## Open

- **The editorial sheet still has the old texts.** Apply the same three fixes there, or a later import from the sheet will bring the typos back.
- No app code changed. Installed apps get the release through the normal manifest check (download, verify, "New version available"). The bundled fallback `questions.json` is precached and changed with it, so the build also ships a new service worker; its update banner activates both on Reload. *(Corrected 2026-10-02 by claude-code: an earlier draft said no service-worker update was needed.)*

## Deploy

Taken over and published by claude-code on Marius's instruction ("take it over", 2026-10-02): gates re-run (validate PASS, 89/89 tests, build exit 0, both release scripts `--check` reproducible), then `git push origin main` → Pages. Live verification is recorded in the session handoff `session-logs/2026-10-02_app-release-2026.10.0_claude-code_v1.2.md` (local).
