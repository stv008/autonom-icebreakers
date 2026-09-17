import type { UiStrings } from "../i18n.ts";

interface InstallHintProps {
  strings: UiStrings;
  dismissed: boolean;
  onDismiss: () => void;
}

/** iPhone/iPad Safari, not yet installed (display-mode: browser). */
export function isIosBrowser(): boolean {
  if (typeof navigator === "undefined" || typeof matchMedia === "undefined") return false;
  const ua = navigator.userAgent;
  const iosDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  // Real Safari only: every other engine on iOS carries its own token, and
  // desktop Chromium/Firefox on a touch Mac must not trigger the hint.
  const safari = /Safari/.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|Firefox|EdgiOS|Edg|OPR|OPiOS/.test(ua);
  const standalone = matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && Boolean((navigator as { standalone?: boolean }).standalone));
  return iosDevice && safari && !standalone;
}

export function InstallHint({ strings, dismissed, onDismiss }: InstallHintProps) {
  if (dismissed || !isIosBrowser()) return null;
  return (
    <div className="hint">
      <span>{strings.install}</span>
      <button type="button" className="btn btn--icon" onClick={onDismiss} aria-label={strings.dismiss}>
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
