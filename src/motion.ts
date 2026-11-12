/**
 * Motion helpers (decision 69). Every effect is event-triggered and finite,
 * runs only under `prefers-reduced-motion: no-preference`, and is skipped
 * where the Web Animations API is missing (tests, old browsers): the app then
 * swaps instantly, as before (decision 37).
 */

/** Easing shared with the Autonom "Prima sesiune deschisă AI" page. */
export const EASE = "cubic-bezier(.2,.7,.2,1)";

export type DealDirection = "next" | "prev";

export function motionAllowed(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  if (typeof Element === "undefined" || typeof Element.prototype.animate !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
}

/** Brand palette used for sparks and the network wake. */
export const BRAND_SPARKS = ["#00C65E", "#147BD1", "#753BBD"] as const;
