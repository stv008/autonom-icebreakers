# Autonom Icebreakers

Internal Confidential · v0.1.3 (prototype) · 2026-09-26 · initiated-by: claude-code

A single-screen Progressive Web App that replaces Autonom's physical ice-breaker question cards. A facilitator opens it on a phone (or shares it on a screen), shows one question, reads it aloud, moves on. Romanian and English, works offline after one online visit, no login, no accounts, no analytics.

> **Prototype status.** Built from `BUILD_PROMPT.md` v1.0 as a throwaway prototype ahead of CEO decisions D1–D4 and the Phase 1 no-build trial verdict. Since content release **2026.09.2** (2026-09-17, CEO instruction) it ships the **real Autonom deck** from the editorial sheet — 107 questions, English drafts and edits flagged for the editorial audit in `content/RELEASE_2026.09.2.md`. The governed plan and provenance live in `../Autonom-Cowork-Setup/Output/2026-Q3/`. Every choice the prompt left open is listed in `DECISIONS.md`.

**Placeholder icon** — `public/favicon.svg` and the PNGs derived from it are placeholders. Replace them with the approved Autonom icon from Marketing before rollout.

## What it does

- One question at a time from five categories (Me: Life & Dreams · Values · Personal Growth · Relationships · Professional), or from all of them.
- **Global no-repeat**: a question is never shown twice until the whole deck is exhausted, no matter how you switch categories. Category exhausted → "All remaining" or "Restart deck". Deck exhausted → "Shuffle again" (never repeats the last card immediately). Nothing resets silently.
- Back / Next buttons, swipe left/right on the card, keyboard on a shared screen (→ / Space = next, ← = back, L = language, F = favourite, P = present, Esc = exit).
- Favourites (star), browsed from the category picker; browsing never consumes from the deck.
- Present mode (⛶): big type, chrome hidden, screen kept awake where the browser allows. Always starts off.
- RO│EN toggle for questions and chrome; persists; never draws a new card.
- Offline after the first visit; content updates arrive as versioned releases and activate on the next launch, never under your feet.
- Dark mode follows the OS. Brand tokens from the Autonom Brand Book only.
- Question cards carry a designed background per category, built only from the Brand Book blue and the four logo colours (decisions 45–48).
- Every card carries the Autonom logo bottom-left (derived card variant, pending Marketing — decisions 49–50).

## Run it

Node **22.12+** (the locked Vitest requires it; `package.json` declares `engines`) and npm.

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm run preview
```

```bash
npm test
```

```bash
npm run validate
```

- `dev` starts Vite on `http://localhost:5173` (no service worker — use `preview` for PWA behaviour).
- `build` type-checks (`tsc -b`) and writes a fully static `dist/` with relative URLs, so it can be hosted under any sub-path.
- `preview` serves `dist/` on `http://localhost:4173` with the service worker active.
- `validate` runs the content validator on the bundled sample deck.

### Testing on a phone

A `127.0.0.1` / `localhost` dev server is not reachable from a phone, and plain HTTP on a LAN address does **not** register the service worker (secure context required), so offline and install behaviour cannot be exercised that way. Use one of:

- `npm run preview -- --host` behind a local HTTPS proxy (e.g. Caddy with an internal CA, or `mkcert` + any static server pointed at `dist/`), then open the `https://<mac-ip>` URL on the phone; or
- a deployed preview URL on the internal HTTPS host (Phase 2).

## Content: how questions reach the app

The app never reads the editorial sheet. Content flows **sheet → validated release file → manifest**, and the app only ever fetches the manifest and the immutable release file it points at.

### Files under `public/data/` (served as `data/`)

| File | Role |
|---|---|
| `questions.json` | Bundled fallback deck, precached with the app shell. Used only when no validated release has ever been saved on the device. |
| `questions-<contentVersion>.json` | Immutable, version-named release files. Never edit or overwrite one after publishing; publish a new version instead. |
| `manifest.json` | The release pointer: `{ releaseSeq, contentVersion, schemaVersion, questionsUrl, sha256 }`. Fetched with `cache: "no-store"`, never precached. |

### Release file format (`schemaVersion` 1)

```json
{
  "schemaVersion": 1,
  "contentVersion": "2026.10.0",
  "releaseSeq": 2,
  "publishedAt": "2026-10-01T09:00:00Z",
  "questions": [
    {
      "id": "va-001",
      "category": "values",
      "active": true,
      "source": "2026",
      "presentationSafe": true,
      "ro": "Ce valoare personală nu ai negocia niciodată?",
      "en": "What personal value would you never negotiate?",
      "hu": null
    }
  ]
}
```

- `id` is stable and never recycled. `category` is one of `me_life_dreams | values | personal_growth | relationships | professional`. `active: false` removes a question from every pool (and from users' seen/favourite lists on activation). `source` is `"2026"` or `"legacy"` (provenance only). `presentationSafe` is reserved (v1 treats all as true). `hu` is reserved for Hungarian (unused in v1). `ro` and `en` are required, plain text with correct Romanian diacritics (ș ț with comma below), one approved wording per id.

### Validation rules (client and CLI share `src/content/validate.js`)

A release is rejected as a whole on: unknown top-level field · **unknown or missing question field** (editorial columns such as `alternatives`, `notes`, `owner` never ship) · `schemaVersion !== 1` · `releaseSeq` not a positive integer · duplicate `id` · unknown `category` · non-boolean `active` · empty/whitespace `ro` or `en` · `ro === en` · any HTML tag in **any** string field · duplicate wording within a language (case-, diacritic- and punctuation-insensitive) · zero active questions. A wording longer than 220 characters is a warning.

The app additionally refuses a manifest whose `questionsUrl` is not a version-named `questions-*.json` file in its own `data/` directory on the same origin (no query, no fragment, no redirects), or whose `contentVersion` differs from the file's.

```bash
node scripts/validate-content.mjs public/data/questions-2026.10.0.json
```

The CLI prints one line per rule and exits non-zero on rejection. A rejected release is also ignored by the app if it ever reaches a device, so the validator is the gate, not the only guard.

### Publishing a release

1. Export approved rows from the editorial sheet into `questions-<contentVersion>.json` (only `review_status = approved` and `active = TRUE` rows; alternatives never ship).
2. Run the validator on it. Fix and re-export until it passes.
3. Upload the file next to the app under `data/`. It is immutable from now on.
4. Compute its SHA-256 (`shasum -a 256 <file>`).
5. Write `data/manifest.json` with a **higher `releaseSeq`** than the current one, the new `contentVersion`, `questionsUrl` pointing at the file (relative), and the hash. Upload it last.

Devices pick it up on the next launch or when the app returns to the foreground (checked at most every 10 minutes): the app downloads the file, verifies the hash, validates it, stores it, and shows "New version available — reload". The deck on screen never changes until the user reloads. Any failure (timeout, bad hash, invalid content, unsupported schema, full storage) keeps the last known good deck silently.

### Rolling back

Publish a new `manifest.json` with a **higher `releaseSeq`** whose `questionsUrl` and `sha256` point at the **older** release file. `releaseSeq` is the activation order; `contentVersion` is just a label. Nothing needs to be deleted.

### Editorial sheet contract

One row per canonical question: `id, category, active, source, ro, en, hu, alternatives (private), disposition, review_status, owner, notes`. The publish job (a separate small script owned by IT, out of scope here) exports only `review_status = approved` and `active = TRUE` rows; `alternatives`, `disposition`, `owner` and `notes` never leave the sheet.

## Install on iPhone

Open the app URL in Safari → **Share** → **Add to Home Screen**. It then opens full-screen ("Icebreakers") and works offline. Android Chrome offers "Install app" from the browser menu. The app shows a one-line, dismissible hint on iPhone Safari until installed.

## Privacy

Aplicația nu colectează date personale: fără cont, fără analytics, fără cookies. Limba, favoritele și istoricul rămân pe acest dispozitiv. Serverul de găzduire păstrează jurnale tehnice minime de acces.

The app collects no personal data: no account, no analytics, no cookies. Language, favourites and history stay on this device. The hosting server keeps minimal technical access logs.

Technically: no cookies, no third-party requests (fonts are self-hosted), no analytics or crash SDK. The only network calls after install are `data/manifest.json` and the same-origin release file it points at. Local state lives in one `localStorage` key (`autonom-icebreakers-v1`) and in Cache Storage: `autonom-icebreakers-content` (validated releases + pointer), `content-files` (Workbox runtime cache of downloaded release files, max 6, with its `workbox-expiration` IndexedDB bookkeeping) and the `workbox-precache-*` app-shell cache. "Reset local data" in the About sheet clears favourites and history (localStorage only).

## Non-goals (v1)

Login, accounts, profiles, cloud sync · push notifications · analytics, telemetry, cookies · payments, ads · sharing question text or images · streaks, scores, gamification · rooms, multiplayer, QR join · settings screen · onboarding tour · category management or in-app editing · visible alternative phrasings · a sixth "Classic" category · Hungarian UI · native wrappers · backend API · anything needing a Google account at runtime · hot-swapping content while a card is on screen.

## Project layout

```
public/            static assets: icons, fonts (Titillium Web, OFL), manifest.webmanifest, data/
src/
  App.tsx          state wiring: persistence, draw actions, keyboard, live region
  types.ts         data model, categories, persisted state
  i18n.ts          UI strings (RO/EN) — every visible string lives here
  state/deck.ts    pure draw functions (global no-repeat, history walk, exhaustion, release activation)
  state/storage.ts localStorage read/write with sanitising parse
  content/validate.js    release validation rules shared with the CLI
  content/loadContent.ts startup order, manifest check, verify/validate/stage, offline-ready
  components/      TopBar, ScopePicker, Card, Controls, PresentLayer, AboutSheet, InstallHint, Sheet, UpdateBanner
  pwa.ts           service-worker registration (prompt mode, never auto-reload)
scripts/validate-content.mjs   CLI validator
tests/             Vitest: deck, storage, content validation + CLI, update pipeline
```

## Accessibility

Every control is a real `<button>` with a visible focus ring; hit targets are ≥ 48 px; question and chrome contrast meet 7:1 / 4.5:1 on the brand tokens in both colour schemes; the question is announced through a polite live region without moving focus; sheets are `role="dialog"` with focus trapped and restored; state is never colour-only (`aria-pressed`, `aria-current`, underline/✓ glyphs); text is in `rem` and the layout scrolls rather than hiding controls at 200 % text size or in landscape; `prefers-reduced-motion` disables the card transition.

**VoiceOver (iOS) and TalkBack (Android): not yet run** — no phone or simulator was available in the build environment. To be done on a real device before rollout and recorded here.

## Verification notes (2026-09-17, prototype build)

Verified in the build environment: `npm run build` exit 0 · `npm test` green — deck, storage, validation + CLI pass/fail, update pipeline (upgrade, rollback, bad checksum, wrong schema, invalid content, version mismatch, off-origin/traversal URLs never fetched, stalled body timeout, cleanup failure after commit, older download finishing after a newer commit, canonical-field storage), App mount persistence · RO/EN toggle never draws and sets `<html lang>` · global no-repeat across category ↔ all · category exhaustion → All remaining / Restart · prev/next history walk · favourites browse without drawing · present mode hides chrome and starts off on relaunch · reload restores the last card · reset local data · publishing a higher `releaseSeq` → banner with the card unchanged → active after reload · rollback (higher seq → older file) → active after reload · dark and light schemes · phone and tablet layouts · console output limited to `deck <contentVersion>` · no requests beyond app assets, `manifest.json` and release files.

Not covered by tests: Cache Storage quota denial / `put()` failure (the code path keeps last-known-good by construction, not by test), the code-update (waiting worker) lifecycle, real touch gestures.

**Independent review:** `reviews/2026-09-17_review_codex_v1.0.md` (Codex, against v0.1.0). v0.1.1 addresses its findings F1–F13 and adopts five wording edits from F14; see `DECISIONS.md` § "v0.1.1 — review response".

Verified on the deployed test site (`https://stv008.github.io/autonom-icebreakers/`, same day): service worker registers and activates, Workbox precache holds the 13 expected entries, the app becomes controlled on the second load and the About sheet reports "Available offline".

Still not verified: an actual offline launch on a phone in airplane mode; the code-update banner path (needs a second deploy while a client is open); Space/Enter on a focused button (the automation cannot trigger native button activation; the handler is code-verified to ignore button targets); VoiceOver / TalkBack. The embedded review browser used during the build refuses service-worker script fetches on `localhost`, so SW behaviour was only checked on the HTTPS deployment.

## Test site

A public test deployment is published from `main` by `.github/workflows/deploy-pages.yml` (validate → test → build → GitHub Pages): **https://stv008.github.io/autonom-icebreakers/** — real deck (pre-audit), placeholder icon, not the rollout host. Every push to `main` redeploys in about two minutes. Content release notes live in `content/`.
