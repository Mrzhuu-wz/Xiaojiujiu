// ==============================
// Xiaojiujiu 数据统计中心
// ==============================

// Chart.js 实例引用
let visitChart = null;
let exportChart = null;
let hourChart = null;

// 当前时间范围
let currentRange = 7;

// 场景名称映射
const SCENARIO_NAMES = {
  S01: "勒索病毒防护", S02: "边界防护", S03: "零信任安全",
  S04: "终端安全", S05: "网站安全防护", S06: "等保合规"
};

// ==============================
// API 调用（双层兜底）
// ==============================
async function fetchStats(path) {
  try {
    const res = await fetch(`/api/stats${path}`);
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

async function fetchDashboard(range) {
  const data = await fetchStats(`/dashboard?range=${range}`);
  if (data) return data;

  // localStorage 兜底
  return buildLocalDashboard(range);
}

function buildLocalDashboard(range) {
  const visits = JSON.parse(localStorage.getItem("stats_visits") || "[]");
  const exports = JSON.parse(localStorage.getItem("stats_exports") || "[]");

  const now = Date.now();
  const startTime = range === "all" ? 0 : now - range * 24 * 60 * 60 * 1000;

  const filteredVisits = visits.filter(v => v.timestamp > startTime);
  const filteredExports = exports.filter(e => e.timestamp > startTime);

  // 计算 UV：用 localStorage 中标记过的唯一 ID
  const uvSet = new Set();
  filteredVisits.forEach(v => { if (v.sessionId) uvSet.add(v.sessionId); });

  // 总数据
  const totalPV = visits.length;
  const totalUV = new Set(visits.map(v => v.sessionId).filter(Boolean)).size;
  const totalExports = exports.length;

  // 每日聚合
  const dailyMap = {};
  filteredVisits.forEach(v => {
    const day = formatDate(new Date(v.timestamp));
    if (!dailyMap[day]) dailyMap[day] = { pv: 0, uvSet: new Set(), exports: 0 };
    dailyMap[day].pv++;
    if (v.sessionId) dailyMap[day].uvSet.add(v.sessionId);
  });
  filteredExports.forEach(e => {
    const day = formatDate(new Date(e.timestamp));
    if (!dailyMap[day]) dailyMap[day] = { pv: 0, uvSet: new Set(), exports: 0 };
    dailyMap[day].exports++;
  });

  // 场景分布
  const sceneDist = {};
  exports.forEach(e => {
    const scene = e.scenario || "未知";
    sceneDist[scene] = (sceneDist[scene] || 0) + 1;
  });

  // 时段分布
  const hourDist = new Array(24).fill(0);
  visits.forEach(v => {
    const h = new Date(v.timestamp).getHours();
    hourDist[h]++;
  });

  // 构建每日数组
  const days = Object.keys(dailyMap).sort();
  const daily = days.map(d => ({
    date: d,
    pv: dailyMap[d].pv,
    uv: dailyMap[d].uvSet.size,
    exports: dailyMap[d].exports
  }));

  // 模板统计
  const templateStats = {};
  exports.forEach(e => {
    const tpl = e.template || "默认模板";
    templateStats[tpl] = (templateStats[tpl] || 0) + 1;
  });

  return {
    summary: {
      totalPV, totalUV, totalExports,
      activeTemplates: Object.keys(templateStats).length,
      totalTemplates: Object.keys(templateStats).length || 1,
      todayPV: filteredVisits.filter(v => isToday(v.timestamp)).length,
      todayExports: filteredExports.filter(e => isToday(e.timestamp)).length,
      prevPV: 0, prevUV: 0, prevExports: 0
    },
    daily,
    exports: filteredExports,
    sceneDist,
    hourDist,
    templateStats,
    isLocal: true
  };
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isToday(ts) {
  const d = new Date(ts);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

// ==============================
// 页面渲染
// ==============================

function renderStatsCards(summary) {
  const pvEl = document.querySelector(".stat-card[data-key='totalPV'] .stat-value");
  const uvEl = document.querySelector(".stat-card[data-key='totalUV'] .stat-value");
  const expEl = document.querySelector(".stat-card[data-key='totalExports'] .stat-value");
  const tplEl = document.querySelector(".stat-card[data-key='activeTemplates'] .stat-value");

  if (pvEl) pvEl.textContent = summary.totalPV.toLocaleString();
  if (uvEl) uvEl.textContent = summary.totalUV.toLocaleString();
  if (expEl) expEl.textContent = summary.totalExports.toLocaleString();
  if (tplEl) tplEl.textContent = summary.activeTemplates;

  // 趋势指示
  const trends = document.querySelectorAll(".stat-trend");
  trends.forEach(el => {
    const key = el.dataset.trend;
    let prev = 0, curr = 0, label = "";
    if (key === "pv") { prev = summary.prevPV || 0; curr = summary.todayPV || 0; label = "今日"; }
    else if (key === "uv") { prev = summary.prevUV || 0; curr = 0; label = ""; }
    else if (key === "export") { prev = summary.prevExports || 0; curr = summary.todayExports || 0; label = "今日"; }

    if (curr > 0 && prev > 0) {
      const pct = Math.round((curr - prev) / prev * 100);
      el.textContent = label ? `${label} +${curr}` : `+${pct}% 较上周`;
      el.className = "stat-trend up";
    } else if (curr > 0) {
      el.textContent = label ? `${label} +${curr}` : "";
      el.className = "stat-trend neutral";
    } else if (label) {
      el.textContent = `${label} 0`;
      el.className = "stat-trend neutral";
    }
  });

  // 模板副标题
  const subEl = document.querySelector("[data-sub='template']");
  if (subEl) subEl.textContent = `共 ${summary.totalTemplates || summary.activeTemplates} 个模板`;
}

function renderVisitChart(daily) {
  const canvas = document.getElementById("visitChart");
  if (!canvas) return;
  if (visitChart) visitChart.destroy();

  const labels = daily.map(d => d.date.slice(5)); // MM-DD
  const pvData = daily.map(d => d.pv);
  const uvData = daily.map(d => d.uv);

  visitChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "PV",
          data: pvData,
          backgroundColor: "rgba(192,0,0,0.7)",
          borderRadius: 4,
          barPercentage: 0.6,
        },
        {
          label: "UV",
          data: uvData,
          backgroundColor: "rgba(55,138,221,0.7)",
          borderRadius: 4,
          barPercentage: 0.6,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: { boxWidth: 12, padding: 10, font: { size: 11 } }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { beginAtZero: true, ticks: { font: { size: 11 }, precision: 0 } }
      }
    }
  });
}

function renderExportChart(daily) {
  const canvas = document.getElementById("exportChart");
  if (!canvas) return;
  if (exportChart) exportChart.destroy();

  const labels = daily.map(d => d.date.slice(5));
  const data = daily.map(d => d.exports);

  exportChart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "导出数",
        data,
        borderColor: "#C00000",
        backgroundColor: "rgba(192,0,0,0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: "#C00000",
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { beginAtZero: true, ticks: { font: { size: 11 }, precision: 0 } }
      }
    }
  });
}

function renderHourChart(hourDist) {
  const canvas = document.getElementById("hourChart");
  if (!canvas) return;
  if (hourChart) hourChart.destroy();

  const labels = [];
  for (let i = 0; i < 24; i++) {
    labels.push(i % 6 === 0 ? `${i}:00` : "");
  }

  hourChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data: hourDist,
        backgroundColor: "rgba(192,0,0,0.6)",
        borderRadius: 2,
        barPercentage: 0.9,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { beginAtZero: true, ticks: { font: { size: 10 }, precision: 0 } }
      }
    }
  });
}

function renderExportTable(exports) {
  const tbody = document.getElementById("exportTableBody");
  if (!tbody) return;

  const recent = exports.slice(-10).reverse();

  if (!recent.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">暂无导出记录</td></tr>';
    return;
  }

  tbody.innerHTML = recent.map(e => {
    const d = new Date(e.timestamp);
    const timeStr = isToday(e.timestamp)
      ? d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });

    const scenarioName = SCENARIO_NAMES[e.scenario] || e.scenario || "--";
    const fileName = e.filename || "";
    const downloadHtml = fileName
      ? `<a href="/generated/${encodeURIComponent(fileName)}" class="download-link">下载</a>`
      : '<span style="color:#CCC">已清理</span>';

    return `<tr>
      <td>${escapeHtml(e.title || "未命名方案")}</td>
      <td>${escapeHtml(scenarioName)}</td>
      <td>${escapeHtml(e.template || "--")}</td>
      <td>${timeStr}</td>
      <td>${downloadHtml}</td>
    </tr>`;
  }).join("");
}

function renderScenarioDist(sceneDist) {
  const container = document.getElementById("scenarioDist");
  if (!container) return;

  const entries = Object.entries(sceneDist).sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    container.innerHTML = '<p style="color:#AAA;font-size:13px;text-align:center;padding:10px;">暂无数据</p>';
    return;
  }

  const max = entries[0][1];
  container.innerHTML = entries.map(([key, count]) => {
    const pct = max > 0 ? Math.round(count / max * 100) : 0;
    const name = SCENARIO_NAMES[key] || key;
    return `<div class="bar-item">
      <span class="bar-label">${escapeHtml(name)}</span>
      <div class="bar-fill">
        <div class="bar-inner" style="width:${pct}%">${count > 0 ? `<span class="bar-value">${count}</span>` : ""}</div>
      </div>
    </div>`;
  }).join("");
}

function renderDataOverview(sessionDataPromise) {
  const container = document.getElementById("dataOverview");
  if (!container) return;

  // 异步获取数据概览，但先展示基本信息
  container.innerHTML = '<p style="color:#AAA;font-size:12px;">加载中...</p>';

  sessionDataPromise.then(({ sceneCount, productCount, serviceCount, industryCount, templateCount }) => {
    container.innerHTML = `
      <div class="data-item"><span class="key">行业数</span><span class="val">${industryCount}</span></div>
      <div class="data-item"><span class="key">场景数</span><span class="val">${sceneCount}</span></div>
      <div class="data-item"><span class="key">产品数</span><span class="val">${productCount}</span></div>
      <div class="data-item"><span class="key">安全服务数</span><span class="val">${serviceCount}</span></div>
      <div class="data-item"><span class="key">Word 模板数</span><span class="val">${templateCount}</span></div>
      <div class="data-item"><span class="key">拓扑模板数</span><span class="val">${localStorage.getItem("saved_templates") ? JSON.parse(localStorage.getItem("saved_templates")).length : 0}</span></div>
    `;
  }).catch(() => {
    container.innerHTML = '<p style="color:#CCC;font-size:12px;">数据加载失败</p>';
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
}

// ==============================
// 数据概览异步获取
// ==============================
async function loadDataOverview() {
  const counts = { sceneCount: 0, productCount: 0, serviceCount: 0, industryCount: 0, templateCount: 0 };

  try {
    const [scenes, products, services, industries, templates] = await Promise.all([
      fetch("/api/data/scenarios").then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/data/products").then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/data/services").then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/data/industries").then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/templates").then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    counts.sceneCount = Object.keys(scenes || {}).length;
    counts.productCount = Object.keys(products || {}).length;
    counts.serviceCount = Object.keys(services || {}).length;
    counts.industryCount = Object.keys(industries || {}).length;
    counts.templateCount = Array.isArray(templates) ? templates.length : 0;
  } catch {}

  return counts;
}

// ==============================
// 主流程
// ==============================
async function refreshDashboard() {
  const data = await fetchDashboard(currentRange);

  // 渲染
  renderStatsCards(data.summary);
  renderVisitChart(data.daily);
  renderExportChart(data.daily);
  renderHourChart(data.hourDist);
  renderExportTable(data.exports);
  renderScenarioDist(data.sceneDist);

  // 数据概览异步
  const overviewPromise = loadDataOverview();
  renderDataOverview(overviewPromise);
}

// ==============================
// 事件绑定
// ==============================
document.getElementById("timeRange").addEventListener("change", function() {
  currentRange = this.value === "all" ? "all" : parseInt(this.value);
  refreshDashboard();
});

document.getElementById("refreshBtn").addEventListener("click", refreshDashboard);

// ==============================
// 初始化
// ==============================
refreshDashboard();

// 自动刷新（每 60 秒）
setInterval(refreshDashboard, 60000);
