import { registerSW } from "virtual:pwa-register";

/**
 * Service-worker registration with `registerType: "prompt"` (§13): a new
 * worker waits; we tell the UI; `skipWaiting` happens only when the user
 * taps Reload. Never reloads on its own.
 */
export interface PwaHandle {
  /** Activates the waiting worker and reloads the page. */
  applyUpdate(): Promise<void>;
}

export function setupPwa(onNeedRefresh: () => void): PwaHandle {
  const update = registerSW({
    immediate: true,
    onNeedRefresh,
    onRegisterError() {
      // Registration failure (e.g. plain HTTP preview) is non-fatal: the app still works online.
    },
  });
  return {
    applyUpdate: () => update(true),
  };
}
