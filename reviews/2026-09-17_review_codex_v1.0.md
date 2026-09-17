# Independent code review — v1.0

Internal Confidential · 2026-09-17 · Reviewer: Codex

Reviewed commit `63514b6f5032f2f0264ef1971a33f7dde2a2b257`, against `BUILD_PROMPT.md` v1.0. Review only; no fixes or commits. The working tree was clean before review. Source references below are repository-relative, one-based lines; the generated `dist/sw.js` is minified onto line 1. README verification claims were not treated as evidence of runtime behaviour.

## (a) Build and test results

Executed exactly `npm ci && npm test && npm run build`, on Node **v26.8.2**, npm **11.19.1**. The combined command exited **0**.

| Check | Observed result |
|---|---|
| Clean dependency installation | 412 packages installed; 116 funding notices. Two warnings, detailed below. |
| Tests | **4 files, 51 tests passed**, 472 ms reported duration. Breakdown: content 21, deck 13, content-loading 10, storage 7. No component tests. |
| Test stderr | `REJECTED cannot read or parse …/bad.json: Expected property name or '}' in JSON at position 2 …`. Expected output from the deliberate malformed-JSON test, not a failing test (`tests/content.test.ts:161`). |
| Build | TypeScript and Vite passed; 35 modules transformed; Vite reported 200 ms. No build warnings. |
| Additional validator run | `npm run validate`: PASS, **0 warnings**. The existing CLI tests also exercised a structurally invalid copy and malformed JSON, both rejected. |

Installation warnings:

- `glob@11.1.0` is deprecated; npm's warning text mentions publicly known vulnerabilities. It is brought in by `vite-plugin-pwa → workbox-build` (`package-lock.json:4115`). This review did not establish an exploitable application vulnerability or run an advisory audit; do not interpret this as a Critical finding. Suggested action: review/update the build dependency chain separately.
- `fsevents@2.3.3` has an install script not covered by npm's `allowScripts`. The installation and build still completed. It is an optional dependency of the build tooling (`package-lock.json:3972`); review whether its native watcher support is needed before approving scripts.

### Bundle and precache inspection

| Generated output | Raw size | Gzip |
|---|---:|---:|
| `index.html` | 1.25 kB | 0.53 kB |
| `assets/index-DW17ItH4.css` | 7.59 kB | 2.31 kB |
| `assets/workbox-window.prod.es5-Bd17z0YL.js` | 5.65 kB | 2.20 kB |
| `assets/index-vxn_Lk5O.js` | 250.58 kB | 78.76 kB |

The main JavaScript bundle is the largest transfer; there is no specified size budget and no emitted chunk-size warning. Its size alone does not establish a failure of the startup latency requirement.

The build reports **13 precache entries, 362.08 KiB**. Independently summed files: **370,773 bytes**. All 13 files exist. The exact entries in `dist/sw.js:1` are:

```text
manifest.webmanifest
index.html
icon-512.png
icon-192.png
favicon.svg
apple-touch-icon.png
fonts/TitilliumWeb-SemiBold.woff2
fonts/TitilliumWeb-Regular.woff2
fonts/TitilliumWeb-Bold.woff2
assets/workbox-window.prod.es5-Bd17z0YL.js
assets/index-vxn_Lk5O.js
assets/index-DW17ItH4.css
data/questions.json
```

This matches §13. Neither `data/manifest.json` nor version-named question files are precached. `fonts/OFL.txt` is also excluded. The worker imports `workbox-ffe34739.js`; it is generated alongside the worker, rather than listed as an application precache entry.

Generated routes, inspected directly at `dist/sw.js:1`: navigation fallback to `index.html`; versioned question paths use CacheFirst in `content-files`, capped at six entries; manifest paths use NetworkOnly. `skipWaiting()` occurs only inside the `SKIP_WAITING` message handler, not on install. Configuration agrees (`vite.config.ts:11–29`); UI application is explicit (`src/pwa.ts:14–22`, `src/App.tsx:223–225`). Built CSS references all fonts through `../fonts/…`, not an external host.

### Additional review execution

Used the Browser skill (`/Users/mariusstefan/.codex/plugins/cache/openai-bundled/browser/26.911.61220/skills/control-in-app-browser/SKILL.md`) against the production preview. Starting the server required execution outside the sandbox after a local `listen EPERM`; this was an environment restriction, not an application failure. The temporary server was stopped afterward.

Observed: language switch retained the card and remaining count; Romanian language, favourite and current card survived reload; Favourites browsing left the global remaining count unchanged; presentation hid the picker/footer/star and reset off after reload; focused RO + ArrowRight did not draw; focused Next + Space advanced exactly one card; normal dialog close restored focus to its opener. About displayed sample status and “Disponibil offline”. After stopping the preview server, reloading still rendered the same question and remaining count. This is a desktop cached reload test, not a phone airplane-mode certification.

Additional Node probes imported the real validator and transpiled the real content loader in memory, replacing only its browser/network/cache dependencies with controlled fakes. No probe files were added to the repository. Observed results:

```text
HTML in hu:             accepted, no warnings
HTML in id:             accepted, no warnings
HTML in contentVersion: accepted, no warnings
Unknown question.notes: accepted, warns “ignored”, notes actually retained
RO with cedilla ş/ţ:     accepted
Cross-origin questionsUrl: fetched by fake fetch and staged
Manifest/file contentVersion mismatch: staged
Cleanup throws after pointer swap: outcome “failed”, saved releaseSeq nevertheless 2
Invalid bundled cache body + controller: isOfflineReady() == true
Concurrent checks: sequence 3 staged, then slower sequence 2 overwrote it
```

Cross-origin probes used fake fetch only; no external request was sent. These probes establish the implementation paths, not the probability of a production incident.

## (b) Definition of Done — all 15 items

“Met” means supported by the evidence specified in the row. “Unmet” means an identified contradiction or counterexample. “Unverifiable here” means remaining environmental or measurement evidence is needed; it is not a pass.

| §16 item | Verdict | Evidence and limits |
|---|---|---|
| 1. Build/test pass, including §8 cases | **Met** | Actual command exited 0, 51 tests. `package.json:8–10`; `tests/deck.test.ts:56` onward covers category/all exhaustion, no immediate repeat, single-card pool, scope changes, history, favourites, reload state and activation. The reload test is a pure-state test, not an App remount (`tests/deck.test.ts:177`). UI persistence was checked separately in browser. |
| 2. Cold load, no login, question within latency constraint | **Unverifiable here** | No login path; loading renders a blank question region, not a spinner (`src/App.tsx:49`, `src/App.tsx:342–367`). Initial content is awaited (`src/content/loadContent.ts:94–98`). No measured first-paint-to-question timing on a cold device/network. Blank UI can last arbitrarily long on a stalled bundled fetch; F6. |
| 3. RO/EN instant, no draw, persistent, html lang | **Met** | `src/App.tsx:69–76`, `src/App.tsx:152`; `src/components/TopBar.tsx:23–39`. Browser confirmed same question/count after toggle and after reload, plus `html.lang == ro`. Startup interruption caveat is F10. |
| 4. Global no-repeat and explicit exhaustion/restart | **Met** | Global filtering `src/state/deck.ts:38–40`; history-forward before draw at 69–80; restart excludes last at 101–107; explicit exhaustion buttons `src/App.tsx:299–313`. Existing deterministic tests passed. History/favourite revisits are intentional and distinguished from new draws. |
| 5. Swipe/buttons/keyboard and focused-button protection | **Unverifiable here** | Buttons and focused-button ArrowRight/Space were exercised. Guard `src/App.tsx:39–44`, 230–245. Swipe threshold/direction/cancel at `src/components/Card.tsx:70–84`, 103–105; `touch-action: pan-y` at `src/styles.css:282`. Real touch swipe versus vertical scroll and browser find-box interaction remain untested. |
| 6. Persistent favourites and browse without drawing | **Met** | Star changes preferences only (`src/App.tsx:203–208`); favourite display changes currentId only (167–169); stepping uses `src/state/deck.ts:135–139`. Browser confirmed persistence and unchanged global count through browse. |
| 7. Presentation layout, off on relaunch, graceful wake lock | **Met, with F9 limitation** | `src/App.tsx:53`, 316–339, 376–390; `src/styles.css:497–521`; `src/components/Card.tsx:124`; unsupported/denied lock is caught at `src/components/PresentLayer.tsx:12–22`. Browser confirmed layout controls and relaunch off. Automatic lock release/reacquisition is defective (F9), although initial request/failure handling exists. |
| 8. Offline reopen; indicator true only when warranted | **Unmet** | Server-stopped reload worked here, but the indicator accepts an unvalidated cached fallback and does not verify shell cache completeness (`src/content/loadContent.ts:174–180`), reproduced in F5. Phone airplane-mode installation still unverified. |
| 9. Release update, next-launch activation, rollback, reject invalid | **Unmet** | Sequential upgrade/rollback tests pass; SHA and schema gates exist (`src/content/loadContent.ts:130–160`). No screen replacement is performed by checkForUpdate. However overlapping updates regress sequence (F1), malformed content can pass (F2/F4), and cleanup can commit while reporting failure (F7). A dismissed banner never returns (F8). |
| 10. CLI accepts sample, rejects deliberately broken copy | **Met** | Actual validator PASS/0 warnings; passing executed tests at `tests/content.test.ts:143–165` assert exit 1 for wrong schema/category and unparsable JSON. These tests do not prove all malformed releases are rejected. |
| 11. OS dark mode, specified brand tokens only | **Unmet** | OS media query at `src/styles.css:40–51`; specified main tokens present. Additional red/green colours outside prompt §9.3 at 134–140 and 467–474 are not recorded as approved exceptions; F12. This is a prompt-conformance verdict, not a wider corporate brand-policy audit. |
| 12. Sample size/categories/diacritics/version/no emoji | **Met** | Independently counted **40 active questions, 8 in each of 5 categories**; zero cedilla forms and zero Extended_Pictographic characters. `public/data/questions.json:3`, 7–50. All pairs read; editorial reservations listed in F14. |
| 13. Restricted network, assets present, standalone | **Unmet** | Shipped assets are local, precache files exist, standalone manifest at `public/manifest.webmanifest:8`. But manifest-controlled arbitrary-origin requests are allowed (`src/content/loadContent.ts:142–143`), contrary to relative releases/no third parties: F3. No complete HTTP status/request capture or deployed host-cookie audit was performed. |
| 14. README required operating documentation | **Met** | Purpose/sample/icon: `README.md:5–9`; commands: 22–53; HTTPS phone caveat: 55–60; publish/rollback/sheet: 109–125; installation/privacy/non-goals: 127–141. Presence verified; its runtime claims are not all correct (F13). |
| 15. All unprescribed choices recorded | **Unmet** | 38 decisions read (`DECISIONS.md:9–58`), but extra red/green palettes and runtime-cache layout are not fully documented; F12/F13. Several recorded choices weaken requirements: section (d). Exhaustive historical intent cannot be reconstructed from the code. |

### Specific algorithm and validation audit

`deck.ts`: no new-draw repeat bug found in the requested scope/history paths. `branch()` removes only forward history and preserves global seen ids (57–59). `prev()` does not consume (83–87); `next()` follows history before drawing (69–80). The cap drops oldest history only, not seen ids (49–53); the passing cap test uses 60 questions. Explicit restart clears global seen state (101) and avoids the last card for a multi-card pool (105). `applyRelease()` filters by active IDs, preserves seen status for changed wording, prunes favourites, and resets navigable history to the retained current card (120–130). Keeping that single anchor is consistent with clearing backward session history. A retired current question is redrawn by App for draw scopes (111–123); Favourites remains browse-only. No draw occurs on language/star/presentation toggles or merely opening/closing sheets. Selecting a draw scope does draw, as explicitly specified.

Every §12 rule was checked:

| Rule | Implementation | Result |
|---|---|---|
| Unknown top-level fields | `validate.js:116–120` | Rejects; also requires all expected top-level fields. |
| schemaVersion exactly 1 | 123–125 | Rejects other types/values. |
| Integer releaseSeq | 126–128 | Implements literal requirement. Does not require safe/positive integer; prompt does not explicitly require that. |
| Duplicate ID | 162–169 | Exact-ID duplicates rejected; also requires nonblank string ID. Stable IDs across releases remain editorial responsibility. |
| Known category | 171–174 | Exact five-category allowlist. |
| Boolean active | 176–177 | Enforced. |
| Nonempty RO/EN | 189–200 | Enforced for all questions, including inactive ones. |
| RO exactly equals EN | 210–212 | Exact equality rejected. Whitespace/case variants are not exact equality; translation accuracy is editorial. |
| Any HTML tag | 201 | **Incomplete**: only RO/EN inspected, F4. |
| Normalised duplicate wording | 73–80, 205–208 | Case/diacritics/punctuation removed and whitespace collapsed; separate language maps; duplicates rejected. |
| At least one active question | 215 | Enforced. |
| Wording >220 chars warning | 202–204 | Warns without rejecting; counts JavaScript UTF-16 units rather than graphemes. No issue for this sample. |
| Per-rule CLI report | 226–245; `scripts/validate-content.mjs` | Executed sample reports every rule; bad-copy exit checked. |

Additional field checks exist for source, presentationSafe, hu type and metadata. `Date.parse` accepts more than strict ISO-8601 despite its error wording; a schema-tightening nit, not an observed application failure. The runtime validator does not enforce comma-below Romanian; the bundled-sample test does. A future publish check must cover it if “correct diacritics” is intended as a release gate.

## (c) Findings ranked by severity

### Critical

None identified within this review's scope. No production content, remote hosting configuration or adversarial dependency audit was available.

### Major

**F1 — Concurrent release commits can regress sequence and delete a newer release.**  
Evidence: `src/content/loadContent.ts:137–163`. `knownSeq` is read before network/body/hash work; no commit-time lock or fresh comparison protects pointer update and pruning. Module-level throttle is per page, not shared between tabs. Reproduction: pause check A for sequence 2 immediately before its release cache write; run check B for sequence 3 to completion; resume A. Real-loader mock probe printed `newer staged 3`, then `older-finishes-last staged 2`. Other interleavings can prune an entry another writer just pointed at. Consequence: next launch can regress content without a higher-sequence rollback, or fall back after a missing pointer target. Suggested fix: serialize commits across tabs (e.g. a scoped Web Lock), reread/validate current sequence inside that lock, and make pruning safe for concurrent readers/writers. Test two-tab interleavings. Merely checking sequence again before an unlocked write is insufficient.

**F2 — Unknown editorial fields are accepted and retained despite “ignored” warning.**  
Evidence: `src/content/validate.js:158–159`, 218; `src/content/loadContent.ts:154–160`; decision 15 at `DECISIONS.md:26`. Add `questions[0].notes = 'private editorial notes'` or an `alternatives` field to a valid release. Validation returns `ok:true`, and the field remains in `result.deck`; staging serializes it. This weakens the §5 editorial boundary that alternatives/owner/notes never ship. The UI need not display a field for it to be distributed and cached. No such data was present in this sample. Suggested fix: reject noncanonical question fields at the publishing gate; optionally reconstruct only known fields defensively on the client. Client stripping alone cannot undo publication of the original release file.

**F3 — Manifest permits third-party or unrelated content requests.**  
Evidence: `src/content/loadContent.ts:47–56`, 142–146; runtime routing at `vite.config.ts:22`, 28 matches pathname only. `questionsUrl` only needs to be a string; absolute external URLs and root/path escapes are accepted. Mocking a valid higher-sequence manifest with `https://elsewhere.invalid/data/questions-test.json` caused fetch and successful staging. A server with appropriate CORS can serve it; even failed CORS occurs after a request. Redirects also lack a policy. This contradicts relative content URLs and no third-party runtime requests; the hash gate is too late to prevent the request. Suggested fix: enforce same-origin, the app's data directory and versioned-file naming before fetch, disallow redirects or enforce a safe redirect policy, and constrain worker routes by origin. Validate manifest contentVersion against the fetched deck too; a mismatch currently stages silently.

### Minor

**F4 — “No HTML anywhere” is checked only in RO/EN.**  
Evidence: `src/content/validate.js:129–130`, 162–185, 192–201. Independently inserted `<b>hello</b>` into hu, id and contentVersion; all three passed with no warnings. Violates §5.1/§12. This is a validation defect, not demonstrated XSS: current rendering uses React text. Suggested fix: check all permitted string fields for HTML, and reject unknown fields rather than leaving another unchecked surface. Add separate tests outside RO/EN.

**F5 — Offline readiness can report true without a validated fallback or complete shell.**  
Evidence: `src/content/loadContent.ts:174–180`; `src/App.tsx:127–129`, 138–149. Any service-worker controller plus any matching cached fallback response is enough; the response is not parsed/validated and shell entries are not checked. Probe with a controller stub, no saved release and cached `not valid JSON` returned true. Cache eviction or a different controlling worker can also invalidate the inference about the shell. Readiness is only refreshed on initial load/visibility, so first-install completion need not update an already visible page. Suggested fix: inspect the intended worker/cache, validate the fallback, establish required shell availability, and refresh on worker readiness/controller changes. Normal server-stopped reload passed; this finding concerns the indicator's unconditional guarantee.

**F6 — Four-second timeout stops at response headers; initial fallback has no timeout.**  
Evidence: `src/content/loadContent.ts:83–88`, 101–108, 131–145. `fetchWithTimeout` clears its timer once fetch resolves, before `.json()`/`.arrayBuffer()` consumes the body. A server can send headers then stall forever; the advertised timeout no longer applies. The initial bundled fetch is entirely unbounded and can leave a blank card without Retry. Suggested fix: keep the abort timeout through body consumption/validation preparation and bound fallback loading, retaining the active deck on update failure. Add a streamed-body-stall test; existing loader tests return complete in-memory responses.

**F7 — Cleanup failure reports failed after a release is already committed.**  
Evidence: `src/content/loadContent.ts:158–166`; banner gate `src/App.tsx:124–125`. Inject a throw from `cache.keys()` after both puts: probe returned `failed` but `readSavedRelease().releaseSeq` was 2. The caller therefore never shows the update banner, while the new release activates on next launch. This contradicts “any failure keeps last-known-good” and hides an actual staged update. Suggested fix: treat the pointer swap as the commit point and return staged after it; isolate pruning as best-effort cleanup. Separately test release-put failure and pointer-put failure to prove prior state survives. Current tests do not inject quota/put failures despite the broad README claim.

**F8 — Dismissing one update hides every later update for that mounted session.**  
Evidence: `src/App.tsx:57`, 81, 125, 143, 297, 325; `DECISIONS.md:51`. `bannerDismissed` is never reset. Reproduce: stage release 2, dismiss its banner, stage release 3 on a subsequent foreground check; bannerVisible stays false. Also affects a later code update. Suggested fix: key dismissal to a specific release/worker identity or reset it on a genuinely new event. Same-event repeated checks should not nag.

**F9 — Wake lock is not reacquired after the browser releases it.**  
Evidence: `src/components/PresentLayer.tsx:17–25`. An acquired sentinel stays non-null when automatically released; no `release` listener clears it and visibility handling only tests null. Return to a presenting tab after a browser release: reacquire is skipped. Suggested fix: clear the matching sentinel on release, check `.released`, and reacquire on visible while still presenting. Reproduction requires a wake-lock-capable browser or a released-sentinel mock; the code path was inspected, not device-tested.

**F10 — Mount persistence overwrites the saved current card before content loads.**  
Evidence: `src/App.tsx:48–51`, 69–72, 100–123. `currentId` initializes null even when prefs contains a valid lastQuestionId; the first persistence effect writes null immediately. Successful loading restores the in-memory original, which is why the normal reload browser test passed. Reproduce with slow/failing initial content, then close/reload before it resolves: the next mount has lost the saved card and draws again. A second tab opening during this interval sees the same transient corruption. Suggested fix: suppress persistence until activation completes or preserve the stored last ID during loading; test an interrupted mount, not just initialDeckState().

**F11 — Dialog focus is not maintained when focused controls disappear.**  
Evidence: `src/components/AboutSheet.tsx:45–68`; `src/components/Sheet.tsx:35–46`, 54. Clicking Reset removes the focused button; clicking Cancel removes it again. Browser readback showed activeElement becoming BODY in both cases. Next Tab happened to return to a dialog button here, so a sustained focus escape was not reproduced, but focus is outside the claimed trap between actions and focus announcement/context is lost. The trap only wraps from exact first/last controls and does not recover external focus. Unstable onClose callbacks also restart the effect and refocus Close on parent rerenders. Suggested fix: explicitly focus the confirmation/cancel destination, recover focus entering outside a modal, and make the open/close lifecycle independent of callback identity. Normal close-to-opener restoration was verified.

**F12 — Extra palette colours violate the prompt's exact-token requirement and are undocumented.**  
Evidence: `src/styles.css:134–140` adds `#c62828` and `#ff8a80`; 467–474 adds `#2e7d32` and `#81c784`. §9.3 explicitly prohibits inventing a palette. Decision 32 (`DECISIONS.md:49`) records on-blue derivation but none of these four colours. Suggested fix: use the specified palette with labels/icons, or document an explicitly approved prompt exception. This does not challenge a separately authorised corporate status-colour policy; none is recorded as a build-prompt exception here.

**F13 — Documentation overstates supported tooling, cache layout and tested failure coverage.**  
Evidence: `README.md:24`, 137, 169; `package-lock.json:6722`; `vite.config.ts:24`; `tests/loadContent.test.ts:19–31`. “Node 20+” is false for the locked Vitest: its declared engine is `^22.12.0 || ^24.0.0 || >=26.0.0`. Vite also requires newer point releases than arbitrary Node 20. The cache description omits runtime `content-files` (and Workbox expiration bookkeeping). “Every ignore case” was not covered: fake cache puts never throw; no stalled-body/concurrent-commit/component tests exist. Suggested fix: declare a supported Node engine and align README; describe all storage surfaces; list actual tested failure cases and outstanding device checks. The 51-test count should not be interpreted as a complete DoD certification.

### Nit / editorial

**F14 — Sample wording revisions.**  
Evidence: `public/data/questions.json:7–50`. All 40 RO/EN pairs were read. None explicitly asks about dating, politics, alcohol, health, money or family status; translations preserve their basic meaning. Diacritics use comma-below forms; no emoji. I would not cut a card solely for a prohibited topic. I would reword:

| ID / line | Reason | Suggested wording |
|---|---|---|
| ml-001 / 7 | “Not said aloud yet” invites disclosure of a secret in a work group. Editorial caution, not an explicit prohibited-topic breach. | RO: „Ce vis sau proiect personal ți-ar plăcea să împărtășești?” EN: “What dream or personal project would you like to share?” |
| ml-003 / 9 | „o zi liberă complet” has unnatural word order. | RO: „Dacă ai avea o zi complet liberă, fără obligații, cum ai petrece-o?” EN can stay. |
| va-007 / 22 | Romanian construction is awkward. | RO: „Ce sfat primit cândva dai mai departe și astăzi?” EN: “What advice you once received do you still pass on today?” |
| pg-002 / 26 | “The mistake you learned the most from” may invite a high-stakes confession. | RO: „Ce ai învățat dintr-o mică greșeală?” EN: “What did you learn from a small mistake?” |
| pg-004 / 28 | “What last took you…” is understandable but unnatural English. | EN: “What most recently took you out of your comfort zone?” |
| pr-004 / 46 | “Made your work easier the most” is awkward English. | EN: “Which tool or process has helped most to make your work easier?” |

## (d) Decisions I would reverse or qualify

| Decision / evidence | Assessment |
|---|---|
| **15**, `DECISIONS.md:26` | **Reverse.** Allowing unknown editorial columns to pass is incompatible with the content-only publication boundary. They are not actually stripped. F2. |
| **14**, line 25 | **Reverse the readiness definition.** Controller + response existence is weaker than cached shell + validated deck. F5. |
| **12**, line 23 | **Retain immutable-entry/pointer design; change concurrency and cleanup.** The single-writer order is not an atomic multi-tab transaction. F1/F7. |
| **7**, line 15 | **Reverse the choice to omit all component integration tests before claiming DoD.** Not itself a violation of the prompt's minimum test-file list, but misses startup persistence, dismissal and focus behaviour. Add focused behavioural tests, not snapshot coverage. |
| **34**, line 51 | **Keep the stated policy; repair implementation later.** “Until next event” is not implemented because dismissal is permanent until remount. F8. |
| **38**, line 58 | **Qualify, not silently waive.** Screen-reader checks are required by §14; absence of devices explains an open gate, not completion. No push and deferring actual deployment are consistent with prototype scope. |
| **25**, line 42 | Modifier/focus guards are reasonable. Browser-find-open behaviour remains a browser acceptance test, not something the Cmd/Ctrl+F guard alone proves. |
| **11**, line 22 | Do **not** reverse the sequence override: higher-sequence rollback to an older immutable file requires it. Require manifest/file contentVersion consistency separately. |
| **17–24**, lines 28–38 | Field sanitisation, pruning, browse-only favourites, explicit restart, empty-state distinction and branching do not themselves weaken no-repeat requirements. The startup persistence bug is outside these pure-state choices. |
| **32**, line 49 | Keep on-blue derivation: it reuses specified colours to preserve contrast. It does not authorise the separate red/green additions. |

The unlisted extra palette and `content-files` cache also make decision completeness fail. No other material reversal identified among the remaining recorded choices; their historical claims about package-template versions were not independently reconstructed.

## (e) What remains unverifiable and what is needed

- **Cold-load timing:** measured first paint and question visibility on a fresh cache/storage profile, representative phones and throttled network/CPU. No spinner is not equivalent to fast question visibility.
- **Phone PWA operation:** iPhone Safari and Android Chrome installation, true airplane-mode cold launch after installation, OS eviction behaviour and standalone display. The desktop server-stopped reload passed, but is narrower.
- **Code-update lifecycle:** serve two independently built app versions and inspect waiting/activation after explicit Reload, including two tabs. Generated worker inspection alone does not establish all lifecycle behaviour.
- **End-to-end release updates:** the real-loader controlled tests exercised sequential upgrades/rollback, hash failure and the reported counterexamples. This review did not publish or replace repository release files for a browser-based update rollout. Use a separate disposable served copy to test actual banner → reload → activation and failure injection.
- **Touch/accessibility:** real horizontal swipes versus vertical scrolling; VoiceOver/TalkBack; keyboard with browser find open; 200% text, landscape, long-content fitting and both colour schemes across devices. The code includes rem sizes, min hit targets, reduced-motion handling and polite live announcements, but these are not a full assistive-technology certification.
- **Wake lock:** automatic release on backgrounding and reacquisition on foreground with an actual supported API.
- **Privacy/network:** source scan found only bundled deck fetch, manifest fetch, manifest-selected release fetch, local worker/app assets and local fonts; no cookie writes, analytics, telemetry SDK, XMLHttpRequest, WebSocket or sendBeacon. The SVG XML namespace and font-license URLs are not network calls. However F3 prevents an unconditional no-third-party guarantee. Capture all requests including redirects on the deployed origin, and inspect host response headers/log policy. This repository cannot establish server cookie behaviour or “minimal” access logging.
- **Failure persistence:** Cache Storage quota denial, pointer corruption, missing/evicted entries and interrupted App startup should be tested in a real browser as well as with mocks. Current green tests do not establish these guarantees.

Only this review document was intentionally added. Required npm commands regenerated ignored dependency/build artefacts; application source, configuration, lockfile and content were not edited. No commit was made.
