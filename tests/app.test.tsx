// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sample from "../public/data/questions.json";
import { App } from "../src/App.tsx";
import { STORAGE_KEY } from "../src/state/storage.ts";

/**
 * Focused App-level behaviour that pure-state tests cannot see: what gets
 * persisted while content is still loading, and how update dismissal is keyed.
 */

const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Record<string, unknown> | null;
const flush = () => act(async () => {
  await new Promise((r) => setTimeout(r, 0));
});

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    disconnect() {}
  });
  vi.stubGlobal("caches", undefined);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("App", () => {
  it("does not overwrite the saved last question while content is still loading (interrupted mount)", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ lang: "en", scope: "all", seenIds: ["va-004"], favorites: ["va-004"], lastQuestionId: "va-004", installHintDismissed: false }));
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => undefined))); // never resolves
    render(<App />);
    await flush();
    expect(stored()?.["lastQuestionId"]).toBe("va-004");
    expect(stored()?.["seenIds"]).toEqual(["va-004"]);
  });

  it("restores the saved card once content loads and persists from then on", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ lang: "en", scope: "all", seenIds: ["va-004"], favorites: [], lastQuestionId: "va-004", installHintDismissed: true }));
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.includes("questions.json")) return new Response(JSON.stringify(sample), { headers: { "content-type": "application/json" } });
      return new Response("", { status: 404 });
    }));
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    render(<App />);
    await flush();
    const va004 = sample.questions.find((q) => q.id === "va-004");
    expect(screen.getByText(va004?.en ?? "")).toBeTruthy();
    expect(stored()?.["lastQuestionId"]).toBe("va-004");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await flush();
    expect((stored()?.["seenIds"] as string[]).length).toBe(2);
    expect(stored()?.["lastQuestionId"]).not.toBe("va-004");
  });
});
