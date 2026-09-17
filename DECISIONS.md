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
12. **Cache Storage layout**: one cache `autonom-icebreakers-content`; entries keyed as `__content/content-release` (pointer `{ key, releaseSeq }`) and `__content/release-<seq>` (the validated deck). Write order: release entry → pointer → prune older entries. Cache keys are resolved against `document.baseURI` so they stay under the app's own path.
13. **Manifest checks** run once after the initial load (forced) and on `visibilitychange → visible`, throttled to 10 minutes as §11 asks. The throttle is module-level (survives React re-renders, resets on reload).
14. **"Offline ready"** = a service worker controls the page **and** (a saved release exists **or** the bundled `data/questions.json` is in a cache). Anything less shows "Not yet available offline".
15. **Question-level unknown fields warn, they do not reject.** §12 rejects unknown *top-level* fields; unknown question fields are reported as warnings so an extra editorial column cannot block a release.
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
32. **`--on-blue` token** (`#ffffff` light / `#0f0f1a` dark) added for text on `--blue` surfaces. It is derived from the given palette (the dark-mode `--blue #8FA3FF` needs dark text for ≥ 4.5:1), not a new colour.
33. **Reset local data** clears only `localStorage` (favourites/history/scope/hint flag, keeps the current language) and draws a fresh card. Cached content releases are kept — they are not personal data.
34. **Update banner** is shown for either a waiting service worker or a staged content release; "Reload" calls `updateSW(true)` when a worker is waiting, otherwise `location.reload()`. Dismiss hides it until the next event.
35. **Install hint** is limited to real Safari on iPhone/iPad (`Safari` token present, no Chromium/Firefox tokens, not in `display-mode: standalone`), including iPadOS "desktop" UAs via `MacIntel + maxTouchPoints > 1`.
36. **i18n keys added beyond §10**: `release` ("Lansare"/"Release"), `close` ("Închide"/"Close"), `favoritesHint` ("Alege o întrebare din listă." / "Pick a question from the list."). Every §10 string is used verbatim.
37. **Card entrance**: a 160 ms fade/slide under `prefers-reduced-motion: no-preference` only; otherwise instant.

## Deliberately not done (see README "Non-goals" and the prompt's §2)

38. No `git push`; no VoiceOver/TalkBack run (no device in the build environment — recorded in README as pending); no HTTPS preview setup (Phase 2).
