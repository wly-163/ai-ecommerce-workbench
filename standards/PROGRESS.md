# PROGRESS · ai-ecommerce-workbench 〔本项目活记忆 · 状态机〕

> **作用**:这是项目的"存档点"。任意 AI、任意重启会话,读它即可知道当前做到哪、下一步做什么、踩过什么坑。
> **更新时机**:每完成一个有意义步骤、每次会话结束前。
> **格式要求**:时间倒序,最新在上;短、准、可接力。

---

## 当前状态 (最后更新: 2026-08-29 · by AI)

- **阶段**:`开发中`(六步流程第③~④步 — US-1+US-2 骨架已完成,待 PR)
- **上一步完成**:`feature/1-project-scaffold 分支:前后端骨架 + docker-compose + CI/CD + 本地自检全绿`
- **下一步 (TODO 第一条)**:`推送分支 → 创建 PR → 等人 Review 合并 → 配 PaaS Secrets 验证 CD`
- **阻塞项**:`GitHub Secrets 未配置(VERCEL_*/RAILWAY_TOKEN) — CD 合并前需人类配置;不影响 CI`

---

## 待办清单 (TODO,按优先级)

- [x] 填写项目上下文:`00-project-context.md`(含 PaaS 部署决策)
- [x] 整理需求与验收标准:`01-requirements.md`(US-1~12)
- [x] 初始化本文件
- [x] 人类确认 00/01/PROGRESS 内容
- [x] 从 `main` 开 `feature/1-project-scaffold` 分支
- [x] 实现 US-1 + US-2:前后端骨架 + docker-compose + CI workflow
- [x] 本地自检(ruff + pytest + eslint + vitest + build) — 全绿
- [ ] 提交并推送 feature 分支 → 创建 PR
- [ ] 人类:配置 PaaS Secrets(合并前或合并后)
- [ ] CI 全绿 → 人类 Review 并合并 main
- [ ] 验证 PaaS CD 自动部署 + `/health` 通过
- [ ] 开始 US-3:基础 LangGraph 工作流

---

## 关键决策记录 (ADR)

| 日期 | 决策 | 理由 |
|---|---|---|
| 2026-08-29 | 部署方案 B:PaaS(Vercel 前端 + Railway 后端) | 无自有服务器;免费额度可用;与 prd.md 第 10 周计划一致 |
| 2026-08-29 | 不使用 SSH CD 三件套 | 无 SSH 主机;课堂 SSH 模板不适用本项目 |
| 2026-08-29 | 本地开发用 docker-compose,CI 不强制本地 Docker | 降低开发机负担;镜像构建交给 CI |
| 2026-08-29 | 需求拆为 US-1~12,按 10 周分阶段交付 | prd.md 四大场景 + 工程化;MVP 先 US-1~4 |
| 2026-08-29 | 后端用 requirements.txt 而非 Poetry | CI 更简单,与 05-cicd-standards 推荐一致 |

---

## 已知坑 (GOTCHAS)

- `vite.config.ts` 中 `process.env` 需 `@types/node`;改用硬编码 proxy target 避免依赖。
- Prettier 默认会检查 `package-lock.json`;加 `.prettierignore` 排除。

---

## 本地自检记录 (2026-08-29)

| 命令 | 结果 |
|---|---|
| `ruff format --check .` (backend) | 通过 |
| `ruff check .` (backend) | 通过 |
| `pytest --cov=app --cov-fail-under=80` | 通过,覆盖率 100% |
| `npm run lint` (frontend) | 通过 |
| `npm run format:check` (frontend) | 通过 |
| `npm test` (frontend) | 通过 |
| `npm run build` (frontend) | 通过 |

---

## 里程碑 (DONE)

- [x] 2026-08-29: GitHub 仓库创建,main 有初始化提交
- [x] 2026-08-29: standards/ 活记忆三文件填写完成(00/01/PROGRESS)
- [x] 2026-08-29: US-1+US-2 骨架完成(frontend/backend/docker-compose/CI)
- [ ] M1: MVP(第 3 周末) — 3D 场景 + AI 工作流
- [ ] M2: 核心功能(第 7 周末) — 四大场景可演示
- [ ] M3: 体验增强(第 9 周末) — 多 Agent + 可观测性
- [ ] M4: 正式发布(第 10 周末) — v1.0.0 + 公网 Demo

> 反臃肿:里程碑超过 15 条时,把更早内容合并成一行摘要,保持本文件可快速阅读。
