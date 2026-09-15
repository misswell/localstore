const elements = {
  rows: document.querySelector("#rows"),
  empty: document.querySelector("#empty"),
  method: document.querySelector("#method"),
  search: document.querySelector("#search"),
  refresh: document.querySelector("#refresh"),
  status: document.querySelector("#status"),
  total: document.querySelector("#total"),
  success: document.querySelector("#success"),
  errors: document.querySelector("#errors"),
  average: document.querySelector("#average"),
  agentInstructions: document.querySelector("#agent-instructions"),
  copyAgentGuide: document.querySelector("#copy-agent-guide"),
};

let entries = [];

async function copyAgentGuide() {
  const button = elements.copyAgentGuide;
  try {
    await writeClipboard(elements.agentInstructions.textContent.trim());
    button.textContent = "已复制";
    button.classList.add("copied");
  } catch (error) {
    button.textContent = "复制失败";
    console.error("Unable to copy agent guide", error);
  }
  window.setTimeout(() => {
    button.textContent = "一键复制给 Agent";
    button.classList.remove("copied");
  }, 1800);
}

async function writeClipboard(value) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard is unavailable");
}

document.querySelector("#host").textContent = `${location.hostname} :`;
document.querySelector("#port").textContent = location.port || (location.protocol === "https:" ? "443" : "80");

async function loadLogs() {
  try {
    const response = await fetch("/logs", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    entries = await response.json();
    setConnection(true);
    render();
  } catch (error) {
    setConnection(false);
    console.error("Unable to load request logs", error);
  }
}

function setConnection(online) {
  elements.status.className = `status ${online ? "online" : "offline"}`;
  elements.status.innerHTML = `<span></span>${online ? "实时更新" : "连接中断"}`;
}

function render() {
  const method = elements.method.value;
  const query = elements.search.value.trim().toLowerCase();
  const visible = entries.filter((entry) =>
    (!method || entry.method === method) && (!query || entry.path.toLowerCase().includes(query)),
  );

  elements.rows.replaceChildren(...visible.map(createRow));
  elements.empty.hidden = visible.length !== 0;
  elements.total.textContent = String(entries.length);
  const successful = entries.filter((entry) => entry.status < 400).length;
  elements.success.textContent = String(successful);
  elements.errors.textContent = String(entries.length - successful);
  const average = entries.length
    ? Math.round(entries.reduce((sum, entry) => sum + entry.durationMs, 0) / entries.length)
    : 0;
  elements.average.textContent = `${average} ms`;
}

function createRow(entry) {
  const row = document.createElement("tr");
  row.append(
    cell(formatTime(entry.timestamp)),
    badgeCell(entry.method, `method ${entry.method}`),
    cell(entry.path, "path"),
    badgeCell(String(entry.status), `code ${entry.status >= 400 ? "error" : ""}`),
    cell(`${entry.durationMs} ms`),
    cell(entry.origin || entry.address || "本机"),
  );
  return row;
}

function cell(value, className = "") {
  const element = document.createElement("td");
  element.className = className;
  element.textContent = value;
  element.title = value;
  return element;
}

function badgeCell(value, className) {
  const element = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = className;
  badge.textContent = value;
  element.append(badge);
  return element;
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

elements.method.addEventListener("change", render);
elements.search.addEventListener("input", render);
elements.refresh.addEventListener("click", loadLogs);
elements.copyAgentGuide.addEventListener("click", copyAgentGuide);

loadLogs();
setInterval(loadLogs, 2000);
