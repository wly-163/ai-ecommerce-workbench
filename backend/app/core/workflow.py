# 阅读顺序:
# 1. MOCK_CATALOG / WorkflowState — 模拟商品与图状态
# 2. retrieve_products            — 节点1: 按关键词召回商品
# 3. generate_recommendation      — 节点2: LLM(可 mock)生成推荐文案
# 4. build_recommendation_graph   — 组装 LangGraph 边
# 5. run_recommendation           — 同步入口(整图 invoke)
# 6. stream_recommendation        — 流式入口(按节点 updates)
#
# 流程图见同目录 README.md

from __future__ import annotations

from collections.abc import Iterator
from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from app.services.llm_client import get_llm_client

# MVP 阶段用内存目录;US-5 再换成真实 RAG/向量库
MOCK_CATALOG = [
    {"id": "p1", "name": "轻薄防晒衣", "price": 199, "category": "外套"},
    {"id": "p2", "name": "宽檐遮阳帽", "price": 89, "category": "配饰"},
    {"id": "p3", "name": "速干沙滩裤", "price": 129, "category": "下装"},
]


class WorkflowState(TypedDict):
    query: str
    products: list[dict]
    recommendation: str


def retrieve_products(state: WorkflowState) -> dict:
    """节点1: 关键词命中则过滤目录,否则回退前两件,保证图可继续跑。"""
    q = state["query"].lower()
    hits = [p for p in MOCK_CATALOG if any(c in q for c in ("防晒", "海边", "度假", "推荐"))]
    if not hits:
        hits = MOCK_CATALOG[:2]
    return {"products": hits}


def generate_recommendation(state: WorkflowState) -> dict:
    """节点2: 把候选商品塞进 prompt;LLM 实现由 LLM_MODE 决定(默认 mock)。"""
    client = get_llm_client()
    catalog = "、".join(f"{p['name']}(¥{p['price']})" for p in state["products"])
    prompt = f"用户需求：{state['query']}\n候选商品：{catalog}\n请用一两句中文给出推荐理由。"
    return {"recommendation": client.complete(prompt)}


def build_recommendation_graph():
    graph = StateGraph(WorkflowState)
    graph.add_node("retrieve_products", retrieve_products)
    graph.add_node("generate_recommendation", generate_recommendation)
    graph.add_edge(START, "retrieve_products")
    graph.add_edge("retrieve_products", "generate_recommendation")
    graph.add_edge("generate_recommendation", END)
    return graph.compile()


def run_recommendation(query: str) -> dict:
    """同步跑完整张图,返回最终 WorkflowState 字典。"""
    app = build_recommendation_graph()
    return app.invoke({"query": query, "products": [], "recommendation": ""})


def stream_recommendation(query: str) -> Iterator[dict]:
    """按节点产出 updates,供 SSE 推送(每个 event 是 {节点名: 增量状态})。"""
    app = build_recommendation_graph()
    yield from app.stream(
        {"query": query, "products": [], "recommendation": ""},
        stream_mode="updates",
    )
