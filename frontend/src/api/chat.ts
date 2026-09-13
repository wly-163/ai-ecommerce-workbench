import { splitSseBlocks, type ChatProduct, type ChatSseEvent } from "./chatSse";

export const CONVERSATION_STORAGE_KEY = "workbench.conversation_id";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  products: ChatProduct[] | null;
};

const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export async function loadChat(conversationId: string): Promise<{
  conversation_id: string;
  messages: ChatMessage[];
}> {
  const resp = await fetch(`${API_URL}/api/v1/chat/${conversationId}`);
  if (!resp.ok) {
    throw new Error(`load-chat:${resp.status}`);
  }
  return resp.json() as Promise<{ conversation_id: string; messages: ChatMessage[] }>;
}

export async function streamChat(
  message: string,
  conversationId: string | null,
  onEvent: (ev: ChatSseEvent) => void,
): Promise<void> {
  const resp = await fetch(`${API_URL}/api/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, conversation_id: conversationId }),
  });
  if (!resp.ok) {
    throw new Error(`chat:${resp.status}`);
  }
  if (!resp.body) {
    throw new Error("chat:empty-body");
  }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const split = splitSseBlocks(buffer);
    buffer = split.rest;
    for (const ev of split.events) {
      if (ev.event === "session") {
        localStorage.setItem(CONVERSATION_STORAGE_KEY, ev.data.conversation_id);
      }
      onEvent(ev);
    }
  }
  if (buffer.trim()) {
    const split = splitSseBlocks(buffer.endsWith("\n\n") ? buffer : `${buffer}\n\n`);
    for (const ev of split.events) {
      if (ev.event === "session") {
        localStorage.setItem(CONVERSATION_STORAGE_KEY, ev.data.conversation_id);
      }
      onEvent(ev);
    }
  }
}
