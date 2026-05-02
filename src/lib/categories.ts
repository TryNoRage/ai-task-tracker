export type CategoryValue = "work" | "personal" | "study" | "other";

export interface CategoryDef {
  value: CategoryValue;
  label: string;
  emoji: string;
}

export const CATEGORIES: ReadonlyArray<CategoryDef> = [
  { value: "work", label: "Робота", emoji: "💼" },
  { value: "personal", label: "Особисте", emoji: "🏠" },
  { value: "study", label: "Навчання", emoji: "📚" },
  { value: "other", label: "Інше", emoji: "🔖" },
] as const;

const MAP: Record<string, CategoryDef> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c])
);

export function getCategory(value: string): CategoryDef {
  return MAP[value] ?? MAP.other;
}

export function isCategory(value: string): value is CategoryValue {
  return value in MAP;
}
