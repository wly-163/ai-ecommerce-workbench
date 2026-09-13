import { useState } from "react";

import { ChatPanel } from "./components/chat/ChatPanel";
import { ProductScene } from "./scene/ProductScene";
import { type Category, highlightCategories } from "./scene/highlight";

export function App() {
  const [highlighted, setHighlighted] = useState<Set<Category>>(() => new Set());
  const [status, setStatus] = useState("输入需求后发送，命中的品类立方体会点亮");

  return (
    <div className="app">
      <header className="toolbar">
        <h1>AI 电商智慧运营工作台</h1>
        <p className="status" role="status">
          {status}
        </p>
      </header>
      <div className="app-body">
        <ProductScene highlighted={highlighted} />
        <ChatPanel
          onProducts={(products) => {
            setHighlighted(highlightCategories(products));
          }}
          onStatus={setStatus}
        />
      </div>
    </div>
  );
}

export default App;
