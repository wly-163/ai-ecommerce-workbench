# 核心工作流(US-3)

## 阅读路径

```text
1. app/main.py                 — 挂载路由
2. app/api/v1/workflows.py     — HTTP 入口(JSON / SSE)
3. app/core/workflow.py        — LangGraph 状态与节点
4. app/services/llm_client.py  — LLM 工厂(有 Key 则 live;CI 无 Key 走 mock)
5. app/utils/sse.py            — SSE 行格式化
```

## 流程图

```mermaid
flowchart TD
    A["接口: 执行工作流<br/>POST /api/v1/workflows/execute"] --> B{是否流式输出?}
    B -->|否 stream=false| C[同步执行推荐工作流]
    B -->|是 stream=true| D[流式执行推荐工作流]
    C --> E[节点1: 检索商品]
    E --> F[节点2: 生成推荐文案]
    F --> G["返回 JSON<br/>查询词 / 商品列表 / 推荐语"]
    D --> H[按节点逐步产出更新]
    H --> I[推送 SSE: 节点事件]
    I --> J[推送 SSE: 结束事件]
    F --> K[获取 LLM 客户端]
    K --> L{LLM 模式}
    L -->|mock 或无密钥| M[模拟 LLM 客户端]
    L -->|live 且有密钥| N[真实 LLM 客户端<br/>DeepSeek]
```

## 节点说明

| 节点(代码名) | 作用 |
|---|---|
| `retrieve_products` | 模拟商品检索(关键词过滤 MOCK_CATALOG) |
| `generate_recommendation` | 基于候选商品生成中文推荐话术 |
