# 部署指南 · PaaS (Vercel + Railway)

> 本项目无自有服务器,采用 **方案 B**:前端 Vercel、后端 Railway。
> 本地开发用 `docker-compose up`,不依赖 PaaS。

---

## 1. 本地开发

```bash
# 复制环境变量
cp .env.example .env

# 一键启动(postgres + redis + backend + frontend)
docker-compose up --build
```

访问:
- 前端: http://localhost:5173
- 后端健康检查: http://localhost:8000/health

不装 Docker 时,可分别启动:

```bash
# 后端
cd backend
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000

# 前端(另开终端)
cd frontend
npm install
npm run dev
```

---

## 2. GitHub Secrets(第一次 CD 前必配)

到 GitHub 仓库 → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | 获取方式 |
|---|---|
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Vercel 项目 Settings → General |
| `VERCEL_PROJECT_ID` | 同上 |
| `RAILWAY_TOKEN` | [railway.app/account/tokens](https://railway.app/account/tokens) |

可选 Repository Variable:
- `BACKEND_URL`: Railway 部署后的公网地址(用于 CD 健康检查)

---

## 3. Vercel 前端

1. 登录 [vercel.com](https://vercel.com),Import GitHub 仓库
2. Root Directory 设为 `frontend`
3. Framework Preset: **Vite**
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. 环境变量:`VITE_API_URL` = Railway 后端地址

GitHub Actions CD 也会自动部署;两者可并存,以 Actions 为准。

---

## 4. Railway 后端

1. 登录 [railway.app](https://railway.app),New Project → Deploy from GitHub
2. Root Directory 设为 `backend`
3. 添加 PostgreSQL 和 Redis 插件(后续 US 需要)
4. 环境变量:
   - `DATABASE_URL`(Railway PostgreSQL 自动注入)
   - `REDIS_URL`(Railway Redis 自动注入)
5. 生成 Domain,得到公网 URL

Railway 会使用 `backend/Dockerfile` 构建。

---

## 5. CD 流程

```text
合并 main → GitHub Actions CD 触发
  ├─ deploy-backend: railway up (backend/)
  ├─ deploy-frontend: vercel deploy --prod (frontend/)
  └─ health-check: curl $BACKEND_URL/health
```

Secrets 未配置时 CD 会失败,不影响本地开发和 CI。

---

## 6. 排错

| 现象 | 检查 |
|---|---|
| CD 报 Secret not found | 确认 4 个 Secret 名称大小写一致 |
| Vercel 构建失败 | `frontend/` 下 `npm run build` 本地是否通过 |
| Railway 启动失败 | 查看 Railway 日志,Dockerfile 端口是否为 8000 |
| 前端连不上后端 | `VITE_API_URL` 是否指向 Railway 公网地址 |
| CORS 错误 | 后端 `main.py` 已允许 `*`,生产环境可收紧 |
