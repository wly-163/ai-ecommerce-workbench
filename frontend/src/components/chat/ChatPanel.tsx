import { FormEvent, useEffect, useState } from "react";

import { CONVERSATION_STORAGE_KEY, loadChat, streamChat, type ChatMessage } from "../../api/chat";
import type { ChatProduct, ChatSseEvent } from "../../api/chatSse";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { highlightCategories } from "../../scene/highlight";

export type ChatPanelProps = {
  onProducts: (products: { category: string }[]) => void;
  onStatus: (text: string) => void;
};

function productsFromNode(data: Record<string, unknown>): ChatProduct[] | null {
  const retrieve = data.retrieve_products as { products?: ChatProduct[] } | undefined;
  if (!retrieve?.products) {
    return null;
  }
  return retrieve.products;
}

function recommendationFromNode(data: Record<string, unknown>): string | null {
  const gen = data.generate_recommendation as { recommendation?: string } | undefined;
  return gen?.recommendation ?? null;
}

export function ChatPanel({ onProducts, onStatus }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState("");

  useEffect(() => {
    const id = localStorage.getItem(CONVERSATION_STORAGE_KEY);
    if (!id) {
      return;
    }
    void loadChat(id)
      .then((body) => {
        setMessages(body.messages);
      })
      .catch((err: unknown) => {
        const text = err instanceof Error ? err.message : "";
        if (text.includes("404")) {
          localStorage.removeItem(CONVERSATION_STORAGE_KEY);
          onStatus("会话不存在，已开新对话");
        }
      });
  }, [onStatus]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) {
      return;
    }
    setDraft("");
    setLoading(true);
    setHint("正在挑货");
    setMessages((prev) => [...prev, { role: "user", content: text, products: null }]);
    const conversationId = localStorage.getItem(CONVERSATION_STORAGE_KEY);
    try {
      await streamChat(text, conversationId, (ev: ChatSseEvent) => {
        if (ev.event === "node") {
          const products = productsFromNode(ev.data);
          if (products) {
            onProducts(products);
            const names = [...highlightCategories(products)].join("、") || "无";
            onStatus(`已高亮: ${names}`);
            setHint("正在写推荐");
          }
          const rec = recommendationFromNode(ev.data);
          if (rec) {
            setMessages((prev) => [...prev, { role: "assistant", content: rec, products: null }]);
          }
        }
        if (ev.event === "error") {
          onStatus(ev.data.message);
        }
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : "";
      if (detail.includes("503")) {
        onStatus("暂时连不上，请稍后");
      } else {
        onStatus(`请求失败: ${detail || "未知错误"}`);
      }
    } finally {
      setLoading(false);
      setHint("");
    }
  }

  return (
    <aside className="chat-dock">
      <ScrollArea className="chat-log">
        {messages.map((msg, index) => (
          <p key={`${msg.role}-${index}`} className={`chat-bubble chat-bubble-${msg.role}`}>
            {msg.content}
          </p>
        ))}
        {hint ? <p className="chat-hint">{hint}</p> : null}
      </ScrollArea>
      <form className="chat-form" onSubmit={onSubmit}>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="例如：推荐防晒衣"
          disabled={loading}
        />
        <Button type="submit" disabled={loading}>
          发送
        </Button>
      </form>
    </aside>
  );
}
