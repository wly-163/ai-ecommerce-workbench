export type WorkflowProduct = {
  id: string;
  name: string;
  price: number;
  category: string;
};

export type WorkflowExecuteResult = {
  query: string;
  products: WorkflowProduct[];
  recommendation: string;
};

const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export async function executeWorkflow(query: string): Promise<WorkflowExecuteResult> {
  const resp = await fetch(`${API_URL}/api/v1/workflows/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, stream: false }),
  });
  if (!resp.ok) {
    throw new Error(`工作流请求失败: ${resp.status}`);
  }
  return resp.json() as Promise<WorkflowExecuteResult>;
}
