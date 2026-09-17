import { useEffect, useRef, type ReactNode } from "react";

interface SheetProps {
  open: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible bottom sheet: role=dialog, focus trapped (and recovered if it
 * escapes), Esc closes, focus restored to the opener on close (§9.2, §14).
 * The open/close lifecycle depends on `open` only — a parent re-render with a
 * new `onClose` identity must not re-run the trap or steal focus.
 */
export function Sheet({ open, title, closeLabel, onClose, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useRef(`sheet-title-${Math.random().toString(36).slice(2, 8)}`);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    const panel = panelRef.current;
    const focusables = () => (panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)) : []);
    (focusables()[0] ?? panel)?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0] as HTMLElement;
      const last = items[items.length - 1] as HTMLElement;
      const active = document.activeElement;
      const inside = active instanceof Node && panel?.contains(active);
      if (!inside || (event.shiftKey && active === first)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    // If focus lands outside the dialog (e.g. the focused control was removed), pull it back.
    const onFocusIn = (event: FocusEvent) => {
      if (!panel || !(event.target instanceof Node) || panel.contains(event.target)) return;
      (focusables()[0] ?? panel).focus();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocusIn);
      const opener = openerRef.current;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={() => onCloseRef.current()}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId.current}
        ref={panelRef}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet__head">
          <h2 id={titleId.current} className="sheet__title">
            {title}
          </h2>
          <button type="button" className="btn btn--icon" onClick={() => onCloseRef.current()} aria-label={closeLabel}>
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="sheet__body">{children}</div>
      </div>
    </div>
  );
}
