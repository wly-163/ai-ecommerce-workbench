import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import App from "./App";

vi.mock("./scene/ProductScene", () => ({
  ProductScene: () => <div data-testid="product-scene" />,
}));

vi.mock("./components/chat/ChatPanel", () => ({
  ChatPanel: ({
    onProducts,
    onStatus,
  }: {
    onProducts: (p: { category: string }[]) => void;
    onStatus: (t: string) => void;
  }) => (
    <button
      type="button"
      onClick={() => {
        onProducts([{ category: "外套" }]);
        onStatus("已高亮: 外套");
      }}
    >
      模拟点亮
    </button>
  ),
}));

describe("App", () => {
  it("renders the workbench title", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /AI 电商智慧运营工作台/i })).toBeInTheDocument();
  });

  it("shows highlighted categories from chat products", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "模拟点亮" }));
    expect(await screen.findByRole("status")).toHaveTextContent("外套");
  });
});
