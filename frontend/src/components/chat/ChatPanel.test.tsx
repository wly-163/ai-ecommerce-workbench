import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ChatPanel } from "./ChatPanel";
import { streamChat } from "../../api/chat";
import type { ChatSseEvent } from "../../api/chatSse";

vi.mock("../../api/chat", () => ({
  streamChat: vi.fn(),
  loadChat: vi.fn(),
  CONVERSATION_STORAGE_KEY: "workbench.conversation_id",
}));

const mockedStream = vi.mocked(streamChat);

describe("ChatPanel", () => {
  it("shows recommendation after send", async () => {
    mockedStream.mockImplementation(async (_message, _id, onEvent) => {
      const events: ChatSseEvent[] = [
        { event: "session", data: { conversation_id: "c1" } },
        {
          event: "node",
          data: {
            retrieve_products: {
              products: [{ id: "p1", name: "轻薄防晒衣", price: 199, category: "外套" }],
            },
          },
        },
        {
          event: "node",
          data: { generate_recommendation: { recommendation: "推荐轻薄防晒衣" } },
        },
        { event: "done", data: { done: true } },
      ];
      for (const ev of events) {
        onEvent(ev);
      }
    });
    const onProducts = vi.fn();
    const onStatus = vi.fn();
    render(<ChatPanel onProducts={onProducts} onStatus={onStatus} />);
    fireEvent.change(screen.getByPlaceholderText("例如：推荐防晒衣"), {
      target: { value: "推荐防晒衣" },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));
    expect(await screen.findByText("推荐轻薄防晒衣")).toBeInTheDocument();
    expect(onProducts).toHaveBeenCalled();
  });
});
