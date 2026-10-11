// ===== GLOBALS =====
let MCU = null;
import("https://esm.sh/@material/material-color-utilities@0.3.0").then((m) => {
  MCU = m;
  if (userSettings.theme === "custom") updateCustomTheme();
});
let latestData = null;
let leafletMap = null;
let queryHistory = JSON.parse(localStorage.getItem("lookup_history") || "[]");

const themes = {
  blue: {
    bg: "#131316",
    surface: "#201F23",
    surfaceHover: "#2A2A2D",
    border: "#46464F",
    text: "#E4E1E6",
    textMuted: "#918F9A",
    accent: "#17468D",
    link: "#A8C7FA",
    linkHover: "#D3E3FD",
    errorBg: "#93000A",
    errorBorder: "#FFB4AB",
    success: "#6DD58C",
    error: "#FFB4AB",
  },
  green: {
    bg: "#131316",
    surface: "#201F23",
    surfaceHover: "#2A2A2D",
    border: "#46464F",
    text: "#E4E1E6",
    textMuted: "#918F9A",
    accent: "#0F5223",
    link: "#93D5A5",
    linkHover: "#B6ECC3",
    errorBg: "#93000A",
    errorBorder: "#FFB4AB",
    success: "#6DD58C",
    error: "#FFB4AB",
  },
  purple: {
    bg: "#131316",
    surface: "#201F23",
    surfaceHover: "#2A2A2D",
    border: "#46464F",
    text: "#E4E1E6",
    textMuted: "#918F9A",
    accent: "#4D2C87",
    link: "#D0BCFF",
    linkHover: "#E8DEF8",
    errorBg: "#93000A",
    errorBorder: "#FFB4AB",
    success: "#6DD58C",
    error: "#FFB4AB",
  },
  red: {
    bg: "#131316",
    surface: "#201F23",
    surfaceHover: "#2A2A2D",
    border: "#46464F",
    text: "#E4E1E6",
    textMuted: "#918F9A",
    accent: "#8C1D18",
    link: "#FFB4AB",
    linkHover: "#FFDAD6",
    errorBg: "#93000A",
    errorBorder: "#FFB4AB",
    success: "#6DD58C",
    error: "#FFB4AB",
  },
  orange: {
    bg: "#131316",
    surface: "#201F23",
    surfaceHover: "#2A2A2D",
    border: "#46464F",
    text: "#E4E1E6",
    textMuted: "#918F9A",
    accent: "#825500",
    link: "#FFB951",
    linkHover: "#FFDDB3",
    errorBg: "#93000A",
    errorBorder: "#FFB4AB",
    success: "#6DD58C",
    error: "#FFB4AB",
  },
};

const defaultSettings = {
  theme: "blue",
  customTheme: {
    bg: "#131316",
    surface: "#201F23",
    surfaceHover: "#2A2A2D",
    border: "#46464F",
    text: "#E4E1E6",
    textMuted: "#918F9A",
    accent: "#ff79c6",
    link: "#ff79c6",
    linkHover: "#131316",
    errorBg: "#93000A",
    errorBorder: "#FFB4AB",
    success: "#6DD58C",
    error: "#FFB4AB",
  },
  customFont: "",
  resolvers: {
    Cloudflare: { url: "https://cloudflare-dns.com/dns-query", active: true },
    Google: { url: "https://dns.google/resolve", active: true },
  },
  features: { animations: true, enableWhois: false, enableSecurity: true, enableSsl: false },
  advanced: {
    rdapServer: "https://rdap.org/domain/",
    timeout: 5000,
    sslProvider: "certspotter",
    historyKey: "",
  },
  defaultRecords: ["A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA"],
};

const availableRecords = [
  "A",
  "AAAA",
  "ALIAS",
  "CAA",
  "CNAME",
  "DNSKEY",
  "DS",
  "HTTPS",
  "LOC",
  "MX",
  "NAPTR",
  "NS",
  "PTR",
  "SMIMEA",
  "SOA",
  "SRV",
  "SSHFP",
  "SVCB",
  "TLSA",
  "TXT",
  "URI",
];
let userSettings = JSON.parse(JSON.stringify(defaultSettings));

// ===== SCROLL =====
window.addEventListener("scroll", () => {
  const btn = document.getElementById("scrollTopBtn");
  if (window.scrollY > 300) btn.classList.add("visible");
  else btn.classList.remove("visible");
});

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    const home = document.getElementById("homePage");
    const input =
      home.style.display !== "none"
        ? document.getElementById("domainHome")
        : document.getElementById("domainTop");
    input.focus();
    input.select();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === ",") {
    e.preventDefault();
    openSettings();
  }
  if (e.key === "Escape") {
    closeModal("ipModal");
    closeModal("helpModal");
    closeSettings();
  }
});

// ===== TOAST =====
function showToast(msg, type) {
  const c = document.getElementById("toastContainer");
  const t = document.createElement("div");
  t.className = "toast";
  const iconCheck =
    '<span class="material-symbols-rounded" style="vertical-align:middle;margin-right:6px;font-size:18px;">check_circle</span>';
  const iconCross =
    '<span class="material-symbols-rounded" style="vertical-align:middle;margin-right:6px;font-size:18px;">cancel</span>';
  const iconInfo =
    '<span class="material-symbols-rounded" style="vertical-align:middle;margin-right:6px;font-size:18px;">info</span>';
  const icon = type === "success" ? iconCheck : type === "error" ? iconCross : iconInfo;
  t.innerHTML =
    '<span style="display:inline-flex;align-items:center;font-weight:600;">' +
    icon +
    esc(msg) +
    "</span>";
  c.appendChild(t);
  setTimeout(() => {
    t.style.opacity = "0";
    t.style.transform = "translateY(10px)";
    t.style.transition = "all 0.3s ease";
    setTimeout(() => t.remove(), 300);
  }, 2500);
}

// ===== MODAL =====
function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}

// ===== SETTINGS DRAWER =====
function openSettings() {
  document.getElementById("settingsOverlay").classList.remove("hidden");
  document.getElementById("settingsDrawer").classList.remove("hidden");
  document.getElementById("settingsDrawer").classList.remove("closing");
}
function closeSettings() {
  const drawer = document.getElementById("settingsDrawer");
  drawer.classList.add("closing");
  setTimeout(() => {
    document.getElementById("settingsOverlay").classList.add("hidden");
    drawer.classList.add("hidden");
    drawer.classList.remove("closing");
  }, 240);
}

// ===== SETTINGS =====
function loadSettings() {
  const saved = localStorage.getItem("lookup_settings");
  if (saved) {
    try {
      const p = JSON.parse(saved);
      if (p.resolvers) {
        for (const k in p.resolvers) {
          if (typeof p.resolvers[k] === "string")
            p.resolvers[k] = { url: p.resolvers[k], active: true };
        }
      }
      userSettings.theme = p.theme || defaultSettings.theme;
      if (userSettings.theme !== "custom" && !themes[userSettings.theme]) {
        userSettings.theme = "blue";
      }
      userSettings.customTheme = { ...defaultSettings.customTheme, ...(p.customTheme || {}) };
      userSettings.customFont = p.customFont || "";
      userSettings.resolvers = p.resolvers || defaultSettings.resolvers;
      userSettings.features = { ...defaultSettings.features, ...(p.features || {}) };
      userSettings.advanced = { ...defaultSettings.advanced, ...(p.advanced || {}) };
      userSettings.defaultRecords = p.defaultRecords || defaultSettings.defaultRecords;
    } catch (e) {
      console.error("Error loading settings");
    }
  }

  // Theme highlighted in applyTheme
  if (userSettings.theme === "custom") {
    document.getElementById("cAccent").value = userSettings.customTheme.accent;
  }
  document.getElementById("customFontInput").value = userSettings.customFont;
  document.getElementById("setAnimations").checked = userSettings.features.animations;
  document.getElementById("setWhois").checked = userSettings.features.enableWhois;
  document.getElementById("setSecurity").checked = userSettings.features.enableSecurity !== false;
  if (document.getElementById("setSsl")) {
    document.getElementById("setSsl").checked = userSettings.features.enableSsl === true;
  }
  document.getElementById("setRdapServer").value = userSettings.advanced.rdapServer;
  document.getElementById("setTimeout").value = userSettings.advanced.timeout;
  if (document.getElementById("setSslProvider")) {
    document.getElementById("setSslProvider").value =
      userSettings.advanced.sslProvider || "certspotter";
  }
  if (document.getElementById("setHistoryKey")) {
    document.getElementById("setHistoryKey").value = userSettings.advanced.historyKey || "";
  }

  applyTheme(userSettings.theme);
  applyFont(userSettings.customFont);
  toggleBodyAnimations();
  renderRecordSettings();
  renderSettingsResolvers();
  renderHistory();
}

function saveSettings() {
  localStorage.setItem("lookup_settings", JSON.stringify(userSettings));
}
function toggleSetting(cat, key, val) {
  userSettings[cat][key] = val;
  saveSettings();
  if (key === "animations") toggleBodyAnimations();
}
function updateSettingText(cat, key, val) {
  if (val !== undefined && val !== "") {
    userSettings[cat][key] = val;
    saveSettings();
  }
}
function toggleBodyAnimations() {
  if (userSettings.features.animations) document.body.classList.remove("no-animations");
  else document.body.classList.add("no-animations");
}
function resetSettings() {
  if (confirm("Reset all settings to default?")) {
    localStorage.removeItem("lookup_settings");
    userSettings = JSON.parse(JSON.stringify(defaultSettings));
    loadSettings();
    showToast("Settings reset", "success");
  }
}

// ===== THEME =====
function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? parseInt(r[1], 16) + "," + parseInt(r[2], 16) + "," + parseInt(r[3], 16) : null;
}

function hslToHex(h, s, l) {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return "#" + f(0) + f(8) + f(4);
}

function applyTheme(name) {
  const root = document.documentElement;
  const editor = document.getElementById("customThemeEditor");
  let source = name === "custom" ? userSettings.customTheme : themes[name] || themes.blue;

  if (name === "custom") editor.classList.remove("hidden");
  else editor.classList.add("hidden");

  document.querySelectorAll(".font-preset-tag[data-theme]").forEach((tag) => {
    tag.classList.toggle("active", tag.dataset.theme === name);
  });
  root.style.setProperty("--bg", source.bg);
  root.style.setProperty("--surface", source.surface);
  root.style.setProperty("--border", source.border);
  root.style.setProperty("--surface-hover", source.surfaceHover);
  root.style.setProperty("--accent", source.accent);
  root.style.setProperty("--link", source.link);
  root.style.setProperty("--link-hover", source.linkHover);
  root.style.setProperty("--text", source.text);
  root.style.setProperty("--text-muted", source.textMuted);
  root.style.setProperty("--error-bg", source.errorBg);
  root.style.setProperty("--error-border", source.errorBorder);

  const bgRgb = hexToRgb(source.bg);
  if (bgRgb) root.style.setProperty("--bg-rgb", bgRgb);
  root.style.setProperty("--success", source.success || "#22c55e");
  root.style.setProperty("--error", source.error || "#ef4444");
  const sRgb = hexToRgb(source.success || "#22c55e");
  if (sRgb) root.style.setProperty("--success-rgb", sRgb);
  const eRgb = hexToRgb(source.error || "#ef4444");
  if (eRgb) root.style.setProperty("--error-rgb", eRgb);

  userSettings.theme = name;
  saveSettings();
}

function updateCustomTheme() {
  const acc = document.getElementById("cAccent").value;
  userSettings.customTheme = {
    bg: "#131316",
    surface: "#201F23",
    surfaceHover: "#2A2A2D",
    border: "#46464F",
    text: "#E4E1E6",
    textMuted: "#918F9A",
    accent: acc,
    link: acc,
    linkHover: "#131316",
    errorBg: "#93000A",
    errorBorder: "#FFB4AB",
    success: "#6DD58C",
    error: "#FFB4AB",
  };
  applyTheme("custom");
}

// ===== FONT =====
function applyFont(fontName) {
  const actual = fontName || "Roboto";
  userSettings.customFont = actual === "Roboto" ? "" : actual;
  saveSettings();
  document.getElementById("customFontInput").value = userSettings.customFont;
  document.querySelectorAll(".font-preset-tag[data-font]").forEach((tag) => {
    tag.classList.toggle(
      "active",
      tag.dataset.font === actual || (actual === "Roboto" && tag.dataset.font === "Roboto"),
    );
  });

  const root = document.documentElement;
  if (actual === "Roboto") {
    root.style.setProperty("--custom-font", "'Roboto', -apple-system, sans-serif");
    const old = document.getElementById("dynamic-google-font");
    if (old) old.remove();
    return;
  }

  const formatted = actual.replace(/ /g, "+");
  let link = document.getElementById("dynamic-google-font");
  if (!link) {
    link = document.createElement("link");
    link.id = "dynamic-google-font";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  link.href =
    "https://fonts.googleapis.com/css2?family=" +
    formatted +
    ":wght@400;500;600;700;800&display=swap";
  const fallback = actual.includes("Mono") || actual.includes("Code") ? "monospace" : "sans-serif";
  root.style.setProperty("--custom-font", "'" + actual + "', " + fallback);
}

// ===== RECORD SETTINGS =====
function renderRecordSettings() {
  const c = document.getElementById("recordCheckboxes");
  c.innerHTML = "";
  if (!userSettings.defaultRecords) userSettings.defaultRecords = defaultSettings.defaultRecords;
  availableRecords.forEach((r) => {
    const active = userSettings.defaultRecords.includes(r);
    c.innerHTML +=
      '<div class="selectable-tag ' +
      (active ? "active" : "") +
      '" data-action="toggle-record" data-value="' +
      esc(r) +
      '">' +
      esc(r) +
      "</div>";
  });
}

function toggleRecord(record) {
  const idx = userSettings.defaultRecords.indexOf(record);
  if (idx > -1) {
    if (userSettings.defaultRecords.length <= 1) {
      showToast("Need at least one record type", "error");
      return;
    }
    userSettings.defaultRecords.splice(idx, 1);
  } else {
    userSettings.defaultRecords.push(record);
  }
  saveSettings();
  renderRecordSettings();
}

// ===== RESOLVER SETTINGS =====
let editingResolverName = null;

function renderSettingsResolvers() {
  const c = document.getElementById("resolverList");
  c.innerHTML = "";
  c.className = "";
  for (const [name, data] of Object.entries(userSettings.resolvers)) {
    const isChecked = data.active ? "checked" : "";
    if (editingResolverName === name) {
      c.innerHTML +=
        '<div class="resolver-card editing">' +
        '<input type="text" class="settings-input" id="editResName" value="' +
        esc(name) +
        '" placeholder="Name" style="margin-bottom:8px;">' +
        '<textarea class="settings-input" id="editResUrl" rows="2" style="resize:vertical; margin-bottom:12px; font-family:var(--font-mono); font-size:12px;">' +
        esc(data.url) +
        "</textarea>" +
        '<div style="display:flex; justify-content:flex-end; gap:8px;">' +
        '<button class="btn-danger" style="margin-right:auto;" data-action="remove-resolver" data-value="' +
        esc(name) +
        '">Delete</button>' +
        '<button class="btn-outline" onclick="cancelEditResolver()">Cancel</button>' +
        '<button data-action="save-resolver" data-value="' +
        esc(name) +
        '">Save</button>' +
        "</div></div>";
    } else {
      const cardBorder = data.active
        ? "border-color: var(--accent); background: rgba(var(--info-rgb), 0.03);"
        : "";
      c.innerHTML +=
        '<div class="resolver-card" style="' +
        cardBorder +
        '">' +
        '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">' +
        '<div style="flex:1; min-width:0;">' +
        '<div style="font-weight:600; font-size:14px; margin-bottom:4px; display:flex; align-items:center; gap:8px;">' +
        esc(name) +
        '<span class="material-symbols-rounded" style="font-size:14px; cursor:pointer; opacity:0.5;" data-action="edit-resolver" data-value="' +
        esc(name) +
        '" title="Edit">edit</span>' +
        "</div>" +
        '<div style="font-size:11px; color:var(--text-muted); font-family:var(--font-mono); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="' +
        esc(data.url) +
        '">' +
        esc(data.url) +
        "</div>" +
        "</div>" +
        '<label class="toggle-switch" style="margin-top:2px;">' +
        '<input type="checkbox" ' +
        isChecked +
        ' data-action="toggle-resolver" data-value="' +
        esc(name) +
        '">' +
        '<span class="toggle-slider"></span>' +
        "</label>" +
        "</div></div>";
    }
  }
}

function toggleResolver(name) {
  if (userSettings.resolvers[name]) {
    userSettings.resolvers[name].active = !userSettings.resolvers[name].active;
    saveSettings();
    if (!editingResolverName) renderSettingsResolvers();
  }
}

function addResolver() {
  const n = document.getElementById("newResName").value.trim();
  const u = document.getElementById("newResUrl").value.trim();
  if (n && u) {
    userSettings.resolvers[n] = { url: u, active: true };
    document.getElementById("newResName").value = "";
    document.getElementById("newResUrl").value = "";
    saveSettings();
    renderSettingsResolvers();
    showToast('"' + n + '" added', "success");
  }
}

function quickAddResolver(name, url) {
  if (userSettings.resolvers[name]) {
    showToast(name + " already exists", "error");
    return;
  }
  userSettings.resolvers[name] = { url, active: true };
  saveSettings();
  renderSettingsResolvers();
  showToast(name + " added", "success");
}

function editResolver(name) {
  editingResolverName = name;
  renderSettingsResolvers();
}

function cancelEditResolver() {
  editingResolverName = null;
  renderSettingsResolvers();
}

function saveEditResolver(oldName) {
  const newName = document.getElementById("editResName").value.trim();
  const newUrl = document.getElementById("editResUrl").value.trim();
  if (!newName || !newUrl) return showToast("Name and URL required", "error");

  const active = userSettings.resolvers[oldName].active;
  if (newName !== oldName) {
    if (userSettings.resolvers[newName]) return showToast("Name already exists", "error");
    delete userSettings.resolvers[oldName];
  }
  userSettings.resolvers[newName] = { url: newUrl, active };
  editingResolverName = null;
  saveSettings();
  renderSettingsResolvers();
  showToast("Resolver updated", "success");
}

function removeResolver(name) {
  if (Object.keys(userSettings.resolvers).length <= 1) {
    showToast("Need at least one resolver", "error");
    return;
  }
  delete userSettings.resolvers[name];
  saveSettings();
  renderSettingsResolvers();
  showToast("Resolver removed", "success");
}

// ===== EXPORT / IMPORT =====
function exportSettings() {
  const blob = new Blob([JSON.stringify(userSettings, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "lookup_settings.json";
  a.click();
  showToast("Settings exported", "success");
}
function importSettings(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const p = JSON.parse(e.target.result);
      userSettings = { ...defaultSettings, ...p };
      saveSettings();
      loadSettings();
      showToast("Settings imported!", "success");
    } catch (err) {
      showToast("Invalid JSON file", "error");
    }
  };
  reader.readAsText(file);
}

// ===== HISTORY =====
function addToHistory(domain) {
  queryHistory = queryHistory.filter((d) => d !== domain);
  queryHistory.unshift(domain);
  if (queryHistory.length > 10) queryHistory = queryHistory.slice(0, 10);
  localStorage.setItem("lookup_history", JSON.stringify(queryHistory));
  renderHistory();
}

function removeFromHistory(domain) {
  queryHistory = queryHistory.filter((d) => d !== domain);
  localStorage.setItem("lookup_history", JSON.stringify(queryHistory));
  renderHistory();
}

function clearHistory() {
  queryHistory = [];
  localStorage.setItem("lookup_history", "[]");
  renderHistory();
  showToast("History cleared", "success");
}

function renderHistory() {
  const section = document.getElementById("historySection");
  const chips = document.getElementById("historyChips");
  if (!queryHistory.length) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");
  chips.innerHTML = queryHistory
    .map(
      (d) =>
        '<div class="history-chip" data-action="lookup" data-value="' +
        esc(d) +
        '">' +
        esc(d) +
        '<span class="x" data-action="remove-history" data-value="' +
        esc(d) +
        '">✕</span></div>',
    )
    .join("");
}

// ===== NAVIGATION =====
function goHome() {
  document.getElementById("homePage").style.display = "";
  document.getElementById("resultsPage").classList.remove("active");
  document.getElementById("results").innerHTML = "";
  history.pushState({}, "", "/");
  document.getElementById("domainHome").focus();
}

function quickLookup(domain) {
  document.getElementById("homeDropdown")?.classList.remove("show");
  document.getElementById("topDropdown")?.classList.remove("show");
  document.getElementById("domainHome").value = domain;
  triggerLookup("domainHome");
}

function handleAutocomplete(e, dropdownId) {
  const val = e.target.value.trim().toLowerCase();
  const dd = document.getElementById(dropdownId);
  if (!val) {
    dd.classList.remove("show");
    return;
  }

  const suggestions = new Set();
  queryHistory.forEach((h) => {
    if (h.includes(val) && h !== val) suggestions.add(h);
  });
  if (!val.includes(".")) {
    [".com", ".net", ".org", ".io"].forEach((t) => suggestions.add(val + t));
  }

  if (suggestions.size === 0) {
    dd.classList.remove("show");
    return;
  }

  dd.innerHTML = Array.from(suggestions)
    .slice(0, 5)
    .map(
      (s) =>
        '<div class="autocomplete-item" data-action="lookup" data-value="' +
        esc(s) +
        '">' +
        esc(s) +
        "</div>",
    )
    .join("");
  dd.classList.add("show");
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".search") && !e.target.closest(".autocomplete-dropdown")) {
    document.getElementById("homeDropdown")?.classList.remove("show");
    document.getElementById("topDropdown")?.classList.remove("show");
  }
});

// ===== HELPERS =====
// Escapes text for HTML content and quoted attribute values. Everything that
// comes from DNS answers, RDAP, CT logs, ipinfo, the URL or localStorage is
// untrusted and must go through this before it is concatenated into markup.
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Rendered markup carries data in data-* attributes instead of inline
// onclick="fn('value')" strings, so values never pass through a JS parser.
const clickActions = {
  lookup: (value) => quickLookup(value),
  "remove-history": (value) => removeFromHistory(value),
  ip: (value) => openIpModal(value),
  copy: (value, el) => copyToClipboard(value, el),
  "toggle-record": (value) => toggleRecord(value),
  "edit-resolver": (value) => editResolver(value),
  "remove-resolver": (value) => removeResolver(value),
  "save-resolver": (value) => saveEditResolver(value),
};

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el || !clickActions[el.dataset.action]) return;
  clickActions[el.dataset.action](el.dataset.value, el);
});

document.addEventListener("change", (e) => {
  const el = e.target.closest('[data-action="toggle-resolver"]');
  if (el) toggleResolver(el.dataset.value);
});

function handleEnter(e, inputId) {
  if (e.key === "Enter") triggerLookup(inputId);
}

function isSubdomain(domain) {
  const parts = domain.split(".");
  if (parts.length > 2) {
    const isCcSld = parts.length === 3 && parts[1].length <= 3 && parts[2].length <= 3;
    if (!isCcSld) return true;
  }
  return false;
}

function expandIPv6ToArpa(ip) {
  let expanded = ip.split("::");
  let left = expanded[0] ? expanded[0].split(":") : [];
  let right = expanded[1] ? expanded[1].split(":") : [];
  let missing = 8 - (left.length + right.length);
  let middle = Array(missing).fill("0000");
  let full = [...left, ...middle, ...right];
  let nibbles = full
    .map((b) => b.padStart(4, "0"))
    .join("")
    .split("")
    .reverse()
    .join(".");
  return nibbles + ".ip6.arpa";
}

async function copyToClipboard(text, btnEl) {
  try {
    await navigator.clipboard.writeText(text);
    const iconCheck =
      '<span class="material-symbols-rounded" style="vertical-align:text-bottom;margin-right:4px;font-size:16px;">check_circle</span>';
    if (btnEl) {
      btnEl.classList.add("copied");
      btnEl.innerHTML = iconCheck + "Copied";
      setTimeout(() => {
        btnEl.classList.remove("copied");
        btnEl.textContent = "Copy";
      }, 1500);
    } else showToast("Copied!", "success");
  } catch (err) {
    showToast("Failed to copy", "error");
  }
}

function getTimingClass(ms) {
  if (ms < 100) return "fast";
  if (ms < 300) return "medium";
  return "slow";
}

// ===== DNS QUERY =====
async function queryDNS(domain, type, resolverName, resolverUrl) {
  const started = Date.now();
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), userSettings.advanced.timeout || 5000);
  try {
    const res = await fetch(
      resolverUrl + "?name=" + encodeURIComponent(domain) + "&type=" + encodeURIComponent(type),
      {
        headers: { accept: "application/dns-json" },
        signal: controller.signal,
      },
    );
    clearTimeout(tid);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    let errorStr = null;
    if (data.Status === 3) errorStr = "NXDOMAIN (Domain does not exist)";
    else if (data.Status === 2) errorStr = "SERVFAIL (Server failed to complete the request)";
    else if (data.Status === 5) errorStr = "REFUSED (Query refused)";
    else if (data.Status === 1) errorStr = "FORMERR (Format Error)";
    else if (data.Status === 4) errorStr = "NOTIMP (Not Implemented)";
    else if (data.Status !== 0 && data.Status !== undefined)
      errorStr = "DNS Error (Status: " + data.Status + ")";
    return {
      resolver: resolverName,
      duration: Date.now() - started,
      answers: data.Answer || [],
      error: errorStr,
    };
  } catch (err) {
    clearTimeout(tid);
    return {
      resolver: resolverName,
      duration: Date.now() - started,
      answers: [],
      error: err.name === "AbortError" ? "Timeout exceeded" : err.message,
    };
  }
}

// ===== CONSENSUS =====
// Mirrors normalizeAnswer() in src/lib/dns.ts so the app and the API agree on
// what counts as the same answer. Cloudflare quotes TXT strings where Google
// returns them bare, and names may differ in case or a trailing dot.
const QUOTED_TXT = /^"(?:[^"\\]|\\.)*"(?:\s+"(?:[^"\\]|\\.)*")*$/;

function normalizeAnswer(data, type) {
  const value = String(data ?? "").trim();
  if (type === "TXT" || type === "SPF") {
    if (!QUOTED_TXT.test(value)) return value;
    return [...value.matchAll(/"((?:[^"\\]|\\.)*)"/g)]
      .map((m) => m[1].replace(/\\(.)/g, "$1"))
      .join("");
  }
  return value.toLowerCase().replace(/(\S)\.(?=\s|$)/g, "$1");
}

function answerSet(result, type) {
  return [...new Set((result.answers || []).map((a) => normalizeAnswer(a.data, type)))]
    .sort()
    .join("|");
}

/**
 * Groups answers by normalized value and works out whether resolvers agree.
 * status: "agree" (every resolver returned the same set), "varies" (A/AAAA
 * differ but every resolver answered, normal for CDNs and geo-DNS), "split"
 * (anything else, including a resolver that failed), or "single" (only one
 * resolver was asked, so there is nothing to compare).
 */
function buildConsensus(arr, type) {
  const groups = new Map();
  for (const r of arr) {
    for (const a of r.answers || []) {
      const key = normalizeAnswer(a.data, type);
      // TXT is shown unquoted and joined, which is also what you want to copy.
      const display = type === "TXT" || type === "SPF" ? key : a.data;
      const group = groups.get(key) || { value: display, confirmedBy: [] };
      if (!group.confirmedBy.includes(r.resolver)) group.confirmedBy.push(r.resolver);
      groups.set(key, group);
    }
  }
  if (!groups.size) return null;

  const total = arr.length;
  const failed = arr.filter((r) => r.error);
  let status = "split";
  if (total === 1) status = "single";
  else if (!failed.length && arr.every((r) => answerSet(r, type) === answerSet(arr[0], type)))
    status = "agree";
  else if (
    (type === "A" || type === "AAAA") &&
    !failed.length &&
    arr.every((r) => (r.answers || []).length)
  )
    status = "varies";

  const values = [...groups.values()].sort((a, b) => b.confirmedBy.length - a.confirmedBy.length);
  return {
    values,
    status,
    total,
    resolvers: arr.map((r) => r.resolver),
    failed: failed.map((r) => ({ resolver: r.resolver, error: r.error })),
  };
}

// ===== SECURITY ANALYSIS =====
function txtValues(results) {
  const values = new Set();
  for (const r of results || []) {
    for (const a of r.answers || []) values.add(normalizeAnswer(a.data, "TXT"));
  }
  return [...values];
}

function analyzeSecurityRecords(dnsData, dmarcResults) {
  const apexTxt = dnsData.TXT ? txtValues(Object.values(dnsData.TXT.resolvers)) : [];
  const spf = apexTxt.filter((v) => /^v=spf1(\s|$)/i.test(v));
  const dmarc = txtValues(dmarcResults).filter((v) => /^v=DMARC1(\s*;|$)/i.test(v));
  let caa = [];
  if (dnsData.CAA) {
    caa = [
      ...new Set(
        Object.values(dnsData.CAA.resolvers).flatMap((rd) => (rd.answers || []).map((a) => a.data)),
      ),
    ];
  }
  return { spf, dmarc, caa };
}

// ===== MAIN LOOKUP =====
async function triggerLookup(inputId) {
  let domain = document.getElementById(inputId).value.trim().toLowerCase();
  if (!domain) return;

  const ipv4Regex =
    /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$/;
  const isIPv6 = domain.includes(":") && /^[0-9a-fA-F:]+$/.test(domain);
  const isValidDomain =
    /^[a-zA-Z0-9¡-￿.-]+\.[a-zA-Z0-9¡-￿]{2,}$/.test(domain) || domain === "localhost";

  if (!ipv4Regex.test(domain) && !isIPv6 && !isValidDomain) {
    showToast('"' + domain + '" is not a domain or IP address', "error");
    return;
  }

  document.getElementById("domainHome").value = domain;
  document.getElementById("domainTop").value = domain;

  document.getElementById("homePage").style.display = "none";
  document.getElementById("resultsPage").classList.add("active");
  document.getElementById("results").innerHTML = "";
  document.getElementById("loading").classList.remove("hidden");
  history.pushState({}, "", "/?domain=" + encodeURIComponent(domain));
  window.scrollTo({ top: 0 });
  addToHistory(domain);

  let lookupTypes = [...userSettings.defaultRecords];
  let dnsQueryName = domain;
  let isReverseSearch = false;

  if (ipv4Regex.test(domain)) {
    isReverseSearch = true;
    dnsQueryName = domain.split(".").reverse().join(".") + ".in-addr.arpa";
    lookupTypes = ["PTR"];
    openIpModal(domain);
  } else if (isIPv6) {
    isReverseSearch = true;
    dnsQueryName = expandIPv6ToArpa(domain);
    lookupTypes = ["PTR"];
    openIpModal(domain);
  }

  if (userSettings.features.enableSecurity && !isReverseSearch && !lookupTypes.includes("CAA")) {
    lookupTypes.push("CAA");
  }

  const activeResolvers = Object.entries(userSettings.resolvers).filter(([_, d]) => d.active);
  if (!activeResolvers.length) {
    document.getElementById("results").innerHTML =
      '<div class="card" style="animation-delay:0s;opacity:1;"><span class="error-badge badge">No active resolvers! Go to settings.</span></div>';
    document.getElementById("loading").classList.add("hidden");
    return;
  }

  // The security card needs TXT (for SPF) even when TXT isn't a displayed type,
  // and DMARC lives at _dmarc.<domain>, not in the domain's own TXT records.
  const wantsSecurity = userSettings.features.enableSecurity && !isReverseSearch;
  const queryTypes = [...lookupTypes];
  if (wantsSecurity && !queryTypes.includes("TXT")) queryTypes.push("TXT");

  document.querySelector("#loading .loader-text").textContent =
    "Querying " +
    activeResolvers.length +
    (activeResolvers.length === 1 ? " resolver" : " resolvers") +
    " for " +
    lookupTypes.join(", ") +
    "…";

  const fetchPromises = [];
  for (const type of queryTypes) {
    for (const [name, data] of activeResolvers) {
      fetchPromises.push(
        queryDNS(dnsQueryName, type, name, data.url).then((result) => ({ type, result })),
      );
    }
  }
  const dmarcPromise = wantsSecurity
    ? Promise.all(
        activeResolvers.map(([name, data]) => queryDNS("_dmarc." + domain, "TXT", name, data.url)),
      )
    : Promise.resolve([]);

  let whoisPromise = null;
  let historyPromise = null;
  let sslPromise = null;

  if (userSettings.features.enableSsl && !isReverseSearch && !isSubdomain(domain)) {
    sslPromise = fetch(
      "/ssl/" + domain + "?provider=" + encodeURIComponent(userSettings.advanced.sslProvider),
    )
      .then((r) => (r.ok ? r.json() : { error: "HTTP " + r.status }))
      .catch((e) => ({ error: e.message }));
  }

  if (userSettings.features.enableWhois && !isReverseSearch && !isSubdomain(domain)) {
    let rdapUrl = userSettings.advanced.rdapServer;
    if (!rdapUrl.endsWith("/")) rdapUrl += "/";
    whoisPromise = fetch(rdapUrl + domain, {
      headers: { accept: "application/rdap+json, application/json" },
    })
      .then((r) => (r.ok ? r.json() : { error: "HTTP " + r.status }))
      .catch((e) => ({ error: e.message }));
  } else {
    whoisPromise = Promise.resolve(null);
  }

  if (userSettings.advanced.historyKey && !isReverseSearch && !isSubdomain(domain)) {
    historyPromise = fetch(
      "/history/" + domain + "?apikey=" + encodeURIComponent(userSettings.advanced.historyKey),
    )
      .then((r) => (r.ok ? r.json() : { error: "HTTP " + r.status }))
      .catch((e) => ({ error: e.message }));
  }

  const [allResults, dmarcResults] = await Promise.all([Promise.all(fetchPromises), dmarcPromise]);

  const finalResults = {};
  for (const item of allResults) {
    if (!finalResults[item.type]) finalResults[item.type] = { resolvers: {}, rawArray: [] };
    finalResults[item.type].resolvers[item.result.resolver] = item.result;
    finalResults[item.type].rawArray.push(item.result);
  }

  for (const type of queryTypes) {
    if (finalResults[type]) {
      finalResults[type].consensus = buildConsensus(finalResults[type].rawArray, type);
      delete finalResults[type].rawArray;
    }
  }

  latestData = {
    domain,
    timestamp: new Date().toISOString(),
    isReverseSearch,
    dns: finalResults,
    dmarc: wantsSecurity ? dmarcResults : undefined,
    whois: null,
  };
  document.getElementById("loading").classList.add("hidden");
  renderResults(finalResults, null, lookupTypes, domain, isReverseSearch, dmarcResults);
  if (!isReverseSearch && isSubdomain(domain)) renderSkippedNotice(domain);

  if (whoisPromise) {
    whoisPromise.then((whoisResult) => {
      if (whoisResult) {
        latestData.whois = whoisResult;
        renderWhoisCard(whoisResult, domain);
      }
    });
  }

  if (historyPromise) {
    historyPromise.then((historyResult) => {
      if (historyResult) {
        latestData.history = historyResult;
        renderHistoryCard(historyResult, domain);
      }
    });
  }

  if (sslPromise) {
    sslPromise.then((sslResult) => {
      if (sslResult) {
        latestData.ssl = sslResult;
        renderSslCard(sslResult, domain);
      }
    });
  }
}

// ===== RENDER =====
// Best guess at the registered domain: the last two labels, or three for
// short second-level labels under a country code (example.co.uk).
function registeredDomain(domain) {
  const parts = domain.split(".");
  const n = parts.length;
  const ccSld = n > 2 && parts[n - 1].length === 2 && parts[n - 2].length <= 3;
  return parts.slice(ccSld ? -3 : -2).join(".");
}

// WHOIS, SSL and history only run on registered domains. Say so instead of
// leaving the operator to wonder whether they ran at all.
function renderSkippedNotice(domain) {
  const skipped = [];
  if (userSettings.features.enableWhois) skipped.push("WHOIS");
  if (userSettings.features.enableSsl) skipped.push("certificates");
  if (userSettings.advanced.historyKey) skipped.push("DNS history");
  if (!skipped.length) return;
  const parent = registeredDomain(domain);
  const list =
    skipped.length === 1
      ? skipped[0]
      : skipped.slice(0, -1).join(", ") + " and " + skipped[skipped.length - 1];
  const note = document.createElement("div");
  note.className = "skipped-note";
  note.innerHTML =
    '<span class="material-symbols-rounded" aria-hidden="true">info</span><span>' +
    esc(list) +
    (skipped.length === 1 ? " is" : " are") +
    " looked up for registered domains only, so " +
    (skipped.length === 1 ? "it was" : "they were") +
    " skipped for " +
    esc(domain) +
    ". " +
    '<button class="link-btn" data-action="lookup" data-value="' +
    esc(parent) +
    '">Look up ' +
    esc(parent) +
    "</button></span>";
  const header = document.querySelector("#results .domain-header");
  if (header) header.after(note);
}

const AGREEMENT_ICON = { agree: "check_circle", varies: "info", split: "warning", single: "dns" };

function agreementLabel(c) {
  if (c.status === "single") return "1 resolver";
  if (c.status === "agree") return c.total + "/" + c.total + " resolvers agree";
  if (c.status === "varies") return "Addresses differ by resolver";
  return "Resolvers disagree";
}

function agreementTitle(c) {
  if (c.status === "varies")
    return "Every resolver answered, with different addresses. Normal for CDNs and geo-DNS.";
  if (c.status === "single") return "Only one resolver is active, so there is nothing to compare.";
  return "";
}

// "2/2 · Cloudflare, Google" for a value every resolver returned;
// "1/2 · Cloudflare · not from Google" for one only some returned.
function valueMeta(cv, c) {
  const all = cv.confirmedBy.length === c.total;
  const missing = c.resolvers.filter((r) => !cv.confirmedBy.includes(r));
  const kind = all ? "full" : c.status === "varies" ? "expected" : "partial";
  const icon = all ? "check_circle" : kind === "expected" ? "info" : "warning";
  return (
    '<div class="consensus-meta ' +
    kind +
    '"><span class="material-symbols-rounded" aria-hidden="true">' +
    icon +
    "</span>" +
    cv.confirmedBy.length +
    "/" +
    c.total +
    " · " +
    esc(cv.confirmedBy.join(", ")) +
    (missing.length ? " · not from " + esc(missing.join(", ")) : "") +
    "</div>"
  );
}

const SECURITY_ICON = {
  found: "check_circle",
  missing: "cancel",
  warn: "warning",
  neutral: "info",
};

// state: found | missing | warn | neutral. `record` is shown with a Copy button.
function securityItem(label, state, status, note, record) {
  return (
    '<div class="security-item ' +
    state +
    '"><div class="label">' +
    esc(label) +
    '</div><div class="status"><span class="material-symbols-rounded" aria-hidden="true">' +
    SECURITY_ICON[state] +
    "</span>" +
    esc(status) +
    "</div>" +
    (note ? '<div class="note">' + esc(note) + "</div>" : "") +
    (record
      ? '<div style="margin-top:8px; display:flex; justify-content:flex-end;"><button class="copy-btn" data-action="copy" data-value="' +
        esc(record) +
        '">Copy</button></div><pre style="font-size:11px;margin-top:4px;padding:10px;">' +
        esc(record) +
        "</pre>"
      : "") +
    "</div>"
  );
}

function renderResults(dnsData, whoisData, typesRendered, domain, isReverse, dmarcResults) {
  const container = document.getElementById("results");
  container.innerHTML = "";
  let delayIndex = 0;
  const ipv4Regex =
    /\b(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;

  function ipLink(ip) {
    return '<span class="ip-link" data-action="ip" data-value="' + ip + '">' + ip + "</span>";
  }

  // Escapes first, then links IPs. The patterns only match digits, hex,
  // dots and colons, so the inserted markup can't pick up untrusted text.
  function linkifyIPs(str) {
    let linked = esc(str).replace(ipv4Regex, (m) => ipLink(m));
    linked = linked.replace(
      /&quot;([0-9a-fA-F:]+:[0-9a-fA-F:]+)&quot;/g,
      (m, p1) => "&quot;" + ipLink(p1) + "&quot;",
    );
    return linked;
  }

  function appendCard(html) {
    const card = document.createElement("div");
    card.className = "card";
    card.style.animationDelay = delayIndex * 0.08 + "s";
    card.innerHTML = html;
    container.appendChild(card);
    delayIndex++;
  }

  // Domain Header
  const hdr = document.createElement("div");
  hdr.className = "domain-header";
  hdr.innerHTML = "<h2>" + esc(domain) + "</h2>";
  container.appendChild(hdr);

  // Record Overview Pills removed as requested

  // DNS Record Cards
  for (const type of typesRendered) {
    const section = dnsData[type];
    if (!section) continue;

    const c = section.consensus;
    let html =
      '<div class="card-header"><div class="card-title"><span class="type-badge">' +
      esc(type) +
      "</span> Record</div>" +
      (c
        ? '<span class="agreement ' +
          c.status +
          '"' +
          (agreementTitle(c) ? ' title="' + esc(agreementTitle(c)) + '"' : "") +
          '><span class="material-symbols-rounded" aria-hidden="true">' +
          AGREEMENT_ICON[c.status] +
          "</span>" +
          esc(agreementLabel(c)) +
          "</span>"
        : "") +
      "</div>";

    if (c && c.values && c.values.length) {
      html += '<div class="consensus">';
      for (let i = 0; i < c.values.length; i++) {
        const cv = c.values[i];
        const value = String(cv.value);
        // Only values that are entirely an IP address become links; anything
        // else (TXT with a colon, for instance) stays plain escaped text.
        const isIp =
          new RegExp("^" + ipv4Regex.source + "$").test(value) ||
          /^[0-9a-fA-F:]+:[0-9a-fA-F:]+$/.test(value);
        const displayVal = isIp ? ipLink(value) : esc(value);
        html +=
          '<div class="consensus-row">' +
          '<div class="consensus-value">' +
          displayVal +
          "</div>" +
          '<button class="copy-btn" data-action="copy" data-value="' +
          esc(value) +
          '">Copy</button></div>' +
          valueMeta(cv, c);
        if (i < c.values.length - 1) html += '<div class="consensus-divider"></div>';
      }
      for (const f of c.failed) {
        html +=
          '<div class="consensus-failure"><span class="material-symbols-rounded" aria-hidden="true">error</span>' +
          esc(f.resolver) +
          " failed: " +
          esc(f.error) +
          "</div>";
      }
      html += "</div>";
    } else {
      const errors = [];
      for (const resName in section.resolvers) {
        if (section.resolvers[resName].error) errors.push(section.resolvers[resName].error);
      }
      if (errors.length > 0) {
        const errorMap = {};
        for (const e of errors) {
          errorMap[e] = (errorMap[e] || 0) + 1;
        }
        const sortedErrors = Object.entries(errorMap).sort((a, b) => b[1] - a[1]);
        const commonError = sortedErrors[0][0];
        html +=
          '<div style="margin-top: 12px;"><span class="error-badge badge" style="font-size: 13px; padding: 6px 12px;">' +
          esc(commonError) +
          "</span></div>";
      } else {
        html +=
          '<div class="small" style="margin-top: 10px; color: var(--text-muted);">No ' +
          esc(type) +
          " records</div>";
      }
    }

    html +=
      '<details id="record-' +
      esc(type) +
      '"><summary><span class="material-symbols-rounded chevron">chevron_right</span> Resolver Details</summary>';
    for (const resName in section.resolvers) {
      const rd = section.resolvers[resName];
      html +=
        '<div class="resolver-result"><div class="resolver-header">' +
        '<div class="resolver-name">' +
        esc(resName) +
        "</div>";
      if (rd.error) {
        html += '<span class="badge error-badge">' + esc(rd.error) + "</span>";
      } else {
        html += '<div style="display:flex;gap:8px;align-items:center;">';
        html +=
          '<button class="copy-btn" data-action="copy" data-value="' +
          esc(JSON.stringify(rd.answers, null, 2)) +
          '">Copy JSON</button>';
        html +=
          '<span class="resolver-timing ' +
          getTimingClass(rd.duration) +
          '">' +
          rd.duration +
          "ms</span>";
        html += "</div>";
      }
      html += "</div>";
      if (!rd.error && rd.answers.length) {
        html += "<pre>" + linkifyIPs(JSON.stringify(rd.answers, null, 2)) + "</pre>";
      } else if (!rd.error) {
        html += "<pre>No records</pre>";
      }
      html += "</div>";
    }
    html += "</details>";
    appendCard(html);
  }

  // Security Analysis
  if (userSettings.features.enableSecurity && !isReverse) {
    const sec = analyzeSecurityRecords(dnsData, dmarcResults);
    const dmarcName = "_dmarc." + domain;
    const dmarcPolicy = sec.dmarc.length ? (sec.dmarc[0].match(/\bp=([a-z]+)/i) || [])[1] : null;
    let secHtml =
      '<div class="card-header"><div class="card-title"><span class="type-badge"><span class="material-symbols-rounded" style="font-size:16px;" aria-hidden="true">security</span></span> Security Analysis</div></div>';
    secHtml += '<div class="security-grid">';

    if (sec.spf.length === 1) secHtml += securityItem("SPF", "found", "Found", "", sec.spf[0]);
    else if (sec.spf.length > 1)
      secHtml += securityItem(
        "SPF",
        "warn",
        sec.spf.length + " SPF records",
        "Receivers treat more than one as an error (permerror). Merge them into one.",
        sec.spf.join("\n"),
      );
    else secHtml += securityItem("SPF", "missing", "No SPF record", "", null);

    if (sec.dmarc.length)
      secHtml += securityItem(
        "DMARC",
        dmarcPolicy && dmarcPolicy.toLowerCase() === "none" ? "warn" : "found",
        "Found" + (dmarcPolicy ? " · p=" + dmarcPolicy : ""),
        dmarcPolicy && dmarcPolicy.toLowerCase() === "none"
          ? "Monitoring only: failing mail is still delivered."
          : "",
        sec.dmarc[0],
      );
    else if (isSubdomain(domain))
      secHtml += securityItem(
        "DMARC",
        "neutral",
        "None at " + dmarcName,
        "The policy at _dmarc." +
          registeredDomain(domain) +
          " applies to subdomains unless sp= says otherwise.",
        null,
      );
    else secHtml += securityItem("DMARC", "missing", "No record at " + dmarcName, "", null);

    secHtml += securityItem(
      "DKIM",
      "neutral",
      "Needs a selector",
      "DKIM keys live at <selector>._domainkey." +
        domain +
        ". Selectors can't be listed from DNS; find one in a message's DKIM-Signature header (s=).",
      null,
    );

    if (sec.caa.length)
      secHtml += securityItem(
        "CAA",
        "found",
        sec.caa.length === 1 ? "1 record" : sec.caa.length + " records",
        "",
        sec.caa.join("\n"),
      );
    else
      secHtml += securityItem(
        "CAA",
        "neutral",
        "None",
        "Any certificate authority may issue for this domain.",
        null,
      );

    secHtml += "</div>";
    appendCard(secHtml);
  }

  // WHOIS Render Placeholder handled async
}

function renderWhoisCard(whoisData, domain) {
  if (!whoisData || !userSettings.features.enableWhois) return;
  const container = document.getElementById("results");
  let html =
    '<div class="card-header"><div class="card-title"><span class="type-badge"><span class="material-symbols-rounded" style="font-size:16px;">contact_page</span></span> WHOIS / RDAP</div></div>';
  if (whoisData.error) {
    if (whoisData.error === "Skipped") return;
    html +=
      '<div class="small" style="color:var(--text-muted);">' + esc(whoisData.error) + "</div>";
  } else {
    const name = whoisData.ldhName || whoisData.handle || domain;
    const status = (whoisData.status || []).join(", ") || "Unknown";
    const events = whoisData.events || [];
    const reg = events.find((e) => e.eventAction === "registration");
    const exp = events.find((e) => e.eventAction === "expiration");
    const upd = events.find((e) => e.eventAction === "last changed");
    const nameservers = (whoisData.nameservers || [])
      .map((ns) => ns.ldhName || ns.objectClassName)
      .filter(Boolean);
    const entities = whoisData.entities || [];
    const registrar = entities.find((e) => (e.roles || []).includes("registrar"));
    const registrarName =
      registrar && registrar.vcardArray
        ? (registrar.vcardArray[1] || []).find((v) => v[0] === "fn")?.[3]
        : null;

    html += '<div class="whois-grid">';
    html += '<span class="wlabel">Domain</span><span class="wvalue">' + esc(name) + "</span>";
    if (registrarName)
      html +=
        '<span class="wlabel">Registrar</span><span class="wvalue">' +
        esc(registrarName) +
        "</span>";
    html +=
      '<span class="wlabel">Status</span><span class="wvalue" style="font-size:12px;">' +
      esc(status) +
      "</span>";
    if (reg)
      html +=
        '<span class="wlabel">Registered</span><span class="wvalue">' +
        new Date(reg.eventDate).toLocaleDateString() +
        "</span>";
    if (exp)
      html +=
        '<span class="wlabel">Expires</span><span class="wvalue">' +
        new Date(exp.eventDate).toLocaleDateString() +
        "</span>";
    if (upd)
      html +=
        '<span class="wlabel">Updated</span><span class="wvalue">' +
        new Date(upd.eventDate).toLocaleDateString() +
        "</span>";
    if (nameservers.length)
      html +=
        '<span class="wlabel">Nameservers</span><span class="wvalue">' +
        esc(nameservers.join(", ")) +
        "</span>";
    html += "</div>";

    html +=
      '<details style="margin-top:16px;">' +
      '<summary><span class="material-symbols-rounded chevron">chevron_right</span> Raw RDAP JSON' +
      (whoisData._latency
        ? ' <span style="font-size:12px;opacity:0.5;font-weight:normal;margin-left:8px;">(' +
          esc(whoisData._latency) +
          "ms)</span>"
        : "") +
      "</summary>" +
      '<div style="display:flex; justify-content:flex-end; margin-bottom:-20px; position:relative; z-index:10; padding-right:10px; margin-top:10px;">' +
      '<button class="copy-btn" data-action="copy" data-value="' +
      esc(JSON.stringify(whoisData, null, 2)) +
      '">Copy JSON</button></div>' +
      "<pre>" +
      esc(JSON.stringify(whoisData, null, 2)) +
      "</pre></details>";
  }
  const card = document.createElement("div");
  card.className = "card";
  card.style.animationDelay = "0s";
  card.innerHTML = html;
  container.appendChild(card);
}

function renderHistoryCard(historyData, domain) {
  if (!historyData || !userSettings.advanced.historyKey) return;
  const container = document.getElementById("results");
  if (!container) return;

  let html =
    '<div class="card-header"><div class="card-title"><span class="type-badge"><span class="material-symbols-rounded" style="font-size:16px;">history</span></span> DNS History (A Records)</div></div>';
  if (historyData.error || !historyData.records || historyData.records.length === 0) {
    html +=
      '<div class="small" style="color:var(--text-muted);">' +
      esc(historyData.error || "No historical records found.") +
      "</div>";
  } else {
    html += '<div class="whois-grid">';
    let records = historyData.records.slice(0, 10); // Show max 10
    for (const rec of records) {
      let ip = rec.values ? rec.values.map((v) => v.ip).join(", ") : "Unknown";
      let date = rec.first_seen ? new Date(rec.first_seen).toLocaleDateString() : "Unknown Date";
      html +=
        '<span class="wlabel">' + esc(date) + '</span><span class="wvalue">' + esc(ip) + "</span>";
    }
    html += "</div>";

    html +=
      '<details style="margin-top:16px;">' +
      '<summary><span class="material-symbols-rounded chevron">chevron_right</span> Raw History JSON</summary>' +
      '<div style="display:flex; justify-content:flex-end; margin-bottom:-20px; position:relative; z-index:10; padding-right:10px; margin-top:10px;">' +
      '<button class="copy-btn" data-action="copy" data-value="' +
      esc(JSON.stringify(historyData, null, 2)) +
      '">Copy JSON</button></div>' +
      "<pre>" +
      esc(JSON.stringify(historyData, null, 2)) +
      "</pre></details>";
  }
  const card = document.createElement("div");
  card.className = "card";
  card.style.animationDelay = "0s";
  card.innerHTML = html;
  container.appendChild(card);
}

function renderSslCard(sslData, domain) {
  if (!sslData || !userSettings.features.enableSsl) return;
  const container = document.getElementById("results");
  if (!container) return;

  let html =
    '<div class="card-header"><div class="card-title"><span class="type-badge"><span class="material-symbols-rounded" style="font-size:16px;">lock</span></span> SSL Certificates</div></div>';
  if (sslData.error || (Array.isArray(sslData) && sslData.length === 0)) {
    html +=
      '<div class="small" style="color:var(--text-muted);">' +
      esc(sslData.error || "No SSL certificates found.") +
      "</div>";
  } else {
    html += '<div style="display:grid; gap:12px;">';
    let records = Array.isArray(sslData) ? sslData.slice(0, 10) : [];
    for (const rec of records) {
      let subjects = rec.dns_names
        ? rec.dns_names.join(", ")
        : (rec.name_value || "Unknown").replace(/\n/g, ", ");
      let notBefore = rec.not_before
        ? new Date(rec.not_before).toLocaleDateString()
        : "Unknown Date";
      let notAfter = rec.not_after ? new Date(rec.not_after).toLocaleDateString() : "Unknown Date";
      let issuer = rec.issuer_name || (rec.issuer && rec.issuer.name) || "Unknown Issuer";
      if (issuer.includes("CN=")) issuer = issuer.split("CN=")[1].split(",")[0];
      else if (issuer.includes("O=")) issuer = issuer.split("O=")[1].split(",")[0];

      html += '<div class="consensus" style="margin-bottom:0; padding:12px;">';
      html +=
        '<div style="font-weight:bold; font-family:var(--font-mono); margin-bottom:4px; word-break:break-all;">' +
        esc(subjects) +
        "</div>";
      html +=
        '<div class="small" style="color:var(--text-muted); display:flex; gap:16px; flex-wrap:wrap;">';
      html += "<span><strong>Issuer:</strong> " + esc(issuer) + "</span>";
      html += "<span><strong>Valid:</strong> " + esc(notBefore) + " - " + esc(notAfter) + "</span>";
      html += "</div></div>";
    }
    html += "</div>";
    html +=
      '<details style="margin-top:16px;">' +
      '<summary><span class="material-symbols-rounded chevron">chevron_right</span> Raw SSL JSON</summary>' +
      '<div style="display:flex; justify-content:flex-end; margin-bottom:-20px; position:relative; z-index:10; padding-right:10px; margin-top:10px;">' +
      '<button class="copy-btn" data-action="copy" data-value="' +
      esc(JSON.stringify(sslData, null, 2)) +
      '">Copy JSON</button></div>' +
      "<pre>" +
      esc(JSON.stringify(sslData, null, 2)) +
      "</pre></details>";
  }
  const card = document.createElement("div");
  card.className = "card";
  card.style.animationDelay = "0s";
  card.innerHTML = html;
  container.appendChild(card);
}

function scrollToRecord(type) {
  const el = document.getElementById("record-" + type);
  if (el) {
    const card = el.closest(".card");
    if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// ===== IP MODAL =====
async function openIpModal(ip) {
  document.getElementById("ipModal").classList.remove("hidden");
  document.getElementById("modalTitle").innerText = ip;
  document.getElementById("modalDetails").textContent =
    "Looking up the network owner via ipinfo.io…";
  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
  }
  try {
    const res = await fetch("https://ipinfo.io/" + encodeURIComponent(ip) + "/json");
    const data = await res.json();
    document.getElementById("modalDetails").innerHTML =
      '<div class="modal-detail-grid">' +
      '<span class="label">Organization</span><span class="value">' +
      esc(data.org || "Unknown") +
      "</span>" +
      '<span class="label">Location</span><span class="value">' +
      esc((data.city || "?") + ", " + (data.region || "?") + ", " + (data.country || "?")) +
      "</span>" +
      '<span class="label">Hostname</span><span class="value">' +
      esc(data.hostname || "N/A") +
      "</span>" +
      '<span class="label">Timezone</span><span class="value">' +
      esc(data.timezone || "Unknown") +
      "</span>" +
      '<span class="label">Postal</span><span class="value">' +
      esc(data.postal || "N/A") +
      "</span>" +
      "</div>";
    if (data.loc) {
      const [lat, lng] = data.loc.split(",").map(parseFloat);
      leafletMap = L.map("map").setView([lat, lng], 10);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(leafletMap);
      L.marker([lat, lng]).addTo(leafletMap);
    }
  } catch (err) {
    document.getElementById("modalDetails").innerText = "Failed to load IP info.";
  }
}

// ===== EXPORT =====
function exportResultJSON() {
  if (!latestData) {
    showToast("No results to export", "error");
    return;
  }
  const blob = new Blob([JSON.stringify(latestData, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = latestData.domain + "_lookup.json";
  a.click();
  showToast("Results exported", "success");
}

// ===== INIT =====
loadSettings();
const path = window.location.pathname;
const params = new URLSearchParams(location.search);
let domainToLookup = params.get("domain");

if (path.startsWith("/ip/") || path === "/ip") {
  domainToLookup = path.replace(/^\/ip\/?/, "") || params.get("domain");
  userSettings.defaultRecords = ["A", "AAAA"];
  userSettings.features.enableWhois = false;
  userSettings.features.enableSecurity = false;
} else if (path.startsWith("/ipv4/") || path === "/ipv4") {
  domainToLookup = path.replace(/^\/ipv4\/?/, "") || params.get("domain");
  userSettings.defaultRecords = ["A"];
  userSettings.features.enableWhois = false;
  userSettings.features.enableSecurity = false;
} else if (path.startsWith("/ipv6/") || path === "/ipv6") {
  domainToLookup = path.replace(/^\/ipv6\/?/, "") || params.get("domain");
  userSettings.defaultRecords = ["AAAA"];
  userSettings.features.enableWhois = false;
  userSettings.features.enableSecurity = false;
} else if (path.startsWith("/whois/") || path === "/whois") {
  domainToLookup = path.replace(/^\/whois\/?/, "") || params.get("domain");
  userSettings.defaultRecords = [];
  userSettings.features.enableWhois = true;
  userSettings.features.enableSecurity = false;
  userSettings.features.enableSsl = false;
} else if (path.startsWith("/ssl/") || path === "/ssl") {
  domainToLookup = path.replace(/^\/ssl\/?/, "") || params.get("domain");
  userSettings.defaultRecords = [];
  userSettings.features.enableWhois = false;
  userSettings.features.enableSecurity = false;
  userSettings.features.enableSsl = true;
} else if (path.startsWith("/security/") || path === "/security") {
  domainToLookup = path.replace(/^\/security\/?/, "") || params.get("domain");
  userSettings.defaultRecords = ["TXT", "CAA"];
  userSettings.features.enableWhois = false;
  userSettings.features.enableSecurity = true;
  userSettings.features.enableSsl = false;
}

if (
  !domainToLookup &&
  (path === "/ip" ||
    path === "/ipv4" ||
    path === "/ipv6" ||
    path === "/whois" ||
    path === "/ssl" ||
    path === "/security")
) {
  let titleStr = "IP-Lookup";
  if (path === "/ipv4") titleStr = "IPv4-Lookup";
  if (path === "/ipv6") titleStr = "IPv6-Lookup";
  if (path === "/whois") titleStr = "WHOIS-Lookup";
  if (path === "/ssl") titleStr = "SSL-Lookup";
  if (path === "/security") titleStr = "Security-Lookup";
  document.title = titleStr;
  document.querySelector("h1").innerText = titleStr;
  const btn = document.querySelector(".toolbar button");
  btn.innerText = "Search";
  const input = document.getElementById("domainHome");
  const go = () => {
    window.location.href = path + "/" + encodeURIComponent(input.value.trim());
  };
  btn.onclick = go;
  input.onkeydown = (e) => {
    if (e.key === "Enter") go();
  };
}

if (domainToLookup) {
  document.getElementById("domainHome").value = domainToLookup;
  triggerLookup("domainHome");
}

// Initialize Sortable for drag-and-drop
if (typeof Sortable !== "undefined") {
  new Sortable(document.getElementById("results"), {
    animation: 150,
    handle: ".card-header",
    ghostClass: "sortable-ghost",
    delay: 50,
    delayOnTouchOnly: true,
  });
}
