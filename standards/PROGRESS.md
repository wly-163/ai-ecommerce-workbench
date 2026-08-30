# PROGRESS · ai-ecommerce-workbench 〔本项目活记忆 · 状态机〕

> **作用**:这是项目的"存档点"。任意 AI、任意重启会话,读它即可知道当前做到哪、下一步做什么、踩过什么坑。
> **更新时机**:每完成一个有意义步骤、每次会话结束前。
> **格式要求**:时间倒序,最新在上;短、准、可接力。

---

## 当前状态 (最后更新: 2026-08-31 · by AI)

- **阶段**:`开发中`(六步流程第⑥步 — US-1 CI/CD 已完成,CD 全绿)
- **上一步完成**:`PR #1~#3 合并;CI + CD 全绿(Vercel 前端 + Railway /health)`
- **下一步 (TODO 第一条)**:`从 main 开 feature/3-langgraph-workflow,开始 US-3`
- **阻塞项**:`无`

---

## 待办清单 (TODO,按优先级)

- [x] US-1 + US-2:前后端骨架 + docker-compose + CI
- [x] PR #1 合并 + CI 全绿
- [x] PaaS 部署配置(Vercel + Railway)
- [x] PR #2/#3 修复 CD → CD 全绿(deploy-frontend + health-check)
- [ ] 开始 US-3:基础 LangGraph 工作流(第 2 周)
- [ ] US-4:3D 场景 MVP(第 3 周)

---

## 关键决策记录 (ADR)

| 日期 | 决策 | 理由 |
|---|---|---|
| 2026-08-29 | 部署方案 B:PaaS(Vercel 前端 + Railway 后端) | 无自有服务器 |
| 2026-08-29 | 不使用 SSH CD 三件套 | 无 SSH 主机 |
| 2026-08-30 | CD 后端靠 Railway GitHub 集成,不用 CLI Token | RAILWAY_TOKEN 反复无效;集成已可用 |
| 2026-08-30 | Vercel deploy 从仓库根目录,不在 frontend/ 子目录 | 避免 frontend/frontend 路径错误 |
| 2026-08-30 | Vercel CLI 用 vercel@latest,不用 amondnet action | 旧 CLI 25.x 不满足 API 47.2.2+ |

---

## 已知坑 (GOTCHAS)

- Vercel CLI 在中文路径(`工程化项目`)下 login/link 会 ByteString 报错 → 用网页或 API 拿 ID。
- Vercel 项目 Root Directory=frontend 时,CD 不要再设 working-directory:frontend。
- Railway 公网 Domain 端口填 8000,不是 8080;根路径 `/` 无路由,用 `/health` 验证。
- Git push workflow 文件需 `gh auth refresh -s workflow` 或改用 SSH。

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
