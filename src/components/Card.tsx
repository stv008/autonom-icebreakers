import { useLayoutEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import type { UiStrings } from "../i18n.ts";
import { CATEGORIES, type Lang, type Question } from "../types.ts";

export type CardNotice =
  | { kind: "category" }
  | { kind: "deck" }
  | { kind: "empty" }
  | { kind: "noFavorites" }
  | { kind: "favoritesHint" };

interface CardProps {
  lang: Lang;
  strings: UiStrings;
  question: Question | null;
  notice: CardNotice | null;
  present: boolean;
  favorite: boolean;
  onToggleFavorite: () => void;
  onSwipe: (direction: "next" | "prev") => void;
  /** Buttons rendered under an exhaustion notice. */
  actions?: ReactNode;
}

const SWIPE_THRESHOLD_PX = 56;
const MIN_FONT_REM = 1.25;

/**
 * Shrink the question slightly when it overflows its container, down to a
 * floor; past the floor the container scrolls (§9.2). Never truncates.
 */
function useFitText(
  containerRef: React.RefObject<HTMLElement | null>,
  textRef: React.RefObject<HTMLElement | null>,
  deps: readonly unknown[],
) {
  useLayoutEffect(() => {
    const box = containerRef.current;
    const el = textRef.current;
    if (!box || !el) return;
    const fit = () => {
      el.style.fontSize = "";
      const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      let size = parseFloat(getComputedStyle(el).fontSize);
      const floor = MIN_FONT_REM * rootPx;
      let guard = 0;
      while (box.scrollHeight > box.clientHeight + 1 && size - 1 >= floor && guard < 40) {
        size -= 1;
        el.style.fontSize = `${size}px`;
        guard += 1;
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function Card({ lang, strings, question, notice, present, favorite, onToggleFavorite, onSwipe, actions }: CardProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const text = question ? question[lang] : "";
  useFitText(bodyRef, textRef, [text, present, lang]);

  const category = question ? CATEGORIES.find((c) => c.id === question.category) : undefined;

  const onPointerDown = (event: ReactPointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    start.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
  };
  const onPointerUp = (event: ReactPointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s || s.id !== event.pointerId) return;
    const dx = event.clientX - s.x;
    const dy = event.clientY - s.y;
    // Do not fight vertical scroll: only a clearly horizontal gesture counts.
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    onSwipe(dx < 0 ? "next" : "prev");
  };

  const noticeText =
    notice?.kind === "category"
      ? strings.categoryDone
      : notice?.kind === "deck"
        ? strings.deckDone
        : notice?.kind === "empty"
          ? strings.empty
          : notice?.kind === "noFavorites"
            ? strings.noFavorites
            : notice?.kind === "favoritesHint"
              ? strings.favoritesHint
              : null;

  return (
    <section
      className={`card${present ? " card--present" : ""}`}
      data-category={question && !noticeText ? question.category : "all"}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        start.current = null;
      }}
    >
      {/* Logo top-left, category bottom-left (CEO request 2026-10-02, decision 59). */}
      <img className="card__logo" src="./logo-autonom-card.svg" alt="" width="553" height="187" decoding="async" />
      <div className="card__body" ref={bodyRef}>
        {noticeText ? (
          <div className="card__notice">
            <p className="card__notice-text">{noticeText}</p>
            {actions && <div className="card__actions">{actions}</div>}
          </div>
        ) : (
          <p key={question?.id ?? "none"} ref={textRef} className="card__text" lang={lang}>
            {text}
          </p>
        )}
      </div>
      {question && category && !noticeText && (
        <p className="card__category" lang={lang}>
          {category[lang]}
        </p>
      )}
      {question && !present && !noticeText && (
        <button
          type="button"
          className={`btn btn--icon star${favorite ? " star--on" : ""}`}
          aria-pressed={favorite}
          aria-label={favorite ? strings.unfavorite : strings.favorite}
          onClick={onToggleFavorite}
        >
          <svg className="star__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M12 2.8l2.78 5.64 6.22.9-4.5 4.39 1.06 6.2L12 17.0l-5.56 2.93 1.06-6.2L3 9.34l6.22-.9z"
              fill={favorite ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </section>
  );
}
