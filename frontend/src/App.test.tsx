import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "./App";

describe("App", () => {
  it("renders the workbench title", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /AI 电商智慧运营工作台/i })).toBeInTheDocument();
  });
});
