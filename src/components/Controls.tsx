import type { UiStrings } from "../i18n.ts";

interface ControlsProps {
  strings: UiStrings;
  present: boolean;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function Controls({ strings, present, canPrev, canNext, onPrev, onNext }: ControlsProps) {
  return (
    <nav className={`controls${present ? " controls--present" : ""}`} aria-label={strings.scope}>
      <button type="button" className="btn btn--secondary controls__prev" onClick={onPrev} disabled={!canPrev}>
        <span aria-hidden="true">← </span>
        {strings.prev}
      </button>
      <button type="button" className="btn btn--primary controls__next" onClick={onNext} disabled={!canNext}>
        {strings.next}
        <span aria-hidden="true"> →</span>
      </button>
    </nav>
  );
}
