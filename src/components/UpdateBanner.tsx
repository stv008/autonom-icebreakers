import type { UiStrings } from "../i18n.ts";

interface UpdateBannerProps {
  strings: UiStrings;
  visible: boolean;
  onReload: () => void;
  onDismiss: () => void;
}

/** Discreet, dismissible "new version available — reload". Never reloads by itself (§9.2, §11). */
export function UpdateBanner({ strings, visible, onReload, onDismiss }: UpdateBannerProps) {
  if (!visible) return null;
  return (
    <div className="banner" role="status">
      <span>{strings.updateAvailable}</span>
      <button type="button" className="btn btn--text" onClick={onReload}>
        {strings.reload}
      </button>
      <button type="button" className="btn btn--icon" onClick={onDismiss} aria-label={strings.dismiss}>
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
