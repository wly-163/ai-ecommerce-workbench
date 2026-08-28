## AI 电商智慧运营工作台

> 低代码 AI 工作流平台 · 3D 数字孪生 · 多智能体协作

面向电商企业的 AI 运营工作台,提供智能导购、智能客服、供应链预测、营销内容生成四大核心能力。

---

### 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/wly-163/ai-ecommerce-workbench.git
cd ai-ecommerce-workbench

# 2. 环境变量
cp .env.example .env

# 3. 一键启动(需 Docker)
docker-compose up --build
```

| 服务 | 地址 |
|---|---|
| 前端 | http://localhost:5173 |
| 后端 API | http://localhost:8000 |
| 健康检查 | http://localhost:8000/health |
| API 文档 | http://localhost:8000/docs |

---

### 本地开发(无 Docker)

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

### 质量检查

```bash
# 后端
cd backend
ruff format --check .
ruff check .
pytest --cov=app --cov-fail-under=80

# 前端
cd frontend
npm run lint
npm run format:check
npm test
npm run build
```

---

### 部署

- **前端**: Vercel
- **后端**: Railway
- 详见 [docs/deployment.md](docs/deployment.md)

---

### 项目结构

```text
ai-ecommerce-workbench/
├── frontend/          # React 19 + Vite + TypeScript
├── backend/           # FastAPI + Python 3.11
├── standards/         # 项目规范与活记忆
├── docs/              # 部署等文档
├── prototype/         # UI 原型
└── docker-compose.yml
```

---

### 开发规范

AI 与开发者请先阅读 `standards/README.md`,按 `00/01/PROGRESS` + `02~06` 规范推进。

---

### 愿景

> 让任何一个中小电商企业,在 3 天内就能搭建一套拥有智能导购、智能客服、智能补货、智能营销的 AI 运营体系。
