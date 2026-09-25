# DECISIONS — choices made where the build prompt was silent

Internal Confidential · 2026-09-17 · initiated-by: claude-code · Prompt: `BUILD_PROMPT.md` v1.0 (prototype run; D1–D4 pending)

Each entry: what was decided, why, and where it lives. Anything here can be reversed without touching the spec'd behaviour.

## Structure and tooling

1. **Shared validation lives in plain JS** — `src/content/validate.js` (JSDoc-typed, checked by `tsc` via `checkJs`). The prompt wants one rule set for the client and for `scripts/validate-content.mjs` running under plain Node 20+; a `.ts` module would need a build step or Node ≥ 22.18 type stripping. Tests assert the JS category list matches `CATEGORIES` in `src/types.ts`.
2. **Extra components** beyond §4: `Sheet.tsx` (shared accessible bottom sheet used by ScopePicker and About) and `UpdateBanner.tsx`. `PresentLayer.tsx` holds the wake-lock hook and a `<html class="present">` toggle; the present layout itself is CSS on `.app--present`.
3. **Separate `vitest.config.ts`** instead of a `test` block in `vite.config.ts`, so the PWA plugin never loads under the test runner.
4. **TypeScript pinned to 6.x** (`~6.0.2`, the version the Vite react-ts template ships). npm resolved 7.x on first install; pinned to keep `tsc -b` behaviour predictable for the maintainer.
5. **`noUncheckedIndexedAccess: true`** added on top of `strict` — pure draw code indexes arrays a lot; this keeps `undefined` visible.
6. **Vite `base: "./"`** so `dist/` works under any sub-path (D7 not needed for the build). Font URLs are written as `/fonts/...` in `styles.css` and rewritten to relative paths by Vite (verified in `dist/assets/*.css`).
7. **`@testing-library/react` and `jsdom` are installed** (per §18) but only `jsdom` is used, for the storage tests. No React component tests were written — the prompt requires tests for `deck.ts`, `storage.ts` and content validation only.
8. **Web manifest is hand-written** (`public/manifest.webmanifest`, plugin `manifest: false`) so the icon set and `start_url "."` are exactly as §13 specifies.
9. **Fonts**: Titillium Web TTFs from the `google/fonts` repository (OFL), converted to woff2 with fontTools at build-setup time; `public/fonts/OFL.txt` shipped alongside (not precached). Coverage of ă â î ș ț verified from the cmap.
10. **Icons**: `favicon.svg` is the placeholder (rounded square, brand blue, white "Ai"); PNGs (192/512/180) rendered from the same design with Pillow at setup time, not generated at build time.

## Data and state

11. **Manifest `releaseSeq` overrides the file's own `releaseSeq` when staging.** A rollback is a higher seq pointing at an older immutable file whose embedded seq is lower; the activation order must follow the manifest, so the saved copy carries the manifest's seq (`loadContent.ts`).
12. **Cache Storage layout**: one cache `autonom-icebreakers-content`; entries keyed as `__content/content-release` (pointer `{ key, releaseSeq }`) and `__content/release-<seq>` (the validated deck). Commit = release entry → pointer swap (the commit point) → best-effort prune of entries with a *lower* seq. The commit runs under a Web Lock (`navigator.locks`) where available and re-reads the pointer inside it, so an older download finishing after a newer commit is dropped instead of overwriting it. Cache keys are resolved against `document.baseURI` so they stay under the app's own path. Workbox also keeps a `content-files` runtime cache of the raw downloaded files (max 6). *(v0.1.1 — review F1/F7/F13.)*
13. **Manifest checks** run once after the initial load (forced) and on `visibilitychange → visible`, throttled to 10 minutes as §11 asks. The throttle is module-level (survives React re-renders, resets on reload).
14. **"Offline ready"** = a service worker controls the page **and** `index.html` is in a cache **and** (a validated saved release exists **or** the cached bundled `data/questions.json` validates). Anything less shows "Not yet available offline". *(v0.1.1: previously any cached fallback response counted, unvalidated — review F5.)*
15. **Unknown question fields are rejected** and validated decks are rebuilt with canonical fields only before caching. *(v0.1.1 reversal — review F2. v0.1.0 only warned, which would have shipped `alternatives`/`notes` columns and broken the §5.4 editorial boundary.)*
16. **Validation also rejects** missing/invalid `contentVersion`, `publishedAt` (must parse as a date), `source` outside `2026|legacy`, non-boolean `presentationSafe`, and `hu` that is neither string nor null — implied by §5.1's field rules.
17. **Persisted state is sanitised field by field** rather than all-or-nothing: a partially corrupted record keeps the valid fields; unparsable JSON resets everything (§7).
18. **`lastQuestionId` persisted = the card on screen**, including a favourite being viewed. Deck history (`seenIds`, in-memory history) is separate.
19. **On reopen, `seenIds` are pruned** to ids that exist and are active in the loaded deck (harmless housekeeping; covers a bundled-deck change between app versions).

## Draw and navigation

20. **Prev/Next inside the Favourites scope** step through the favourites list in order, wrapping; they never touch `seenIds` and never draw. Selecting the Favourites scope keeps the current card until a favourite is tapped (the card shows a "pick from the list" hint when nothing has been picked yet). `stepFavorites()` in `deck.ts`.
21. **"Restart deck" from a category exhaustion** clears `seenIds` entirely (§8) and draws from that category, excluding the card on screen when the pool has more than one question — same rule as "Shuffle again".
22. **`next()` distinguishes `empty` (no active questions in scope) from `exhausted`** so the empty-state string and disabled Next (§9.5) can be shown without a notice.
23. **Prev at the start of history** returns the first card again rather than `null`, so the UI never blanks.
24. **Scope change calls `branch()`** (drops forward history after a `prev()`) before drawing — the "new forward branch" of §8.

## UI

25. **Keyboard shortcuts** are ignored when `metaKey`/`ctrlKey`/`altKey` is held (so Cmd+L, Cmd+F keep their browser meaning), when a sheet is open (the sheet owns Esc/Tab), and when focus is on a button, link, input, textarea, select or contenteditable. A browser find box cannot be detected from page script; the modifier guard covers Cmd/Ctrl+F itself.
26. **Space on a focused button** is left to the browser (activates the button). The window handler returns before any key handling when the target is a button.
27. **Swipe**: pointer events with a 56 px horizontal threshold and `|dx| ≥ 1.5·|dy|`; the card sets `touch-action: pan-y` so vertical scroll is never fought.
28. **Text fitting** measures the card body (`scrollHeight > clientHeight`), stepping the question font down 1 px at a time to a 1.25 rem floor; past the floor the body scrolls. Re-run on `ResizeObserver` (rotation, text-size changes).
29. **Live region** is a visually hidden `aria-live="polite"` div updated ~50 ms after the swap, with the question text or the exhaustion message. Focus is never moved on draw.
30. **Segmented RO│EN** buttons carry `aria-pressed`, plus an underline on the selected item — state is not conveyed by colour alone. Picker items use `aria-current="true"` plus a ✓ glyph and border.
31. **Picker button** has an explicit `aria-label` ("Category: All questions") in addition to its visible text.
32. **`--on-blue` token** (`#ffffff` light / `#0f0f1a` dark) added for text on `--blue` surfaces. It is derived from the given palette (the dark-mode `--blue #8FA3FF` needs dark text for ≥ 4.5:1), not a new colour. **No other colours.** *(v0.1.1: v0.1.0 had used the workspace's status red/green for the reset button and the offline indicator; §9.3 forbids inventing a palette, so they were removed — status is glyph + text in `--blue`/`--muted`, the reset confirm is a plain button with an `--ink` border. Review F12.)*
33. **Reset local data** clears only `localStorage` (favourites/history/scope/hint flag, keeps the current language) and draws a fresh card. Cached content releases are kept — they are not personal data.
34. **Update banner** is shown for either a waiting service worker or a staged content release; "Reload" calls `updateSW(true)` when a worker is waiting, otherwise `location.reload()`. Dismiss hides **that** update only (keyed `code` or `content:<releaseSeq>`); a later release or a new worker shows the banner again. A waiting worker takes precedence over staged content because its reload activates both. *(v0.1.1 — review F8.)*
35. **Install hint** is limited to real Safari on iPhone/iPad (`Safari` token present, no Chromium/Firefox tokens, not in `display-mode: standalone`), including iPadOS "desktop" UAs via `MacIntel + maxTouchPoints > 1`.
36. **i18n keys added beyond §10**: `release` ("Lansare"/"Release"), `close` ("Închide"/"Close"), `favoritesHint` ("Alege o întrebare din listă." / "Pick a question from the list."). Every §10 string is used verbatim.
37. **Card entrance**: a 160 ms fade/slide under `prefers-reduced-motion: no-preference` only; otherwise instant.

## v0.1.1 — review response (2026-09-17)

Independent review by Codex: `reviews/2026-09-17_review_codex_v1.0.md`. Disposition of each finding:

| Finding | Disposition | Where |
|---|---|---|
| F1 concurrent commits regress seq | Fixed: Web Lock + pointer re-read inside the critical section; prune only lower seqs | `loadContent.ts` `commitRelease`, test "older download that finishes last" |
| F2 unknown question fields retained | Fixed: rejected at the gate; client stores canonical fields only | `validate.js` `question_fields`, `canonicalDeck` |
| F3 manifest may point off-origin | Fixed: same-origin + `data/questions-*.json` + no query/fragment + `redirect: "error"`; contentVersion must match | `resolveReleaseUrl`, tests |
| F4 HTML checked only in ro/en | Fixed: every string field | `validate.js` `checkHtml` |
| F5 offline indicator too optimistic | Fixed: shell entry + validated deck required | `isOfflineReady` |
| F6 timeout ends at headers; fallback unbounded | Fixed: abort covers body; bundled fetch bounded (8 s) | `fetchBytes`, `readBundledDeck`, timer tests |
| F7 cleanup failure reported as failure | Fixed: pointer swap is the commit point; cleanup best-effort | `commitRelease`, test |
| F8 dismissal permanent | Fixed: keyed dismissal | `App.tsx` `pendingUpdate`/`dismissedKey` |
| F9 wake lock not re-acquired | Fixed: `release` listener + `released` check | `PresentLayer.tsx` |
| F10 null persisted before load | Fixed: persist only once content is active | `App.tsx`, `tests/app.test.tsx` |
| F11 focus lost in About; unstable `onClose` | Fixed: explicit focus moves; `onClose` held in a ref; focus recovery on `focusin` | `AboutSheet.tsx`, `Sheet.tsx` |
| F12 extra palette colours | Fixed: removed | `styles.css`; decision 32 |
| F13 docs overstate | Fixed: `engines`, README cache list, test-coverage wording | `package.json`, `README.md` |
| F14 wording | Adopted ml-003, va-007, pg-002, pg-004, pr-004; kept ml-001 (the prompt's own example) | `questions.json` → `2026.09.1-sample`, releaseSeq 2 |
| (d) decision 7 — no component tests | Partially adopted: focused App tests for mount persistence; no broad UI coverage | `tests/app.test.tsx` |
| (d) decision 11 — seq override | Kept, as the review agrees | — |
| `glob` deprecation / `fsevents` script | Noted, not actioned: transitive build-tool dependencies with no runtime exposure | — |

Sample content was re-released as `2026.09.1-sample` (`releaseSeq` 2, new immutable file, manifest updated) rather than editing the published `2026.09.0-sample` file — release files are immutable, and this exercises the real update path on the deployed test site.

## Content release 2026.09.2 (2026-09-17)

39. **Real content loaded ahead of the editorial audit, by CEO instruction** (2026-09-17). The prompt gated real content behind D5; the CEO chose to publish to the test site now. Scope, translation and publication choices were put to him explicitly: only the five-category rows (108 → 107 after one duplicate), Claude-drafted English for 9 Romanian-only rows flagged for review, publish to the public test site. Full record: `content/RELEASE_2026.09.2.md`.
40. **Ids follow sheet order per category** (`ml-001`…) and are frozen from this release on; the sheet is the source of truth for wording, the JSON is derived.
41. **The bundled fallback tracks the latest release** (`questions.json` = `questions-2026.09.2.json`) so a fresh install never shows the sample deck.

## Logo (2026-09-21)

42. **Text wordmark replaced by the official logo, on CEO request.** Source: `Projects/Autonom-Cowork-Setup/Context/brand/Autonom_Logo_Vectorial_RGB.ai`, page 1 (horizontal, no tagline), extracted as outlined vector paths (no fonts, no raster) into `public/logo-autonom.svg`; the prompt's "no logo from the web" rule is respected — the asset came from the workspace brand folder. Rendered at 1.75 rem height in the top bar, hidden in present mode as before; `alt="Autonom"`.
43. **Dark-scheme variant derived, pending Marketing.** The master file has six variants (horizontal / vertical × no tagline / EN / RO) but no negative version. `public/logo-autonom-dark.svg` keeps the four-colour mark and sets only the wordmark to white so it stays legible on `--bg #0f0f1a`; served via `<picture>` + `prefers-color-scheme`. This is a deviation from the master and belongs in `Context/brand/exceptii-registru.md` as a new row once Marketing confirms (or supplies the official negative logo, which then replaces the derived file).
44. **App icon still a placeholder.** The mark from the logo could become the icon, but §9.6 says Marketing supplies the approved icon; unchanged.

## Card surfaces (2026-09-25) — v0.1.2

45. **Question cards get designed backgrounds, on CEO request** ("I want the cards to look beautiful, with quality and tasteful backgrounds"). This knowingly overrides §9.3 "no gradients behind text, no imagery" and decision 37's plain white card. Each card is now the Brand Book blue `#10069F` deepening to `#0a0470`, lit from two corners by the **four official logo colours** (`#10069F`, `#007cd5`, `#00c755`, `#8538c2`, read from `public/logo-autonom.svg`), plus a fine paper grain, a 1 px inner edge and a soft shadow. No colour outside the brand and the logo is introduced; `#0a0470`, `#06033f` (dark scheme) and `#3a2fd6` are darker/lighter steps of `#10069F`.
46. **One identity per category**, set by `data-category` on the card: *Me: Life & Dreams* violet + sky, orbit rings; *Values* sky + blue, nested diamonds; *Personal Growth* green + sky, rising chevrons; *Relationships* violet + green, interlocking circles; *Professional* sky + green, dot grid. Notices and the load-error card use the neutral `all` variant (sky + violet, soft rings). The category label becomes a translucent pill with a dot in the category's colour.
47. **Text stays legible — guardrail kept from §9.3.** Light and motifs are confined to the corners (motifs capped at `min(…%, 17rem)` so they never grow behind the text on wide screens); question text is white 600. Measured on rendered screenshots (390 × 780, light and dark, all five categories): the **brightest single background pixel behind the question is 7.5 : 1** against white, median ≈ 15 : 1 — the ≥ 7 : 1 rule still holds. Buttons on the card invert (white primary, outlined secondary).
48. **Present mode keeps the designed card** (previously `--bg` with no shadow, §9.4), since that is the view that gets screen-shared. Body background stays `--bg`.

## Deliberately not done (see README "Non-goals" and the prompt's §2)

38. No `git push` during the build (pushed afterwards on explicit CEO instruction, 2026-09-17, to a public GitHub repo with a Pages test deployment — see README "Test site"); no VoiceOver/TalkBack run (no device in the build environment — recorded in README as pending). Internal HTTPS hosting remains a Phase 2 task; GitHub Pages is a prototype convenience only.
