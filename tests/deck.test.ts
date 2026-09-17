import { describe, expect, it } from "vitest";
import {
  applyRelease,
  branch,
  HISTORY_CAP,
  initialDeckState,
  next,
  pool,
  prev,
  remaining,
  restart,
  stepFavorites,
  type DeckState,
  type Rng,
} from "../src/state/deck.ts";
import type { CategoryId, Question } from "../src/types.ts";

function q(id: string, category: CategoryId, active = true): Question {
  return { id, category, active, source: "2026", presentationSafe: true, ro: `RO ${id}`, en: `EN ${id}`, hu: null };
}

const QUESTIONS: Question[] = [
  q("v1", "values"),
  q("v2", "values"),
  q("p1", "professional"),
  q("p2", "professional"),
  q("p3", "professional"),
  q("r1", "relationships", false), // inactive: never drawn
];

/** Deterministic rng that always picks the first remaining item. */
const first: Rng = () => 0;

function drawAll(scope: CategoryId | "all", state: DeckState, rng: Rng = first): { ids: string[]; state: DeckState } {
  const ids: string[] = [];
  let s = state;
  for (;;) {
    const r = next(QUESTIONS, scope, s, rng);
    s = r.state;
    if (r.kind !== "shown") break;
    ids.push(r.id);
  }
  return { ids, state: s };
}

describe("pool / remaining", () => {
  it("excludes inactive questions and treats favourites as an empty pool", () => {
    expect(pool(QUESTIONS, "all").map((x) => x.id)).toEqual(["v1", "v2", "p1", "p2", "p3"]);
    expect(pool(QUESTIONS, "relationships")).toEqual([]);
    expect(pool(QUESTIONS, "favorites")).toEqual([]);
    expect(remaining(QUESTIONS, "values", ["v1"]).map((x) => x.id)).toEqual(["v2"]);
  });
});

describe("next", () => {
  it("exhausts a category, then All-remaining continues without repeats", () => {
    const { ids, state } = drawAll("values", initialDeckState([], null));
    expect(ids).toEqual(["v1", "v2"]);
    const exhausted = next(QUESTIONS, "values", state, first);
    expect(exhausted.kind).toBe("exhausted");
    if (exhausted.kind === "exhausted") expect(exhausted.level).toBe("category");

    const rest = drawAll("all", branch(state));
    expect(rest.ids).toEqual(["p1", "p2", "p3"]);
    expect(rest.state.seenIds).toEqual(["v1", "v2", "p1", "p2", "p3"]);
  });

  it("reports deck exhaustion on All and shuffle-again never repeats the last card immediately", () => {
    const { state } = drawAll("all", initialDeckState([], null));
    const done = next(QUESTIONS, "all", state, first);
    expect(done).toMatchObject({ kind: "exhausted", level: "deck" });
    expect(state.lastQuestionId).toBe("p3");

    // rng → 1 would pick the last candidate; with p3 excluded it must be p2.
    const again = restart(QUESTIONS, "all", state, () => 0.999);
    expect(again.kind).toBe("shown");
    if (again.kind === "shown") {
      expect(again.id).toBe("p2");
      expect(again.state.seenIds).toEqual(["p2"]);
    }
  });

  it("handles a one-card pool: draws it, exhausts, restart shows it again", () => {
    const one = [q("only", "values")];
    const a = next(one, "values", initialDeckState([], null), first);
    expect(a).toMatchObject({ kind: "shown", id: "only" });
    const b = next(one, "values", a.state, first);
    expect(b.kind).toBe("exhausted");
    const c = restart(one, "values", b.state, first);
    expect(c).toMatchObject({ kind: "shown", id: "only" });
  });

  it("returns empty when the scope has no active questions", () => {
    expect(next(QUESTIONS, "relationships", initialDeckState([], null), first).kind).toBe("empty");
  });

  it("never re-shows a seen id when switching category ↔ all", () => {
    const rng = (() => {
      let i = 0;
      return () => ((i += 7) % 10) / 10;
    })();
    let state = initialDeckState([], null);
    const shown: string[] = [];
    const scopes: (CategoryId | "all")[] = ["values", "all", "professional", "all", "values", "all"];
    for (const scope of scopes) {
      state = branch(state);
      const r = next(QUESTIONS, scope, state, rng);
      state = r.state;
      if (r.kind === "shown") shown.push(r.id);
    }
    expect(new Set(shown).size).toBe(shown.length);
    expect(shown.length).toBe(5);
  });
});

describe("prev / next history walk", () => {
  it("walks back without touching seenIds, then forward through history before drawing", () => {
    let state = initialDeckState([], null);
    const drawn: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = next(QUESTIONS, "all", state, first);
      state = r.state;
      if (r.kind === "shown") drawn.push(r.id);
    }
    expect(drawn).toEqual(["v1", "v2", "p1"]);

    const back1 = prev(state);
    expect(back1.id).toBe("v2");
    const back2 = prev(back1.state);
    expect(back2.id).toBe("v1");
    expect(back2.state.seenIds).toEqual(["v1", "v2", "p1"]);
    expect(prev(back2.state).id).toBe("v1"); // at the start: stays

    const fwd1 = next(QUESTIONS, "all", back2.state, first);
    expect(fwd1).toMatchObject({ kind: "shown", id: "v2" });
    const fwd2 = next(QUESTIONS, "all", fwd1.state, first);
    expect(fwd2).toMatchObject({ kind: "shown", id: "p1" });
    const fresh = next(QUESTIONS, "all", fwd2.state, first);
    expect(fresh).toMatchObject({ kind: "shown", id: "p2" });
    expect(fresh.state.seenIds).toEqual(["v1", "v2", "p1", "p2"]);
  });

  it("changing scope after prev() starts a new forward branch but keeps seenIds", () => {
    let state = initialDeckState([], null);
    for (let i = 0; i < 3; i++) state = next(QUESTIONS, "all", state, first).state;
    const back = prev(prev(state).state); // on v1, forward: v2, p1
    const branched = branch(back.state);
    expect(branched.history).toEqual(["v1"]);
    expect(branched.seenIds).toEqual(["v1", "v2", "p1"]);
    const r = next(QUESTIONS, "professional", branched, first);
    expect(r).toMatchObject({ kind: "shown", id: "p2" });
  });

  it("caps history at HISTORY_CAP", () => {
    const many = Array.from({ length: HISTORY_CAP + 10 }, (_, i) => q(`q${i}`, "values"));
    let state = initialDeckState([], null);
    for (let i = 0; i < many.length; i++) state = next(many, "values", state, first).state;
    expect(state.history.length).toBe(HISTORY_CAP);
    expect(state.cursor).toBe(HISTORY_CAP - 1);
    expect(state.seenIds.length).toBe(many.length);
  });
});

describe("favourites", () => {
  it("browsing favourites never consumes from the deck", () => {
    const state = initialDeckState([], null);
    expect(stepFavorites(["v2", "p1"], null, 1)).toBe("v2");
    expect(stepFavorites(["v2", "p1"], "v2", 1)).toBe("p1");
    expect(stepFavorites(["v2", "p1"], "p1", 1)).toBe("v2");
    expect(stepFavorites(["v2", "p1"], "v2", -1)).toBe("p1");
    expect(stepFavorites([], null, 1)).toBeNull();
    expect(state.seenIds).toEqual([]);
    expect(next(QUESTIONS, "favorites", state, first).kind).toBe("empty");
  });
});

describe("reload", () => {
  it("restores the last question and seen set from persisted values", () => {
    const state = initialDeckState(["v1", "p1"], "p1");
    expect(state.history).toEqual(["p1"]);
    expect(state.cursor).toBe(0);
    expect(next(QUESTIONS, "all", state, first)).toMatchObject({ kind: "shown", id: "v2" });
  });
});

describe("applyRelease", () => {
  it("drops retired ids from seen/favourites/history, keeps the current card if still active", () => {
    let state = initialDeckState([], null);
    for (let i = 0; i < 3; i++) state = next(QUESTIONS, "all", state, first).state; // v1 v2 p1
    const newDeck = [q("v1", "values"), q("v2", "values", false), q("p1", "professional"), q("n1", "professional")];
    const r = applyRelease(newDeck, state, ["v2", "p1", "gone"]);
    expect(r.state.seenIds).toEqual(["v1", "p1"]);
    expect(r.favorites).toEqual(["p1"]);
    expect(r.state.history).toEqual(["p1"]);
    expect(r.state.lastQuestionId).toBe("p1");
    expect(r.lastQuestionLost).toBe(false);
    expect(next(newDeck, "all", r.state, first)).toMatchObject({ kind: "shown", id: "n1" });
  });

  it("signals a draw when the current card disappeared", () => {
    let state = initialDeckState([], null);
    state = next(QUESTIONS, "values", state, first).state; // v1
    const r = applyRelease([q("v2", "values")], state, []);
    expect(r.lastQuestionLost).toBe(true);
    expect(r.state.history).toEqual([]);
    expect(r.state.cursor).toBe(-1);
  });
});
