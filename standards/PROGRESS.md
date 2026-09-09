# PROGRESS · ai-ecommerce-workbench 〔本项目活记忆 · 状态机〕

> **作用**:这是项目的"存档点"。任意 AI、任意重启会话,读它即可知道当前做到哪、下一步做什么、踩过什么坑。
> **更新时机**:每完成一个有意义步骤、每次会话结束前。
> **格式要求**:时间倒序,最新在上;短、准、可接力。

---

## 当前状态 (最后更新: 2026-09-09 · by AI)

- **阶段**:`开发中`(US-4 设计已落盘;等待确认后写实现计划)
- **上一步完成**:`从 GitHub 历史移除 prd.md 与 Cursor 署名;main 已强制推送`
- **下一步 (TODO 第一条)**:`人审 US-4 设计文档后写实现计划并编码`
- **阻塞项**:`等人类确认 docs/superpowers/specs/2026-09-09-us4-3d-scene-design.md`

---

## 待办清单 (TODO,按优先级)

- [x] US-1 + US-2:骨架 + CI/CD
- [x] US-3: LangGraph 工作流 API(PR #5)
- [x] 代码可读性约定:注释阅读顺序 + Mermaid 流程图 + 中文 commit
- [ ] US-4:3D 场景 MVP(第 3 周)
- [ ] US-5:AI 智能导购(第 4 周)

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
- [ ] M1: MVP(第 3 周末) — 3D 场景 + AI 工作流
- [ ] M2: 核心功能(第 7 周末)
- [ ] M3: 体验增强(第 9 周末)
- [ ] M4: 正式发布(第 10 周末)
