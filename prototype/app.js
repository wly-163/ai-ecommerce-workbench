const PERMS = [
  { id: "dashboard.view", group: "业务模块", name: "运营总览" },
  { id: "guide.use", group: "业务模块", name: "智能导购" },
  { id: "service.use", group: "业务模块", name: "智能客服" },
  { id: "supply.view", group: "业务模块", name: "供应链预测" },
  { id: "marketing.use", group: "业务模块", name: "营销内容" },
  { id: "workflow.edit", group: "业务模块", name: "工作流编排" },
  { id: "scene3d.view", group: "业务模块", name: "3D数据大屏" },
  { id: "observe.view", group: "业务模块", name: "可观测性" },
  { id: "service.hitl", group: "敏感操作", name: "Human-in-the-Loop 审核" },
  { id: "supply.approve", group: "敏感操作", name: "补货采纳" },
  { id: "supply.create_po", group: "敏感操作", name: "生成采购单" },
  { id: "workflow.publish", group: "敏感操作", name: "工作流发布" },
  { id: "iam.manage", group: "系统", name: "账号 / 角色 / 权限" },
];

const ALL = PERMS.map((p) => p.id);

const ROLES = {
  admin: { name: "系统管理员", perms: ALL },
  manager: { name: "管理者", perms: ["dashboard.view", "scene3d.view", "observe.view", "supply.view"] },
  ops: { name: "运营经理", perms: ["dashboard.view", "guide.use", "marketing.use", "supply.view", "supply.approve"] },
  analyst: { name: "数据分析师", perms: ["dashboard.view", "workflow.edit", "workflow.publish", "supply.view", "observe.view"] },
  cs: { name: "客服主管", perms: ["service.use", "service.hitl", "observe.view"] },
};

const USERS = [
  { id: "admin", pass: "123456", name: "王管理员", role: "admin", home: "dashboard" },
  { id: "zhou", pass: "123456", name: "周总", role: "manager", home: "dashboard" },
  { id: "lin", pass: "123456", name: "林运营", role: "ops", home: "dashboard" },
  { id: "chen", pass: "123456", name: "陈析", role: "analyst", home: "workflow" },
  { id: "li", pass: "123456", name: "李晓智", role: "cs", home: "service" },
];

const VIEW_PERM = {
  dashboard: "dashboard.view",
  guide: "guide.use",
  service: "service.use",
  supply: "supply.view",
  marketing: "marketing.use",
  workflow: "workflow.edit",
  scene3d: "scene3d.view",
  observe: "observe.view",
  iam: "iam.manage",
};

const titles = {
  dashboard: "运营总览",
  guide: "智能导购",
  service: "智能客服",
  supply: "供应链预测",
  marketing: "营销内容",
  workflow: "工作流编排",
  scene3d: "3D数据大屏",
  observe: "可观测性",
  iam: "权限与角色",
  drafts: "UI 设计稿",
};

const drafts = {
  dashboard: "mockups/ui-dashboard-light.png",
  iam: "mockups/ui-iam-light.png",
  guide: "mockups/ui-chat-guide.png",
  service: "mockups/ui-cs-service.png",
  supply: "mockups/ui-supply-chain.png",
  marketing: "mockups/ui-marketing.png",
  workflow: "mockups/ui-workflow.png",
  scene3d: "mockups/ui-3d-scene.png",
};

let current = "dashboard";
let session = null;
let selectedRole = "ops";

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("on");
  setTimeout(() => el.classList.remove("on"), 1800);
}

function can(perm) {
  if (!session) return false;
  return ROLES[session.role].perms.includes(perm);
}

function applyAccess() {
  document.querySelectorAll(".nav-item[data-perm]").forEach((el) => {
    el.hidden = !can(el.dataset.perm);
  });
  document.querySelectorAll(".need-perm").forEach((el) => {
    el.hidden = !can(el.dataset.perm);
  });
  document.querySelectorAll(".nav-label").forEach((label) => {
    let el = label.nextElementSibling;
    let any = false;
    while (el && !el.classList.contains("nav-label")) {
      if (el.matches(".nav-item") && !el.hidden) any = true;
      el = el.nextElementSibling;
    }
    label.hidden = !any;
  });
}

function firstAllowedView(preferred) {
  if (preferred && (!VIEW_PERM[preferred] || can(VIEW_PERM[preferred]))) return preferred;
  const item = [...document.querySelectorAll(".nav-item[data-view]")].find((el) => !el.hidden);
  return item ? item.dataset.view : "drafts";
}

function show(id) {
  const need = VIEW_PERM[id];
  if (need && !can(need)) {
    toast("当前角色没有该模块权限");
    return;
  }
  current = id;
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${id}`));
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.view === id));
  document.getElementById("crumb").textContent = titles[id] || id;
  history.replaceState(null, "", `#${id}`);
}

function enter(user) {
  session = user;
  document.getElementById("gate").classList.remove("on");
  document.getElementById("app").classList.add("on");
  document.getElementById("user-name").textContent = user.name;
  document.getElementById("user-role").textContent = ROLES[user.role].name;
  document.getElementById("user-avatar").textContent = user.name.slice(0, 1);
  applyAccess();
  renderIAM();
  show(firstAllowedView(user.home));
}

function logout() {
  session = null;
  document.getElementById("app").classList.remove("on");
  document.getElementById("gate").classList.add("on");
  history.replaceState(null, "", " ");
}

document.getElementById("demo-accounts").innerHTML = USERS.map(
  (u) =>
    `<button class="demo" type="button" data-id="${u.id}"><b>${ROLES[u.role].name}</b><span>${u.name} · ${u.id}</span></button>`
).join("");

document.getElementById("demo-accounts").addEventListener("click", (e) => {
  const btn = e.target.closest(".demo");
  if (!btn) return;
  const user = USERS.find((u) => u.id === btn.dataset.id);
  document.querySelector('#login-form [name="user"]').value = user.id;
  document.querySelector('#login-form [name="pass"]').value = user.pass;
  enter(user);
});

document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = e.target.user.value.trim();
  const pass = e.target.pass.value;
  const user = USERS.find((u) => u.id === id && u.pass === pass);
  document.getElementById("login-err").textContent = user ? "" : "账号或密码不正确";
  if (user) enter(user);
});

document.getElementById("btn-logout").addEventListener("click", logout);

document.querySelectorAll("[data-view]").forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    show(el.dataset.view);
  });
});

document.getElementById("guide-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = e.target.q;
  const text = input.value.trim();
  if (!text) return;
  const box = document.getElementById("guide-msgs");
  const u = document.createElement("div");
  u.className = "bubble user";
  u.textContent = text;
  box.appendChild(u);
  input.value = "";
  setTimeout(() => {
    const a = document.createElement("div");
    a.className = "bubble ai";
    a.textContent = "已记下新条件。会在下一轮检索里加入对比维度，并控制总价不超过预算。";
    box.appendChild(a);
    box.scrollTop = box.scrollHeight;
  }, 450);
  box.scrollTop = box.scrollHeight;
});

document.getElementById("btn-pass").addEventListener("click", () => toast("已通过审核，换货流程继续引导用户"));
document.getElementById("btn-reject").addEventListener("click", () => toast("已驳回，客服将回退政策说明"));
document.getElementById("btn-accept").addEventListener("click", () => {
  if (!can("supply.approve")) return toast("无补货采纳权限");
  toast("已采纳补货建议：防晒衫 × 500");
});
document.getElementById("btn-po").addEventListener("click", () => toast("当前角色可看到入口，采购单生成仍为 P2"));
document.getElementById("btn-gen").addEventListener("click", () => toast("已用商品详情生成直播脚本与三语文案"));
document.getElementById("btn-run").addEventListener("click", () => toast("工作流测试通过 · 1.2s · 414 tokens"));

document.querySelectorAll(".wnode").forEach((n) => {
  n.addEventListener("click", () => {
    document.querySelectorAll(".wnode").forEach((x) => x.classList.remove("on"));
    n.classList.add("on");
  });
});

const aisles = document.getElementById("aisles");
[..."gggyggrgggygggggyggggrgg"].forEach((c) => {
  const d = document.createElement("div");
  d.className = `bin ${c}`;
  aisles.appendChild(d);
});

const lightbox = document.getElementById("lightbox");
document.querySelectorAll(".shot").forEach((fig) => {
  fig.addEventListener("click", () => {
    lightbox.querySelector("img").src = fig.dataset.src;
    lightbox.classList.add("on");
  });
});
lightbox.addEventListener("click", () => lightbox.classList.remove("on"));

const compare = document.getElementById("compare");
document.getElementById("btn-compare").addEventListener("click", () => {
  const src = drafts[current];
  if (!src) {
    toast("当前页暂无对应高保真稿，请打开「UI 设计稿」");
    return;
  }
  compare.querySelector("img").src = src;
  compare.classList.add("on");
});
compare.addEventListener("click", () => compare.classList.remove("on"));

document.getElementById("iam-tabs").addEventListener("click", (e) => {
  const tab = e.target.closest("[data-iam]");
  if (!tab) return;
  document.querySelectorAll("#iam-tabs .tab").forEach((t) => t.classList.toggle("on", t === tab));
  ["users", "roles", "matrix"].forEach((k) => {
    document.getElementById(`iam-${k}`).style.display = tab.dataset.iam === k ? (k === "roles" ? "grid" : "block") : "none";
  });
});

function renderIAM() {
  document.getElementById("user-table").innerHTML = `
    <thead><tr><th>账号</th><th>姓名</th><th>角色</th><th>状态</th></tr></thead>
    <tbody>${USERS.map(
      (u) => `<tr>
        <td>${u.id}</td><td>${u.name}</td>
        <td><select data-user="${u.id}">${Object.entries(ROLES)
          .map(([k, r]) => `<option value="${k}" ${u.role === k ? "selected" : ""}>${r.name}</option>`)
          .join("")}</select></td>
        <td><span class="tag lo">启用</span></td>
      </tr>`
    ).join("")}</tbody>`;

  document.getElementById("role-list").innerHTML = Object.entries(ROLES)
    .map(
      ([k, r]) =>
        `<button class="role-item ${k === selectedRole ? "on" : ""}" type="button" data-role="${k}"><b>${r.name}</b><div class="sub">${r.perms.length} 项权限</div></button>`
    )
    .join("");

  const groups = [...new Set(PERMS.map((p) => p.group))];
  document.getElementById("role-edit-title").textContent = ROLES[selectedRole].name;
  document.getElementById("perm-editor").innerHTML = groups
    .map((g) => {
      const items = PERMS.filter((p) => p.group === g)
        .map(
          (p) =>
            `<label><input type="checkbox" data-pid="${p.id}" ${ROLES[selectedRole].perms.includes(p.id) ? "checked" : ""}/> ${p.name}</label>`
        )
        .join("");
      return `<div class="perm-group"><h4>${g}</h4><div class="perm-list">${items}</div></div>`;
    })
    .join("");

  document.getElementById("perm-matrix").innerHTML = `
    <thead><tr><th>权限</th>${Object.values(ROLES)
      .map((r) => `<th>${r.name}</th>`)
      .join("")}</tr></thead>
    <tbody>${PERMS.map(
      (p) =>
        `<tr><td>${p.name}</td>${Object.values(ROLES)
          .map((r) => `<td>${r.perms.includes(p.id) ? '<span class="check">●</span>' : '<span class="dash">—</span>'}</td>`)
          .join("")}</tr>`
    ).join("")}</tbody>`;
}

document.getElementById("user-table").addEventListener("change", (e) => {
  const sel = e.target.closest("select[data-user]");
  if (!sel) return;
  const user = USERS.find((u) => u.id === sel.dataset.user);
  user.role = sel.value;
  toast(`已将 ${user.name} 分配为 ${ROLES[user.role].name}`);
  if (session && session.id === user.id) {
    applyAccess();
    show(firstAllowedView(current));
  }
  renderIAM();
});

document.getElementById("role-list").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-role]");
  if (!btn) return;
  selectedRole = btn.dataset.role;
  renderIAM();
});

document.getElementById("btn-save-role").addEventListener("click", () => {
  const ids = [...document.querySelectorAll("#perm-editor input[data-pid]:checked")].map((i) => i.dataset.pid);
  ROLES[selectedRole].perms = ids;
  applyAccess();
  renderIAM();
  toast(`${ROLES[selectedRole].name} 权限已保存，菜单即时生效`);
});

document.getElementById("btn-add-user").addEventListener("click", () => toast("原型演示：新建账号会走邀请邮件，正式版再接后端"));
