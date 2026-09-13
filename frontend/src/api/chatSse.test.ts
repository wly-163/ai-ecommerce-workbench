import { describe, expect, it } from "vitest";

import { parseSseBlock, splitSseBlocks } from "./chatSse";

describe("parseSseBlock", () => {
  it("parses session event", () => {
    const ev = parseSseBlock('event: session\ndata: {"conversation_id":"abc"}');
    expect(ev).toEqual({ event: "session", data: { conversation_id: "abc" } });
  });
});

describe("splitSseBlocks", () => {
  it("yields complete blocks and keeps tail", () => {
    const { events, rest } = splitSseBlocks(
      'event: session\ndata: {"conversation_id":"abc"}\n\nevent: node\ndata: {',
    );
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe("session");
    expect(rest.startsWith("event: node")).toBe(true);
  });
});
