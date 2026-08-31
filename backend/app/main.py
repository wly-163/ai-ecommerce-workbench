from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.workflows import router as workflows_router

app = FastAPI(title="AI E-Commerce Workbench API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(workflows_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
