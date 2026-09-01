# 阅读顺序:
# 1. MOCK_CATALOG / WorkflowState — 假货架 + 整张图共用的「纸条」字段
# 2. retrieve_products            — 节点1:按关键词从假货架拿货
# 3. generate_recommendation      — 节点2:把货塞进 prompt,让 LLM 写推荐语
# 4. build_recommendation_graph   — 把两站焊成 START→挑货→写推荐→END
# 5. run_recommendation           — 同步入口:invoke 整图,返回最终状态
# 6. stream_recommendation        — 流式入口:每站结束交出增量,给 SSE 用
#
# 这不是智能检索。关键词命中就拿目录里海边场景的货;没命中也要给货,否则下一站没东西可写。
# 流程图见同目录 README.md

from __future__ import annotations

from collections.abc import Iterator
from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from app.services.llm_client import get_llm_client

# MVP 写死三件货,保证无数据库也能跑通图。US-5 再换成 RAG/向量库。
MOCK_CATALOG = [
    {"id": "p1", "name": "轻薄防晒衣", "price": 199, "category": "外套"},
    {"id": "p2", "name": "宽檐遮阳帽", "price": 89, "category": "配饰"},
    {"id": "p3", "name": "速干沙滩裤", "price": 129, "category": "下装"},
]


class WorkflowState(TypedDict):
    """LangGraph 在节点之间传递的状态。节点只 return 自己改的字段,框架负责合并。"""

    query: str  # 用户原话,全程只读
    products: list[dict]  # 节点1 写入
    recommendation: str  # 节点2 写入


def retrieve_products(state: WorkflowState) -> dict:
    """节点1:关键词命中则过滤目录,否则回退前两件,保证图可继续跑。"""
    q = state["query"].lower()
    # 当前目录三件都是海边防晒场景,命中任一场景词就全拿,而不是按商品名精确匹配
    hits = [p for p in MOCK_CATALOG if any(c in q for c in ("防晒", "海边", "度假", "推荐"))]
    if not hits:
        # 空列表会让节点2拼出空候选,LLM 只能胡编。宁可推荐不准,也要图能跑完。
        hits = MOCK_CATALOG[:2]
    return {"products": hits}


def generate_recommendation(state: WorkflowState) -> dict:
    """节点2:把候选商品塞进 prompt;有 API Key 走真模型,否则 mock。"""
    client = get_llm_client()
    catalog = "、".join(f"{p['name']}(¥{p['price']})" for p in state["products"])
    prompt = f"用户需求：{state['query']}\n候选商品：{catalog}\n请用一两句中文给出推荐理由。"
    return {"recommendation": client.complete(prompt)}


def build_recommendation_graph():
    """直线图,暂无分支/循环。以后「没货再搜」也是在这里加边。"""
    graph = StateGraph(WorkflowState)
    graph.add_node("retrieve_products", retrieve_products)
    graph.add_node("generate_recommendation", generate_recommendation)
    graph.add_edge(START, "retrieve_products")
    graph.add_edge("retrieve_products", "generate_recommendation")
    graph.add_edge("generate_recommendation", END)
    return graph.compile()


def run_recommendation(query: str) -> dict:
    """同步跑完整张图,返回最终 WorkflowState。给 /docs、Postman 一次性拿结果。"""
    app = build_recommendation_graph()
    # products/recommendation 必须先占位,TypedDict 三个键缺一不可
    return app.invoke({"query": query, "products": [], "recommendation": ""})


def stream_recommendation(query: str) -> Iterator[dict]:
    """按节点产出 updates,每个元素形如 {节点名: 增量状态},供 SSE 推送。"""
    app = build_recommendation_graph()
    yield from app.stream(
        {"query": query, "products": [], "recommendation": ""},
        stream_mode="updates",  # 不要 values:values 是全量快照,前端不好判断刚完成哪一站
    )
