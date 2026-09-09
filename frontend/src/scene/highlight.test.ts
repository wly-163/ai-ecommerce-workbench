import { describe, expect, it } from "vitest";

import { highlightCategories } from "./highlight";

describe("highlightCategories", () => {
  it("collects known categories from products", () => {
    const set = highlightCategories([
      { category: "外套" },
      { category: "配饰" },
      { category: "外套" },
    ]);
    expect([...set].sort()).toEqual(["外套", "配饰"].sort());
  });

  it("ignores unknown categories", () => {
    const set = highlightCategories([{ category: "鞋靴" }]);
    expect(set.size).toBe(0);
  });

  it("returns empty set for empty list", () => {
    expect(highlightCategories([]).size).toBe(0);
  });
});
