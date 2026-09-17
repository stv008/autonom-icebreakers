export type Lang = "ro" | "en";

export type CategoryId =
  | "me_life_dreams"
  | "values"
  | "personal_growth"
  | "relationships"
  | "professional";

export const CATEGORIES = [
  { id: "me_life_dreams", ro: "Eu: viață și vise", en: "Me: Life & Dreams" },
  { id: "values", ro: "Valori", en: "Values" },
  { id: "personal_growth", ro: "Creștere personală", en: "Personal Growth" },
  { id: "relationships", ro: "Relații", en: "Relationships" },
  { id: "professional", ro: "Profesional", en: "Professional" },
] as const satisfies readonly { id: CategoryId; ro: string; en: string }[];

export const CATEGORY_IDS: readonly CategoryId[] = CATEGORIES.map((c) => c.id);

export function isCategoryId(value: string): value is CategoryId {
  return (CATEGORY_IDS as readonly string[]).includes(value);
}

/** Picker scopes. `all` and `favorites` are not categories in the JSON (§5.2). */
export type Scope = "all" | CategoryId | "favorites";

export function isScope(value: string): value is Scope {
  return value === "all" || value === "favorites" || isCategoryId(value);
}

export type Source = "2026" | "legacy";

export interface Question {
  id: string;
  category: CategoryId;
  active: boolean;
  source: Source;
  presentationSafe: boolean;
  ro: string;
  en: string;
  hu: string | null;
}

export interface Deck {
  schemaVersion: 1;
  contentVersion: string;
  releaseSeq: number;
  publishedAt: string;
  questions: Question[];
}

export interface ContentManifest {
  releaseSeq: number;
  contentVersion: string;
  schemaVersion: number;
  questionsUrl: string;
  sha256: string;
}

export interface Persisted {
  lang: Lang;
  scope: Scope;
  seenIds: string[]; // ONE global cycle, canonical ids
  favorites: string[];
  lastQuestionId: string | null;
  installHintDismissed: boolean;
}
