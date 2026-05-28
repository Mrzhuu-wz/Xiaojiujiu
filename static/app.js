// ==============================
// 工具函数
// ==============================
function h(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
}
function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, "0")}月`;
}
function showToast(message) {
  const t = document.querySelector("#toast");
  t.textContent = message;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2600);
}

// ==============================
// 全局状态
// ==============================
let selectedScenarios = new Set(["S01"]);
let selectedProducts = new Set();
let selectedServices = new Set();
let quotes = [];
let templates = [];
let activeTemplateName = "默认模板";
let activeTemplate = null;

// 动态数据（从 API 加载）
let industryContexts = {};
let scenarios = {};
let products = {};
let services = {};

// 管理面板状态
let adminType = "industries";
let adminData = {};

const STYLE_META = {
  CoverTitle:    { label: "封面标题" },
  CoverCustomer: { label: "封面客户名" },
  CoverMeta:     { label: "封面信息" },
  Heading1:      { label: "一级标题" },
  Heading2:      { label: "二级标题" },
  Heading3:      { label: "三级标题" },
  Normal:        { label: "正文段落" },
  TableHeader:   { label: "表格表头" },
  TableText:     { label: "表格正文" },
};

const DEFAULT_STYLE_VALUES = {
  CoverTitle:    { fontSize: 42, bold: true, color: "C00000", alignment: "center", spaceAfter: 120 },
  CoverCustomer: { fontSize: 24, color: "666666", alignment: "center", spaceBefore: 460, spaceAfter: 900 },
  CoverMeta:     { fontSize: 24, alignment: "center", spaceAfter: 180 },
  CoverBrand:    { fontSize: 28, bold: true, color: "C00000", spaceBefore: 720, spaceAfter: 860 },
  Heading1:      { fontSize: 30, bold: true, color: "C00000", spaceBefore: 360, spaceAfter: 220 },
  Heading2:      { fontSize: 24, bold: true, spaceBefore: 260, spaceAfter: 120 },
  Heading3:      { fontSize: 22, bold: true, spaceBefore: 180, spaceAfter: 80 },
  Normal:        { fontSize: 22, lineSpacing: 360, alignment: "both", firstLineIndent: 480, spaceAfter: 140 },
  TableHeader:   { fontSize: 20, bold: true, color: "C00000", alignment: "center" },
  TableText:     { fontSize: 19 },
};

// ==============================
// 数据加载
// ==============================
async function loadData(type) {
  try {
    const res = await fetch(`/api/data/${type}`);
    if (res.ok) return await res.json();
  } catch {}
  // Netlify fallback: 直接读取静态 JSON 文件
  try {
    const res = await fetch(`/data/${type}.json`);
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

async function loadAllData() {
  const [ind, sce, prod, srv] = await Promise.all([
    loadData("industries"), loadData("scenarios"), loadData("products"), loadData("services"),
  ]);
  if (ind) industryContexts = ind;
  if (sce) scenarios = sce;
  if (prod) products = prod;
  if (srv) services = srv;

  // 合并 localStorage 的本地修改（Netlify 环境下数据持久化）
  ["industries","scenarios","products","services"].forEach(type => {
    try {
      const overrides = JSON.parse(localStorage.getItem(`admin_${type}`) || "{}");
      const target = type === "industries" ? industryContexts : type === "scenarios" ? scenarios : type === "products" ? products : services;
      Object.entries(overrides).forEach(([k, v]) => {
        if (v === "__deleted__") delete target[k];
        else target[k] = v;
      });
    } catch {}
  });

  // 如果 API 没拿到，用默认值兜底
  if (!Object.keys(scenarios).length) scenarios = getDefaultScenarios();
  if (!Object.keys(products).length) products = getDefaultProducts();
  if (!Object.keys(services).length) services = getDefaultServices();

  // 初始化选中
  const s01 = scenarios["S01"];
  if (s01) {
    selectedProducts = new Set(s01.products || []);
    selectedServices = new Set(s01.services || []);
  }
  syncQuotes();
  populateIndustrySelect();
}

function populateIndustrySelect() {
  const sel = document.querySelector("#industrySelect");
  if (!sel || !Object.keys(industryContexts).length) return;
  const current = sel.value;
  sel.innerHTML = "";
  Object.entries(industryContexts).forEach(([key, item]) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = item.name || key;
    if (key === current) opt.selected = true;
    sel.append(opt);
  });
  // 恢复之前的选择（如果还存在的话）
  if (current && industryContexts[current]) sel.value = current;
}

// ==============================
// 模板管理（API + localStorage 兜底）
// ==============================
function LOCAL(key) { return `tpl_${key}`; }
function loadLocalTemplates() {
  try { return JSON.parse(localStorage.getItem("templates_list") || "[]"); } catch { return []; }
}
function saveLocalTemplates(list) {
  localStorage.setItem("templates_list", JSON.stringify(list));
}
function loadLocalTemplate(name) {
  try { return JSON.parse(localStorage.getItem(LOCAL(name))); } catch { return null; }
}
function saveLocalTemplate(name, data) {
  localStorage.setItem(LOCAL(name), JSON.stringify(data));
}
function deleteLocalTemplate(name) {
  localStorage.removeItem(LOCAL(name));
  const list = loadLocalTemplates().filter(t => t.name !== name);
  saveLocalTemplates(list);
}

async function loadTemplates() {
  try {
    const res = await fetch("/api/templates");
    if (res.ok) { templates = await res.json(); populateTemplateSelect(); return; }
  } catch {}
  // localStorage 兜底
  let list = loadLocalTemplates();
  if (!list.length) {
    list = [{ name: "默认模板", displayName: "默认模板" }];
    saveLocalTemplates(list);
  }
  templates = list;
  populateTemplateSelect();
}

async function loadTemplateData(name) {
  try {
    const res = await fetch(`/api/templates/${encodeURIComponent(name)}`);
    if (res.ok) { activeTemplate = await res.json(); activeTemplateName = activeTemplate.name || name; return; }
  } catch {}
  // localStorage 兜底
  const local = loadLocalTemplate(name);
  if (local) { activeTemplate = local; activeTemplateName = local.name || name; return; }
  activeTemplate = { name: name || "默认模板", docDefaults: { fontName: "Microsoft YaHei", fontSize: 22 }, styles: JSON.parse(JSON.stringify(DEFAULT_STYLE_VALUES)) };
  activeTemplateName = activeTemplate.name;
}

async function saveTemplateData() {
  if (!activeTemplate) return;
  const input = document.querySelector("#templateNameInput");
  if (input) activeTemplate.name = input.value || activeTemplateName;
  // 尝试 API
  try {
    const res = await fetch("/api/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(activeTemplate) });
    if (res.ok) {
      const r = await res.json();
      activeTemplateName = r.name;
      showToast("模板已保存");
      await loadTemplates();
      return;
    }
  } catch {}
  // localStorage 兜底
  saveLocalTemplate(activeTemplateName, activeTemplate);
  let list = loadLocalTemplates();
  if (!list.find(t => t.name === activeTemplateName)) {
    list.push({ name: activeTemplateName, displayName: activeTemplate.name || activeTemplateName });
    saveLocalTemplates(list);
  }
  templates = list;
  populateTemplateSelect();
  showToast("模板已保存（本地）");
}

async function deleteTemplateData() {
  if (activeTemplateName === "默认模板") { showToast("不能删除默认模板"); return; }
  if (!confirm(`确认删除模板「${activeTemplateName}」？`)) return;
  try {
    const res = await fetch(`/api/templates/${encodeURIComponent(activeTemplateName)}/delete`, { method: "POST" });
    if (res.ok) { showToast("模板已删除"); await switchTemplate("默认模板"); return; }
  } catch {}
  // localStorage 兜底
  deleteLocalTemplate(activeTemplateName);
  showToast("模板已删除（本地）");
  await switchTemplate("默认模板");
}

async function switchTemplate(name) {
  await loadTemplateData(name);
  populateTemplateSelect();
  renderPreview();
}

function populateTemplateSelect() {
  const sel = document.querySelector("#activeTemplate");
  if (!sel) return;
  sel.innerHTML = "";
  templates.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t.name;
    opt.textContent = t.displayName || t.name;
    if (t.name === activeTemplateName) opt.selected = true;
    sel.append(opt);
  });
}

function renderTemplateEditor() {
  const input = document.querySelector("#templateNameInput");
  if (input) input.value = activeTemplateName;
  const container = document.querySelector("#templateStyles");
  if (!container || !activeTemplate) return;

  const styles = activeTemplate.styles || {};
  container.innerHTML = Object.entries(STYLE_META).map(([sid, meta]) => {
    const cfg = styles[sid] || {};
    return `<div class="style-card" data-style="${sid}">
      <div class="style-card-header"><strong>${meta.label}</strong><span class="style-id">${sid}</span></div>
      <div class="style-card-body">
        <label>字体<input data-field="fontName" value="${h(cfg.fontName||'')}" placeholder="Microsoft YaHei" /></label>
        <label>字号<input type="number" data-field="fontSize" value="${cfg.fontSize||''}" placeholder="22" min="8" max="72" /></label>
        <label>颜色<input type="color" data-field="color" value="#${(cfg.color||'000000').replace(/^#?/,'')}" /></label>
        <label>加粗<input type="checkbox" data-field="bold" ${cfg.bold?'checked':''} /></label>
        <label>对齐<select data-field="alignment"><option value="">默认</option>
          <option value="left" ${cfg.alignment==='left'?'selected':''}>左对齐</option>
          <option value="center" ${cfg.alignment==='center'?'selected':''}>居中</option>
          <option value="right" ${cfg.alignment==='right'?'selected':''}>右对齐</option>
          <option value="both" ${cfg.alignment==='both'?'selected':''}>两端</option></select></label>
        ${sid==='Normal'?`<label>首行缩进<input type="number" data-field="firstLineIndent" value="${cfg.firstLineIndent||0}" placeholder="480" min="0" step="10" /></label><label>行距<input type="number" data-field="lineSpacing" value="${cfg.lineSpacing||''}" placeholder="360" min="100" step="10" /></label>`:''}
      </div></div>`;
  }).join("");

  container.querySelectorAll("[data-field]").forEach((el) => {
    const handler = () => {
      const card = el.closest(".style-card");
      const sid = card.dataset.style;
      const field = el.dataset.field;
      let value;
      if (el.type === "checkbox") value = el.checked;
      else if (el.type === "color") value = el.value.replace("#", "");
      else if (el.type === "number") value = el.value ? parseInt(el.value, 10) : undefined;
      else value = el.value || undefined;
      if (!activeTemplate.styles[sid]) activeTemplate.styles[sid] = {};
      if (value === undefined || value === "" || value === false) delete activeTemplate.styles[sid][field];
      else activeTemplate.styles[sid][field] = value;
      renderPreview();
    };
    el.addEventListener("change", handler);
    if (!["checkbox","color","SELECT"].includes(el.tagName) && el.type !== "checkbox" && el.type !== "color") {
      el.addEventListener("input", handler);
    }
  });
}

// ==============================
// 内容管理面板
// ==============================
let adminCurrentData = {};
let adminEditingId = null;

function openAdminPanel() {
  document.querySelector("#adminOverlay").classList.add("show");
  document.querySelector("#adminPanel").classList.add("show");
  renderAdminTable();
}

function closeAdminPanel() {
  document.querySelector("#adminOverlay").classList.remove("show");
  document.querySelector("#adminPanel").classList.remove("show");
}

function renderAdminTable() {
  const head = document.querySelector("#adminTableHead");
  const body = document.querySelector("#adminTableBody");
  const data = adminCurrentData || {};

  if (adminType === "industries") {
    head.innerHTML = "<tr><th>行业</th><th>场景数</th><th>操作</th></tr>";
    body.innerHTML = Object.entries(data).map(([id, item]) =>
      `<tr><td><strong>${h(item.name||id)}</strong></td><td>${Object.keys(item).filter(k=>k.startsWith('S')).length}</td>
       <td class="admin-actions"><button onclick="editAdminItem('${id}')">编辑</button>
       <button class="admin-delete" onclick="deleteAdminItem('${id}')">删除</button></td></tr>`).join("");
  } else {
    const labels = {
      scenarios: ["ID", "名称", "描述"],
      products: ["ID", "名称", "防护层"],
      services: ["ID", "名称", "服务方式"],
    };
    head.innerHTML = `<tr>${labels[adminType].map(l=>`<th>${l}</th>`).join("")}<th>操作</th></tr>`;
    body.innerHTML = Object.entries(data).map(([id, item]) => {
      let extra = "";
      if (adminType === "products") extra = h(item.layer || "");
      if (adminType === "services") extra = h(item.method || "");
      return `<tr><td><code>${h(id)}</code></td><td><strong>${h(item.name||item.title||'')}</strong></td><td>${extra}</td>
        <td class="admin-actions"><button onclick="editAdminItem('${id}')">编辑</button>
        <button class="admin-delete" onclick="deleteAdminItem('${id}')">删除</button></td></tr>`;
    }).join("");
  }
}

async function deleteAdminItem(id) {
  if (!confirm(`确认删除「${id}」？`)) return;
  try { await fetch(`/api/data/${adminType}/${encodeURIComponent(id)}/delete`, { method: "POST" }); } catch {}
  // localStorage 同步
  try {
    const ls = JSON.parse(localStorage.getItem(`admin_${adminType}`) || "{}");
    ls[id] = "__deleted__";
    localStorage.setItem(`admin_${adminType}`, JSON.stringify(ls));
  } catch {}
  await refreshAdminData();
}

async function refreshAdminData() {
  let data = await loadData(adminType);
  if (!data) data = {};
  // 合并 localStorage 的修改
  try {
    const overrides = JSON.parse(localStorage.getItem(`admin_${adminType}`) || "{}");
    Object.entries(overrides).forEach(([k, v]) => {
      if (v === "__deleted__") delete data[k];
      else data[k] = v;
    });
  } catch {}
  adminCurrentData = data;
  renderAdminTable();
}

function openAdminModal(id) {
  adminEditingId = id;
  const data = adminCurrentData;
  const item = data[id] || {};
  const modal = document.querySelector("#adminModal");
  const form = document.querySelector("#adminForm");
  document.querySelector("#adminModalTitle").textContent = id ? `编辑: ${id}` : "新增";

  if (adminType === "industries") {
    form.innerHTML = `
      <label>行业标识<input name="id" value="${h(id||'')}" ${id?'readonly':''} /></label>
      <label>行业名称<input name="name" value="${h(item.name||'')}" /></label>
      ${["S01","S02","S03","S04","S05","S06"].map(s=>`<label>${s} 场景描述<textarea name="${s}">${h(item[s]||'')}</textarea></label>`).join("")}`;
  } else if (adminType === "scenarios") {
    const w = item.weaknesses || [];
    form.innerHTML = `
      <label>场景ID<input name="id" value="${h(id||'')}" ${id?'readonly':''} /></label>
      <label>名称<input name="name" value="${h(item.name||'')}" /></label>
      <label>描述<input name="description" value="${h(item.description||'')}" /></label>
      <label>背景<textarea name="background">${h(item.background||'')}</textarea></label>
      <label>需求分析<textarea name="analysis">${h(item.analysis||'')}</textarea></label>
      <label>架构描述<textarea name="architecture">${h(item.architecture||'')}</textarea></label>
      <label>推荐产品IDs <input name="products" value="${(item.products||[]).join(',')}" placeholder="C01_PROTECT,C02_SASE" /></label>
      <label>推荐服务IDs <input name="services" value="${(item.services||[]).join(',')}" placeholder="SV_VULN,SV_PENTEST" /></label>
      <div data-field="weaknesses"><label>风险短板</label>
        <div id="weaknessList">${w.map((w,i)=>`<div class="weakness-row"><input value="${h(w.title||'')}" data-idx="${i}" data-f="title" placeholder="标题" /><input value="${h(w.description||'')}" data-idx="${i}" data-f="description" placeholder="描述" /><button type="button" class="icon-btn" onclick="this.parentElement.remove()">×</button></div>`).join("")}</div>
        <button type="button" class="secondary-btn small" onclick="addWeaknessRow()" style="margin-top:4px">+ 添加短板</button>
      </div>`;
  } else if (adminType === "products") {
    form.innerHTML = `
      <label>产品ID<input name="id" value="${h(id||'')}" ${id?'readonly':''} /></label>
      <label>标题<input name="title" value="${h(item.title||'')}" /></label>
      <label>防护层<input name="layer" value="${h(item.layer||'')}" /></label>
      <label>产品名<input name="product" value="${h(item.product||'')}" /></label>
      <label>防护目标<textarea name="goal">${h(item.goal||'')}</textarea></label>
      <label>能力描述<input name="capability" value="${h(item.capability||'')}" /></label>
      <label>部署方式<input name="deployMode" value="${h(item.deployMode||'')}" /></label>
      <label>规格<input name="spec" value="${h(item.spec||'')}" /></label>
      <label>报价(逗号分隔: 名称,计费,价格)<input name="quoteStr" value="${(item.quote||[]).join(',')}" /></label>`;
  } else if (adminType === "services") {
    form.innerHTML = `
      <label>服务ID<input name="id" value="${h(id||'')}" ${id?'readonly':''} /></label>
      <label>名称<input name="name" value="${h(item.name||'')}" /></label>
      <label>服务内容<textarea name="content">${h(item.content||'')}</textarea></label>
      <label>服务方式<input name="method" value="${h(item.method||'')}" /></label>
      <label>服务频次<input name="frequency" value="${h(item.frequency||'')}" /></label>
      <label>交付成果<input name="deliverable" value="${h(item.deliverable||'')}" /></label>`;
  }
  modal.classList.add("show");
}

function addWeaknessRow() {
  const list = document.querySelector("#weaknessList");
  if (!list) return;
  const div = document.createElement("div");
  div.className = "weakness-row";
  div.innerHTML = `<input placeholder="标题" /><input placeholder="描述" /><button type="button" class="icon-btn" onclick="this.parentElement.remove()">×</button>`;
  list.append(div);
}

async function submitAdminForm() {
  const form = document.querySelector("#adminForm");
  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());

  // 处理特殊字段
  if (adminType === "scenarios") {
    data.products = (data.products || "").split(",").map(s => s.trim()).filter(Boolean);
    data.services = (data.services || "").split(",").map(s => s.trim()).filter(Boolean);
    // 收集 weaknesses
    const wRows = document.querySelectorAll("#weaknessList .weakness-row");
    data.weaknesses = [];
    wRows.forEach(row => {
      const inputs = row.querySelectorAll("input");
      if (inputs[0] && inputs[0].value) data.weaknesses.push({ title: inputs[0].value, description: inputs[1]?.value || "" });
    });
  }
  if (adminType === "products") {
    data.quote = (data.quoteStr || "").split(",").map(s => s.trim()).filter(Boolean);
    delete data.quoteStr;
    data.paragraphs = [data.capability || "", data.goal || ""].filter(Boolean);
    data.deployment = [data.product || "", "", "按需"];
  }

  try {
    await fetch(`/api/data/${adminType}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  } catch {}
  // localStorage 兜底
  try {
    const ls = JSON.parse(localStorage.getItem(`admin_${adminType}`) || "{}");
    ls[data.id] = data;
    localStorage.setItem(`admin_${adminType}`, JSON.stringify(ls));
  } catch {}
  showToast("保存成功");
  closeAdminModal();
  await refreshAdminData();
  await loadAllData();
  renderAll();
}

function closeAdminModal() {
  document.querySelector("#adminModal").classList.remove("show");
}

// ==============================
// 工作流逻辑
// ==============================
function selectedScenarioList() {
  return [...selectedScenarios].map(id => scenarios[id]).filter(Boolean);
}
function productList() {
  return [...selectedProducts].map(id => products[id]).filter(Boolean);
}
function serviceList() {
  return [...selectedServices].map(id => services[id]).filter(Boolean);
}

function mergeScenarioRecommendations() {
  const pIds = new Set();
  const sIds = new Set();
  selectedScenarioList().forEach(item => {
    (item.products || []).forEach(id => pIds.add(id));
    (item.services || []).forEach(id => sIds.add(id));
  });
  selectedProducts = pIds;
  selectedServices = sIds;
  syncQuotes();
}

function buildContent() {
  const industry = document.querySelector("#industrySelect")?.value || "企业";
  const scenarioItems = selectedScenarioList();
  const productItems = productList();
  const serviceItems = serviceList();
  return {
    background: scenarioItems.map(item => item.background).join("\n"),
    industryContext: scenarioItems.map(item => {
      const key = Object.keys(scenarios).find(k => scenarios[k] === item);
      return industryContexts[industry]?.[key] || "";
    }).filter(Boolean).join("\n"),
    weaknesses: scenarioItems.flatMap(item => (item.weaknesses || []).map(w => ({ title: w.title, description: w.description }))),
    requirementAnalysis: scenarioItems.map(item => item.analysis).join("\n"),
    architecture: scenarioItems.map(item => item.architecture).join("\n"),
    architectureRows: productItems.map(item => ({ layer: item.layer, product: item.product, goal: item.goal })),
    products: productItems,
    serviceItems,
    deployments: productItems.map(item => ({ name: (item.deployment||[])[0]||"", scope: (item.deployment||[])[1]||"", cycle: (item.deployment||[])[2]||"" })),
  };
}

function collectData() {
  const data = Object.fromEntries(new FormData(document.querySelector("#solutionForm")).entries());
  const content = buildContent();
  data.solutionTitle = data.coverTitleLine1;
  data.templateName = activeTemplateName;
  data.template = activeTemplate;
  return { ...data, ...content, quotes };
}

function syncQuotes() {
  const existing = new Map(quotes.map(item => [item.name, item]));
  quotes = productList().map(item => {
    const q = item.quote || [];
    const name = q[0] || "";
    return existing.get(name) || { name, spec: q[1] || "", price: q[2] || "", remark: "" };
  });
  // 自动追加选中的安全服务行
  serviceList().forEach(item => {
    const sName = item.name || "";
    if (!quotes.find(q => q.name === sName)) {
      quotes.push({ name: sName, spec: "按需定制", price: "按需定制", remark: "" });
    }
  });
}

// ==============================
// UI 渲染
// ==============================
function renderOptions(rootId, catalog, selectedSet, onChange) {
  const root = document.querySelector(rootId);
  if (!root) return;
  root.innerHTML = "";
  Object.entries(catalog).forEach(([id, item]) => {
    const label = document.createElement("label");
    label.className = "option-card";
    label.innerHTML = `<input type="checkbox" value="${id}" ${selectedSet.has(id)?"checked":""} />
      <span><strong>${h(item.name||item.product||item.title)}</strong>
      <em>${h(item.description||item.goal||item.capability||"")}</em></span>`;
    label.querySelector("input").addEventListener("change", e => onChange(id, e.target.checked));
    root.append(label);
  });
}

function renderQuotes() {
  const root = document.querySelector("#quoteTable");
  if (!root) return;
  root.innerHTML = "";
  quotes.forEach((row, index) => {
    const item = document.createElement("div");
    item.className = "row-editor quote";
    ["产品/服务名称","产品规格","优惠单价","备注"].forEach((label, i) => {
      const keys = ["name","spec","price","remark"];
      const w = document.createElement("label");
      w.textContent = label;
      const inp = document.createElement("input");
      inp.value = row[keys[i]] ?? "";
      inp.addEventListener("input", e => { row[keys[i]] = e.target.value; renderPreview(); });
      w.append(inp);
      item.append(w);
    });
    const rm = document.createElement("button");
    rm.className = "icon-btn"; rm.type = "button"; rm.textContent = "\u00d7";
    rm.setAttribute("aria-label","删除报价行");
    rm.addEventListener("click", () => { quotes.splice(index,1); renderAll(); });
    item.append(rm);
    root.append(item);
  });
}

function renderSummaries() {
  const content = buildContent();
  const aEl = document.querySelector("#architectureSummary");
  if (aEl) aEl.innerHTML = content.architectureRows.map(r => `<section><strong>${h(r.layer)}</strong><span>${h(r.product)}</span><p>${h(r.goal)}</p></section>`).join("");
  const dEl = document.querySelector("#deploymentSummary");
  if (dEl) dEl.innerHTML = content.deployments.map(r => `<section><strong>${h(r.name)}</strong><span>${h(r.scope)}</span><p>${h(r.cycle)}</p></section>`).join("");
}

function table(headers, rows) {
  return `<table class="preview-table"><thead><tr>${headers.map(c=>`<th>${h(c)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(row=>`<tr>${row.map(c=>`<td>${h(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function templateStyleCSS() {
  if (!activeTemplate || !activeTemplate.styles) return "";
  const defaults = activeTemplate.docDefaults || {};
  const fontFamily = defaults.fontName || "Microsoft YaHei";
  const st = activeTemplate.styles;
  const map = { CoverTitle:".cover h2", CoverCustomer:".cover > p", CoverMeta:".cover footer", Heading1:".chapter h3", Heading2:".chapter h4", Heading3:".chapter h5", Normal:".chapter p, .chapter li", TableHeader:".preview-table th", TableText:".preview-table td" };
  let css = `.page{font-family:"${fontFamily}",sans-serif}\n`;
  Object.entries(map).forEach(([sid, sel]) => {
    const cfg = st[sid]; if (!cfg) return;
    const rules = [];
    if (cfg.fontSize) rules.push(`font-size:${Math.round(cfg.fontSize/2)}pt`);
    if (cfg.fontName) rules.push(`font-family:"${cfg.fontName}",sans-serif`);
    if (cfg.color) rules.push(`color:#${cfg.color}`);
    if (cfg.bold) rules.push("font-weight:bold");
    if (cfg.alignment) rules.push(`text-align:${cfg.alignment==="both"?"justify":cfg.alignment}`);
    if (cfg.firstLineIndent === 480 && sid === "Normal") rules.push("text-indent:2em");
    if (rules.length) css += `${sel}{${rules.join(";")}}\n`;
  });
  return css;
}

function renderPreview() {
  const data = collectData();
  document.querySelector("#previewTitle").textContent = data.solutionTitle;
  document.querySelector("#preview").innerHTML = `<style>${templateStyleCSS()}</style><div class="page">
    <section class="cover">
      <img src="telecom-logo.png" alt="中国电信" class="cover-logo" />
      <h2>${h(data.coverTitleLine1)}</h2><p>${h(data.customerName)}</p>
      <footer>${h(data.branchName)}<br/>${h(data.docDate)}</footer>
    </section>
    <section class="chapter">
      <h3>一、背景与需求分析</h3>
      ${data.background.split("\n").filter(Boolean).map(l=>`<p>${h(l)}</p>`).join("")}
      ${data.industryContext.split("\n").filter(Boolean).map(l=>`<p>${h(l)}</p>`).join("")}
      <p>从大量实际案例来看，客户可能存在以下安全短板：</p>
      ${data.weaknesses.map(w=>`<p><strong>${h(w.title)}：</strong>${h(w.description)}</p>`).join("")}
      ${data.requirementAnalysis.split("\n").filter(Boolean).map(l=>`<p>${h(l)}</p>`).join("")}
    </section>
    <section class="chapter">
      <h3>二、方案架构</h3>
      ${data.architecture.split("\n").filter(Boolean).map(l=>`<p>${h(l)}</p>`).join("")}
      ${table(["防护层面","部署产品","防护目标"], data.architectureRows.map(r=>[r.layer,r.product,r.goal]))}
    </section>
    <section class="chapter">
      <h3>三、核心产品方案</h3>
      ${data.products.map((p,i)=>`<h4>（${"一二三四五六七八九十"[i]||i+1}）${h(p.title)}</h4>
        ${p.paragraphs.map(pp=>`<p>${h(pp)}</p>`).join("")}
        <p><strong>核心能力：</strong>${h(p.capability)}</p>
        <p><strong>部署方式：</strong>${h(p.deployMode)}</p>
        <p><strong>推荐规格：</strong>${h(p.spec)}</p>`).join("")}
      ${data.serviceItems && data.serviceItems.length ? `
        <h4>安全服务模块</h4>
        ${data.serviceItems.map(s => `
          <p><strong>${h(s.name)}：</strong>${h(s.content||'')}</p>
          <p>服务方式：${h(s.method||'')}　｜　频次：${h(s.frequency||'')}　｜　交付：${h(s.deliverable||'')}</p>
        `).join("")}
      ` : ""}
    </section>
    <section class="chapter">
      <h3>四、部署与报价</h3>
      <h4>（一）产品部署及报价</h4>
      ${table(["序号","产品名称","部署范围","部署周期"], data.deployments.map((d,i)=>[i+1,d.name,d.scope,d.cycle]))}
      <h4>（二）报价</h4>
      ${table(["序号","产品/服务名称","产品规格","优惠单价","备注"], data.quotes.map((q,i)=>[i+1,q.name,q.spec,q.price,q.remark||""]))}
    </section></div>`;
}

function renderAll() {
  renderOptions("#scenarioOptions", scenarios, selectedScenarios, (id, checked) => {
    if (checked) selectedScenarios.add(id); else selectedScenarios.delete(id);
    if (!selectedScenarios.size) selectedScenarios.add("S01");
    mergeScenarioRecommendations();
    renderAll();
  });
  renderOptions("#productOptions", products, selectedProducts, (id, checked) => {
    if (checked) selectedProducts.add(id); else selectedProducts.delete(id);
    syncQuotes(); renderAll();
  });
  renderOptions("#serviceOptions", services, selectedServices, (id, checked) => {
    if (checked) selectedServices.add(id); else selectedServices.delete(id);
    renderAll();
  });
  renderSummaries();
  renderQuotes();
  renderPreview();
}

// ==============================
// 事件绑定
// ==============================
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.querySelector(`#tab-${tab.dataset.tab}`)?.classList.add("active");
  });
});

document.querySelector("#industrySelect")?.addEventListener("change", renderPreview);
document.querySelector("#activeTemplate")?.addEventListener("change", e => switchTemplate(e.target.value));

// 模板面板
document.querySelector("#openTemplate")?.addEventListener("click", () => {
  renderTemplateEditor();
  document.querySelector("#templateOverlay").classList.add("show");
  document.querySelector("#templatePanel").classList.add("show");
});
document.querySelector("#closeTemplate")?.addEventListener("click", () => {
  document.querySelector("#templateOverlay").classList.remove("show");
  document.querySelector("#templatePanel").classList.remove("show");
});
document.querySelector("#templateOverlay")?.addEventListener("click", () => {
  document.querySelector("#templateOverlay").classList.remove("show");
  document.querySelector("#templatePanel").classList.remove("show");
});

document.querySelector("#saveTemplate")?.addEventListener("click", saveTemplateData);
document.querySelector("#newBlankTemplate")?.addEventListener("click", () => {
  activeTemplate = { name: "新建模板", docDefaults: { fontName: "Microsoft YaHei", fontSize: 22 }, styles: JSON.parse(JSON.stringify(DEFAULT_STYLE_VALUES)) };
  activeTemplateName = "新建模板";
  document.querySelector("#templateNameInput").value = "新建模板";
  renderTemplateEditor();
  renderPreview();
});
document.querySelector("#deleteTemplate")?.addEventListener("click", deleteTemplateData);

// 内容管理面板
document.querySelector("#openAdmin")?.addEventListener("click", () => { adminType = "industries"; adminCurrentData = industryContexts || {}; openAdminPanel(); });
document.querySelector("#closeAdmin")?.addEventListener("click", closeAdminPanel);
document.querySelector("#adminOverlay")?.addEventListener("click", closeAdminPanel);
document.querySelectorAll("#adminSubtabs .admin-subtab").forEach(btn => {
  btn.addEventListener("click", async () => {
    document.querySelectorAll("#adminSubtabs .admin-subtab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    adminType = btn.dataset.type;
    const data = await loadData(adminType);
    if (data) adminCurrentData = data;
    renderAdminTable();
  });
});
document.querySelector("#adminAddBtn")?.addEventListener("click", () => openAdminModal(""));
document.querySelector("#adminCancel")?.addEventListener("click", closeAdminModal);
document.querySelector("#adminModal")?.addEventListener("click", e => { if (e.target === e.currentTarget) closeAdminModal(); });
document.querySelector("#adminForm")?.addEventListener("submit", e => { e.preventDefault(); submitAdminForm(); });

// 报价
document.querySelector("#addQuote")?.addEventListener("click", () => { quotes.push({ name:"", spec:"", price:"", remark:"" }); renderAll(); });
document.querySelector("#resetTemplate")?.addEventListener("click", () => {
  const s01 = scenarios["S01"];
  selectedScenarios = new Set(["S01"]);
  if (s01) { selectedProducts = new Set(s01.products||[]); selectedServices = new Set(s01.services||[]); }
  syncQuotes(); renderAll();
  showToast("已恢复推荐配置");
});
document.querySelector("#generateBtn")?.addEventListener("click", async () => {
  const btn = document.querySelector("#generateBtn");
  btn.disabled = true; btn.textContent = "生成中...";
  try {
    const res = await fetch("/api/generate", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(collectData()) });
    if (!res.ok) throw new Error("生成失败");
    const result = await res.json();
    showToast("Word 已生成，正在下载");
    window.location.href = result.url;
  } catch(e) { showToast(e.message); }
  finally { btn.disabled = false; btn.textContent = "生成 Word"; }
});
document.querySelector("#solutionForm")?.addEventListener("input", renderPreview);
document.querySelector("#docDate") && (document.querySelector("#docDate").value = currentMonth());

// ==============================
// 默认数据兜底
// ==============================
function getDefaultScenarios() {
  return { "S01": { "id":"S01","name":"勒索病毒防护","description":"面向勒索病毒入侵的纵深防护方案。","background":"勒索病毒已成为全球各类组织面临的持续性、高危害安全威胁之一。","weaknesses":[{"title":"边界防护薄弱","description":"缺乏针对新型变种及加密流量的实时检测能力。"}],"analysis":"构建纵深防护体系。","architecture":"四道防线形成立体防护。","products":["C01_PROTECT","C02_SASE","C03_SERVER","C04_MSSP"],"services":["SV_VULN","SV_PENTEST"]} };
}
function getDefaultProducts() {
  return { "C01_PROTECT":{"id":"C01_PROTECT","title":"天翼安全大脑","layer":"边界防御","product":"天翼安全大脑","goal":"网络边界入侵防御","paragraphs":["天翼安全大脑是集本地安全防护、云端安全运营为一体的安全网关服务产品。"],"capability":"下一代防火墙","deployMode":"本地网关","spec":"按带宽","deployment":["天翼安全大脑","网络出口","1-3个工作日"],"quote":["天翼安全大脑","按带宽/年","7,200元/年起"]} };
}
function getDefaultServices() {
  return { "SV_VULN":{"id":"SV_VULN","name":"漏洞扫描服务","content":"对客户信息系统进行漏洞扫描。","method":"远程","frequency":"按合同约定","deliverable":"漏洞扫描报告"} };
}

// 暴露到全局作用域供 onclick 使用
window.editAdminItem = openAdminModal;
window.deleteAdminItem = deleteAdminItem;
window.addWeaknessRow = addWeaknessRow;

// ==============================
// 初始化
// ==============================
(async function init() {
  await loadAllData();
  await loadTemplates();
  await switchTemplate("默认模板");
  syncQuotes();
  renderAll();
})();
