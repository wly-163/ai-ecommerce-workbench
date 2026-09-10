import { afterEach, describe, expect, it, vi } from "vitest";

import { executeWorkflow } from "./workflows";

describe("executeWorkflow", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts query and returns JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        query: "海边防晒",
        products: [{ id: "p1", name: "轻薄防晒衣", price: 199, category: "外套" }],
        recommendation: "推荐防晒衣",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await executeWorkflow("海边防晒");
    expect(result.products[0].category).toBe("外套");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/workflows/execute",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "海边防晒", stream: false }),
      }),
    );
  });

  it("throws when response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
    );
    await expect(executeWorkflow("x")).rejects.toThrow(/500/);
  });
});
