# PROGRESS · ai-ecommerce-workbench 〔本项目活记忆 · 状态机〕

> **作用**:这是项目的"存档点"。任意 AI、任意重启会话,读它即可知道当前做到哪、下一步做什么、踩过什么坑。
> **更新时机**:每完成一个有意义步骤、每次会话结束前。
> **格式要求**:时间倒序,最新在上;短、准、可接力。

---

## 当前状态 (最后更新: 2026-09-13 · by AI)

- **阶段**:`开发中`(六步流程第③步 · US-5 聊天切片实现中)
- **上一步完成**:`右侧导购聊天 + Postgres 会话 + 按节点 SSE; US-4 已合入 PR #9`
- **下一步 (TODO 第一条)**:`本地门禁后推送 feature/5-ai-shopping-guide 并发 PR; RAG 下一切片`
- **阻塞项**:`线上聊天需人类在 Railway 挂 Postgres`

---

## 待办清单 (TODO,按优先级)

- [x] US-1 + US-2:骨架 + CI/CD
- [x] US-3: LangGraph 工作流 API(PR #5)
- [x] 代码可读性约定:注释阅读顺序 + Mermaid 流程图 + 中文 commit
- [x] US-4:3D 场景 MVP(PR #9)
- [ ] US-5:AI 智能导购(第 4 周) — 聊天切片进行中,RAG 未做

---

## 关键决策记录 (ADR)

| 日期 | 决策 | 理由 |
|---|---|---|
| 2026-08-29 | 部署方案 B:PaaS(Vercel + Railway) | 无自有服务器 |
| 2026-08-30 | CD 后端靠 Railway GitHub 集成 | CLI Token 不可靠 |
| 2026-08-31 | LLM 默认 mock | CI 可复现 |
| 2026-09-01 | 复杂模块必须写阅读顺序 + Mermaid 流程图 | 降低接手成本 |
| 2026-09-01 | commit 说明用中文(前缀保留英文) | 团队约定 |

---

## 已知坑 (GOTCHAS)

- 改写已 push 的 commit 后再 push 会 non-fast-forward → feature 分支用 `--force-with-lease`。
- Vercel Root Directory=frontend 时,CD 不要再设 working-directory:frontend。
- Railway 公网端口填 8000;验证用 `/health`。
- FastAPI `allow_origins=["*"]` 不能与 `allow_credentials=True` 同时用,浏览器会直接拦 CORS。
- 前端默认 `VITE_API_URL=""` 走相对路径 `/api`,由 Vite 代理到后端;写死 `localhost:8000` 时若页面开在 `127.0.0.1` 会跨域。
- 重启 uvicorn 前先看 `netstat :8000`,残留的旧 reloader 会抢走请求(例如 DeepSeek 402 的旧进程)。
- DeepSeek 返回 402 Insufficient Balance 时,进程环境设 `LLM_MODE=mock` 可继续演示(dotenv 不覆盖已有环境变量)。
- pytest 聊天库必须用 `sqlite://` + `StaticPool`,否则内存库每次连都是空的。
- 导购聊天依赖 `DATABASE_URL`;没 Postgres 时 `/health` 仍 200,发消息会 503。

---

## 部署地址

| 服务 | URL |
|---|---|
| 后端 | https://ai-ecommerce-workbench-production.up.railway.app |
| 健康检查 | https://ai-ecommerce-workbench-production.up.railway.app/health |
| 工作流 API | `POST .../api/v1/workflows/execute` |
| 前端 | Vercel → ai-ecommerce-workbench-hznw |

---

## 里程碑 (DONE)

- [x] US-1~US-3 + CI/CD 全绿
- [x] M1: MVP(第 3 周末) — 3D 场景 + AI 工作流
- [ ] M2: 核心功能(第 7 周末)
- [ ] M3: 体验增强(第 9 周末)
- [ ] M4: 正式发布(第 10 周末)
