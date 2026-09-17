import { useEffect, useState } from "react";
import type { UiStrings } from "../i18n.ts";
import type { Deck } from "../types.ts";
import { Sheet } from "./Sheet.tsx";

interface AboutSheetProps {
  open: boolean;
  strings: UiStrings;
  deck: Deck | null;
  offlineReady: boolean;
  onClose: () => void;
  onReset: () => void;
}

export function AboutSheet({ open, strings, deck, offlineReady, onClose, onReset }: AboutSheetProps) {
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!open) setConfirming(false);
  }, [open]);

  const isSample = deck?.contentVersion.endsWith("-sample") ?? false;

  return (
    <Sheet open={open} title={strings.about} closeLabel={strings.close} onClose={onClose}>
      <dl className="about">
        <dt>{strings.version}</dt>
        <dd>
          {deck ? `v${deck.contentVersion}` : "—"}
          {isSample && <span className="tag">{strings.sample}</span>}
        </dd>
        <dt>{strings.release}</dt>
        <dd>{deck ? `#${deck.releaseSeq}` : "—"}</dd>
        <dt>Offline</dt>
        <dd>
          <span className={`status ${offlineReady ? "status--ok" : "status--warn"}`}>
            <span aria-hidden="true">{offlineReady ? "● " : "○ "}</span>
            {offlineReady ? strings.offlineReady : strings.offlineNotReady}
          </span>
        </dd>
      </dl>

      <p className="about__privacy">{strings.privacy}</p>
      <p className="muted">{strings.install}</p>

      {confirming ? (
        <div className="confirm" role="group" aria-label={strings.reset}>
          <p>{strings.resetConfirm}</p>
          <div className="confirm__actions">
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => {
                setConfirming(false);
                onReset();
                onClose();
              }}
            >
              {strings.resetYes}
            </button>
            <button type="button" className="btn btn--secondary" onClick={() => setConfirming(false)}>
              {strings.cancel}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn--secondary" onClick={() => setConfirming(true)}>
          {strings.reset}
        </button>
      )}
    </Sheet>
  );
}
