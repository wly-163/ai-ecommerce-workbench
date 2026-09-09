import { expect, test } from "@playwright/test";

test("3D scene shows category labels and highlights after query", async ({ page }) => {
  await page.route("**/api/v1/workflows/execute", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        query: "海边防晒",
        products: [
          { id: "p1", name: "轻薄防晒衣", price: 199, category: "外套" },
          { id: "p2", name: "宽檐遮阳帽", price: 89, category: "配饰" },
          { id: "p3", name: "速干沙滩裤", price: 129, category: "下装" },
        ],
        recommendation: "ok",
      }),
    });
  });

  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByText("外套", { exact: true })).toBeVisible();
  await expect(page.getByText("配饰", { exact: true })).toBeVisible();
  await expect(page.getByText("下装", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "查询" }).click();
  await expect(page.getByRole("status")).toContainText("外套");
});
