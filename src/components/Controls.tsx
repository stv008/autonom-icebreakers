import type { MouseEvent } from "react";
import type { UiStrings } from "../i18n.ts";
import { motionAllowed } from "../motion.ts";

/** Green ring ripple on "Next", the CTA ring of the Autonom AI-session page (decision 69). */
function ring(event: MouseEvent<HTMLButtonElement>) {
  if (!motionAllowed()) return;
  event.currentTarget.animate(
    [
      { boxShadow: "0 0 0 0 rgba(0, 198, 94, 0.6)" },
      { boxShadow: "0 0 0 18px rgba(0, 198, 94, 0)" },
    ],
    { duration: 700, easing: "ease-out" },
  );
}

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
      <button type="button" className="btn btn--primary controls__next" onClick={(e) => {
          ring(e);
          onNext();
        }}
        disabled={!canNext}
      >
        {strings.next}
        <span aria-hidden="true"> →</span>
      </button>
    </nav>
  );
}
