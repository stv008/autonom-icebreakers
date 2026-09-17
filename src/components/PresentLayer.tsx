import { useEffect, useRef } from "react";

/**
 * Present mode side effects (§9.4): Screen Wake Lock while presenting,
 * re-acquired when the tab becomes visible again or after the browser
 * releases it on its own, released on exit. If the API is unsupported or the
 * request is denied, nothing happens.
 */
export function useWakeLock(active: boolean): void {
  const sentinel = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let cancelled = false;

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          await lock.release();
          return;
        }
        sentinel.current = lock;
        // The browser releases the lock itself when the tab is hidden; forget
        // it so the next visibility change re-acquires.
        lock.addEventListener("release", () => {
          if (sentinel.current === lock) sentinel.current = null;
        });
      } catch {
        // unsupported or denied — continue silently
      }
    };
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (sentinel.current === null || sentinel.current.released) void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      const lock = sentinel.current;
      sentinel.current = null;
      if (lock && !lock.released) void lock.release().catch(() => undefined);
    };
  }, [active]);
}

/** Marks the document so CSS can switch to the presentation layout. */
export function PresentLayer({ active }: { active: boolean }) {
  useWakeLock(active);
  useEffect(() => {
    document.documentElement.classList.toggle("present", active);
    return () => document.documentElement.classList.remove("present");
  }, [active]);
  return null;
}
