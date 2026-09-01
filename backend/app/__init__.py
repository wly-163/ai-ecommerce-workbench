# 阅读顺序:
# 1. load_dotenv — 任何 `from app...` 都会先执行这里,才能读到仓库根目录 .env
#
# 为何放在 app 包初始化而不是 main.py:
# uvicorn `app.main:app`、pytest `from app.core.workflow import ...` 都会先 import app。
# 只写在 main.py 时,直接调 run_recommendation 仍读不到 .env,会误走 mock。
# load_dotenv 默认不覆盖已有环境变量,所以 CI 里 LLM_MODE=mock 仍然优先。

from pathlib import Path

from dotenv import load_dotenv

_REPO_ROOT = Path(__file__).resolve().parents[2]  # backend/app/__init__.py → 仓库根
load_dotenv(_REPO_ROOT / ".env")
