# Claude Code build prompt — Autonom Icebreakers PWA (v1.0)

Internal Confidential · 2026-09-17 · initiated-by: claude · Derived from: Grok build spec v1.0 (17.09.2026) corrected per `Output/2026-Q3/Plan_Integrat_App_Cartonase_Icebreaker_2026-09-17_claude-190109_v1.1.html` §2.3, §4 (Claude + Codex integrated plans).

**Lifecycle:** draft · **Currentness:** integrated plan v1.1, read 17.09.2026 · **Authorization:** use only after CEO decisions D1–D4 and the Phase 1 no-build trial verdict; until then it may be run for a throwaway prototype with the sample content it ships with.

**How to use:** open Claude Code in an empty folder on the Mac (`~/Documents/CoWork/Projects/autonom-icebreakers/` is suggested — outside the Cowork Setup project so the app's `node_modules` and build artefacts never enter the governed workspace), paste everything below the line. Placeholders resolved for the prototype run (React confirmed; marketing note kept). Do not paste the "Joc intrebari" sheet or any real question content into the prompt; real content enters later through `public/data/questions.json` after the editorial audit.

---

## 0. Agent instructions

You are a senior front-end engineer. Build a production-quality Progressive Web App that replaces Autonom's physical ice-breaker question cards used to open internal meetings.

Rules:
- Implement ONLY what is specified here. No onboarding, accounts, analytics, ads, AI, Slack/Teams, push, backend server.
- If a detail is missing, choose the simplest accessible option and continue; list every such choice in `DECISIONS.md` at the end.
- Ship with the SAMPLE content described in §6. Real Autonom questions will replace `public/data/questions.json` later through the publish pipeline — do not invent "Autonom-style" content beyond the sample.
- Do not fetch, scrape or reproduce any Autonom logo or brand asset from the web. Use the brand tokens in §9 and a text wordmark; a placeholder icon must look like a placeholder (see §9.6).
- Clean TypeScript, `strict: true`, no `any`. No console output except one `deck <contentVersion>` line on content activation.
- Before you stop: `npm run build` exits 0, `npm test` passes, the app works offline after one online load, and every item of the Definition of Done (§16) is true. Write `README.md` and `DECISIONS.md`.
- Do not ask the human questions during the build. Do not run `git push`. Commit locally at the end with message `feat: autonom-icebreakers v0.1.0 (initiated-by: claude-code)`.

## 1. Product

- **Name:** Autonom Icebreakers · slug `autonom-icebreakers`
- **Users:** ~600 Autonom employees (Romania + Hungary); not consumers. Facilitator opens a meeting, shows one question, reads it aloud, moves on. Session 1–3 minutes.
- **Languages:** Romanian and English for questions and UI, one persistent toggle. Hungarian is NOT in v1 but the schema reserves a field.
- **Distribution:** internal HTTPS URL + optional "Add to Home Screen". No App Store.
- **Success:** phone unlocked → app open → question readable across a table in under two seconds, no login, no spinner longer than 300 ms after first paint.

## 2. Non-goals (do not build)

Login, signup, profiles, cloud sync · push notifications · analytics, telemetry, cookies, fingerprinting, crash SDKs · payments, ads · sharing question text/images · streaks, scores, gamification · rooms, multiplayer, QR join · settings screen · onboarding tour · category management UI · in-app editing · visible alternative phrasings ("Alt") · a sixth "Classic" category · Hungarian UI · native wrappers · backend API · anything needing a Google account at runtime · hot-swapping content while a card is on screen.

## 3. Tech stack

| Layer | Choice |
|---|---|
| Bundler | Vite (current stable) |
| Language | TypeScript strict |
| UI | React (current stable). Confirmed for the prototype (D4 pending — maintainer may swap the library later; everything else stands). |
| Styling | one `src/styles.css` with CSS custom properties. No Tailwind, no CSS-in-JS. |
| PWA | `vite-plugin-pwa` (Workbox). Precache app shell + bundled `questions.json`. `registerType: 'prompt'` — never auto-reload. |
| Routing | none, single view |
| State | React state + `localStorage` (+ Cache Storage for content releases). No Redux/Zustand. |
| Tests | Vitest, REQUIRED for `deck.ts`, `storage.ts`, `content.ts` validation |
| Fonts | Titillium Web 400/600/700 self-hosted in `public/fonts/` (woff2, downloaded from Google Fonts at build-setup time, SIL OFL). No runtime call to fonts.googleapis.com. |
| Hosting target | static `dist/` under a sub-path; all URLs relative. |

Node 20+, npm. Commit the lockfile.

## 4. Repo layout

```
autonom-icebreakers/
  package.json  vite.config.ts  tsconfig.json  index.html  README.md  DECISIONS.md
  public/
    favicon.svg  apple-touch-icon.png  manifest.webmanifest
    fonts/TitilliumWeb-{Regular,SemiBold,Bold}.woff2
    data/questions.json          bundled fallback deck (sample content)
    data/manifest.json           release pointer (see §11)
  src/
    main.tsx  App.tsx  styles.css  types.ts  i18n.ts  pwa.ts
    content/loadContent.ts       startup + update + validation
    state/deck.ts                pure draw functions
    state/storage.ts             persisted state
    components/TopBar.tsx  ScopePicker.tsx  Card.tsx  Controls.tsx  PresentLayer.tsx  AboutSheet.tsx  InstallHint.tsx
  tests/deck.test.ts  tests/storage.test.ts  tests/content.test.ts
  scripts/validate-content.mjs   CLI validator, same rules as the client (run in CI / before publish)
```

## 5. Data model

### 5.1 `public/data/questions.json`
```json
{
  "schemaVersion": 1,
  "contentVersion": "2026.09.0-sample",
  "releaseSeq": 1,
  "publishedAt": "2026-09-17T12:00:00Z",
  "questions": [
    {
      "id": "ml-001",
      "category": "me_life_dreams",
      "active": true,
      "source": "2026",
      "presentationSafe": true,
      "ro": "Care este un vis pe care nu l-ai spus încă cu voce tare?",
      "en": "What is a dream you have not said out loud yet?",
      "hu": null
    }
  ]
}
```
Field rules: `id` stable, never recycled · `category` from the enum below · `active:false` = excluded from every pool · `source` ∈ `"2026" | "legacy"` (provenance only; never a user-facing category) · `presentationSafe` boolean (reserved; v1 treats all as true) · `ro`/`en` REQUIRED non-empty plain Unicode with correct Romanian diacritics (ăâîșț) · `hu` nullable, unused in v1 · no HTML anywhere · one approved wording per `id` (alternatives never ship; the editorial sheet keeps them).

### 5.2 Categories (exactly five)
```ts
export type CategoryId = "me_life_dreams" | "values" | "personal_growth" | "relationships" | "professional";
export const CATEGORIES = [
  { id: "me_life_dreams", ro: "Eu: viață și vise", en: "Me: Life & Dreams" },
  { id: "values",          ro: "Valori",            en: "Values" },
  { id: "personal_growth", ro: "Creștere personală",en: "Personal Growth" },
  { id: "relationships",   ro: "Relații",           en: "Relationships" },
  { id: "professional",    ro: "Profesional",       en: "Professional" },
] as const;
```
Scopes in the picker: `all` · the five categories · `favorites`. `all` and `favorites` are not categories in the JSON.

### 5.3 `public/data/manifest.json`
```json
{ "releaseSeq": 1, "contentVersion": "2026.09.0-sample", "schemaVersion": 1,
  "questionsUrl": "./questions-2026.09.0-sample.json", "sha256": "<hex>" }
```
Relative URL. `releaseSeq` is a monotonically increasing integer independent of `contentVersion` — a rollback is a NEW higher `releaseSeq` pointing at an OLDER immutable file. Published content files are immutable and version-named; `questions.json` is only the bundled fallback.

### 5.4 Editorial sheet contract (document in README; do NOT integrate the Sheets API)
One row per canonical question: `id, category, active, source, ro, en, hu, alternatives (private), disposition, review_status, owner, notes`. Only `review_status = approved` and `active = TRUE` rows are exported by a separate publish job (out of scope here). The app never reads the sheet.

## 6. Sample content (ship this)

≥36 questions, ≥6 per category, workplace-safe, mix of light and reflective, RO written natively with correct diacritics, EN a true translation. No dating, politics, alcohol, health, money or family-status prompts. Mark them clearly as sample: `contentVersion` ends in `-sample` and the About sheet shows "Sample content" when it does. Do not use emoji.

## 7. Persisted state

`localStorage` key `autonom-icebreakers-v1`:
```ts
type Lang = "ro" | "en";
type Persisted = {
  lang: Lang;
  scope: "all" | CategoryId | "favorites";
  seenIds: string[];            // ONE global cycle, canonical ids
  favorites: string[];
  lastQuestionId: string | null;
  installHintDismissed: boolean;
};
```
Defaults `{ lang: navigator.language starts with "ro" ? "ro" : "en", scope: "all", seenIds: [], favorites: [], lastQuestionId: null, installHintDismissed: false }`. After first persist never re-derive `lang` from the browser. On parse failure reset to defaults. `present` is NOT persisted — presentation mode always starts off. Session history (§8) is in-memory only.

## 8. Draw algorithm — pure functions in `src/state/deck.ts`, unit-tested

Definitions: pool(scope) = active questions in that category, or all active questions for `all`. `favorites` is a browse list, not a draw pool. Seen-set is GLOBAL across scopes.

`next(scope)`:
1. `remaining` = pool(scope) ids not in `seenIds`.
2. If `remaining` is empty and scope is a category → return `{ exhausted: "category" }`; UI offers **"All remaining"** (switch scope to `all`, draw) or **"Restart deck"** (explicit; clears `seenIds` entirely). Never reset silently.
3. If `remaining` is empty and scope is `all` → return `{ exhausted: "deck" }`; UI shows **"Shuffle again"** which clears `seenIds` and draws, excluding the last shown id from the first draw when the pool has more than one question.
4. Otherwise pick uniformly at random from `remaining`, push id to `seenIds`, push to session history, set `lastQuestionId`, persist.

`prev()` walks the in-memory session history backwards (cap 50) without touching `seenIds`; after `prev()`, `next()` first walks forward through history until its end, then draws. Changing scope starts a new forward branch but keeps `seenIds`.

Never draw on: language toggle, app reopen (show `lastQuestionId` if still active, else `next(scope)`), favourite toggle, opening/closing Favourites or About, present toggle.

On content release activation: drop ids no longer active from `seenIds`, `favorites` and history; keep seen state for ids whose wording changed; clear session history; if `lastQuestionId` disappeared, draw.

Tests must cover: exhaustion of a category then All-remaining; deck exhaustion + no immediate repeat; one-card pool; switching category ↔ all never re-shows a seen id; prev/next forward walk; favourites never consume; reload restores; activation with retired/new ids.

## 9. UI — one screen

### 9.1 Layout (portrait phone first, responsive to tablet/laptop)
```
┌──────────────────────────────────────┐
│ AUTONOM  Icebreakers      RO│EN   ⛶  │  TopBar
├──────────────────────────────────────┤
│ ▾ Toate întrebările                  │  ScopePicker (button → bottom sheet)
├──────────────────────────────────────┤
│        ┌────────────────────┐        │
│        │ VALORI             │        │  Card: category label + question
│        │  Question text …   │        │
│        │                ☆   │        │  favourite, aria-pressed
│        └────────────────────┘        │
├──────────────────────────────────────┤
│   ← Înapoi          Următoarea →     │  Controls, ≥48×48 CSS px
│   12 rămase · v2026.09.0-sample   ⓘ  │  footer + About button
└──────────────────────────────────────┘
```
### 9.2 Behaviour
- TopBar: text wordmark `AUTONOM` (12–13 px, letter-spaced, brand blue) + title `Icebreakers` / `Sparge gheața`. RO│EN segmented control re-renders card + chrome instantly, persists, sets `document.documentElement.lang`. Present (⛶) toggles §9.4.
- ScopePicker: a button showing the current scope label; opens an accessible bottom sheet (role=dialog, focus trapped, Esc closes) listing All, five categories, Favourites with full translated labels and counts of remaining unseen. Selecting a category draws immediately. Selecting Favourites shows a simple list of starred questions; tapping one displays it without drawing. Selected item has `aria-current="true"` and a filled style — never colour alone.
- Card: one question. Tapping the card does nothing. If text overflows, shrink slightly to a floor (question ≥ 1.25 rem) then scroll inside the card; never truncate.
- Star: outline/filled, `aria-pressed`, labels from i18n.
- Prev/Next: real `<button>`s ≥48 px. Next is visually dominant.
- Swipe on the card: left = next, right = prev, 56 px threshold, do not fight vertical scroll.
- Keyboard (desktop/shared screen): ArrowRight / Space = next, ArrowLeft = prev, L = language, F = favourite, P = present, Esc = exit present/sheet. Ignore when focus is on a button (Enter/Space must activate the button normally), on a text field, or when a browser find box is open.
- Footer: `N rămase` (unseen in current scope) · `v{contentVersion}` · ⓘ About.
- About sheet: content version + release seq, "offline ready" status (true only when the app shell AND a validated deck are cached), 5-line privacy note (i18n), "Add to Home Screen" instructions for iPhone, **Reset local data** (confirm inline, no `window.confirm`).
- Update available (code or content): a discreet, dismissible banner "Versiune nouă disponibilă — reîncarcă" / "New version available — reload". Never reload automatically.

### 9.3 Visual design — Autonom Brand Book tokens
```css
:root {
  --blue: #10069F;         /* Albastru Intens — chrome, wordmark, primary button */
  --ink: #1a1a1a; --muted: #5c5c6b; --line: #d9d9e3; --bg: #f4f4f9; --card: #ffffff;
  --focus: #10069F; --radius: 16px;
  --font: 'Titillium Web', Arial, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root { --bg: #0f0f1a; --card: #1a1a2b; --ink: #f2f2f7; --muted: #a9a9b8; --line: #2e2e44; --blue: #8FA3FF; --focus: #8FA3FF; }
}
```
Question typography: Titillium Web 600, `clamp(1.6rem, 4.6vw + 1rem, 2.75rem)`, line-height 1.25, contrast ≥ 7:1 on the card. Category label: 600, uppercase, letter-spaced, `--blue`. No gradients behind text, no imagery, no emoji in chrome. `prefers-reduced-motion`: instant swaps. Do NOT invent a palette; do NOT use Grok's warm oxide tokens.

### 9.4 Present mode
Hides picker, footer and star; TopBar keeps only RO│EN and an exit control; question at `clamp(2rem, 6vw + 1.2rem, 4.5rem)`; Prev/Next remain as large high-contrast bottom buttons; body background `--bg`; request Screen Wake Lock if available and release on exit — if unsupported or denied, continue silently. Starts OFF on every launch. This view is what gets AirPlayed or screen-shared.

### 9.5 Empty / error states (i18n strings)
Empty scope: card shows the `empty` string, Next disabled. No deck at all (fallback also unreadable): `loadError` + Retry. Never a stack trace.

### 9.6 Icons
`favicon.svg`: rounded square, `--blue`, white "Ai" placeholder mark. `apple-touch-icon.png` 180×180 from the same SVG. README states: "placeholder icon — replace with the approved Autonom icon from Marketing before rollout".

## 10. UI strings — `src/i18n.ts`, use exactly
```ts
export const ui = {
  ro: { title:"Sparge gheața", all:"Toate întrebările", favorites:"Favorite", prev:"Înapoi", next:"Următoarea",
        favorite:"Adaugă la favorite", unfavorite:"Scoate din favorite", present:"Ecran complet", exitPresent:"Ieși din ecran complet",
        langRo:"RO", langEn:"EN", language:"Limba", scope:"Categorie", remaining:"rămase",
        allRemaining:"Toate cele rămase", restartDeck:"Reia pachetul", shuffleAgain:"Amestecă din nou",
        categoryDone:"Ai parcurs toate întrebările din această categorie.", deckDone:"Ai parcurs toate întrebările.",
        empty:"Nicio întrebare în această categorie.", noFavorites:"Nu ai încă întrebări favorite.",
        loadError:"Nu am putut încărca întrebările.", retry:"Încearcă din nou",
        about:"Despre", version:"Versiune conținut", offlineReady:"Disponibil offline", offlineNotReady:"Încă nu este disponibil offline",
        sample:"Conținut de test", reset:"Șterge datele locale", resetConfirm:"Sigur? Se șterg favoritele și istoricul de pe acest telefon.", resetYes:"Da, șterge", cancel:"Anulează",
        install:"Pe iPhone: Partajează → Adaugă pe ecranul principal.", updateAvailable:"Versiune nouă disponibilă", reload:"Reîncarcă", dismiss:"Închide",
        privacy:"Aplicația nu colectează date personale: fără cont, fără analytics, fără cookies. Limba, favoritele și istoricul rămân pe acest dispozitiv. Serverul de găzduire păstrează jurnale tehnice minime de acces." },
  en: { title:"Icebreakers", all:"All questions", favorites:"Favourites", prev:"Back", next:"Next",
        favorite:"Add to favourites", unfavorite:"Remove from favourites", present:"Present", exitPresent:"Exit present",
        langRo:"RO", langEn:"EN", language:"Language", scope:"Category", remaining:"remaining",
        allRemaining:"All remaining", restartDeck:"Restart deck", shuffleAgain:"Shuffle again",
        categoryDone:"You have seen every question in this category.", deckDone:"You have seen every question.",
        empty:"No questions in this category.", noFavorites:"No favourite questions yet.",
        loadError:"Could not load questions.", retry:"Try again",
        about:"About", version:"Content version", offlineReady:"Available offline", offlineNotReady:"Not yet available offline",
        sample:"Sample content", reset:"Reset local data", resetConfirm:"Sure? This clears favourites and history on this phone.", resetYes:"Yes, reset", cancel:"Cancel",
        install:"On iPhone: Share → Add to Home Screen.", updateAvailable:"New version available", reload:"Reload", dismiss:"Dismiss",
        privacy:"The app collects no personal data: no account, no analytics, no cookies. Language, favourites and history stay on this device. The hosting server keeps minimal technical access logs." },
} as const;
```
[[MARKETING NOTE: Romanian strings to be reviewed by the content owner before rollout.]]

## 11. Content loading and updates — `src/content/loadContent.ts`

Startup order:
1. Read the last **saved validated release** from Cache Storage (key `content-release`) → render. Only if none exists, render the bundled `public/data/questions.json` (precached).
2. After first paint, if a network attempt is sensible (do not rely solely on `navigator.onLine`), `fetch('./data/manifest.json', { cache: 'no-store' })` with a 4 s timeout.
3. If `manifest.releaseSeq > saved.releaseSeq` and `manifest.schemaVersion === 1`: fetch `questionsUrl`, verify `sha256`, validate with §12 rules (every question), stage in memory, then write atomically to Cache Storage (write new key, then swap pointer). If `schemaVersion` is unsupported, ignore the release and keep the current deck.
4. Do NOT replace the deck on screen. Show the update banner; activate on reload or next launch. Log exactly one line `deck <contentVersion>` on activation.
5. Any failure (timeout, HTTP error, bad JSON, checksum mismatch, validation failure, quota/denied storage) → keep last-known-good silently. Never blank the card.
Also refresh the manifest check on `visibilitychange` → visible, throttled to once per 10 minutes.

## 12. Validation — shared by client and `scripts/validate-content.mjs`
Reject the whole release on: unknown top-level fields; `schemaVersion !== 1`; non-integer `releaseSeq`; duplicate `id`; unknown `category`; `active` not boolean; empty/whitespace `ro` or `en`; `ro === en`; any HTML tag; duplicate normalised wording (case/diacritic/punctuation-insensitive) within a language; zero active questions overall. Warn (not reject) on wording > 220 characters. The CLI prints a per-rule report and exits non-zero on rejection.

## 13. PWA + HTML shell
`index.html`: `lang="ro"`, viewport with `viewport-fit=cover`, `theme-color #10069F`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-title "Icebreakers"`, no third-party scripts, font preload for the Regular and SemiBold woff2.
`manifest.webmanifest`: name "Autonom Icebreakers", short_name "Icebreakers", `start_url "."`, `display "standalone"`, `background_color`/`theme_color` `#10069F`, `lang "ro"`, SVG icon `any maskable` + PNG 192/512.
Service worker: precache shell, fonts, icons, bundled deck; runtime cache for `data/questions-*.json` (cache-first, immutable); `data/manifest.json` network-only. New SW waits; the app shows the update banner; `skipWaiting` only after the user taps Reload.
Install hint (`InstallHint.tsx`): only on iPhone/iPad Safari when `display-mode: browser`, one line, dismissible once forever, never modal.

## 14. Accessibility
Every control a real `<button>` with visible `:focus-visible` outline. Question region uses `aria-live="polite"` on a container that is updated after the text swap (do not rely on `<h1>` alone; do not move focus on draw). Labels from i18n on toggle (`aria-label` = `ui.lang.language`), star and present (`aria-pressed`). Hit targets ≥ 48 px. Text in `rem`; layout survives 200 % text size and landscape without hidden controls (allow page scroll). Contrast ≥ 4.5:1 chrome, ≥ 7:1 question. `prefers-reduced-motion`. Sheet dialogs trap focus and restore it on close. Test with VoiceOver on iOS and TalkBack on Android and note results in README.

## 15. Privacy
No cookies, no third-party requests (including fonts), no analytics, no crash SDK. Only the `localStorage` key and Cache Storage keys named here. README states the §10 privacy sentence in both languages.

## 16. Definition of Done — all must be true
1. `npm run build` exits 0; `npm test` passes with the §8 cases.
2. Cold load shows a question with no login and no spinner > 300 ms after first paint.
3. RO/EN toggle changes card + chrome instantly, never draws, survives reload, sets `<html lang>`.
4. Global no-repeat: drawing across categories and All never repeats an id until the deck is exhausted; category exhaustion offers All-remaining / Restart; deck exhaustion offers Shuffle again with no immediate repeat.
5. Swipe and buttons both work; keyboard shortcuts work and never hijack a focused button.
6. Favourites: star survives reload; Favourites scope lists and shows them without drawing.
7. Present mode fills the viewport, hides picker/footer, starts off on relaunch, wake lock degrades gracefully.
8. Airplane mode after one online visit: app opens and shows the saved deck; About shows "Available offline" only when true.
9. Publishing a manifest with higher `releaseSeq` → banner, no card change; after reload the new deck is active; a higher `releaseSeq` pointing at an older file also activates (rollback); a malformed or wrong-schema release is ignored and the old deck stays.
10. `scripts/validate-content.mjs public/data/questions.json` passes on the sample and fails on a deliberately broken copy (test this).
11. Dark mode follows the OS; brand tokens only.
12. Sample JSON: ≥36 questions, five categories, correct diacritics, `-sample` version, no emoji.
13. No network calls except manifest/content refresh; no 404 for icons/manifest; `display: standalone`.
14. README covers: what it is, `npm i/dev/build/preview`, HTTPS preview for phone testing (e.g. `vite preview --host` behind a local HTTPS proxy or a deployed preview URL — note that a 127.0.0.1 dev server is not reachable from a phone and plain HTTP does not exercise the service worker), how to publish content (validator → immutable file → manifest with higher `releaseSeq`), rollback, the sheet contract, iPhone install steps, non-goals, privacy sentence, placeholder-icon note.
15. `DECISIONS.md` lists every choice you made where this prompt was silent.

## 17. Implementation order
1 scaffold → 2 types + sample JSON + manifest → 3 `deck.ts` + `storage.ts` + tests → 4 `App.tsx` wired → 5 styles, dark, present → 6 swipe + keyboard → 7 PWA plugin, install hint, update banner → 8 `loadContent.ts` + validator + tests → 9 README + DECISIONS → 10 build, test, self-check §16, fix, stop.

## 18. Commands
```bash
npm create vite@latest . -- --template react-ts   # scaffold IN this folder, not a nested one
npm i && npm i -D vite-plugin-pwa vitest @testing-library/react jsdom
```
Build it now.

---

### Placeholders to fill before pasting
- `[[MAINTAINER NOTE]]` in §3 — resolved: React (prototype run 2026-09-17; revisit at D4).
- `[[MARKETING NOTE]]` in §10 — keep as a reminder or delete.
- Hosting sub-path (decision D7) is not needed for the build; all URLs are relative.

### What this prompt deliberately does NOT do
- Publish job (Sheet → validated release): separate small script owned by IT after D4/D7; the validator here is its core.
- Real content: enters only after Maria Tătaru's audit (D5) and the L3-free content-only sheet exists.
- Hosting/deployment, DPO wording, Intune web clip: Phase 2 tasks outside the codebase.
