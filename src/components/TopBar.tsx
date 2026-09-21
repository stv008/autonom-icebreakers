import type { UiStrings } from "../i18n.ts";
import type { Lang } from "../types.ts";

interface TopBarProps {
  lang: Lang;
  strings: UiStrings;
  present: boolean;
  onLang: (lang: Lang) => void;
  onTogglePresent: () => void;
}

export function TopBar({ lang, strings, present, onLang, onTogglePresent }: TopBarProps) {
  return (
    <header className="topbar">
      {!present && (
        <div className="topbar__brand">
          <picture>
            <source media="(prefers-color-scheme: dark)" srcSet="./logo-autonom-dark.svg" />
            <img className="logo" src="./logo-autonom.svg" alt="Autonom" width="553" height="187" decoding="async" />
          </picture>
          <h1 className="topbar__title">{strings.title}</h1>
        </div>
      )}
      <div className="topbar__actions">
        <div className="segmented" role="group" aria-label={strings.language}>
          <button
            type="button"
            className="segmented__item"
            aria-pressed={lang === "ro"}
            onClick={() => onLang("ro")}
            lang="ro"
          >
            {strings.langRo}
          </button>
          <button
            type="button"
            className="segmented__item"
            aria-pressed={lang === "en"}
            onClick={() => onLang("en")}
            lang="en"
          >
            {strings.langEn}
          </button>
        </div>
        <button
          type="button"
          className="btn btn--icon"
          aria-pressed={present}
          aria-label={present ? strings.exitPresent : strings.present}
          onClick={onTogglePresent}
        >
          <span aria-hidden="true">{present ? "✕" : "⛶"}</span>
        </button>
      </div>
    </header>
  );
}
