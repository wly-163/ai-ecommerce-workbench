# 00 · 项目上下文 〔本项目活记忆 · AI 维护〕

> **作用**:这是项目的“身份档案”。AI 接管项目时先读这里,了解项目目标、技术栈、目录、部署取值。
> **更新时机**:架构、技术栈、目录结构、端口、部署目录、重要约束变化时更新。
> **填写方式**:把 `<...>` 替换成真实内容;用不到的行删掉。

---

## 1. 项目是什么

- **项目名称**:`ai-ecommerce-workbench`
- **一句话目标**:`打造一个面向电商企业的低代码AI工作流平台,通过3D数字孪生可视化与多智能体协作,让运营从“经验驱动”进化为“AI驱动的智能决策”`
- **使用者/受益者**:`电商运营人员、数据分析师、管理者;为中小电商企业降低AI落地门槛,提升运营效率`
- **核心功能**:
  - `AI智能导购:自然语言理解→RAG商品检索→个性化推荐生成,支持多轮对话`
  - `AI智能客服:意图识别→业务API调用(订单/物流查询)→售后政策RAG→Human-in-the-Loop高风险拦截`
  - `供应链智能预测:时序销量预测→库存水位预警→智能补货清单生成→3D场景联动`
  - `AI营销内容生成:商品信息→LLM生成直播脚本/多语言文案→(可选)数字人推流`
  - `低代码工作流编排:React Flow拖拽DAG→LangGraph执行引擎→可观测性链路追踪`
- **输入/数据**(如有):`电商平台API(订单/商品/库存)、用户聊天对话、历史销售CSV/Excel、售后政策PDF/DOCX、商品图片;均为模拟数据,不进Git`

## 2. 技术栈

| 层            | 选型                                              | 理由                                                         |
| ------------- | ------------------------------------------------- | ------------------------------------------------------------ |
| 语言/运行时   | `前端: Node 20 + TypeScript 5; 后端: Python 3.11` | `前端生态成熟,Python AI生态最丰富(LangChain/LangGraph)`      |
| Web/API 框架  | `前端: Vite 5 + React 19; 后端: FastAPI`          | `Vite启动快,HMR体验好;FastAPI异步性能强,自动生成OpenAPI文档` |
| 3D引擎        | `Three.js + React Three Fiber + Drei`             | `React生态最流行的3D方案,声明式API降低复杂度`                |
| 工作流编辑器  | `@xyflow/react (React Flow)`                      | `行业标准,支持DAG拖拽、自定义节点,文档丰富`                  |
| 状态管理      | `Zustand + TanStack Query`                        | `Zustand轻量无模板代码;TanStack Query管理服务端状态缓存`     |
| UI组件        | `shadcn/ui + Tailwind CSS`                        | `现代、可定制、无头组件库,快速搭建专业界面`                  |
| AI编排框架    | `LangGraph 1.2+`                                  | `支持有状态多智能体协作、循环、分支,比LangChain更适合复杂工作流` |
| AI基础框架    | `LangChain 1.x`                                   | `与LangGraph无缝配合,提供RAG、工具调用等基础能力`            |
| 向量数据库    | `ChromaDB (开发) / Milvus (生产备选)`             | `Chroma轻量无服务依赖,适合本地开发;Milvus企业级可扩展`       |
| Embedding模型 | `BAAI/bge-small-zh-v1.5`                          | `中文效果优秀,轻量(24MB),本地运行无需API调用`                |
| LLM           | `DeepSeek API / 通义千问`                         | `国内可用,成本低,推理能力强,兼容OpenAI SDK`                  |
| Reranker      | `Qwen3-VL-Rerank`                                 | `精排提升RAG召回质量`                                        |
| 异步任务      | `Celery + Redis`                                  | `处理耗时工作流(如批量预测、视频生成),支持重试与状态追踪`    |
| 数据库        | `PostgreSQL 15 + SQLModel`                        | `关系型数据库稳定可靠,SQLModel提供类型安全的ORM`             |
| 实时通信      | `WebSocket (FastAPI内置)`                         | `实现3D场景实时联动、多用户协同、执行进度推送`               |
| 测试          | `pytest (后端) + Vitest (前端)`                   | `Python/JS生态标准测试框架`                                  |
| 格式/静态检查 | `ruff (后端) + ESLint + Prettier (前端)`          | `ruff速度极快,替代black/isort/flake8;ESLint+Prettier前端标准` |
| 打包/运行     | `Docker + Docker Compose`                         | `一键启动所有服务(前端/后端/PostgreSQL/Redis),降低试用门槛`  |
| CI/CD         | GitHub Actions                                    | `通用、可视化、适合开源项目与团队协作`                       |

## 3. 目录地图

```text
ai-ecommerce-workbench/
├── standards/                    # AI 项目记忆与通用规范
│   └── 00-project-context.md     # 本文件
├── frontend/                     # React + TypeScript 前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── scene/            # 3D场景 (Three.js/R3F)
│   │   │   ├── workflow/         # 工作流编辑器 (React Flow)
│   │   │   ├── chat/             # 聊天界面 (客服/导购)
│   │   │   ├── dashboard/        # 运营仪表盘 (ECharts)
│   │   │   └── ui/               # shadcn/ui 通用组件
│   │   ├── stores/               # Zustand 状态管理
│   │   ├── api/                  # API客户端 (TanStack Query)
│   │   ├── hooks/                # 自定义Hooks
│   │   ├── lib/                  # 工具函数
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── Dockerfile
├── backend/                      # FastAPI + Python 后端
│   ├── app/
│   │   ├── api/                  # FastAPI路由
│   │   │   ├── v1/
│   │   │   │   ├── workflows.py  # 工作流CRUD与执行
│   │   │   │   ├── chat.py       # 聊天接口(导购/客服)
│   │   │   │   ├── prediction.py # 销量预测
│   │   │   │   ├── knowledge.py  # 知识库管理
│   │   │   │   └── orders.py     # 模拟订单接口
│   │   ├── core/                 # 核心业务逻辑
│   │   │   ├── workflow.py       # LangGraph工作流定义与执行
│   │   │   ├── nodes.py          # 自定义节点实现
│   │   │   ├── tools.py          # 业务工具(订单查询/库存查询等)
│   │   │   ├── rag.py            # RAG检索(向量+BM25+Rerank)
│   │   │   └── agents.py         # 多智能体协作定义
│   │   ├── models/               # SQLModel 数据模型
│   │   │   ├── workflow.py       # 工作流定义表
│   │   │   ├── order.py          # 订单表(模拟)
│   │   │   ├── product.py        # 商品表(模拟)
│   │   │   └── knowledge.py      # 知识库块表
│   │   ├── services/             # 业务服务层
│   │   │   ├── llm_client.py     # LLM统一客户端
│   │   │   ├── chroma_client.py  # 向量数据库客户端
│   │   │   └── celery_app.py     # Celery异步任务
│   │   └── utils/                # 工具函数
│   │       ├── logger.py         # 日志配置
│   │       └── sse.py            # SSE流式输出工具
│   ├── pyproject.toml            # Poetry 依赖管理
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml            # 编排 frontend/backend/postgres/redis
├── .github/workflows/
│   ├── ci.yml                    # 持续集成: lint + test + build
│   └── cd.yml                    # 持续部署: 自动部署到云服务(可选)
├── README.md                     # 项目介绍与快速开始
├── WHITEPAPER.md                 # 技术决策白皮书
└── docs/                         # 额外文档
    ├── api.md                    # API文档(可自动生成)
    └── deployment.md             # 部署指南
```

> 新增目录前先更新本节,避免项目越做越散。

## 4. 质量门槛

| 类型           | 本项目标准                                                   |
| -------------- | ------------------------------------------------------------ |
| 格式检查(后端) | `ruff format --check .`                                      |
| 静态检查(后端) | `ruff check .`                                               |
| 格式检查(前端) | `prettier --check .`                                         |
| 静态检查(前端) | `eslint . --ext ts,tsx`                                      |
| 单元测试(后端) | `pytest`                                                     |
| 单元测试(前端) | `vitest`                                                     |
| 覆盖率         | `>=80% (核心模块); 整体暂定 >=60%`                           |
| 构建           | `docker build -t ai-ecommerce-workbench .` 成功              |
| 业务/模型指标  | `RAG检索Hit Rate >= 0.85 (模拟测试集); 工作流执行成功率 >= 99%` |

## 5. 不变约束

- 密钥、密码、私钥、Token **绝不写进代码或文档**,只进 GitHub Secrets / 环境变量 (`.env` 已在 `.gitignore`)。
- 大文件、数据集、模型产物是否进 Git: **默认不进 Git**,使用 `.gitignore` 排除 `*.pb`, `*.onnx`, `*.h5`, `data/`, `uploads/`, `*.db`。
- `main` 分支受保护,日常开发必须走 feature 分支 + PR。
- CI 红灯不合并。
- 所有AI决策关键路径(如退款审批、价格修改)必须包含 **Human-in-the-Loop** 审核节点。
- 所有外部API调用(LLM、电商平台)必须有 **重试机制** 与 **超时控制**。

## 6. 部署/CI 占位符取值

> `guides/` 和 workflow 里的通用占位符,在本项目里的真实值只写这里。

| 占位符          | 本项目取值                       | 说明                       |
| --------------- | -------------------------------- | -------------------------- |
| `<APP>`         | `ai-ecommerce-workbench`         | 应用名/镜像名/容器名       |
| `<DEPLOY_DIR>`  | `/opt/ai-ecommerce-workbench`    | 服务器部署目录             |
| `<PORT>`        | `8000` (后端) / `5173` (前端Dev) | 服务端口                   |
| `<PYVER>`       | `3.11`                           | Python版本                 |
| `<NODEVER>`     | `20`                             | Node版本                   |
| `<HEALTHCHECK>` | `/health`                        | 健康检查地址               |
| `<SSH_USER>`    | `deploy`                         | 部署用户(生产)             |
| `<SSH_HOST>`    | `your-server-ip-or-domain`       | 服务器公网 IP 或域名(占位) |