import { FormEvent, useState } from "react";

import { executeWorkflow } from "./api/workflows";
import { ProductScene } from "./scene/ProductScene";
import { type Category, highlightCategories } from "./scene/highlight";

export function App() {
  const [query, setQuery] = useState("海边防晒");
  const [highlighted, setHighlighted] = useState<Set<Category>>(() => new Set());
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("输入需求后查询，命中的品类立方体会点亮");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q) {
      return;
    }
    setLoading(true);
    setStatus("请求中");
    try {
      const result = await executeWorkflow(q);
      const hits = highlightCategories(result.products);
      setHighlighted(hits);
      const names = [...hits].join("、") || "无";
      setStatus(`已高亮: ${names}`);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "未知错误";
      setStatus(`请求失败: ${detail}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="toolbar">
        <h1>AI 电商智慧运营工作台</h1>
        <form className="query-form" onSubmit={onSubmit}>
          <label htmlFor="workflow-query" className="sr-only">
            查询
          </label>
          <input
            id="workflow-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例如：海边防晒"
          />
          <button type="submit" disabled={loading}>
            查询
          </button>
        </form>
        <p className="status" role="status">
          {status}
        </p>
      </header>
      <ProductScene highlighted={highlighted} />
    </div>
  );
}

export default App;
