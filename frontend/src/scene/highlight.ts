export const CATEGORIES = ["外套", "配饰", "下装"] as const;
export type Category = (typeof CATEGORIES)[number];

export const DIM_COLOR = "#64748b";
export const CATEGORY_COLORS: Record<Category, string> = {
  外套: "#3b82f6",
  配饰: "#f59e0b",
  下装: "#22c55e",
};

export function highlightCategories(products: { category: string }[]): Set<Category> {
  const hits = new Set<Category>();
  for (const p of products) {
    if ((CATEGORIES as readonly string[]).includes(p.category)) {
      hits.add(p.category as Category);
    }
  }
  return hits;
}

export function cubeColor(category: Category, highlighted: Set<Category>): string {
  return highlighted.has(category) ? CATEGORY_COLORS[category] : DIM_COLOR;
}
