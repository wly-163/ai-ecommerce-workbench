# 阅读顺序:
# 1. FastAPI app + CORS  — HTTP 应用本体(开发期放开跨域)
# 2. include_router      — 挂上 /api/v1/workflows
# 3. /health             — 给 Docker/Railway 探活,不跑工作流
#
# .env 在 app/__init__.py 里加载,本文件不用再读配置。
# 流程图: backend/app/core/README.md

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.workflows import router as workflows_router

app = FastAPI(title="AI E-Commerce Workbench API", version="0.1.0")

# 前端 Vite 在 5173,后端在 8000,浏览器会拦跨域。开发先全放行;上线必须改成白名单。
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许任何网站来请求（开发方便，生产通常要收紧）
    allow_credentials=True,  # 允许带 cookie / 登录凭证
    allow_methods=["*"],  # 允许 GET、POST 等各种方法
    allow_headers=["*"],  # 允许各种请求头
)

app.include_router(workflows_router)


@app.get("/health")
def health() -> dict[str, str]:
    """进程还活着即可;不检查数据库/LLM,避免探活把依赖偶发故障当成整站挂了。"""
    return {"status": "ok"}
