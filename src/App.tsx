import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AboutSheet } from "./components/AboutSheet.tsx";
import { Card, type CardNotice } from "./components/Card.tsx";
import { Controls } from "./components/Controls.tsx";
import { InstallHint } from "./components/InstallHint.tsx";
import { PresentLayer } from "./components/PresentLayer.tsx";
import { ScopePicker } from "./components/ScopePicker.tsx";
import { TopBar } from "./components/TopBar.tsx";
import { UpdateBanner } from "./components/UpdateBanner.tsx";
import { checkForUpdate, isOfflineReady, loadInitialDeck, type UpdateResult } from "./content/loadContent.ts";
import { t } from "./i18n.ts";
import { setupPwa, type PwaHandle } from "./pwa.ts";
import {
  applyRelease,
  branch,
  initialDeckState,
  next,
  prev,
  remaining,
  restart,
  stepFavorites,
  type DeckState,
  type NextResult,
} from "./state/deck.ts";
import { clear, defaults, load, save } from "./state/storage.ts";
import type { Deck, Lang, Persisted, Scope } from "./types.ts";

type Phase = { status: "loading" } | { status: "error" } | { status: "ready"; deck: Deck };
type Exhausted = "category" | "deck" | null;

function storageOrNull(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "BUTTON" || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "A";
}

export function App() {
  const storage = useMemo(storageOrNull, []);
  const [prefs, setPrefs] = useState<Persisted>(() => load(storage ?? { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }, navigator.language));
  const [phase, setPhase] = useState<Phase>({ status: "loading" });
  const [deckState, setDeckState] = useState<DeckState>(() => initialDeckState(prefs.seenIds, prefs.lastQuestionId));
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState<Exhausted>(null);
  const [present, setPresent] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  // One pending update at a time, identified so that dismissing it hides only
  // that update: a later release or a new worker shows the banner again.
  const [pendingUpdate, setPendingUpdate] = useState<{ key: string; kind: "code" | "content" } | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [offlineReady, setOfflineReady] = useState(false);
  const [loadNonce, setLoadNonce] = useState(0);
  const pwa = useRef<PwaHandle | null>(null);
  const liveRef = useRef<HTMLDivElement>(null);

  const strings = t(prefs.lang);
  const deck = phase.status === "ready" ? phase.deck : null;
  const questions = useMemo(() => deck?.questions ?? [], [deck]);
  const question = useMemo(() => questions.find((q) => q.id === currentId && q.active) ?? null, [questions, currentId]);

  // ---- persistence -------------------------------------------------------
  // Only once content is active: before that `currentId` is still null and
  // writing it would erase the saved card if the load were interrupted.
  useEffect(() => {
    if (!storage || phase.status !== "ready") return;
    save(storage, { ...prefs, seenIds: deckState.seenIds, lastQuestionId: currentId });
  }, [storage, phase.status, prefs, deckState.seenIds, currentId]);

  useEffect(() => {
    document.documentElement.lang = prefs.lang;
  }, [prefs.lang]);

  // ---- service worker ----------------------------------------------------
  useEffect(() => {
    if (pwa.current) return;
    // A waiting worker takes precedence: its reload also activates any staged content.
    pwa.current = setupPwa(() => setPendingUpdate({ key: "code", kind: "code" }));
  }, []);

  const onContentUpdate = useCallback((result: UpdateResult) => {
    if (result.kind !== "staged") return;
    setPendingUpdate((current) => (current?.kind === "code" ? current : { key: `content:${result.releaseSeq}`, kind: "content" }));
  }, []);

  // ---- content: initial load + update check -----------------------------
  const applyResult = useCallback((result: NextResult) => {
    setDeckState(result.state);
    if (result.kind === "shown") {
      setCurrentId(result.id);
      setExhausted(null);
    } else if (result.kind === "exhausted") {
      setExhausted(result.level);
    } else {
      setExhausted(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPhase({ status: "loading" });
    void loadInitialDeck().then((loaded) => {
      if (cancelled) return;
      if (!loaded) {
        setPhase({ status: "error" });
        return;
      }
      const { deck } = loaded;
      console.log(`deck ${deck.contentVersion}`);
      setPhase({ status: "ready", deck });
      // Activation (§8): drop retired ids from seen/favourites/history, keep the
      // current card if it is still active, otherwise draw.
      const activated = applyRelease(deck.questions, initialDeckState(prefs.seenIds, prefs.lastQuestionId), prefs.favorites);
      if (activated.favorites.length !== prefs.favorites.length) {
        setPrefs((p) => ({ ...p, favorites: activated.favorites }));
      }
      const last = activated.state.lastQuestionId;
      if (last !== null) {
        setDeckState(activated.state);
        setCurrentId(last);
      } else if (prefs.scope !== "favorites") {
        applyResult(next(deck.questions, prefs.scope, activated.state));
      } else {
        setDeckState(activated.state);
      }
      void checkForUpdate(deck.releaseSeq, { force: true }).then((result) => {
        if (!cancelled) onContentUpdate(result);
      });
      void isOfflineReady().then((ready) => {
        if (!cancelled) setOfflineReady(ready);
      });
    });
    return () => {
      cancelled = true;
    };
    // Runs once per (re)load attempt; prefs are read at that moment on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadNonce]);

  useEffect(() => {
    if (!deck) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void checkForUpdate(deck.releaseSeq).then(onContentUpdate);
      void isOfflineReady().then(setOfflineReady);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [deck, onContentUpdate]);

  // ---- actions -----------------------------------------------------------
  const setLang = (lang: Lang) => setPrefs((p) => ({ ...p, lang }));

  const remainingFor = useCallback((scope: Scope) => remaining(questions, scope, deckState.seenIds).length, [questions, deckState.seenIds]);

  const selectScope = (scope: Scope) => {
    setPrefs((p) => ({ ...p, scope }));
    setExhausted(null);
    const branched = branch(deckState);
    if (scope === "favorites") {
      setDeckState(branched);
      return;
    }
    applyResult(next(questions, scope, branched));
  };

  const showFavorite = (id: string) => {
    setExhausted(null);
    setCurrentId(id);
  };

  const goNext = () => {
    if (!deck) return;
    if (prefs.scope === "favorites") {
      const id = stepFavorites(prefs.favorites, currentId, 1);
      if (id) setCurrentId(id);
      return;
    }
    applyResult(next(questions, prefs.scope, deckState));
  };

  const goPrev = () => {
    if (!deck) return;
    if (prefs.scope === "favorites") {
      const id = stepFavorites(prefs.favorites, currentId, -1);
      if (id) setCurrentId(id);
      return;
    }
    const result = prev(deckState);
    setDeckState(result.state);
    if (result.id !== null) {
      setCurrentId(result.id);
      setExhausted(null);
    }
  };

  const restartDeck = () => applyResult(restart(questions, prefs.scope, deckState));
  const allRemaining = () => {
    setPrefs((p) => ({ ...p, scope: "all" }));
    applyResult(next(questions, "all", branch(deckState)));
  };

  const toggleFavorite = () => {
    if (!question) return;
    setPrefs((p) => ({
      ...p,
      favorites: p.favorites.includes(question.id) ? p.favorites.filter((id) => id !== question.id) : [...p.favorites, question.id],
    }));
  };

  const togglePresent = () => setPresent((v) => !v);

  const resetLocalData = () => {
    if (storage) clear(storage);
    const fresh = { ...defaults(navigator.language), lang: prefs.lang };
    setPrefs(fresh);
    const state = initialDeckState([], null);
    setExhausted(null);
    setCurrentId(null);
    applyResult(next(questions, fresh.scope, state));
  };

  const reload = () => {
    if (pendingUpdate?.kind === "code" && pwa.current) void pwa.current.applyUpdate();
    else window.location.reload();
  };

  // ---- keyboard ----------------------------------------------------------
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (aboutOpen || document.querySelector(".sheet")) return; // sheets own Esc / Tab
      if (event.key === "Escape") {
        if (present) {
          event.preventDefault();
          setPresent(false);
        }
        return;
      }
      if (isTypingTarget(event.target)) return;
      switch (event.key) {
        case "ArrowRight":
        case " ":
          event.preventDefault();
          goNext();
          break;
        case "ArrowLeft":
          event.preventDefault();
          goPrev();
          break;
        case "l":
        case "L":
          setLang(prefs.lang === "ro" ? "en" : "ro");
          break;
        case "f":
        case "F":
          toggleFavorite();
          break;
        case "p":
        case "P":
          togglePresent();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ---- live region: announce after the text swap, without moving focus ----
  useEffect(() => {
    const el = liveRef.current;
    if (!el) return;
    const message = exhausted === "category" ? strings.categoryDone : exhausted === "deck" ? strings.deckDone : question ? question[prefs.lang] : "";
    const id = window.setTimeout(() => {
      el.textContent = message;
    }, 50);
    return () => window.clearTimeout(id);
  }, [question, exhausted, prefs.lang, strings]);

  // ---- derived view state ------------------------------------------------
  const favoritesScope = prefs.scope === "favorites";
  const poolEmpty = !favoritesScope && deck !== null && questions.filter((q) => q.active && (prefs.scope === "all" || q.category === prefs.scope)).length === 0;
  const notice: CardNotice | null = exhausted
    ? { kind: exhausted }
    : poolEmpty
      ? { kind: "empty" }
      : favoritesScope && prefs.favorites.length === 0
        ? { kind: "noFavorites" }
        : favoritesScope && question === null
          ? { kind: "favoritesHint" }
          : null;
  const remainingCount = favoritesScope ? prefs.favorites.length : remainingFor(prefs.scope);
  const canNext = deck !== null && !poolEmpty && (favoritesScope ? prefs.favorites.length > 0 : true);
  const canPrev = deck !== null && (favoritesScope ? prefs.favorites.length > 1 : deckState.cursor > 0 || exhausted !== null);
  const bannerVisible = pendingUpdate !== null && pendingUpdate.key !== dismissedKey;

  const exhaustionActions =
    exhausted === "category" ? (
      <>
        <button type="button" className="btn btn--primary" onClick={allRemaining}>
          {strings.allRemaining}
        </button>
        <button type="button" className="btn btn--secondary" onClick={restartDeck}>
          {strings.restartDeck}
        </button>
      </>
    ) : exhausted === "deck" ? (
      <button type="button" className="btn btn--primary" onClick={restartDeck}>
        {strings.shuffleAgain}
      </button>
    ) : undefined;

  return (
    <div className={`app${present ? " app--present" : ""}`}>
      <PresentLayer active={present} />
      <TopBar lang={prefs.lang} strings={strings} present={present} onLang={setLang} onTogglePresent={togglePresent} />

      {!present && (
        <UpdateBanner
          strings={strings}
          visible={bannerVisible}
          onReload={reload}
          onDismiss={() => setDismissedKey(pendingUpdate?.key ?? null)}
        />
      )}

      {!present && deck && (
        <ScopePicker
          lang={prefs.lang}
          strings={strings}
          scope={prefs.scope}
          questions={questions}
          favorites={prefs.favorites}
          remainingFor={remainingFor}
          onSelectScope={selectScope}
          onShowFavorite={showFavorite}
        />
      )}

      <main className="main">
        {phase.status === "error" ? (
          <section className="card" data-category="all">
            <div className="card__body">
              <div className="card__notice">
                <p className="card__notice-text">{strings.loadError}</p>
                <div className="card__actions">
                  <button type="button" className="btn btn--primary" onClick={() => setLoadNonce((n) => n + 1)}>
                    {strings.retry}
                  </button>
                </div>
              </div>
            </div>
            <img className="card__logo" src="./logo-autonom-card.svg" alt="" width="553" height="187" decoding="async" />
          </section>
        ) : (
          <Card
            lang={prefs.lang}
            strings={strings}
            question={notice ? null : question}
            notice={notice}
            present={present}
            favorite={question !== null && prefs.favorites.includes(question.id)}
            onToggleFavorite={toggleFavorite}
            onSwipe={(direction) => (direction === "next" ? goNext() : goPrev())}
            actions={exhaustionActions}
          />
        )}
        <div ref={liveRef} className="visually-hidden" aria-live="polite" aria-atomic="true" />
      </main>

      {phase.status !== "error" && (
        <Controls strings={strings} present={present} canPrev={canPrev} canNext={canNext} onPrev={goPrev} onNext={goNext} />
      )}

      {!present && (
        <footer className="footer">
          <span>
            {remainingCount} {strings.remaining}
          </span>
          <span aria-hidden="true">·</span>
          <span>{deck ? `v${deck.contentVersion}` : "—"}</span>
          <button type="button" className="btn btn--icon footer__about" onClick={() => setAboutOpen(true)} aria-label={strings.about}>
            <span aria-hidden="true">ⓘ</span>
          </button>
        </footer>
      )}

      {!present && (
        <InstallHint strings={strings} dismissed={prefs.installHintDismissed} onDismiss={() => setPrefs((p) => ({ ...p, installHintDismissed: true }))} />
      )}

      <AboutSheet open={aboutOpen} strings={strings} deck={deck} offlineReady={offlineReady} onClose={() => setAboutOpen(false)} onReset={resetLocalData} />
    </div>
  );
}
