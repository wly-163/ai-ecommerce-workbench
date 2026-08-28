const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export function App() {
  return (
    <main className="app">
      <h1>AI 电商智慧运营工作台</h1>
      <p>低代码 AI 工作流 · 3D 数字孪生 · 多智能体协作</p>
      <p className="api-url">API: {API_URL}</p>
    </main>
  );
}

export default App;
