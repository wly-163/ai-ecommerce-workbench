from __future__ import annotations

from collections.abc import Iterator
from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from app.services.llm_client import get_llm_client

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
    q = state["query"].lower()
    hits = [p for p in MOCK_CATALOG if any(c in q for c in ("防晒", "海边", "度假", "推荐"))]
    if not hits:
        hits = MOCK_CATALOG[:2]
    return {"products": hits}


def generate_recommendation(state: WorkflowState) -> dict:
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
    app = build_recommendation_graph()
    return app.invoke({"query": query, "products": [], "recommendation": ""})


def stream_recommendation(query: str) -> Iterator[dict]:
    app = build_recommendation_graph()
    yield from app.stream(
        {"query": query, "products": [], "recommendation": ""},
        stream_mode="updates",
    )
