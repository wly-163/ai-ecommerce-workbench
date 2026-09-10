import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import App from "./App";
import { executeWorkflow } from "./api/workflows";

vi.mock("./scene/ProductScene", () => ({
  ProductScene: () => <div data-testid="product-scene" />,
}));

vi.mock("./api/workflows", () => ({
  executeWorkflow: vi.fn(),
}));

const mockedExecute = vi.mocked(executeWorkflow);

describe("App", () => {
  it("renders the workbench title", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /AI 电商智慧运营工作台/i })).toBeInTheDocument();
  });

  it("requests workflow and shows highlighted categories", async () => {
    mockedExecute.mockResolvedValue({
      query: "海边防晒",
      products: [
        { id: "p1", name: "轻薄防晒衣", price: 199, category: "外套" },
        { id: "p2", name: "宽檐遮阳帽", price: 89, category: "配饰" },
      ],
      recommendation: "ok",
    });
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "查询" }));
    expect(mockedExecute).toHaveBeenCalledWith("海边防晒");
    expect(await screen.findByText(/已高亮: 外套、配饰/)).toBeInTheDocument();
  });

  it("does not request when query is empty", async () => {
    mockedExecute.mockClear();
    render(<App />);
    fireEvent.change(screen.getByLabelText("查询"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "查询" }));
    await waitFor(() => {
      expect(mockedExecute).not.toHaveBeenCalled();
    });
  });
});
