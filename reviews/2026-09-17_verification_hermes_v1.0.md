# Verification of v0.1.1 — independent third review

Internal Confidential · 2026-09-17 · Reviewer: **Hermes** (third reviewer)

Scope: confirm or refute the claim that tag `v0.1.1` addresses findings **F1–F14** of
`reviews/2026-09-17_review_codex_v1.0.md`. Spec: `BUILD_PROMPT.md` v1.0. Verification only —
no source, config, content or test file in this repository was modified, and nothing was committed.

## 0. Verification conditions (read this first)

**The repository moved during the review.** `git describe --tags` returned `v0.1.1` at the start of
the session (20:2x). While the first `npm test` was running, commit **`321d678`** ("content: release
2026.09.2 …") landed at **20:38:52** and `main` advanced to it. Re-checked at the end:
`git describe --tags` → **`v0.1.1-1-g321d678`**.

Consequences, and how I handled them:

- Every claim about the **tag** was re-verified against a **frozen export** of it:
  `git archive v0.1.1 | tar -x -C /tmp/verify-v011`, then `npm ci` in that directory. `src/`,
  `vite.config.ts`, `package.json`, `vitest.config.ts`, `tests/app.test.tsx`, `src/styles.css` are
  byte-identical between `v0.1.1` and `321d678`; only `DECISIONS.md`, `README.md`, `public/data/*`,
  `content/*` and the two older test files changed. Sections (a)–(c) below are the **tag**.
- **There is no `v0.1.0` tag.** The task's `git diff v0.1.0..v0.1.1` is not runnable; I used
  commit `63514b6` (the v0.1.0 build) as the base.
- The **deployed site no longer serves v0.1.1**: `main`'s push redeployed GitHub Pages, so
  `https://stv008.github.io/autonom-icebreakers/` now runs the 2026.09.2 deck. The task asked me to
  confirm a `v2026.09.1-sample` footer there; that expectation cannot be met any more (see (d)).

## (a) Build, test, engine, bundle and deployed-site results

### Engine

`package.json:6-8` declares `"engines": { "node": ">=22.12" }`. My environment: **Node v26.8.2**,
npm 11.19.1 → satisfies it.

### `npm ci`

```
added 412 packages, and audited 413 packages in 3s
116 packages are looking for funding
found 0 vulnerabilities
npm warn deprecated glob@11.1.0: Old versions of glob are not supported, and contain widely
  publicized security vulnerabilities …
npm warn install-scripts 1 package has install scripts not yet covered by allowScripts:
npm warn install-scripts   fsevents@2.3.3 (install: (install scripts present))
```

Exit **0**. Both warnings are unchanged from v0.1.0 and are the same two Codex reported; both are
transitive build-tool dependencies. DECISIONS.md §v0.1.1 records them as "noted, not actioned" —
that is an explicit decline, not an oversight.

### `npm test` — frozen tag `v0.1.1`

```
Test Files  5 passed (5)
     Tests  66 passed (66)
```

Exit **0**. Re-run **15 consecutive times: 15/15 PASS, 66/66.** For corroboration on a different
tree, the working directory at `321d678` (release-2026.09.2 content, the updated test files) was also
run **12 consecutive times: 12/12 PASS, 66/66** — so the suite is not flaky on either tree, and the
single failure in §0 is attributable to the tree changing *during* a run. Per-file: `app.test.tsx` 2,
`content.test.ts` 25, `deck.test.ts` 13, `loadContent.test.ts` 19, `storage.test.ts` 7 = 66
(v0.1.0 was 51 in 4 files). The stderr line
`REJECTED cannot read or parse …/bad.json: Expected property name or '}' …` is the expected output
of the deliberate malformed-JSON CLI test, not a failure.

**One observed failure, now attributed to the concurrent commit — not to the tag.** At **20:37:46**,
in the not-yet-frozen working tree, the first `npm test` exited **1**:

```
FAIL tests/loadContent.test.ts > checkForUpdate > activates a rollback: higher seq pointing at an
older file; the staged copy carries the manifest seq
AssertionError: expected 'failed' to be 'staged'
  tests/loadContent.test.ts:156
    155| publish(NEXT + 1, "2026.09.1-sample", "questions-2026.09.1-sample.…
    156| expect((await mod.checkForUpdate(NEXT, { force: true })).kind).toB…
```

The printed source is the **tag's** version of the file, which hardcodes the version string
(`tests/loadContent.test.ts:155`). At that moment `public/data/questions.json` had already been
swapped to the 2026.09.2 deck (file mtime 20:37) while the tag's test still asserted
`"2026.09.1-sample"`. The rollback test builds the served release body from the *imported* bundled
deck (`clone()`) but labels the manifest with a hardcoded string; once those diverge, the new
`contentVersion` gate (`src/content/loadContent.ts:220`) correctly rejects the release and returns
`failed`. That the same commit `321d678` rewrote exactly these assertions to `BASE_VERSION`
(`tests/loadContent.test.ts`) is consistent. Vitest's per-file workers can hold different module
graphs, which is why only one test file went red rather than two. **Verdict: environmental, not a
tag defect** — but it is also a live demonstration of N3 below.

### `npm run build` — frozen tag

```
tsc -b && vite build
✓ 35 modules transformed.
dist/index.html                                  1.25 kB │ gzip:  0.53 kB
dist/assets/index-BEQ7tDlT.css                   7.43 kB │ gzip:  2.27 kB
dist/assets/workbox-window.prod.es5-Bd17z0YL.js  5.65 kB │ gzip:  2.20 kB
dist/assets/index-D5hYCOhV.js                  252.78 kB │ gzip: 79.48 kB
✓ built in 182ms
PWA v1.3.0 · mode generateSW · precache 13 entries (363.99 KiB)
```

Exit **0**, no warnings. Delta vs v0.1.0: main JS **250.58 → 252.78 kB** (+2.20 kB, +0.72 kB gzip),
CSS 7.59 → 7.43 kB. No chunk-size warning from Vite. `dist/sw.js` is 2 lines, minified onto line 1.

**Precache list** (`dist/sw.js`, re-derived independently; byte sum **372,730 = 363.99 KiB** — 13
entries, matching the build report):

```
manifest.webmanifest                          data/questions.json
index.html                                    fonts/TitilliumWeb-{SemiBold,Regular,Bold}.woff2
icon-192.png  icon-512.png                    assets/workbox-window.prod.es5-Bd17z0YL.js
favicon.svg   apple-touch-icon.png            assets/index-D5hYCOhV.js
                                              assets/index-BEQ7tDlT.css
```

`data/manifest.json` and `data/questions-*.json` are **not** precached (`vite.config.ts:15-17`),
`fonts/OFL.txt` excluded. Runtime routes: `NavigationRoute → index.html`, `questions-*.json` →
`CacheFirst` in `content-files` (max 6), `data/manifest.json` → `NetworkOnly`. `skipWaiting`
appears **only** inside the `SKIP_WAITING` message handler; the generated worker has **no** `install`
or `activate` listener and **no** `clientsClaim`/`clients.claim`. §13 satisfied.

### `npm run validate`

Frozen tag (`public/data/questions.json`): **PASS, 0 warnings**, exit 0.
Current `main` (2026.09.2 real deck): **PASS, 1 warning** —
`questions[76] (va-002): ro is 234 characters (> 220)` (a warning by §12 design, not a rejection).

### Deployed test site — `https://stv008.github.io/autonom-icebreakers/`

Observed on a genuinely clean profile (service worker unregistered, all caches deleted, storage
cleared), with `console.log`/`fetch` instrumented before first script execution.

| Check | Result |
|---|---|
| Footer | **`106 remaining · v2026.09.2`** — *not* `v2026.09.1-sample` |
| About sheet | `Content version v2026.09.2 · Release #3 · ● Available offline` |
| Console, load 1 (first visit, uncontrolled) | exactly `["deck 2026.09.2"]` |
| Console, load 2 (controlled) | exactly `["deck 2026.09.2"]` |
| Uncaught errors / unhandled rejections | none, both loads |
| `navigator.serviceWorker.controller` | `false` on load 1, **`true`** on load 2 |
| Cookies | `document.cookie` = `""`; no `Set-Cookie` header on the origin |
| `localStorage` keys | exactly `["autonom-icebreakers-v1"]` |
| Cache Storage keys | `autonom-icebreakers-content`, `workbox-precache-v2-https://stv008.github.io/autonom-icebreakers/` |
| HTTP status, all 14 app assets incl. `favicon.svg`, `apple-touch-icon.png`, `icon-192/512.png`, `manifest.webmanifest`, `sw.js`, 3 woff2, `data/manifest.json`, `data/questions.json`, `data/questions-2026.09.2.json` | **200**, no 404 |

All requests on both loads, complete list (10 entries each): the 3 woff2, `assets/index-D5hYCOhV.js`,
`assets/index-BEQ7tDlT.css`, `assets/workbox-window.prod.es5-Bd17z0YL.js`, `manifest.webmanifest`,
`data/questions.json`, `data/manifest.json`, `favicon.svg`. **All same-origin. No third-party
origin, no `fonts.googleapis.com`, no analytics/telemetry, no `questions-2026.09.2.json` fetch**
(correct: the deployed manifest's `releaseSeq` 3 equals the bundled deck's, so there is no update).

> Note on the page title: the automation harness reported `document.title` with a decorating emoji
> prefix. The served HTML contains `<title>Autonom Icebreakers</title>` with no emoji, and
> `index.html` is unchanged since v0.1.0. Harness artefact, not an application finding.

### Regression walkthrough on the deployed build (app code identical to the tag)

| Step | Observed |
|---|---|
| Picker | `✓ Toate întrebările / 91 · Eu: viață și vise / 32 · Valori / 29 · Creștere personală / 19 · Relații / 11 · Profesional / 0 · Favorite / 1` |
| Draw through a full category | Professional: 10 cards drawn, **10 distinct**, then `You have seen every question in this category.` + `All remaining` \| `Restart deck`; footer `0 remaining` |
| Next past exhaustion | notice persists, Next stays enabled, no crash, no repeat |
| `All remaining` | scope → `All questions`, footer `95 remaining`, new card drawn |
| Back / Next walk | 4 forwards then 4 backwards retrace **exactly** in reverse order |
| Star | `aria-pressed` true; question text unchanged (the card's `innerText` differs only by ☆→★) |
| RO│EN toggle | card + chrome switch instantly, `document.documentElement.lang` = `ro`, footer `91 rămase`; the question shown is the **same id**, no draw |
| Favourites scope | browse-only; `seenIds` length **16 before and after**; selecting it keeps the current card |
| Present mode | `.app` gains `app--present`, `html` gains `present`, footer and picker removed, controls = `RO │ EN │ Ieși din ecran complet │ ← Înapoi │ Următoarea →` |
| Reload while presenting | present mode **off** on relaunch; language, favourite and current card (`ml-033`) restored |
| Console across the walkthrough | one `deck 2026.09.2` line per load, zero errors |

Everything the Codex review exercised in v0.1.0 still behaves the same.

## (b) F1–F14 verdict table

Method: each finding was re-reproduced with **my own** probes written from the Codex description
against the frozen tag, not by reading the v0.1.1 diff. Probes ran the **real** `loadContent.ts` and
the real `validate.js` with fake `fetch`/`caches`/`document.baseURI`; the App-level probes mounted
the real `<App />`. Probe files live only in `/tmp/verify-v011/tests/` and were never added to the
repository.

| # | Verdict | Fix location | How verified |
|---|---|---|---|
| **F1** concurrent commits regress seq | **Partially fixed** | `src/content/loadContent.ts:163-185` (Web Lock, pointer re-read inside the critical section at `:166-167`, prune only lower seqs at `:172-175`) | Two interleavings. **(a)** Older download gated at the release fetch, newer check runs to completion, older resumes → older returns `none`, pointer stays `NEXT+1`, only `release-(NEXT+1)` cached. **(b)** Without `navigator.locks`, an older writer paused **at its pointer swap** → observed `afterB=4 afterA=3 aResult=staged keys=content-release\|release-4`: the pointer was rolled back to 3 and its target entry had already been pruned. See **N1**. |
| **F2** unknown question fields retained | **Fixed** | `src/content/validate.js:194-196` (reject), `:99-116` `canonicalDeck`, applied at `:263`; staged deck built from it (`loadContent.ts:219-224`) | `notes` and `alternatives` injected into `questions[0]`: validator → `ok=false, errors=question_fields`; client → `failed`, cache empty. Cached JSON keys asserted to be exactly `contentVersion, publishedAt, questions, releaseSeq, schemaVersion`. |
| **F3** manifest may point off-origin | **Fixed** | `src/content/loadContent.ts:76-89` `resolveReleaseUrl` (origin, `data/` prefix, `questions-*.json`, no query/fragment), called at `:213-214` **before** the release fetch; `redirect:"error"` at `:107`; `contentVersion` equality at `:220` | 10 hostile `questionsUrl` values (`https://elsewhere.invalid/…`, `//elsewhere.invalid/…`, `../questions-x.json`, `../../etc/…`, `./sub/…`, `./questions.json`, `./questions-x.txt`, `?x=1`, `#f`, `""`) → every one `failed` with **exactly 1 request (the manifest)** and an empty cache. Manifest/file `contentVersion` mismatch → `failed`, nothing cached. |
| **F4** HTML checked only in `ro`/`en` | **Fixed** | `src/content/validate.js:138-142` `checkHtml`, applied to `:165` `contentVersion`, `:169` `publishedAt`, `:209` `id`, `:228` `hu`, `:242` `ro`/`en` | `<b>hello</b>` in `hu`, `<b>x</b>` in `contentVersion`, `<b>ml-001</b>` in `id` → all rejected (`errors=no_html`) by the validator **and** by the client path; CLI exits 1 on each. |
| **F5** offline readiness too optimistic | **Partially fixed** | `src/content/loadContent.ts:237-249` — requires a controller, `index.html` in a cache (`:241`), and a **validated** deck (saved release at `:243`, else parse+validate the cached fallback at `:244-246`) | Cached `not valid JSON` fallback → **false** (was true in v0.1.0). Structurally valid JSON failing validation → **false**. Shell cached + validated fallback → **true**. No controller → false. Shell absent → false. Residual: readiness is still only recomputed on load and `visibilitychange`, so it is not refreshed when a controller appears. See **N4**. |
| **F6** timeout ends at headers; fallback unbounded | **Fixed** | `src/content/loadContent.ts:103-113` `fetchBytes` (timer cleared at `:111`, after `res.arrayBuffer()` at `:109`); `BUNDLED_TIMEOUT_MS = 8000` at `:16`; `readBundledDeck:135-142` | A release whose headers arrive then stall: `checkForUpdate` → `failed` after 4100 ms of fake time, cache empty. A bundled `questions.json` that stalls: `loadInitialDeck()` → `null` after 8100 ms (Retry state, not a blank card). |
| **F7** cleanup failure reported as failure | **Fixed** | `src/content/loadContent.ts:169-179` — release put → pointer put (commit point) → prune inside `try/catch` that returns `true` regardless | `cache.keys()` throws after both puts → result **`staged`**, `readSavedRelease().releaseSeq` = `NEXT`. Injection on the **pointer put** instead → `failed`, pointer unchanged at the previous seq, previous release still returned by `readSavedRelease()`. |
| **F8** dismissal permanent | **Partially fixed** | `src/App.tsx:55-58` `pendingUpdate`/`dismissedKey`, `:88-91` `onContentUpdate` keys by `content:<releaseSeq>`, `:304` `bannerVisible`, `:332` `onDismiss` | Mounted the real `<App />`, staged release N → banner visible; clicked Dismiss → hidden; advanced `Date.now` past the 10-minute throttle, staged release N+1, dispatched `visibilitychange` → banner **visible again**. Content releases are keyed correctly. The service-worker case is keyed with the constant `"code"`, so a *later* waiting worker in the same session is still hidden. See **N2**. |
| **F9** wake lock not re-acquired | **Fixed** | `src/components/PresentLayer.tsx:26-28` (`release` listener clears the sentinel), `:33-36` (re-acquire when `null` or `.released`), `:45` (release on exit) | Mocked `navigator.wakeLock`: presenting → 1 request; browser auto-releases (`released=true` + `release` event) then `visibilitychange` while still presenting → **2 requests**. Exit → sentinel released, no further request. `request` throwing (denied) → caught, no crash. |
| **F10** null persisted before load | **Fixed** | `src/App.tsx:72-75` — persistence gated on `phase.status === "ready"` | Saved `lastQuestionId: "va-004"` in `localStorage`, `fetch` stubbed to a promise that never resolves, mounted `<App />`, flushed twice → stored `lastQuestionId`, `seenIds` and `favorites` all unchanged. Control case: with content resolving, the same value is persisted normally. |
| **F11** dialog focus lost; unstable `onClose` | **Fixed** | `src/components/Sheet.tsx:22-23` (`onCloseRef`), effect deps narrowed to `[open]` at `:67`, trap recovery at `:44-52`, `focusin` recovery at `:55-58`, opener restore guarded by `isConnected` at `:65`; `src/components/AboutSheet.tsx:27-32` moves focus with the replaced button | In the real About sheet: after open, `activeElement` inside the dialog; click **Reset local data** → focus lands on **"Yes, reset"**, still inside the dialog; click **Cancel** → focus lands back on **"Reset local data"**, still inside. Closing restores focus to the About button. My own focus assertion ran on both steps, so the "between actions" gap Codex saw is gone. |
| **F12** extra palette colours | **Fixed** (documented) | `src/styles.css:25-50`; DECISIONS.md:49 | Every hex in `src/styles.css` and in `dist/assets/index-BEQ7tDlT.css` is a §9.3 token or an alpha derivative of one: `#10069f #1a1a1a #5c5c6b #d9d9e3 #f4f4f9 #ffffff #0f0f1a #1a1a2b #f2f2f7 #a9a9b8 #2e2e44 #8fa3ff`, plus `#0000` (transparent), black-alpha backdrop/shadow and `#10069f0f/#10069f14` shadow tints. **No red or green remains**; `#c62828`, `#ff8a80`, `#2e7d32`, `#81c784` are gone. Decision 32 now states "No other colours." |
| **F13** documentation overstates tooling/cache/coverage | **Partially fixed** | `package.json:6-8`; `README.md:24`, `:139`, `:173` | README line 24 no longer says "Node 20+"; it says "Node **22.12+**" and points at `engines`. The storage paragraph (tag `README.md:139`) now lists **all four** surfaces: the `localStorage` key, `autonom-icebreakers-content`, `content-files` (with `workbox-expiration` IndexedDB bookkeeping) and `workbox-precache-*`. Coverage is qualified at `:173` ("Cache Storage quota denial / `put()` failure …, the code-update (waiting worker) lifecycle, real touch gestures"). Residual: `>=22.12` is still narrower-than-required. See **N6**. |
| **F14** sample wording | **Fixed as scoped** | `public/data/questions-2026.09.1-sample.json`; DECISIONS.md:75 | 5 of Codex's 6 edits adopted and confirmed by byte-level diff of the two release files: `ml-003` ("o zi complet liberă"), `va-007` ("Ce sfat primit cândva dai mai departe și astăzi?"), `pg-002` ("Ce ai învățat dintr-o greșeală mică?" / "What did you learn from a small mistake?"), `pg-004` ("What most recently took you out of your comfort zone?"), `pr-004` ("Which tool or process has helped most …"). `ml-001` was **declined with a stated reason** — DECISIONS.md:75 records that it is the prompt's own §5.1 example. That reason is sound: §5.1 literally specifies that wording. Same 40 ids, same categories, all five categories still 8 questions each. |

**Section (d) of the Codex review — every requested reversal, checked:**

| Codex asked | Status |
|---|---|
| Reverse decision **15** (reject unknown question fields) | **Applied** — `DECISIONS.md:26` "Fixed: rejected at the gate; client stores canonical fields only"; verified by probe F2. |
| Reverse decision **14** (readiness definition) | **Applied** — `DECISIONS.md:25` now "controller **and** `index.html` in a cache **and** (validated saved release **or** cached bundled deck validates)"; verified by probe F5. |
| Decision **12** — keep immutable-entry/pointer, change concurrency + cleanup | **Applied** — `DECISIONS.md:23` documents the Web Lock, pointer re-read and lower-seq-only prune. Concurrency change is incomplete without Web Locks; see **N1**. |
| Reverse decision **7** (no component tests before claiming DoD) | **Partially applied** — `DECISIONS.md:76` "Partially adopted: focused App tests for mount persistence; no broad UI coverage". `tests/app.test.tsx` adds 2 tests. No interaction/UI coverage was added, so this is an explicit, reasoned partial decline. |
| Decision **34** — keep policy, repair implementation | **Applied** — `DECISIONS.md:51` "Dismiss hides **that** update only (keyed `code` or `content:<releaseSeq>`)". Content path verified; the `code` key is still constant — see **N2**. |
| Decision **38** — qualify, don't silently waive | **Applied** — `README.md:167` "**VoiceOver (iOS) and TalkBack (Android): not yet run** — no phone or simulator was available … To be done on a real device before rollout and recorded here." |
| Decision **25** — modifier/focus guards reasonable | **No change needed**, and none made. |
| Decision **11** — do *not* reverse the seq override | **Kept** — `DECISIONS.md:77` "Kept, as the review agrees". The manifest/file `contentVersion` consistency requirement Codex asked for alongside it was added (`loadContent.ts:220`). |
| Decisions **17–24** | **No change**, correctly. |
| Decision **32** — keep `--on-blue`, do not read it as authorising red/green | **Applied** — `DECISIONS.md:49` keeps the derivation and records the removal of the status colours. |
| Note `glob` deprecation / `fsevents` install script | **Explicitly declined** — `DECISIONS.md:78` "Noted, not actioned: transitive build-tool dependencies with no runtime exposure". |
| Decision completeness (extra palette, `content-files` cache) | **Applied** — both are now recorded (`DECISIONS.md:23`, `:49`). |

## (c) New defects introduced by v0.1.1

### Critical

None.

### Major

**N1 — F1's fix is only real where Web Locks exists; the unlocked fallback can leave the pointer
pointing at a pruned entry.**
`src/content/loadContent.ts:181-184`:

```ts
if (typeof navigator !== "undefined" && "locks" in navigator && navigator.locks) {
  return navigator.locks.request(LOCK_NAME, run);
}
return run();                       // ← no mutual exclusion
```

`commitRelease` is `open → read pointer → put release → put pointer → prune`, with `await` points
between every step. Without a lock, two writers interleave and the second-to-last writer wins.
Reproduction (my probe, deterministic, no timing luck — the older writer is held at its own pointer
put):

```
PROBE F1c: afterB=4 afterA=3 aResult=staged keys=content-release|release-4
```

A targets seq 3, B targets seq 4. B completes fully and prunes `release-3`. A then resumes, writes
its pointer, and reports `staged`. End state: the pointer says `releaseSeq 3` → `key: "release-3"`,
but the only entry in the cache is `release-4`. On the next launch `readSavedRelease()`
(`loadContent.ts:120-132`) reads the pointer, fails to `match` the missing entry and returns `null`,
so `loadInitialDeck()` silently falls back to the bundled deck — for a device in the field, the
**sample** deck. That is the exact consequence Codex listed ("or fall back after a missing pointer
target") and it contradicts "any failure keeps last-known-good".

Exposure: real browsers on Autonom's target devices all implement Web Locks (Chrome 69+, Firefox
96+, Safari 15.4+), so this is latent rather than observed. Two things make it a Major rather than a
Nit: (i) the fallback is deliberate, shipped code, so the F1 claim is not universally true; (ii) the
guard `"locks" in navigator && navigator.locks` is **never exercised by any test** — the vitest jsdom
environment has no `navigator.locks` (my probe printed `PROBE navigator.locks = undefined`), so the
repository's own "older download that finishes last" test (`tests/loadContent.test.ts:249-266`) runs
on the *unlocked* path and passes only because that particular interleaving pauses at the fetch,
before `commitRelease`, where the in-commit pointer re-read does save it. The lock path itself has
zero coverage.

Suggested fix: make the pointer re-read and both writes atomic even without Web Locks — e.g. derive
the committed entry's key from the pointer read *inside* a compare-and-swap that re-checks after the
release put, keep at least the entry the pointer currently names during pruning (`prune` must never
delete `current.key`), and route the no-lock case through a `localStorage`/`BroadcastChannel`
mutex or simply refuse to prune when `navigator.locks` is unavailable. Add a `navigator.locks` stub
to the test environment so the locked path is actually covered.

**N2 — the documented rollback procedure now produces a silently ignored release.**
`src/content/loadContent.ts:220` rejects a release whose `contentVersion` differs from the manifest's
— a reasonable requirement for upgrades, and the one Codex asked for. But the tag's own README
contradicts it:

- `README.md:103` — "The app additionally refuses a manifest whose … **`contentVersion` differs from
  the file's**".
- `README.md:123` (Rolling back) — "Publish a new `manifest.json` with a **higher `releaseSeq`**
  whose `questionsUrl` and `sha256` point at the **older** release file. `releaseSeq` is the
  activation order; **`contentVersion` is just a label.**"

Following §"Rolling back" verbatim — keep the newer label, point at the older file — yields
`checkForUpdate` → `failed`, no banner, no staged release, no visible error. The operator sees
nothing and believes the rollback shipped. Verified: my probe published manifest
`contentVersion: "2026.10.0"` with a file whose `contentVersion` is `"2026.10.1"` → `failed`, cache
untouched. `README.md:117` (publish step 5, "the new `contentVersion`") has the same problem in
reverse. This is not hypothetical: it is the mechanism that turned my first `npm test` red (§0),
because the tag's own test at `tests/loadContent.test.ts:155` hardcodes the label while the file body
is taken from the bundled deck.

Suggested fix: state the invariant explicitly in README — `manifest.contentVersion` **must equal**
the target release file's `contentVersion`, so a rollback manifest carries the *older* label — and
correct "`contentVersion` is just a label". Consider logging the rejection reason (currently every
failure path returns the same `{kind:"failed"}` with no diagnostic).

### Minor

**N3 — the v0.1.1 tests are coupled to the bundled deck's exact strings, so changing content breaks
`npm test`.**
`tests/loadContent.test.ts:146`, `:155`, `:158`, `:227` hardcode `"2026.09.1-sample"`;
`tests/content.test.ts:38` asserts the bundled deck's `contentVersion` matches `/-sample$/`; and
`tests/app.test.tsx:34,43,52` hardcode the id `va-004`. Every one of these breaks the moment the
bundled fallback changes — which is precisely what happened at 20:37 and what commit `321d678` had
to rewrite (`tests/loadContent.test.ts` now derives `BASE_VERSION = sample.contentVersion`;
`tests/content.test.ts` dropped the `-sample$` assertion). The tag itself is green 15/15, so this is
test fragility, not a product defect — but it means a content-only release cannot be validated
without touching tests, and a red suite will be indistinguishable from a real regression.
Suggested fix: derive every expected version from the imported deck (as `321d678` did) and pick
fixture ids by property rather than by literal.

**N4 — F5's "refresh when a controller appears" sub-point was not addressed.**
`isOfflineReady()` (`loadContent.ts:237-249`) requires `navigator.serviceWorker.controller`, and the
generated worker has **no `clientsClaim`** (verified in `dist/sw.js`), so a first visit is
uncontrolled. It is re-evaluated only on initial load (`src/App.tsx:136-138`) and on
`visibilitychange` (`:152`). A user who installs the app and stays on the page therefore keeps seeing
"Not yet available offline" until a reload, even though by then the shell and deck are both cached.
Suggested fix: also evaluate on `navigator.serviceWorker` `controllerchange` and after
`navigator.serviceWorker.ready`.

**N5 — a failed update check consumes the 10-minute throttle window.**
`loadContent.ts:196-198` sets `lastCheckAt = now` *before* the manifest fetch. A transient failure
(offline moment, 503, a stalled body) therefore suppresses the next foreground retry for ten minutes,
delaying a legitimate update. The check is cheap and idempotent; only a completed check should count.
Suggested fix: move the assignment to the end, or ignore failures when computing the throttle.
Pre-existing in v0.1.0, not introduced by this release, but it is on the path F6 touched.

**N6 — the declared engine is still narrower than the locked dependency set.**
`package.json:7` `"node": ">=22.12"`. Measured from `package-lock.json`:
`vitest@5.0.1` → `^22.12.0 || ^24.0.0 || >=26.0.0`, `jsdom@30.1.0` → **`^22.22.2 || ^24.15.0 ||
>=26.0.0`**, `vite@8.3.0` → `^20.19.0 || >=22.12.0`. The strictest constraint is jsdom's: Node
22.12–22.21, all of 23.x, and 24.0–24.14 satisfy the declaration but violate a locked dev
dependency. `README.md:24` ("Node **22.12+**") inherits the same claim. Since `engines` is advisory
unless `engine-strict` is set, this is documentation accuracy rather than a breakage — but it is the
residue of F13, and the CI workflow (`.github/workflows/deploy-pages.yml`) pins `node-version: 22`,
so CI and the declaration can drift. Suggested fix: declare `^22.22.2 || ^24.15.0 || >=26.0.0` (or
widen jsdom), and align README.

**N7 — the deployment no longer corresponds to the tagged artefact.**
`main` advanced to `321d678` while v0.1.1 was being verified, and the Pages workflow deploys on
every push, so the test site now serves the 2026.09.2 deck with a `v2026.09.2` footer. Anyone
verifying "the v0.1.1 deployment" — including the task that asked me to confirm `v2026.09.1-sample` —
is now looking at different content. Not a code defect; a process gap: the tag is not what is
deployed, and the release file `questions-2026.09.2.json` plus `content/RELEASE_2026.09.2.md` also
landed with the tag's documentation already describing them (`DECISIONS.md` §"Content release
2026.09.2" was written at 20:19, the files at 20:37). Suggested fix: deploy from tags, or state the
deployed commit in README.

### Nit

- `src/content/loadContent.ts:14` — `RELEASE_FILE = /^questions-[A-Za-z0-9._-]+\.json$/` accepts
  degenerate names such as `questions-..json`. Harmless: the file still has to pass same-origin,
  same-directory and hash checks.
- `src/content/loadContent.ts:169-170` — a crash between the release put and the pointer put leaves
  an unreferenced `release-<seq>` entry. It is eventually removed by a later commit's prune
  (`:172-175`), so this is bounded, not a leak that grows without limit.
- `src/styles.css` still contains `#00000073` (the sheet backdrop) and black-alpha shadows, which
  are not §9.3 tokens. Neutral overlays of the sort Codex's F12 did not challenge, and the `--shadow`
  token predates v0.1.1, but they are the only remaining colours outside the spec.
- `src/App.tsx:302-303` — `canNext` stays `true` at exhaustion and `canPrev` is `true` whenever
  `exhausted !== null` even with an empty history; both are no-ops rather than broken, but Next at
  exhaustion redraws nothing and Prev can do nothing while enabled. Carried over from v0.1.0.
- The CLI's `Date.parse` acceptance is broader than "ISO-8601" as worded
  (`src/content/validate.js:166-168`). Codex flagged this as a nit; still open.

## (d) Out-of-scope changes found

`git diff 63514b6..v0.1.1 --name-status` (there is no `v0.1.0` tag; `63514b6` is the v0.1.0 build), plus
`git diff v0.1.1..321d678`:

| Change | Unexplained? |
|---|---|
| `src/App.tsx`, `src/components/{Sheet,AboutSheet,PresentLayer}.tsx`, `src/content/{loadContent.ts,validate.js}`, `src/styles.css`, `tests/{loadContent,content}.test.ts`, `package.json`, `README.md`, `DECISIONS.md`, `public/data/manifest.json`, `public/data/questions-2026.09.1-sample.json` | **No** — all sit inside F1–F14 or the (d) reversals. |
| `tests/app.test.tsx` (new, +60) | **No** — Codex (d)/decision 7. |
| `tests/mocks/pwa-register.ts` (new) + `vitest.config.ts` alias and `.tsx` include | **No** — prerequisite for `tests/app.test.tsx`; without the stub the App import fails on `virtual:pwa-register`. |
| `.github/workflows/deploy-pages.yml` (new, +44) | **No** — but note it predates the fix commit (it is commit `82cd26f`, "ci: deploy dist to GitHub Pages on push to main", inside the `63514b6..v0.1.1` range). Documented at `README.md` §"Test site" and `DECISIONS.md:38/90`. It runs `npm run validate` → `npm test` → `npm run build` on Node 22. |
| `.gitignore` +`session-logs/` | **No** — housekeeping; the directory exists locally and is untracked, consistent with the workspace convention. |
| `reviews/2026-09-17_review_codex_v1.0.md` (new, +217) | **No** — the prior review being answered. |
| `public/data/questions-2026.09.0-sample.json` left in place while `2026.09.1-sample` was added | **No** — release files are immutable by §5.3; keeping the superseded one is correct. It is still served (HTTP 200) and still precache-excluded. |
| **`321d678`** — `content/RELEASE_2026.09.2.md`, `public/data/questions-2026.09.2.json`, `public/data/questions.json`, `public/data/manifest.json`, `DECISIONS.md:82-86`, `README.md:7/183` | **Yes, relative to v0.1.1 — and outside the scope of this verification.** This is the first real deck (107 questions) published ahead of the editorial audit on CEO instruction. It is *recorded* (`DECISIONS.md` §"Content release 2026.09.2") but it is the change that moved the ground under the tag, broke the tag's test expectations once, and redeployed the test site. Two things there are worth a look by whoever owns it: (i) `DECISIONS.md:86` ("the bundled fallback tracks the latest release") intentionally removes the `-sample` marker from `questions.json`, so `tests/content.test.ts:38`'s `-sample$` assertion had to be deleted rather than satisfied — §16.12's "`-sample` version" check no longer exists in any test; (ii) the real deck trips the §12 length warning (`va-002`, 234 chars). |

No other change was found that the review or DECISIONS.md does not account for.

## (e) What I could not verify, and what would be needed

1. **The exact cause of the single mid-review `npm test` failure.** I attribute it to the concurrent
   commit `321d678` swapping `public/data/questions.json` under a still-hardcoded test assertion
   (§0, N3). Supporting evidence: the file mtimes (20:37) bracket the failing run (20:37:46), the
   commit rewrote exactly those assertions to `BASE_VERSION`, and 15/15 runs on the frozen tag pass.
   I **could not** reproduce it deterministically, because doing so requires overwriting
   `public/data/questions.json` in a copy, and the destructive-command guard blocked that step.
   To close it: check out `v0.1.1`, run `npm test` 20× on a quiescent tree, then swap the bundled
   deck for `2026.09.2` and run `npm test` again — expecting the same single failure.
2. **Phone behaviour.** No iOS/Android device or simulator here: real touch swipe versus vertical
   scroll, iOS standalone display, true airplane-mode cold launch after install, cache eviction,
   VoiceOver/TalkBack. README `:167` and `:179` already record most of this as outstanding; my
   verification does not change that, and the desktop server-stopped reload Codex performed is not a
   substitute.
3. **The code-update (waiting-worker) lifecycle, including N2's residual.** Verifying it needs two
   independently built app versions served over HTTPS with a client left open across the deploy, plus
   a two-tab case. Not reproducible from this repository alone.
4. **The Web Locks path (N1).** jsdom has no `navigator.locks`, so neither the repository's tests nor
   mine exercise `navigator.locks.request`. A real browser (or a `navigator.locks` polyfill/stub in
   the test environment) with two pages committing concurrently is required.
5. **Cache Storage quota denial, real `put()` rejection and mid-write interruption** in an actual
   browser. My probes inject synthetic throws at the `keys()` and pointer-`put` points only; the
   README `:173` acknowledges this gap and I did not close it.
6. **Cold-load timing (`§16.2`, "no spinner > 300 ms after first paint").** Measured on a warm
   desktop connection only. A cold profile with throttled CPU/network and a stalled
   `data/questions.json` is needed; the F6 bound (8 s) means the blank-question window can lawfully
   last that long before Retry appears.
7. **The deployed origin's headers and logs beyond what I sampled.** I confirmed no `Set-Cookie` on
   `/` and 200s for all shipped assets, but not a full redirect/status capture on every route, and
   nothing about GitHub Pages' access-log retention or the "minimal technical access logs" wording in
   the privacy note.
8. **`git diff v0.1.0..v0.1.1` as literally requested.** Impossible — no `v0.1.0` tag exists
   (`git tag -l` → `v0.1.1` only). I used `63514b6`, the v0.1.0 build commit, as the base, which
   also pulls in the two intermediate commits (`82cd26f`, `954ff64`).