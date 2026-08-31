# PROGRESS · ai-ecommerce-workbench 〔本项目活记忆 · 状态机〕

> **作用**:这是项目的"存档点"。任意 AI、任意重启会话,读它即可知道当前做到哪、下一步做什么、踩过什么坑。
> **更新时机**:每完成一个有意义步骤、每次会话结束前。
> **格式要求**:时间倒序,最新在上;短、准、可接力。

---

## 当前状态 (最后更新: 2026-08-31 · by AI)

- **阶段**:`开发中`(六步流程第⑤步 — US-3 本地完成,待 push/PR)
- **上一步完成**:`feature/3-langgraph-workflow 本地 commit; ruff+pytest 全绿(5 passed,~92%)`
- **下一步 (TODO 第一条)**:`网络恢复后 git push -u origin feature/3-langgraph-workflow 并 gh pr create`
- **阻塞项**:`当前本机连不上 github.com:443,push/PR 失败 — 需人侧重试网络后推送`

---

## 待办清单 (TODO,按优先级)

- [x] US-1 + US-2:前后端骨架 + docker-compose + CI
- [x] PaaS 部署配置(Vercel + Railway) + CD 全绿
- [x] US-3: LangGraph 工作流 + execute API + SSE + mock LLM
- [ ] US-3 PR 合并 main
- [ ] US-4:3D 场景 MVP(第 3 周)

---

## 关键决策记录 (ADR)

| 日期 | 决策 | 理由 |
|---|---|---|
| 2026-08-29 | 部署方案 B:PaaS(Vercel 前端 + Railway 后端) | 无自有服务器 |
| 2026-08-30 | CD 后端靠 Railway GitHub 集成,不用 CLI Token | RAILWAY_TOKEN 反复无效 |
| 2026-08-30 | Vercel deploy 从仓库根目录 | 避免 frontend/frontend |
| 2026-08-31 | LLM 默认 mock,CI 不依赖真实 Key | 可测可复现;live 模式可选 DeepSeek |

---

## 已知坑 (GOTCHAS)

- Vercel CLI 在中文路径下 login/link 会 ByteString 报错 → 用网页或 API 拿 ID。
- Vercel 项目 Root Directory=frontend 时,CD 不要再设 working-directory:frontend。
- Railway 公网端口填 8000;根路径 `/` 无路由,用 `/health` 验证。

---

## 部署地址

| 服务 | URL |
|---|---|
| 后端(Railway) | https://ai-ecommerce-workbench-production.up.railway.app |
| 后端健康检查 | https://ai-ecommerce-workbench-production.up.railway.app/health |
| 前端(Vercel) | Vercel Dashboard → ai-ecommerce-workbench-hznw |

---

## 里程碑 (DONE)

- [x] 2026-08-29: GitHub 仓库 + standards 活记忆
- [x] 2026-08-29: US-1+US-2 骨架(PR #1)
- [x] 2026-08-30: CI 全绿 + CD 修复(PR #2/#3)
- [x] 2026-08-31: CD Success(deploy-frontend + health-check)
- [ ] M1: MVP(第 3 周末) — 3D 场景 + AI 工作流
- [ ] M2: 核心功能(第 7 周末)
- [ ] M3: 体验增强(第 9 周末)
- [ ] M4: 正式发布(第 10 周末)

> 反臃肿:里程碑超过 15 条时,把更早内容合并成一行摘要,保持本文件可快速阅读。
