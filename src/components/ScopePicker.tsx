import { useState } from "react";
import type { UiStrings } from "../i18n.ts";
import { CATEGORIES, type Lang, type Question, type Scope } from "../types.ts";
import { Sheet } from "./Sheet.tsx";

interface ScopePickerProps {
  lang: Lang;
  strings: UiStrings;
  scope: Scope;
  questions: readonly Question[];
  favorites: readonly string[];
  remainingFor: (scope: Scope) => number;
  onSelectScope: (scope: Scope) => void;
  onShowFavorite: (id: string) => void;
}

export function scopeLabel(scope: Scope, lang: Lang, strings: UiStrings): string {
  if (scope === "all") return strings.all;
  if (scope === "favorites") return strings.favorites;
  const category = CATEGORIES.find((c) => c.id === scope);
  return category ? category[lang] : scope;
}

export function ScopePicker({
  lang,
  strings,
  scope,
  questions,
  favorites,
  remainingFor,
  onSelectScope,
  onShowFavorite,
}: ScopePickerProps) {
  const [open, setOpen] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const close = () => {
    setOpen(false);
    setBrowsing(false);
  };

  const options: Scope[] = ["all", ...CATEGORIES.map((c) => c.id), "favorites"];
  const favoriteQuestions = favorites
    .map((id) => questions.find((q) => q.id === id && q.active))
    .filter((q): q is Question => q !== undefined);

  return (
    <div className="picker">
      <button
        type="button"
        className="btn picker__button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${strings.scope}: ${scopeLabel(scope, lang, strings)}`}
        onClick={() => {
          setBrowsing(scope === "favorites");
          setOpen(true);
        }}
      >
        <span className="picker__caret" aria-hidden="true">
          ▾
        </span>
        <span className="picker__label">{scopeLabel(scope, lang, strings)}</span>
      </button>

      <Sheet open={open} title={browsing ? strings.favorites : strings.scope} closeLabel={strings.close} onClose={close}>
        {browsing ? (
          <div>
            <button type="button" className="btn btn--text" onClick={() => setBrowsing(false)}>
              ← {strings.scope}
            </button>
            {favoriteQuestions.length === 0 ? (
              <p className="muted">{strings.noFavorites}</p>
            ) : (
              <ul className="list">
                {favoriteQuestions.map((q) => (
                  <li key={q.id}>
                    <button
                      type="button"
                      className="list__item"
                      onClick={() => {
                        onShowFavorite(q.id);
                        close();
                      }}
                    >
                      {q[lang]}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <ul className="list">
            {options.map((option) => {
              const selected = option === scope;
              const count = option === "favorites" ? favoriteQuestions.length : remainingFor(option);
              return (
                <li key={option}>
                  <button
                    type="button"
                    className={`list__item${selected ? " list__item--selected" : ""}`}
                    aria-current={selected ? "true" : undefined}
                    onClick={() => {
                      onSelectScope(option);
                      if (option === "favorites") setBrowsing(true);
                      else close();
                    }}
                  >
                    <span className="list__check" aria-hidden="true">
                      {selected ? "✓" : ""}
                    </span>
                    <span className="list__text">{scopeLabel(option, lang, strings)}</span>
                    <span className="list__count">{count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Sheet>
    </div>
  );
}
