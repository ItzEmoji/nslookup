// ===== GLOBALS =====
let latestData = null;
let leafletMap = null;
let queryHistory = JSON.parse(localStorage.getItem("lookup_history") || "[]");

const defaultSettings = {
  appearance: "system",
  resolvers: {
    Cloudflare: { url: "https://cloudflare-dns.com/dns-query", active: true },
    Google: { url: "https://dns.google/resolve", active: true },
  },
  features: { animations: true, enableWhois: false, enableSecurity: true, enableSsl: false },
  advanced: {
    rdapServer: "https://rdap.org/domain/",
    timeout: 5000,
    sslProvider: "certspotter",
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
    const input =
      currentView === "home"
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
    const modalOpen = document.querySelector(".modal-overlay:not(.hidden)");
    closeModal("ipModal");
    closeModal("helpModal");
    toggleSidebar(false);
    if (!modalOpen) closeSettings();
  }
});

// ===== VIEWS =====
// One page with three views: the overview, a lookup's results and settings.
let currentView = "home";
let viewBeforeSettings = "home";

function showView(name) {
  currentView = name;
  const views = { home: "homePage", results: "resultsPage", settings: "settingsPage" };
  for (const [view, id] of Object.entries(views)) {
    document.getElementById(id).classList.toggle("hidden", view !== name);
  }
  for (const el of document.querySelectorAll("[data-nav]")) {
    if (el.dataset.nav === name) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  }
  const hasReport = !!document.getElementById("sideSections").innerHTML;
  document
    .getElementById("sideReport")
    .classList.toggle("hidden", name !== "results" || !hasReport);
  toggleSidebar(false);
}

// The sidebar is a drawer below 900px.
function toggleSidebar(force) {
  const sidebar = document.getElementById("sidebar");
  const open = force === undefined ? !sidebar.classList.contains("open") : force;
  sidebar.classList.toggle("open", open);
  document.getElementById("scrim").classList.toggle("show", open);
  document.getElementById("menuBtn").setAttribute("aria-expanded", String(open));
}

document.addEventListener("click", (e) => {
  if (e.target.closest(".sidebar a, .sidebar button")) toggleSidebar(false);
});

// ===== ICONS =====
// Inline SVG symbols defined at the top of index.html.
function icon(name) {
  return '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
}

// Status badges: fail (red), warn (amber), note (grey), ok (green).
const BADGE_ICON = { fail: "error", warn: "warn", note: "info", ok: "check" };
function badge(kind, text) {
  return '<span class="badge badge-' + kind + '">' + icon(BADGE_ICON[kind]) + esc(text) + "</span>";
}

// ===== TOAST =====
function showToast(msg, type) {
  const c = document.getElementById("toastContainer");
  const t = document.createElement("div");
  t.className = "toast" + (type ? " " + type : "");
  t.innerHTML =
    icon(type === "success" ? "check" : type === "error" ? "error" : "info") +
    "<span>" +
    esc(msg) +
    "</span>";
  c.appendChild(t);
  setTimeout(() => {
    t.classList.add("leaving");
    setTimeout(() => t.remove(), 200);
  }, 2500);
}

// ===== MODAL =====
function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}

function openShortcuts() {
  document.getElementById("helpModal").classList.remove("hidden");
}

// ===== SETTINGS PAGE =====
function openSettings() {
  if (currentView === "settings") return;
  viewBeforeSettings = currentView;
  showView("settings");
  window.scrollTo({ top: 0 });
}
function closeSettings() {
  if (currentView !== "settings") return;
  showView(viewBeforeSettings);
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
      userSettings.appearance = ["light", "dark"].includes(p.appearance) ? p.appearance : "system";
      userSettings.resolvers = p.resolvers || defaultSettings.resolvers;
      userSettings.features = { ...defaultSettings.features, ...(p.features || {}) };
      userSettings.advanced = { ...defaultSettings.advanced, ...(p.advanced || {}) };
      userSettings.defaultRecords = p.defaultRecords || defaultSettings.defaultRecords;
    } catch (e) {
      console.error("Error loading settings");
    }
  }

  document.getElementById("setAnimations").checked = userSettings.features.animations;
  document.getElementById("setWhois").checked = userSettings.features.enableWhois;
  document.getElementById("setSecurity").checked = userSettings.features.enableSecurity !== false;
  document.getElementById("setSsl").checked = userSettings.features.enableSsl === true;
  document.getElementById("setRdapServer").value = userSettings.advanced.rdapServer;
  document.getElementById("setTimeout").value = userSettings.advanced.timeout;
  document.getElementById("setSslProvider").value =
    userSettings.advanced.sslProvider || "certspotter";

  applyAppearance(userSettings.appearance);
  toggleBodyAnimations();
  renderRecordSettings();
  renderSettingsResolvers();
  renderHistory();
  renderHomeNote();
  renderHomeChecks();
}

function saveSettings() {
  localStorage.setItem("lookup_settings", JSON.stringify(userSettings));
}
function toggleSetting(cat, key, val) {
  userSettings[cat][key] = val;
  saveSettings();
  if (key === "animations") toggleBodyAnimations();
  renderHomeChecks();
}
function updateSettingText(cat, key, val) {
  if (val !== undefined && val !== "") {
    userSettings[cat][key] = val;
    saveSettings();
    renderHomeChecks();
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
// "system" follows prefers-color-scheme; light and dark pin the theme.
function applyAppearance(mode) {
  const root = document.documentElement;
  if (mode === "light" || mode === "dark") root.dataset.theme = mode;
  else delete root.dataset.theme;
  for (const input of document.querySelectorAll('input[name="appearance"]')) {
    input.checked = input.value === mode;
  }
  userSettings.appearance = mode;
  saveSettings();
}

function isDarkTheme() {
  const pinned = document.documentElement.dataset.theme;
  if (pinned) return pinned === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Top bar button: flip to the opposite of what is on screen and pin it.
function toggleTheme() {
  applyAppearance(isDarkTheme() ? "light" : "dark");
}

// The curl command that returns the same lookup from the API.
function curlFor(domain) {
  return "curl " + location.origin + "/" + domain;
}

// One line under the home search naming the resolvers that will be asked.
function renderHomeNote() {
  const curl = document.getElementById("homeCurl");
  if (curl) curl.textContent = curlFor("example.com");
  const active = Object.entries(userSettings.resolvers)
    .filter(([_, d]) => d.active)
    .map(([name]) => name);
  const note = document.getElementById("homeNote");
  if (!note) return;
  if (!active.length) {
    note.textContent = "No resolvers are active. Turn one on in Settings.";
    return;
  }
  const names =
    active.length === 1
      ? active[0]
      : active.slice(0, -1).join(", ") + " and " + active[active.length - 1];
  note.textContent =
    active.length === 1
      ? "Asks " + names + "."
      : "Asks " + names + " in parallel and shows where they agree.";
}

// "What a lookup checks" on the overview, reflecting the current settings.
function renderHomeChecks() {
  const el = document.getElementById("homeChecks");
  if (!el) return;
  const active = Object.entries(userSettings.resolvers)
    .filter(([_, d]) => d.active)
    .map(([name]) => name);
  const f = userSettings.features;
  const provider = userSettings.advanced.sslProvider === "crt.sh" ? "crt.sh" : "CertSpotter";
  const items = [
    [
      "globe",
      "DNS records",
      (userSettings.defaultRecords || []).join(", ") +
        (active.length ? " from " + active.join(", ") : " (no active resolver)"),
      active.length > 0,
    ],
    ["mail", "Mail", "SPF, DMARC and DKIM, from TXT records", f.enableSecurity !== false],
    ["registry", "Registry", "RDAP via " + rdapSource(), f.enableWhois],
    ["lock", "Certificates", "Certificate Transparency logs via " + provider, f.enableSsl === true],
  ];
  el.innerHTML =
    '<ul class="check-list">' +
    items
      .map(
        ([ic, title, desc, on]) =>
          '<li class="' +
          (on ? "" : "off") +
          '">' +
          icon(ic) +
          '<div class="check-text"><strong>' +
          esc(title) +
          "</strong><span>" +
          esc(desc) +
          '</span></div><span class="dot' +
          (on ? "" : " dot-off") +
          '">' +
          (on ? "On" : "Off") +
          "</span></li>",
      )
      .join("") +
    "</ul>";
}

// ===== RECORD SETTINGS =====
function renderRecordSettings() {
  const c = document.getElementById("recordCheckboxes");
  if (!userSettings.defaultRecords) userSettings.defaultRecords = defaultSettings.defaultRecords;
  c.innerHTML = availableRecords
    .map(
      (r) =>
        '<button type="button" class="selectable-tag" aria-pressed="' +
        userSettings.defaultRecords.includes(r) +
        '" data-action="toggle-record" data-value="' +
        esc(r) +
        '">' +
        esc(r) +
        "</button>",
    )
    .join("");
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
  renderHomeChecks();
}

// ===== RESOLVER SETTINGS =====
let editingResolverName = null;

function renderSettingsResolvers() {
  const c = document.getElementById("resolverList");
  let html = "";
  for (const [name, data] of Object.entries(userSettings.resolvers)) {
    if (editingResolverName === name) {
      // Cloudflare-style in-place edit: the row opens into a small form.
      html +=
        '<div class="resolver-row editing">' +
        '<label class="field"><span>Name</span><input type="text" class="settings-input" id="editResName" value="' +
        esc(name) +
        '"></label>' +
        '<label class="field field-wide"><span>URL</span><input type="text" class="settings-input mono" id="editResUrl" value="' +
        esc(data.url) +
        '"></label>' +
        '<div class="resolver-edit-actions">' +
        '<button class="btn btn-danger" data-action="remove-resolver" data-value="' +
        esc(name) +
        '">' +
        icon("trash") +
        "Delete</button>" +
        '<span class="spacer"></span>' +
        '<button class="btn" onclick="cancelEditResolver()">Cancel</button>' +
        '<button class="btn btn-primary" data-action="save-resolver" data-value="' +
        esc(name) +
        '">Save</button>' +
        "</div></div>";
    } else {
      html +=
        '<div class="resolver-row' +
        (data.active ? " active" : "") +
        '">' +
        '<label class="toggle-switch"><input type="checkbox" ' +
        (data.active ? "checked " : "") +
        'data-action="toggle-resolver" data-value="' +
        esc(name) +
        '" aria-label="Use ' +
        esc(name) +
        '"><span class="toggle-slider"></span></label>' +
        '<div class="resolver-info"><strong>' +
        esc(name) +
        '</strong><span class="mono" title="' +
        esc(data.url) +
        '">' +
        esc(data.url) +
        "</span></div>" +
        '<button class="link-btn" data-action="edit-resolver" data-value="' +
        esc(name) +
        '" aria-label="Edit ' +
        esc(name) +
        '">Edit' +
        icon("chevron") +
        "</button></div>";
    }
  }
  c.innerHTML = html;
  renderHomeNote();
  renderHomeChecks();
}

function toggleAddResolver(force) {
  const form = document.getElementById("resolverAdd");
  const open = force === undefined ? form.classList.contains("hidden") : force;
  form.classList.toggle("hidden", !open);
  if (open) document.getElementById("newResName").focus();
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
    toggleAddResolver(false);
    showToast('"' + n + '" added', "success");
  } else {
    showToast("A resolver needs a name and a URL", "error");
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

function queryKind(q) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(q)) return "IPv4 · reverse";
  if (q.includes(":")) return "IPv6 · reverse";
  return "Domain";
}

function renderHistory() {
  const list = document.getElementById("historyChips");
  const side = document.getElementById("sideRecent");
  document.getElementById("clearHistoryBtn").classList.toggle("hidden", !queryHistory.length);
  document.getElementById("sideRecentGroup").classList.toggle("hidden", !queryHistory.length);

  side.innerHTML = queryHistory
    .slice(0, 5)
    .map(
      (d) =>
        '<button class="side-item" data-action="lookup" data-value="' +
        esc(d) +
        '">' +
        icon("clock") +
        '<span class="side-text mono">' +
        esc(d) +
        "</span></button>",
    )
    .join("");

  if (!queryHistory.length) {
    list.innerHTML =
      '<div class="empty-state">' +
      icon("clock") +
      "<p>No lookups yet</p><span>Domains and IP addresses you look up appear here.</span></div>";
    return;
  }
  list.innerHTML =
    '<table class="table history-table"><caption class="sr-only">Recent lookups</caption><tbody>' +
    queryHistory
      .map(
        (d) =>
          '<tr><td class="h-name"><button class="link-btn mono" data-action="lookup" data-value="' +
          esc(d) +
          '">' +
          esc(d) +
          '</button></td><td class="h-kind">' +
          queryKind(d) +
          '</td><td class="h-actions"><button class="icon-btn" data-action="remove-history" data-value="' +
          esc(d) +
          '" aria-label="Remove ' +
          esc(d) +
          ' from recent" title="Remove">' +
          icon("close") +
          "</button></td></tr>",
      )
      .join("") +
    "</tbody></table>";
}

// ===== NAVIGATION =====
function goHome() {
  showView("home");
  document.getElementById("results").innerHTML = "";
  document.getElementById("sideSections").innerHTML = "";
  document.getElementById("sideReport").classList.add("hidden");
  history.pushState({}, "", "/");
  window.scrollTo({ top: 0 });
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
  "toggle-row": (value, el) => toggleRow(value, el),
  "edit-resolver": (value) => editResolver(value),
  "remove-resolver": (value) => removeResolver(value),
  "save-resolver": (value) => saveEditResolver(value),
  "show-more": (value, el) => {
    const list = document.getElementById(value);
    if (!list) return;
    for (const li of list.querySelectorAll(".val[hidden]")) li.hidden = false;
    list.classList.add("expanded");
    el.remove();
  },
  rerun: () => {
    if (!latestData) return;
    document.getElementById("domainTop").value = latestData.domain;
    triggerLookup("domainTop");
  },
};

// Hovering or focusing a value in the per-resolver comparison lights up the
// same answer in every resolver, so the one that differs stands out.
function linkAnswers(e, on) {
  const cell = e.target.closest && e.target.closest(".a-data");
  if (!cell) return;
  const scope = cell.closest(".answers");
  for (const c of scope.querySelectorAll(".a-data")) {
    if (c.dataset.norm === cell.dataset.norm) c.classList.toggle("match", on);
  }
}
document.addEventListener("mouseover", (e) => linkAnswers(e, true));
document.addEventListener("mouseout", (e) => linkAnswers(e, false));
document.addEventListener("focusin", (e) => linkAnswers(e, true));
document.addEventListener("focusout", (e) => linkAnswers(e, false));

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
    if (btnEl) {
      if (!btnEl.dataset.idle) btnEl.dataset.idle = btnEl.innerHTML;
      btnEl.classList.add("copied");
      btnEl.innerHTML = icon("check") + (btnEl.classList.contains("labelled") ? "Copied" : "");
      clearTimeout(btnEl._copyTimer);
      btnEl._copyTimer = setTimeout(() => {
        btnEl.classList.remove("copied");
        btnEl.innerHTML = btnEl.dataset.idle;
      }, 1500);
    } else showToast("Copied", "success");
  } catch (err) {
    showToast("Couldn't copy to the clipboard", "error");
  }
}

// Icon-only copy button; `label` names what is copied for screen readers.
function copyButton(value, label) {
  return (
    '<button class="copy-btn" data-action="copy" data-value="' +
    esc(value) +
    '" aria-label="Copy ' +
    esc(label) +
    '" title="Copy">' +
    icon("copy") +
    "</button>"
  );
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

  document.getElementById("results").innerHTML = "";
  document.getElementById("sideSections").innerHTML = "";
  document.getElementById("loadingDomain").textContent = domain;
  document.getElementById("loading").classList.remove("hidden");
  document.getElementById("topDropdown").classList.remove("show");
  document.getElementById("homeDropdown").classList.remove("show");
  showView("results");
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

  // CAA is queried for the TLS panel even when it isn't a chosen record type.
  const wantsSecurity = userSettings.features.enableSecurity && !isReverseSearch;
  if (wantsSecurity && !lookupTypes.includes("CAA")) lookupTypes.push("CAA");

  const activeResolvers = Object.entries(userSettings.resolvers).filter(([_, d]) => d.active);
  if (!activeResolvers.length) {
    document.getElementById("results").innerHTML =
      '<section class="card"><div class="panel-note">' +
      icon("warn") +
      '<span>No resolvers are active. <button class="link-btn" onclick="openSettings()">Open settings</button> and turn one on.</span></div></section>';
    document.getElementById("loading").classList.add("hidden");
    return;
  }

  // The mail panel needs TXT (for SPF) even when TXT isn't a displayed type,
  // and DMARC lives at _dmarc.<domain>, not in the domain's own TXT records.
  const queryTypes = [...lookupTypes];
  if (wantsSecurity && !queryTypes.includes("TXT")) queryTypes.push("TXT");

  document.querySelector("#loading .loader-text").textContent =
    "Asking " +
    activeResolvers.map(([name]) => name).join(", ") +
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

  const registered = !isReverseSearch && !isSubdomain(domain);
  let whoisPromise = null;
  let sslPromise = null;

  if (userSettings.features.enableSsl && registered) {
    sslPromise = fetch(
      "/ssl/" + domain + "?provider=" + encodeURIComponent(userSettings.advanced.sslProvider),
    )
      .then((r) => (r.ok ? r.json() : { error: "HTTP " + r.status }))
      .catch((e) => ({ error: e.message }));
  }

  if (userSettings.features.enableWhois && registered) {
    let rdapUrl = userSettings.advanced.rdapServer;
    if (!rdapUrl.endsWith("/")) rdapUrl += "/";
    const started = Date.now();
    whoisPromise = fetch(rdapUrl + domain, {
      headers: { accept: "application/rdap+json, application/json" },
    })
      .then((r) => (r.ok ? r.json() : { error: "HTTP " + r.status }))
      .then((d) => (d && !d.error ? { ...d, _latency: Date.now() - started } : d))
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
  renderResults(finalResults, lookupTypes, domain, isReverseSearch, dmarcResults, {
    resolvers: activeResolvers.map(([name]) => name),
    whoisPending: !!whoisPromise,
    sslPending: !!sslPromise,
  });

  if (whoisPromise) {
    whoisPromise.then((whoisResult) => {
      if (whoisResult) latestData.whois = whoisResult;
      renderWhoisCard(whoisResult, domain);
    });
  }

  if (sslPromise) {
    sslPromise.then((sslResult) => {
      if (sslResult) latestData.ssl = sslResult;
      renderSslCard(sslResult, domain);
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

// WHOIS and certificates only run on registered domains. Say so in their
// panel instead of leaving the operator to wonder whether they ran at all.
function skippedNote(what, domain) {
  const parent = registeredDomain(domain);
  return (
    '<div class="panel-note">' +
    icon("info") +
    "<span>" +
    esc(what) +
    " is looked up for registered domains only, so it was skipped for " +
    esc(domain) +
    '. <button class="link-btn" data-action="lookup" data-value="' +
    esc(parent) +
    '">Look up ' +
    esc(parent) +
    "</button></span></div>"
  );
}

function pendingNote(text) {
  return (
    '<div class="pending-text" role="status"><span class="spinner" aria-hidden="true"></span>' +
    esc(text) +
    "</div>"
  );
}

// A record row, in the shape of a DNS records table: type, content, status,
// source, and an in-place "Details" row. Only out-of-range rows carry a
// coloured badge; the rest show a quiet status dot.
function checkRow(o) {
  const status = o.flag
    ? badge(o.flag, o.flagText)
    : '<span class="dot">' + esc(o.okText || "OK") + "</span>";
  const more = o.detail
    ? '<button class="row-toggle" aria-expanded="false" aria-controls="' +
      o.detailId +
      '" data-action="toggle-row" data-value="' +
      o.detailId +
      '">Details' +
      icon("chevron-down") +
      "</button>"
    : "";
  return (
    '<tr class="check"' +
    (o.flag ? ' data-flag="' + o.flag + '"' : "") +
    (o.id ? ' id="' + o.id + '"' : "") +
    '><th scope="row" class="c-check">' +
    esc(o.check) +
    '</th><td class="c-result">' +
    o.result +
    '</td><td class="c-flag">' +
    status +
    '</td><td class="c-ref">' +
    o.ref +
    '</td><td class="c-more">' +
    more +
    "</td></tr>" +
    (o.detail
      ? '<tr class="check-detail" id="' +
        o.detailId +
        '" hidden><td colspan="5"><div class="detail-inner">' +
        o.detail +
        "</div></td></tr>"
      : "")
  );
}

function checksTable(rows, caption, first) {
  return (
    '<div class="table-wrap"><table class="table checks"><caption class="sr-only">' +
    esc(caption) +
    '</caption><thead><tr><th scope="col" class="c-check">' +
    esc(first || "Type") +
    '</th><th scope="col">Content</th>' +
    '<th scope="col" class="c-flag">Status</th><th scope="col" class="c-ref">Source</th>' +
    '<th scope="col" class="c-more"><span class="sr-only">Details</span></th></tr></thead><tbody>' +
    rows +
    "</tbody></table></div>"
  );
}

function panel(id, title, desc, summary, body) {
  return (
    '<section class="card panel" id="panel-' +
    id +
    '" aria-labelledby="panel-' +
    id +
    '-title"><div class="card-head"><div><h2 id="panel-' +
    id +
    '-title">' +
    esc(title) +
    '</h2><p class="card-desc">' +
    desc +
    '</p></div><span class="card-meta panel-sum">' +
    summary +
    '</span></div><div class="panel-body">' +
    body +
    "</div></section>"
  );
}

function setPanelBody(id, summary, body) {
  const el = document.getElementById("panel-" + id);
  if (!el) return;
  el.querySelector(".panel-sum").innerHTML = summary;
  el.querySelector(".panel-body").innerHTML = body;
  updateIndex();
}

// Flag counts in the sidebar and the status badge in the lookup header,
// recomputed whenever a panel changes.
function updateIndex() {
  let fails = 0;
  let warns = 0;
  let pending = 0;
  for (const link of document.querySelectorAll("#sideSections a[data-panel]")) {
    const p = document.getElementById(link.dataset.panel);
    const count = link.querySelector(".count");
    if (!p || !count) continue;
    if (p.querySelector(".pending-text")) {
      pending++;
      count.className = "count";
      count.innerHTML =
        '<span class="spinner" aria-hidden="true"></span><span class="sr-only">Pending</span>';
      continue;
    }
    const f = p.querySelectorAll('.check[data-flag="fail"]').length;
    const w = p.querySelectorAll('.check[data-flag="warn"]').length;
    fails += f;
    warns += w;
    const n = f + w;
    count.className = "count" + (n ? " badge " + (f ? "badge-fail" : "badge-warn") : " ok");
    count.innerHTML = n
      ? n + '<span class="sr-only"> flagged</span>'
      : icon("check") + '<span class="sr-only">No issues</span>';
  }
  const status = document.getElementById("zoneStatus");
  if (!status) return;
  const n = fails + warns;
  if (n) {
    status.outerHTML =
      '<span id="zoneStatus">' +
      badge(fails ? "fail" : "warn", n + (n === 1 ? " issue" : " issues")) +
      "</span>";
  } else if (pending) {
    status.outerHTML =
      '<span id="zoneStatus"><span class="badge"><span class="spinner" aria-hidden="true"></span>Checking</span></span>';
  } else {
    status.outerHTML = '<span id="zoneStatus">' + badge("ok", "No issues") + "</span>";
  }
}

function flaggedSummary(rowsHtml, n) {
  const flagged = (rowsHtml.match(/data-flag="(warn|fail)"/g) || []).length;
  return n + (n === 1 ? " check" : " checks") + (flagged ? " · " + flagged + " flagged" : "");
}

function agreementTitle(c) {
  if (c.status === "varies")
    return "Every resolver answered, with different addresses. Normal for CDNs and geo-DNS.";
  if (c.status === "single") return "Only one resolver is active, so there is nothing to compare.";
  return "";
}

// Only shown when a value did not come back from every resolver.
function valueMeta(cv, c) {
  if (cv.confirmedBy.length === c.total) return "";
  const missing = c.resolvers.filter((r) => !cv.confirmedBy.includes(r));
  return (
    '<span class="val-meta' +
    (c.status === "varies" ? " expected" : "") +
    '">' +
    cv.confirmedBy.length +
    "/" +
    c.total +
    " · " +
    esc(cv.confirmedBy.join(", ")) +
    (missing.length ? " · not from " + esc(missing.join(", ")) : "") +
    "</span>"
  );
}

// DNS status words are the leading code of the resolver error ("NXDOMAIN (…)").
function errorCode(err) {
  return String(err).split(" (")[0];
}

function isIpValue(value) {
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value) || /^[0-9a-fA-F:]+:[0-9a-fA-F:]+$/.test(value);
}

// Per-resolver answers side by side. Values one resolver returned and
// another did not are marked, so a split is visible without reading JSON.
function resolverComparison(type, section, ipLink) {
  const names = Object.keys(section.resolvers);
  const sets = {};
  for (const name of names) {
    sets[name] = new Set(
      (section.resolvers[name].answers || []).map((a) => normalizeAnswer(a.data, type)),
    );
  }
  let html = '<div class="answers">';
  for (const name of names) {
    const rd = section.resolvers[name];
    html +=
      '<div class="answer"><div class="answer-head"><span class="resolver-name">' +
      esc(name) +
      '</span><span class="timing ' +
      getTimingClass(rd.duration) +
      '">' +
      rd.duration +
      " ms</span>" +
      (!rd.error && rd.answers.length
        ? copyButton(JSON.stringify(rd.answers, null, 2), name + " answer JSON")
        : "") +
      "</div>";
    if (rd.error) {
      html +=
        '<div class="answer-error">' +
        badge("fail", errorCode(rd.error)) +
        "<span>" +
        esc(rd.error) +
        "</span></div>";
    } else if (rd.answers.length) {
      html +=
        '<table class="answer-table"><thead><tr><th scope="col">Answer</th><th scope="col" class="a-ttl">TTL</th></tr></thead><tbody>';
      for (const a of rd.answers) {
        const norm = normalizeAnswer(a.data, type);
        const missing = names.filter((n) => n !== name && !sets[n].has(norm));
        const value = String(a.data ?? "");
        html +=
          '<tr><td class="a-data' +
          (missing.length ? " differs" : "") +
          '" data-norm="' +
          esc(norm) +
          '"' +
          (missing.length ? ' title="Not returned by ' + esc(missing.join(", ")) + '"' : "") +
          ">" +
          (isIpValue(value) ? ipLink(value) : esc(value)) +
          (missing.length
            ? '<span class="differs-note">not from ' + esc(missing.join(", ")) + "</span>"
            : "") +
          '</td><td class="a-ttl">' +
          esc(a.TTL ?? "") +
          "</td></tr>";
      }
      html += "</tbody></table>";
    } else {
      html += '<p class="answer-empty">No records</p>';
    }
    html += "</div>";
  }
  return html + "</div>";
}

function dnsRow(type, section, ipLink) {
  const c = section.consensus;
  const results = Object.values(section.resolvers);
  const total = results.length;
  const row = { check: type, id: "record-" + type, detailId: "detail-" + type };

  if (c && c.values && c.values.length) {
    // Long answer sets (TXT on big domains) show the first few values; the
    // rest open in place, and the resolver comparison always has them all.
    const SHOWN = 5;
    let html = '<ul class="values" id="values-' + type + '">';
    c.values.forEach((cv, i) => {
      const value = String(cv.value);
      // Only values that are entirely an IP address become links; anything
      // else (TXT with a colon, for instance) stays plain escaped text.
      html +=
        '<li class="val"' +
        (i >= SHOWN ? " hidden" : "") +
        '><span class="v"><span class="v-text" title="' +
        esc(value) +
        '">' +
        (isIpValue(value) ? ipLink(value) : esc(value)) +
        "</span>" +
        valueMeta(cv, c) +
        "</span>" +
        copyButton(value, type + " value") +
        "</li>";
    });
    html += "</ul>";
    if (c.values.length > SHOWN) {
      html +=
        '<button class="link-btn show-more" data-action="show-more" data-value="values-' +
        esc(type) +
        '">Show ' +
        (c.values.length - SHOWN) +
        " more</button>";
    }
    for (const f of c.failed) {
      html += '<p class="fail-line">' + esc(f.resolver) + ": " + esc(f.error) + "</p>";
    }
    row.result = html;
    if (c.status === "agree") {
      row.okText = "Agree";
      row.ref = c.total + "/" + c.total + " resolvers";
    } else if (c.status === "single") {
      row.okText = "Answered";
      row.ref = "1 resolver";
    } else if (c.status === "varies") {
      row.flag = "note";
      row.flagText = "Varies";
      row.ref = '<span title="' + esc(agreementTitle(c)) + '">Expected for CDNs</span>';
    } else {
      row.flag = "warn";
      row.flagText = "Split";
      row.ref = "Resolvers disagree";
    }
  } else {
    const errors = results.filter((r) => r.error).map((r) => r.error);
    if (errors.length) {
      const counts = {};
      for (const e of errors) counts[e] = (counts[e] || 0) + 1;
      const common = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      row.flag = "fail";
      row.flagText = errorCode(common);
      row.result = '<span class="empty">' + esc(common) + "</span>";
      row.ref = errors.length + "/" + total + " resolvers";
    } else {
      row.okText = total === 1 ? "Answered" : "Agree";
      row.result = '<span class="empty">No ' + esc(type) + " records</span>";
      row.ref = total === 1 ? "1 resolver" : total + "/" + total + " resolvers";
    }
  }

  row.detail = resolverComparison(type, section, ipLink);
  return checkRow(row);
}

const MAIL_FLAG = {
  missing: ["fail", "Missing"],
  warn: ["warn", "Review"],
  neutral: ["note", "Note"],
};

// state: found | missing | warn | neutral. `record` is shown with a copy button.
function mailRow(check, state, status, note, record, ref) {
  const [flag, flagText] = MAIL_FLAG[state] || [];
  return checkRow({
    check,
    flag,
    flagText,
    okText: "Found",
    result:
      '<div class="status-line">' +
      esc(status) +
      "</div>" +
      (note ? '<p class="check-note">' + esc(note) + "</p>" : "") +
      (record
        ? '<div class="record"><pre>' +
          esc(record) +
          "</pre>" +
          copyButton(record, check + " record") +
          "</div>"
        : ""),
    ref: '<span class="mono">' + esc(ref) + "</span>",
  });
}

function caaRow(dnsData, domain) {
  const sec = analyzeSecurityRecords(dnsData, []);
  if (sec.caa.length)
    return mailRow(
      "CAA",
      "found",
      sec.caa.length === 1 ? "1 record" : sec.caa.length + " records",
      "",
      sec.caa.join("\n"),
      "CAA " + domain,
    );
  return mailRow(
    "CAA",
    "neutral",
    "None",
    "Any certificate authority may issue for this domain.",
    null,
    "CAA " + domain,
  );
}

function rdapSource() {
  return userSettings.advanced.rdapServer.replace(/^https?:\/\//, "").split("/")[0];
}

const PANEL_ICON = { dns: "globe", mail: "mail", registry: "registry", tls: "lock" };

function renderResults(dnsData, typesRendered, domain, isReverse, dmarcResults, ctx) {
  const container = document.getElementById("results");

  // IP values become buttons that open the IP info modal.
  function ipLink(ip) {
    return (
      '<button type="button" class="ip-link" data-action="ip" data-value="' +
      ip +
      '" title="Network and location for ' +
      ip +
      '">' +
      ip +
      "</button>"
    );
  }

  const showMail = userSettings.features.enableSecurity && !isReverse;
  const showRegistry = userSettings.features.enableWhois && !isReverse;
  const showTls = !isReverse && (showMail || userSettings.features.enableSsl);
  const subdomain = !isReverse && isSubdomain(domain);
  const resolverNames = esc(ctx.resolvers.join(", "));

  // DNS: CAA lives in the TLS panel unless it was chosen as a record type.
  const dnsTypes = typesRendered.filter(
    (t) => dnsData[t] && !(t === "CAA" && showMail && !userSettings.defaultRecords.includes("CAA")),
  );
  const dnsRows = dnsTypes.map((t) => dnsRow(t, dnsData[t], ipLink)).join("");
  const dnsTitle = isReverse ? "Reverse DNS" : "DNS records";
  const panels = [];
  if (dnsTypes.length || isReverse) {
    panels.push({
      id: "dns",
      title: isReverse ? "Reverse DNS" : "DNS",
      html: panel(
        "dns",
        dnsTitle,
        "Answers from " + resolverNames + ". Open a row to compare resolvers side by side.",
        flaggedSummary(dnsRows, dnsTypes.length),
        checksTable(dnsRows, "DNS records by type"),
      ),
    });
  }

  if (showMail) {
    const sec = analyzeSecurityRecords(dnsData, dmarcResults);
    const dmarcName = "_dmarc." + domain;
    const dmarcPolicy = sec.dmarc.length ? (sec.dmarc[0].match(/\bp=([a-z]+)/i) || [])[1] : null;
    let rows = "";

    if (sec.spf.length === 1)
      rows += mailRow("SPF", "found", "Found", "", sec.spf[0], "TXT " + domain);
    else if (sec.spf.length > 1)
      rows += mailRow(
        "SPF",
        "warn",
        sec.spf.length + " SPF records",
        "Receivers treat more than one as an error (permerror). Merge them into one.",
        sec.spf.join("\n"),
        "TXT " + domain,
      );
    else rows += mailRow("SPF", "missing", "No SPF record", "", null, "TXT " + domain);

    if (sec.dmarc.length) {
      const monitoring = dmarcPolicy && dmarcPolicy.toLowerCase() === "none";
      rows += mailRow(
        "DMARC",
        monitoring ? "warn" : "found",
        "Found" + (dmarcPolicy ? " · p=" + dmarcPolicy : ""),
        monitoring ? "Monitoring only: failing mail is still delivered." : "",
        sec.dmarc[0],
        "TXT " + dmarcName,
      );
    } else if (subdomain)
      rows += mailRow(
        "DMARC",
        "neutral",
        "None at " + dmarcName,
        "The policy at _dmarc." +
          registeredDomain(domain) +
          " applies to subdomains unless sp= says otherwise.",
        null,
        "TXT " + dmarcName,
      );
    else
      rows += mailRow(
        "DMARC",
        "missing",
        "No record at " + dmarcName,
        "",
        null,
        "TXT " + dmarcName,
      );

    rows += mailRow(
      "DKIM",
      "neutral",
      "Needs a selector",
      "Selectors can't be listed from DNS; find one in a message's DKIM-Signature header (s=).",
      null,
      "TXT <selector>._domainkey." + domain,
    );

    panels.push({
      id: "mail",
      title: "Mail",
      html: panel(
        "mail",
        "Mail",
        "Sender policy and authentication records, read from TXT.",
        flaggedSummary(rows, 3),
        checksTable(rows, "Mail records", "Record"),
      ),
    });
  }

  if (showRegistry) {
    const source = esc(rdapSource());
    panels.push({
      id: "registry",
      title: "Registry",
      html: panel(
        "registry",
        "Registry",
        "Registration data from RDAP, the successor to WHOIS.",
        "via " + source,
        subdomain
          ? skippedNote("Registry data", domain)
          : ctx.whoisPending
            ? pendingNote("Waiting for " + rdapSource() + "…")
            : "",
      ),
    });
  }

  if (showTls) {
    let body = showMail
      ? checksTable(caaRow(dnsData, domain), "Certificate authority authorization", "Record")
      : "";
    if (userSettings.features.enableSsl) {
      body +=
        '<div class="tls-certs">' +
        (subdomain
          ? skippedNote("Certificate history", domain)
          : ctx.sslPending
            ? pendingNote("Waiting for certificate logs…")
            : "") +
        "</div>";
    }
    const parts = [];
    if (showMail) parts.push("Which authorities may issue (CAA)");
    if (userSettings.features.enableSsl)
      parts.push((showMail ? "and r" : "R") + "ecent certificates from Certificate Transparency");
    panels.push({
      id: "tls",
      title: "TLS",
      html: panel("tls", "TLS", esc(parts.join(" ")) + ".", "", body),
    });
  }

  const time = new Date(latestData.timestamp).toLocaleTimeString();
  const curl = curlFor(domain);
  const head =
    '<div class="page-head zone-head"><div class="zone-id">' +
    '<div class="crumbs"><button class="link-btn" onclick="goHome()">Lookups</button>' +
    icon("chevron") +
    "<span>" +
    (isReverse ? "Reverse lookup" : isSubdomain(domain) ? "Subdomain" : "Domain") +
    "</span></div>" +
    '<div class="zone-title"><h1 class="zone-name">' +
    esc(domain) +
    '</h1><span id="zoneStatus"></span></div>' +
    '<p class="zone-meta">' +
    icon("clock") +
    "<span>" +
    esc(time) +
    "</span><span>·</span><span>" +
    resolverNames +
    "</span><span>·</span><span>" +
    typesRendered.length +
    (typesRendered.length === 1 ? " record type" : " record types") +
    "</span></p></div>" +
    '<div class="zone-actions">' +
    '<button class="btn" onclick="exportResultJSON()">' +
    icon("download") +
    "Export JSON</button>" +
    '<button class="btn btn-primary" data-action="rerun">' +
    icon("refresh") +
    "Run again</button></div></div>" +
    '<div class="code curl-strip"><span class="prompt">$</span><code>' +
    esc(curl) +
    "</code>" +
    copyButton(curl, "curl command") +
    "</div>";

  document.getElementById("sideDomain").textContent = domain;
  document.getElementById("sideSections").innerHTML = panels
    .map(
      (p) =>
        '<a class="side-item" href="#panel-' +
        p.id +
        '" data-panel="panel-' +
        p.id +
        '">' +
        icon(PANEL_ICON[p.id]) +
        '<span class="side-text">' +
        esc(p.title) +
        '</span><span class="count"></span></a>',
    )
    .join("");
  document.getElementById("sideReport").classList.toggle("hidden", currentView !== "results");

  container.innerHTML = head + panels.map((p) => p.html).join("");
  updateIndex();
}

function rawJson(label, json) {
  return (
    '<details class="raw"><summary>' +
    icon("chevron") +
    esc(label) +
    '</summary><div class="raw-body">' +
    '<button class="copy-btn labelled" data-action="copy" data-value="' +
    esc(json) +
    '">' +
    icon("copy") +
    "Copy JSON</button><pre>" +
    esc(json) +
    "</pre></div></details>"
  );
}

function renderWhoisCard(whoisData, domain) {
  if (!document.getElementById("panel-registry")) return;
  const source = esc(rdapSource());
  if (!whoisData || whoisData.error) {
    setPanelBody(
      "registry",
      "via " + source,
      '<div class="panel-note">' +
        icon("warn") +
        "<span>No registry data: " +
        esc((whoisData && whoisData.error) || "no response") +
        "</span></div>",
    );
    return;
  }
  const name = whoisData.ldhName || whoisData.handle || domain;
  const status = (whoisData.status || []).join(", ") || "Unknown";
  const events = whoisData.events || [];
  const date = (action) => {
    const e = events.find((ev) => ev.eventAction === action);
    return e ? new Date(e.eventDate).toLocaleDateString() : null;
  };
  const nameservers = (whoisData.nameservers || [])
    .map((ns) => ns.ldhName || ns.objectClassName)
    .filter(Boolean);
  const registrar = (whoisData.entities || []).find((e) => (e.roles || []).includes("registrar"));
  const registrarName =
    registrar && registrar.vcardArray
      ? (registrar.vcardArray[1] || []).find((v) => v[0] === "fn")?.[3]
      : null;

  const fact = (label, value, mono) =>
    value
      ? "<div><dt>" +
        label +
        "</dt><dd" +
        (mono ? ' class="mono"' : "") +
        ">" +
        esc(value) +
        "</dd></div>"
      : "";
  setPanelBody(
    "registry",
    "via " + source + (whoisData._latency ? " · " + esc(whoisData._latency) + " ms" : ""),
    '<dl class="kv">' +
      fact("Domain", name, true) +
      fact("Registrar", registrarName) +
      fact("Status", status) +
      fact("Registered", date("registration"), true) +
      fact("Expires", date("expiration"), true) +
      fact("Updated", date("last changed"), true) +
      fact("Nameservers", nameservers.join(", "), true) +
      "</dl>" +
      rawJson("Raw RDAP response", JSON.stringify(whoisData, null, 2)),
  );
}

function renderSslCard(sslData, domain) {
  const panelEl = document.getElementById("panel-tls");
  const slot = panelEl && panelEl.querySelector(".tls-certs");
  if (!slot) return;
  const source = userSettings.advanced.sslProvider === "crt.sh" ? "crt.sh" : "CertSpotter";

  let html =
    '<div class="panel-sub"><h3>Recent certificates</h3><span>via ' + esc(source) + "</span></div>";
  if (!sslData || sslData.error || (Array.isArray(sslData) && sslData.length === 0)) {
    html +=
      '<div class="panel-note">' +
      icon("info") +
      "<span>" +
      esc((sslData && sslData.error) || "No certificates found in the logs.") +
      "</span></div>";
  } else {
    const records = Array.isArray(sslData) ? sslData.slice(0, 10) : [];
    // CertSpotter answers without issuers; drop the column rather than fill it with "Unknown".
    const hasIssuer = records.some((rec) => rec.issuer_name || (rec.issuer && rec.issuer.name));
    let rows = "";
    for (const rec of records) {
      const subjects = rec.dns_names
        ? rec.dns_names.join(", ")
        : (rec.name_value || "Unknown").replace(/\n/g, ", ");
      const from = rec.not_before ? new Date(rec.not_before).toLocaleDateString() : "Unknown";
      const until = rec.not_after ? new Date(rec.not_after).toLocaleDateString() : "Unknown";
      let issuer = rec.issuer_name || (rec.issuer && rec.issuer.name) || "Unknown issuer";
      if (issuer.includes("CN=")) issuer = issuer.split("CN=")[1].split(",")[0];
      else if (issuer.includes("O=")) issuer = issuer.split("O=")[1].split(",")[0];
      rows +=
        '<tr><td class="c-names mono">' +
        esc(subjects) +
        (hasIssuer ? '</td><td data-label="Issuer">' + esc(issuer) : "") +
        '</td><td class="c-date mono" data-label="From">' +
        esc(from) +
        '</td><td class="c-date mono" data-label="Until">' +
        esc(until) +
        "</td></tr>";
    }
    html +=
      '<div class="table-wrap"><table class="table certs"><caption class="sr-only">Recent certificates</caption><thead><tr>' +
      '<th scope="col">Hostnames</th>' +
      (hasIssuer ? '<th scope="col" class="c-issuer">Issuer</th>' : "") +
      '<th scope="col" class="c-date">Valid from</th><th scope="col" class="c-date">Valid until</th>' +
      "</tr></thead><tbody>" +
      rows +
      "</tbody></table></div>" +
      rawJson("Raw certificate response", JSON.stringify(sslData, null, 2));
  }
  slot.innerHTML = html;
  updateIndex();
}

function toggleRow(detailId, btn) {
  const row = document.getElementById(detailId);
  if (!row) return;
  const open = row.hidden;
  row.hidden = !open;
  btn.setAttribute("aria-expanded", String(open));
  row.previousElementSibling?.classList.toggle("expanded", open);
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
    const fact = (label, value, mono) =>
      "<div><dt>" +
      label +
      "</dt><dd" +
      (mono ? ' class="mono"' : "") +
      ">" +
      esc(value) +
      "</dd></div>";
    document.getElementById("modalDetails").innerHTML =
      '<dl class="kv">' +
      fact("Organization", data.org || "Unknown") +
      fact(
        "Location",
        (data.city || "?") + ", " + (data.region || "?") + ", " + (data.country || "?"),
      ) +
      fact("Hostname", data.hostname || "N/A", true) +
      fact("Timezone", data.timezone || "Unknown") +
      fact("Postal", data.postal || "N/A", true) +
      "</dl>";
    if (data.loc) {
      const [lat, lng] = data.loc.split(",").map(parseFloat);
      leafletMap = L.map("map").setView([lat, lng], 10);
      const tiles = isDarkTheme() ? "dark_all" : "light_all";
      L.tileLayer("https://{s}.basemaps.cartocdn.com/" + tiles + "/{z}/{x}/{y}{r}.png", {
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
  let titleStr = "IP lookup";
  if (path === "/ipv4") titleStr = "IPv4 lookup";
  if (path === "/ipv6") titleStr = "IPv6 lookup";
  if (path === "/whois") titleStr = "WHOIS lookup";
  if (path === "/ssl") titleStr = "Certificate lookup";
  if (path === "/security") titleStr = "Mail and CAA records";
  document.title = titleStr;
  document.querySelector("#homeTitle label").textContent = titleStr;
  const btn = document.getElementById("homeLookupBtn");
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
