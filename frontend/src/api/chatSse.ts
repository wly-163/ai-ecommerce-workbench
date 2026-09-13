export type ChatProduct = { id: string; name: string; price: number; category: string };

export type ChatSseEvent =
  | { event: "session"; data: { conversation_id: string } }
  | { event: "node"; data: Record<string, unknown> }
  | { event: "error"; data: { message: string } }
  | { event: "done"; data: { done: boolean } };

export function parseSseBlock(block: string): ChatSseEvent | null {
  let name = "message";
  let payload: unknown;
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) {
      name = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      payload = JSON.parse(line.slice("data:".length).trim());
    }
  }
  if (payload === undefined) {
    return null;
  }
  return { event: name, data: payload } as ChatSseEvent;
}

export function splitSseBlocks(buffer: string): { events: ChatSseEvent[]; rest: string } {
  const parts = buffer.split("\n\n");
  const complete = buffer.endsWith("\n\n") ? parts.slice(0, -1) : parts.slice(0, -1);
  const rest = buffer.endsWith("\n\n") ? "" : (parts[parts.length - 1] ?? "");
  const events: ChatSseEvent[] = [];
  for (const block of complete) {
    const ev = parseSseBlock(block);
    if (ev) {
      events.push(ev);
    }
  }
  return { events, rest };
}
