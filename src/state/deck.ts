import type { Question, Scope } from "../types.ts";

/**
 * Pure draw functions (§8). Nothing here touches the DOM or storage; the
 * caller persists `seenIds` / `lastQuestionId` and keeps `history` in memory.
 */

export const HISTORY_CAP = 50;

export type Rng = () => number;

export interface DeckState {
  /** One global cycle across every scope. */
  seenIds: string[];
  /** In-memory session history, capped at HISTORY_CAP, oldest first. */
  history: string[];
  /** Index into `history` of the card on screen; -1 when nothing is shown. */
  cursor: number;
  lastQuestionId: string | null;
}

export type NextResult =
  | { kind: "shown"; id: string; state: DeckState }
  | { kind: "exhausted"; level: "category" | "deck"; state: DeckState }
  | { kind: "empty"; state: DeckState };

export function initialDeckState(seenIds: readonly string[], lastQuestionId: string | null): DeckState {
  const history = lastQuestionId === null ? [] : [lastQuestionId];
  return { seenIds: [...seenIds], history, cursor: history.length - 1, lastQuestionId };
}

/** Active questions in scope. `favorites` is a browse list, never a draw pool. */
export function pool(questions: readonly Question[], scope: Scope): Question[] {
  if (scope === "favorites") return [];
  return questions.filter((q) => q.active && (scope === "all" || q.category === scope));
}

export function remaining(questions: readonly Question[], scope: Scope, seenIds: readonly string[]): Question[] {
  const seen = new Set(seenIds);
  return pool(questions, scope).filter((q) => !seen.has(q.id));
}

function pick<T>(items: readonly T[], rng: Rng): T {
  const index = Math.min(items.length - 1, Math.max(0, Math.floor(rng() * items.length)));
  return items[index] as T;
}

/** Put `id` on screen: truncate any forward branch, append, cap, mark seen. */
function show(state: DeckState, id: string): DeckState {
  let history = [...state.history.slice(0, state.cursor + 1), id];
  if (history.length > HISTORY_CAP) history = history.slice(history.length - HISTORY_CAP);
  const seenIds = state.seenIds.includes(id) ? state.seenIds : [...state.seenIds, id];
  return { seenIds, history, cursor: history.length - 1, lastQuestionId: id };
}

/** Changing scope starts a new forward branch but keeps `seenIds`. */
export function branch(state: DeckState): DeckState {
  if (state.cursor >= state.history.length - 1) return state;
  return { ...state, history: state.history.slice(0, state.cursor + 1) };
}

export function next(
  questions: readonly Question[],
  scope: Scope,
  state: DeckState,
  rng: Rng = Math.random,
): NextResult {
  // After prev(), walk forward through history before drawing.
  if (state.cursor < state.history.length - 1) {
    const cursor = state.cursor + 1;
    const id = state.history[cursor] as string;
    return { kind: "shown", id, state: { ...state, cursor, lastQuestionId: id } };
  }
  if (pool(questions, scope).length === 0) return { kind: "empty", state };
  const left = remaining(questions, scope, state.seenIds);
  if (left.length === 0) {
    return { kind: "exhausted", level: scope === "all" ? "deck" : "category", state };
  }
  const chosen = pick(left, rng);
  return { kind: "shown", id: chosen.id, state: show(state, chosen.id) };
}

export function prev(state: DeckState): { id: string | null; state: DeckState } {
  if (state.cursor <= 0) return { id: state.cursor === 0 ? (state.history[0] ?? null) : null, state };
  const cursor = state.cursor - 1;
  const id = state.history[cursor] as string;
  return { id, state: { ...state, cursor, lastQuestionId: id } };
}

/**
 * Explicit reset: clears `seenIds` entirely and draws from the scope's pool,
 * excluding the card currently on screen when the pool has more than one
 * question (§8 steps 2–3: "Restart deck" / "Shuffle again").
 */
export function restart(
  questions: readonly Question[],
  scope: Scope,
  state: DeckState,
  rng: Rng = Math.random,
): NextResult {
  const cleared: DeckState = { ...state, seenIds: [] };
  const candidates = pool(questions, scope);
  if (candidates.length === 0) return { kind: "empty", state: cleared };
  const last = state.lastQuestionId;
  const eligible = candidates.length > 1 ? candidates.filter((q) => q.id !== last) : candidates;
  const chosen = pick(eligible, rng);
  return { kind: "shown", id: chosen.id, state: show(cleared, chosen.id) };
}

/**
 * Content release activation (§8): drop ids that are no longer active from
 * seen/favourites/history, keep seen state for ids whose wording changed,
 * clear session history. `lastQuestionLost` tells the caller to draw.
 */
export function applyRelease(
  questions: readonly Question[],
  state: DeckState,
  favorites: readonly string[],
): { state: DeckState; favorites: string[]; lastQuestionLost: boolean } {
  const active = new Set(questions.filter((q) => q.active).map((q) => q.id));
  const last = state.lastQuestionId !== null && active.has(state.lastQuestionId) ? state.lastQuestionId : null;
  return {
    state: {
      seenIds: state.seenIds.filter((id) => active.has(id)),
      history: last === null ? [] : [last],
      cursor: last === null ? -1 : 0,
      lastQuestionId: last,
    },
    favorites: favorites.filter((id) => active.has(id)),
    lastQuestionLost: state.lastQuestionId !== null && last === null,
  };
}

/** Browse favourites in list order, wrapping; never touches `seenIds`. */
export function stepFavorites(favorites: readonly string[], currentId: string | null, dir: 1 | -1): string | null {
  if (favorites.length === 0) return null;
  const index = currentId === null ? -1 : favorites.indexOf(currentId);
  if (index === -1) return dir === 1 ? (favorites[0] ?? null) : (favorites[favorites.length - 1] ?? null);
  return favorites[(index + dir + favorites.length) % favorites.length] ?? null;
}
