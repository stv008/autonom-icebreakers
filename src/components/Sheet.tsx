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
 * Accessible bottom sheet: role=dialog, focus trapped, Esc closes, focus
 * restored to the opener on close (§9.2, §14).
 */
export function Sheet({ open, title, closeLabel, onClose, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);
  const titleId = useRef(`sheet-title-${Math.random().toString(36).slice(2, 8)}`);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const firstItem = items[0] as HTMLElement;
      const lastItem = items[items.length - 1] as HTMLElement;
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const opener = openerRef.current;
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
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
          <button type="button" className="btn btn--icon" onClick={onClose} aria-label={closeLabel}>
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="sheet__body">{children}</div>
      </div>
    </div>
  );
}
