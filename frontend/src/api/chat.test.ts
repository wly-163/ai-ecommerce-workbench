import { describe, expect, it, vi, beforeEach } from "vitest";

import { CONVERSATION_STORAGE_KEY, streamChat } from "./chat";

describe("streamChat", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("emits events and stores conversation id", async () => {
    const body = [
      "event: session",
      'data: {"conversation_id":"cid-1"}',
      "",
      "event: node",
      'data: {"retrieve_products":{"products":[{"category":"外套"}]}}',
      "",
      "event: done",
      'data: {"done":true}',
      "",
    ].join("\n");
    const encoder = new TextEncoder();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader() {
            let sent = false;
            return {
              read: async () => {
                if (sent) {
                  return { done: true, value: undefined };
                }
                sent = true;
                return { done: false, value: encoder.encode(body) };
              },
            };
          },
        },
      }),
    );
    const seen: string[] = [];
    await streamChat("推荐防晒衣", null, (ev) => {
      seen.push(ev.event);
    });
    expect(seen).toEqual(["session", "node", "done"]);
    expect(localStorage.getItem(CONVERSATION_STORAGE_KEY)).toBe("cid-1");
  });
});
