# 核心工作流(US-3)

## 阅读路径

```text
1. app/main.py                 — 挂载路由
2. app/api/v1/workflows.py     — HTTP 入口(JSON / SSE)
3. app/core/workflow.py        — LangGraph 状态与节点
4. app/services/llm_client.py  — LLM 工厂(默认 mock)
5. app/utils/sse.py            — SSE 行格式化
```

## 流程图

```mermaid
flowchart TD
    A[POST /api/v1/workflows/execute] --> B{stream?}
    B -->|false| C[run_recommendation]
    B -->|true| D[stream_recommendation]
    C --> E[retrieve_products]
    E --> F[generate_recommendation]
    F --> G[返回 JSON: query/products/recommendation]
    D --> H[按节点 yield updates]
    H --> I[SSE event:node]
    I --> J[SSE event:done]
    F --> K[get_llm_client]
    K --> L{LLM_MODE}
    L -->|mock| M[MockLLMClient]
    L -->|live| N[LiveLLMClient / DeepSeek]
```

## 节点说明

| 节点 | 作用 |
|---|---|
| `retrieve_products` | 模拟商品检索(关键词过滤 MOCK_CATALOG) |
| `generate_recommendation` | 基于候选商品生成中文推荐话术 |
