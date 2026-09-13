import { expect, test } from "@playwright/test";

test("chat recommends and highlights categories", async ({ page }) => {
  await page.route("**/api/v1/chat", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    const body = [
      "event: session",
      'data: {"conversation_id":"00000000-0000-0000-0000-000000000001"}',
      "",
      "event: node",
      'data: {"retrieve_products":{"products":[{"id":"p1","name":"轻薄防晒衣","price":199,"category":"外套"}]}}',
      "",
      "event: node",
      'data: {"generate_recommendation":{"recommendation":"推荐轻薄防晒衣"}}',
      "",
      "event: done",
      'data: {"done":true}',
      "",
    ].join("\n");
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body,
    });
  });

  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByText("外套", { exact: true })).toBeVisible();
  await page.getByPlaceholder("例如：推荐防晒衣").fill("推荐防晒衣");
  await page.getByRole("button", { name: "发送" }).click();
  await expect(page.getByText("推荐轻薄防晒衣")).toBeVisible();
  await expect(page.getByRole("status")).toContainText("外套");
});
