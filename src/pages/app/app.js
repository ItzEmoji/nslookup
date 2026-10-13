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
  features: {
    animations: true,
    enableWhois: false,
    enableSecurity: true,
    enableSsl: false,
    rememberRecent: true,
  },
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
    focusSearch();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === ",") {
    e.preventDefault();
    openSettings();
  }
  if (e.key === "Escape") {
    const modalOpen = document.querySelector(".modal-overlay:not(.hidden)");
    closeModal("ipModal");
    closeModal("helpModal");
    if (!modalOpen) closeSettings();
  }
  // Single-key shortcuts only apply outside text fields.
  const typing = e.target.closest && e.target.closest("input, textarea, select, [contenteditable]");
  if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === "?") openShortcuts();
  if (e.key === "/") {
    e.preventDefault();
    focusSearch();
  }
  if (currentView !== "results" || !document.getElementById("viewSwitch")) return;
  if (e.key === "d" || e.key === "D") {
    const box = document.getElementById("onlyDiff");
    box.checked = !box.checked;
    setOnlyDiff(box.checked);
  }
  const views = { 1: "form", 2: "zone", 3: "json" };
  if (views[e.key]) setResultView(views[e.key]);
});

// ===== VIEWS =====
// One page with three views: the overview, a lookup's results and settings.
let currentView = "home";
let viewBeforeSettings = "home";

// ===== MOTION =====
// Motion explains changes: the search field glides between the start page
// and the top bar, new content fades in, and controls confirm what they did.
// The "Animations" setting turns all of it off; reduced motion keeps only fades.
function motionOn() {
  return userSettings.features.animations !== false;
}
function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

// Runs a DOM update as a view transition where the browser supports it.
function withTransition(update) {
  if (!document.startViewTransition || !motionOn() || document.hidden) {
    update();
    return Promise.resolve();
  }
  return document.startViewTransition(update).updateCallbackDone.catch(() => {});
}

// A short entrance for content that was just swapped in.
function enter(el, rise) {
  if (!el || !el.animate || !motionOn()) return;
  const lift = rise && !reducedMotion() ? "translateY(6px)" : "none";
  el.animate(
    [
      { opacity: 0, transform: lift },
      { opacity: 1, transform: "none" },
    ],
    { duration: 240, easing: EASE_OUT },
  );
}

function showView(name) {
  if (name === currentView) {
    applyView(name);
    return Promise.resolve();
  }
  currentView = name;
  return withTransition(() => applyView(name));
}

function applyView(name) {
  currentView = name;
  const views = { home: "homePage", results: "resultsPage", settings: "settingsPage" };
  for (const [view, id] of Object.entries(views)) {
    document.getElementById(id).classList.toggle("hidden", view !== name);
  }
  placeSearch(name === "home" ? "home" : "top");
  for (const el of document.querySelectorAll("[data-nav]")) {
    if (el.dataset.nav === name) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  }
}

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
  window.scrollTo({ top: 0, behavior: "instant" });
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
  document.getElementById("setRecent").checked = userSettings.features.rememberRecent !== false;
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
  const next = isDarkTheme() ? "light" : "dark";
  document.documentElement.classList.add("theme-switch");
  withTransition(() => applyAppearance(next)).then(() => {
    setTimeout(() => document.documentElement.classList.remove("theme-switch"), 400);
  });
}

// The curl command that returns the same lookup from the API.
function curlFor(domain) {
  return "curl " + location.origin + "/" + domain;
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

// ===== RECENT LOOKUPS =====
// Kept in this browser only, and only while "Remember recent lookups" is on.
function rememberRecent() {
  return userSettings.features.rememberRecent !== false;
}

function saveHistory() {
  localStorage.setItem("lookup_history", JSON.stringify(queryHistory));
}

function addToHistory(domain) {
  if (!rememberRecent()) return;
  queryHistory = [domain, ...queryHistory.filter((d) => d !== domain)].slice(0, 10);
  saveHistory();
}

function removeFromHistory(domain) {
  queryHistory = queryHistory.filter((d) => d !== domain);
  saveHistory();
  const row = [...document.querySelectorAll("#suggest .suggest-item")].find(
    (r) => r.dataset.value === domain,
  );
  const done = () => {
    renderSuggest();
    searchInput().focus();
  };
  if (!row || !row.animate || !motionOn() || reducedMotion()) return done();
  row.style.overflow = "hidden";
  row
    .animate(
      [
        { opacity: 1, height: row.offsetHeight + "px", minHeight: "0px" },
        { opacity: 0, height: "0px", minHeight: "0px" },
      ],
      { duration: 160, easing: "ease-in", fill: "forwards" },
    )
    .finished.then(done, done);
}

function clearHistory(fromSettings) {
  queryHistory = [];
  saveHistory();
  renderSuggest();
  if (fromSettings) showToast("Recent lookups deleted", "success");
  else searchInput().focus();
}

function queryKind(q) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(q)) return "IPv4";
  if (q.includes(":")) return "IPv6";
  return "Domain";
}

// ===== SEARCH =====
// There is one search field. On the start page it sits in the middle of the
// screen; once a lookup runs (or settings open) it moves into the top bar.
// Focusing it opens a list of recent lookups; typing filters that list.
function searchInput() {
  return document.getElementById("q");
}

function focusSearch() {
  const input = searchInput();
  input.focus();
  input.select();
}

function placeSearch(where) {
  const box = document.getElementById("search");
  const slot = document.getElementById(where === "home" ? "searchSlotHome" : "searchSlotTop");
  document.body.classList.toggle("on-home", where === "home");
  if (box.parentElement === slot) return;
  const hadFocus = box.contains(document.activeElement);
  slot.appendChild(box);
  box.classList.toggle("search-lg", where === "home");
  if (hadFocus && where === "home") focusQuietly();
}

let suggestIndex = -1;
let suggestItems = [];

function suggestionsFor(val) {
  const v = val.trim().toLowerCase();
  const recent = rememberRecent() ? queryHistory : [];
  const items = [];
  for (const h of recent) {
    if (!v || (h.includes(v) && h !== v)) items.push({ value: h, recent: true });
  }
  if (v && !v.includes(".") && !v.includes(":") && /^[a-z0-9-]+$/.test(v)) {
    for (const tld of [".com", ".net", ".org", ".io"]) {
      if (!items.some((i) => i.value === v + tld)) items.push({ value: v + tld, recent: false });
    }
  }
  return items.slice(0, 8);
}

function renderSuggest() {
  const panel = document.getElementById("suggest");
  const input = searchInput();
  if (document.activeElement !== input && !panel.contains(document.activeElement)) {
    closeSuggest();
    return;
  }
  suggestItems = suggestionsFor(input.value);
  suggestIndex = -1;
  const showingRecent = !input.value.trim() && suggestItems.length;
  if (!suggestItems.length) {
    closeSuggest();
    return;
  }
  panel.innerHTML =
    (showingRecent
      ? '<div class="suggest-head"><span>Recent</span><button type="button" class="link-btn" data-action="clear-history">Clear all</button></div>'
      : "") +
    '<ul class="suggest-list">' +
    suggestItems
      .map(
        (item, i) =>
          '<li class="suggest-item" role="option" id="sg-' +
          i +
          '" aria-selected="false" data-action="lookup" data-value="' +
          esc(item.value) +
          '">' +
          icon(item.recent ? "clock" : "search") +
          '<span class="suggest-text mono">' +
          esc(item.value) +
          '</span><span class="suggest-kind">' +
          queryKind(item.value) +
          "</span>" +
          (item.recent
            ? '<button type="button" class="icon-btn suggest-del" data-action="remove-history" data-value="' +
              esc(item.value) +
              '" aria-label="Delete ' +
              esc(item.value) +
              ' from recent lookups" title="Delete">' +
              icon("trash") +
              "</button>"
            : "") +
          "</li>",
      )
      .join("") +
    "</ul>";
  panel.hidden = false;
  input.setAttribute("aria-expanded", "true");
  document.getElementById("search").classList.add("open");
}

function closeSuggest() {
  const panel = document.getElementById("suggest");
  panel.hidden = true;
  suggestIndex = -1;
  searchInput().setAttribute("aria-expanded", "false");
  searchInput().removeAttribute("aria-activedescendant");
  document.getElementById("search").classList.remove("open");
}

function moveSuggest(step) {
  if (!suggestItems.length) return;
  suggestIndex = (suggestIndex + step + suggestItems.length + 1) % (suggestItems.length + 1);
  if (suggestIndex === suggestItems.length) suggestIndex = -1;
  const rows = document.querySelectorAll("#suggest .suggest-item");
  rows.forEach((row, i) => row.setAttribute("aria-selected", String(i === suggestIndex)));
  const input = searchInput();
  if (suggestIndex >= 0) input.setAttribute("aria-activedescendant", "sg-" + suggestIndex);
  else input.removeAttribute("aria-activedescendant");
}

// Path-specific start pages (/ipv4, /whois, ...) send the query to their own
// endpoint instead of running a full lookup.
let submitOverride = null;

function submitSearch(e) {
  e?.preventDefault();
  const chosen = suggestIndex >= 0 ? suggestItems[suggestIndex]?.value : null;
  const value = chosen || searchInput().value;
  if (submitOverride) submitOverride(value);
  else lookup(value);
}

function onSearchKey(e) {
  const open = !document.getElementById("suggest").hidden;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (!open) renderSuggest();
    moveSuggest(1);
  } else if (e.key === "ArrowUp" && open) {
    e.preventDefault();
    moveSuggest(-1);
  } else if (e.key === "Delete" && e.shiftKey && open && suggestIndex >= 0) {
    const item = suggestItems[suggestIndex];
    if (item.recent) {
      e.preventDefault();
      removeFromHistory(item.value);
    }
  } else if (e.key === "Escape" && open) {
    e.stopPropagation();
    closeSuggest();
  }
}

function clearSearchField() {
  const input = searchInput();
  input.value = "";
  input.focus();
  renderSuggest();
  syncClearBtn();
}

function syncClearBtn() {
  document.getElementById("searchClear").hidden = !searchInput().value;
}

// The page focuses the field on its own after load and on "New lookup";
// that focus is quiet. A click, Tab, Ctrl K or typing opens the list.
let quietFocus = false;
function focusQuietly() {
  quietFocus = true;
  searchInput().focus();
  quietFocus = false;
}
document.addEventListener("focusin", (e) => {
  if (e.target === searchInput() && !quietFocus) renderSuggest();
});
document.addEventListener("click", (e) => {
  if (e.target === searchInput() && document.getElementById("suggest").hidden) renderSuggest();
});
document.addEventListener("input", (e) => {
  if (e.target === searchInput()) {
    syncClearBtn();
    renderSuggest();
  }
});
// Clicks inside the panel keep focus in the field; clicks elsewhere close it.
document.addEventListener("mousedown", (e) => {
  if (e.target.closest("#suggest")) e.preventDefault();
  else if (!e.target.closest("#search")) closeSuggest();
});
document.addEventListener("focusout", (e) => {
  if (e.target === searchInput() && !document.getElementById("search").contains(e.relatedTarget)) {
    closeSuggest();
  }
});

// ===== NAVIGATION =====
function goHome(fromHistory) {
  if (!fromHistory) history.pushState({}, "", "/");
  currentView = "home";
  withTransition(() => {
    applyView("home");
    document.getElementById("results").innerHTML = "";
    searchInput().value = "";
    syncClearBtn();
    window.scrollTo({ top: 0, behavior: "instant" });
  }).then(focusQuietly);
}

function quickLookup(domain) {
  closeSuggest();
  if (submitOverride) submitOverride(domain);
  else lookup(domain);
}

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
  rerun: () => {
    if (latestData) lookup(latestData.domain);
  },
  "clear-history": () => clearHistory(),
};

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el || !clickActions[el.dataset.action]) return;
  clickActions[el.dataset.action](el.dataset.value, el);
});

document.addEventListener("change", (e) => {
  const el = e.target.closest('[data-action="toggle-resolver"]');
  if (el) toggleResolver(el.dataset.value);
  if (e.target.id === "onlyDiff") setOnlyDiff(e.target.checked);
  if (e.target.name === "resultView") setResultView(e.target.value);
});

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
async function lookup(query, fromHistory) {
  let domain = String(query || "")
    .trim()
    .toLowerCase();
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

  searchInput().value = domain;
  searchInput().blur();
  closeSuggest();

  document.getElementById("results").innerHTML = "";
  document.getElementById("loadingDomain").textContent = domain;
  document.getElementById("loading").classList.remove("hidden");
  showView("results");
  if (!fromHistory) history.pushState({}, "", "/?domain=" + encodeURIComponent(domain));
  window.scrollTo({ top: 0, behavior: "instant" });
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
      '<p class="panel-note">' +
      badge("fail", "No resolver") +
      '<span>Every resolver is turned off, so nothing was asked. <button class="link-btn" onclick="openSettings()">Turn one on in Settings</button></span></p>';
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
    query: dnsQueryName,
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
      renderSslCard(sslResult);
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
// section instead of leaving the operator to wonder whether they ran at all.
function skippedNote(what, domain) {
  const parent = registeredDomain(domain);
  return (
    '<p class="panel-note">' +
    esc(what) +
    ' is looked up for registered domains only, so it was skipped for <span class="mono">' +
    esc(domain) +
    '</span>. <button class="link-btn mono" data-action="lookup" data-value="' +
    esc(parent) +
    '">Look up ' +
    esc(parent) +
    "</button></p>"
  );
}

function pendingNote(text) {
  return (
    '<p class="pending-text" role="status"><span class="spinner" aria-hidden="true"></span>' +
    esc(text) +
    "</p>"
  );
}

// Times are shown in UTC, ISO 8601, so they match logs and other tools.
function isoUtc(date) {
  return new Date(date)
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d+Z$/, "Z");
}

function isoDate(date) {
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? "Unknown" : d.toISOString().slice(0, 10);
}

// DNS status words are the leading code of the resolver error ("NXDOMAIN (…)").
function errorCode(err) {
  return String(err).split(" (")[0];
}

// The short form that fits a resolver column.
function shortError(err) {
  const code = errorCode(err);
  if (/timeout/i.test(code)) return "TIMEOUT";
  if (/failed to fetch|networkerror|load failed/i.test(code)) return "NO RESPONSE";
  const rcode = String(err).match(/Status: (\d+)/);
  if (rcode) return "RCODE " + rcode[1];
  return code;
}

function isIpValue(value) {
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value) || /^[0-9a-fA-F:]+:[0-9a-fA-F:]+$/.test(value);
}

function resCell(name, inner, cls, title) {
  return (
    '<td class="c-res' +
    (cls ? " " + cls : "") +
    '" data-label="' +
    esc(name) +
    '"' +
    (title ? ' title="' + esc(title) + '"' : "") +
    ">" +
    inner +
    "</td>"
  );
}

function errCell(name, err) {
  return resCell(
    name,
    '<span class="res-code">' + esc(shortError(err)) + "</span>",
    "res-err",
    err,
  );
}

function noDataCell(name) {
  return resCell(
    name,
    '<span class="res-code">NODATA</span>',
    "res-nodata",
    name + " answered with no records",
  );
}

const GROUP_FLAG = { split: "warn", error: "fail", varies: "note" };

// NXDOMAIN is an answer ("this name does not exist"); anything else a
// resolver reports (timeout, network error, SERVFAIL) means it never answered.
function isFailure(r) {
  return !!(r && r.error && errorCode(r.error) !== "NXDOMAIN");
}

// One register group per record type: a row per distinct answer, and one
// column per resolver holding a tick and the TTL it returned, or a dash when
// that resolver did not return the answer. A missing tick is a disagreement.
// A resolver that failed shows its error once and does not count as one: the
// failure is reported against the resolver in the header instead.
function recordGroup(type, section, names, ipLink) {
  const c = section.consensus;
  const results = section.resolvers;
  const failed = names.filter((n) => isFailure(results[n]));
  const answering = names.filter((n) => !failed.includes(n));
  const rows = [];
  let state = "agree";
  let stamp = "";

  if (c && c.values && c.values.length) {
    const diffExists = c.values.some((cv) => answering.some((n) => !cv.confirmedBy.includes(n)));
    const allAnswered = answering.every((n) => (results[n]?.answers || []).length);
    if (diffExists) state = (type === "A" || type === "AAAA") && allAnswered ? "varies" : "split";
    else if (failed.length) state = "partial";
    const ttlBy = {};
    for (const n of names) {
      ttlBy[n] = new Map();
      for (const a of results[n]?.answers || []) {
        ttlBy[n].set(normalizeAnswer(a.data, type), a.TTL);
      }
    }
    c.values.forEach((cv, i) => {
      const value = String(cv.value);
      const norm = normalizeAnswer(value, type);
      const missing = answering.filter((n) => !cv.confirmedBy.includes(n));
      const cells = names
        .map((n) => {
          const r = results[n];
          if (r && r.error) return i === 0 ? errCell(n, r.error) : resCell(n, "", "res-err");
          if (cv.confirmedBy.includes(n)) {
            return resCell(
              n,
              '<span class="tick">' +
                icon("tick") +
                '<span class="sr-only">returned, TTL</span></span><span class="ttl">' +
                esc(ttlBy[n].get(norm) ?? "") +
                "</span>",
            );
          }
          return resCell(
            n,
            '<span class="miss" aria-hidden="true"></span><span class="sr-only">not returned</span>',
            "res-miss",
            "Not returned by " + n,
          );
        })
        .join("");
      const diff = missing.length > 0 && state === "split";
      rows.push(
        '<tr class="rrow' +
          (diff ? " diff" : "") +
          '"><th scope="row" class="c-type">' +
          (i === 0 ? "{TYPE}" : '<span class="sr-only">' + esc(type) + "</span>") +
          '</th><td class="c-val"><span class="v">' +
          (isIpValue(value) ? ipLink(value) : esc(value)) +
          "</span></td>" +
          cells +
          '<td class="c-act">' +
          copyButton(value, type + " value") +
          "</td></tr>",
      );
    });
    if (state === "split") stamp = badge("warn", "Split");
    if (state === "varies")
      stamp =
        '<span class="badge badge-note" title="Every resolver answered, with different addresses. Normal for CDNs and geo-DNS.">Varies</span>';
  } else {
    const nx = answering.filter((n) => results[n]?.error);
    let value = '<span class="empty">No ' + esc(type) + " records</span>";
    if (!answering.length) {
      state = "error";
      const counts = {};
      for (const n of failed) counts[results[n].error] = (counts[results[n].error] || 0) + 1;
      const common = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      value = '<span class="empty txt-fail">No resolver answered: ' + esc(common) + "</span>";
      stamp = badge("fail", "No answer");
    } else if (nx.length === answering.length) {
      state = "error";
      value = '<span class="empty txt-fail">' + esc(results[nx[0]].error) + "</span>";
      stamp = badge("fail", "NXDOMAIN");
    } else if (nx.length) {
      state = "split";
      stamp = badge("warn", "Split");
    } else {
      state = failed.length ? "partial" : "empty";
    }
    const cells = names
      .map((n) => (results[n]?.error ? errCell(n, results[n].error) : noDataCell(n)))
      .join("");
    rows.push(
      '<tr class="rrow' +
        (state === "split" ? " diff" : "") +
        '"><th scope="row" class="c-type">{TYPE}</th><td class="c-val">' +
        value +
        "</td>" +
        cells +
        '<td class="c-act"></td></tr>',
    );
  }

  const typeCell = '<span class="rtype">' + esc(type) + "</span>" + stamp;
  const flag = GROUP_FLAG[state];
  return (
    '<tbody class="rgroup" id="record-' +
    esc(type) +
    '" data-state="' +
    state +
    '"' +
    (flag ? ' data-flag="' + flag + '"' : "") +
    ">" +
    rows.join("").replace("{TYPE}", () => typeCell) +
    "</tbody>"
  );
}

// Every answering resolver said the name does not exist, for every type.
// That is one fact, so it is shown once instead of once per record type.
function nxGroup(dnsTypes, dnsData, names) {
  const any = dnsData[dnsTypes[0]].resolvers;
  const nxName = names.find((n) => any[n]?.error && !isFailure(any[n]));
  const cells = names
    .map((n) => {
      const failures = dnsTypes.filter((t) => isFailure(dnsData[t].resolvers[n]));
      return failures.length
        ? errCell(n, dnsData[failures[0]].resolvers[n].error)
        : errCell(n, any[nxName].error);
    })
    .join("");
  return (
    '<tbody class="rgroup" id="record-all" data-state="error" data-flag="fail"><tr class="rrow"><th scope="row" class="c-type"><span class="rtype">All</span>' +
    badge("fail", "NXDOMAIN") +
    '</th><td class="c-val"><span class="empty txt-fail">' +
    esc(any[nxName].error) +
    '</span><span class="nx-note">Asked for ' +
    esc(dnsTypes.join(", ")) +
    ". Check the spelling, or whether the domain is registered.</span></td>" +
    cells +
    '<td class="c-act"></td></tr></tbody>'
  );
}

function registerTable(names, groups, caption) {
  return (
    '<div class="table-wrap"><table class="table register"><caption class="sr-only">' +
    esc(caption) +
    '</caption><thead><tr><th scope="col" class="c-type">Type</th><th scope="col" class="c-val">Value</th>' +
    names
      .map(
        (n) =>
          '<th scope="col" class="c-res" title="Tick and TTL from ' +
          esc(n) +
          '">' +
          esc(n) +
          "</th>",
      )
      .join("") +
    '<th scope="col" class="c-act"><span class="sr-only">Copy</span></th></tr></thead>' +
    groups +
    "</table></div>"
  );
}

// A row in the mail and CAA registers. Only out-of-range rows carry a stamp;
// the rest show a quiet tick and a word.
function checkRow(o) {
  const status = o.flag
    ? badge(o.flag, o.flagText)
    : '<span class="ok-word">' + icon("tick") + esc(o.okText || "OK") + "</span>";
  return (
    '<tr class="check"' +
    (o.flag ? ' data-flag="' + o.flag + '"' : "") +
    '><th scope="row" class="c-check">' +
    esc(o.check) +
    '</th><td class="c-ref">' +
    o.ref +
    '</td><td class="c-result">' +
    o.result +
    '</td><td class="c-flag">' +
    status +
    "</td></tr>"
  );
}

function checksTable(rows, caption) {
  return (
    '<div class="table-wrap"><table class="table checks"><caption class="sr-only">' +
    esc(caption) +
    '</caption><thead><tr><th scope="col" class="c-check">Record</th><th scope="col" class="c-ref">Queried</th>' +
    '<th scope="col" class="c-result">Answer</th><th scope="col" class="c-flag">Result</th></tr></thead><tbody>' +
    rows +
    "</tbody></table></div>"
  );
}

function panel(id, title, summary, body) {
  return (
    '<section class="card panel" id="panel-' +
    id +
    '" aria-labelledby="panel-' +
    id +
    '-title"><div class="card-head"><h2 id="panel-' +
    id +
    '-title">' +
    esc(title) +
    '</h2><span class="card-meta panel-sum">' +
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
  enter(el.querySelector(".panel-body"), false);
  updateIndex();
}

// Flag counts in the section bar and the stamp in the lookup header,
// recomputed whenever a section changes.
function updateIndex() {
  let fails = 0;
  let warns = 0;
  let pending = 0;
  for (const link of document.querySelectorAll("#sectionBar a[data-panel]")) {
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
    const f = p.querySelectorAll('[data-flag="fail"]').length;
    const w = p.querySelectorAll('[data-flag="warn"]').length;
    fails += f;
    warns += w;
    const n = f + w;
    count.className = "count" + (n ? (f ? " count-fail" : " count-warn") : "");
    count.innerHTML = n
      ? n + '<span class="sr-only"> flagged</span>'
      : esc(link.dataset.total || "") +
        '<span class="sr-only"> ' +
        esc(link.dataset.unit || "") +
        ", none flagged</span>";
  }
  // Resolver failures are flagged once, on the header's resolver cell.
  fails += document.querySelectorAll('.zone [data-flag="fail"]').length;
  warns += document.querySelectorAll('.zone [data-flag="warn"]').length;
  const dns = document.getElementById("panel-dns");
  if (dns)
    dns.dataset.hasDiff = String(!!dns.querySelector('[data-state="split"], [data-state="error"]'));
  const status = document.getElementById("zoneStatus");
  if (!status) return;
  const n = fails + warns;
  if (n) {
    status.innerHTML = badge(fails ? "fail" : "warn", n + (n === 1 ? " issue" : " issues"));
  } else if (pending) {
    status.innerHTML =
      '<span class="badge"><span class="spinner" aria-hidden="true"></span>Checking</span>';
  } else {
    status.innerHTML = badge("ok", "No issues");
  }
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
      (record
        ? '<div class="record"><pre>' +
          esc(record) +
          "</pre>" +
          copyButton(record, check + " record") +
          "</div>"
        : '<div class="status-line">' + esc(status) + "</div>") +
      (record && state === "warn" ? '<div class="status-line">' + esc(status) + "</div>" : "") +
      (note ? '<p class="check-note">' + esc(note) + "</p>" : ""),
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

function cell(label, value, cls, flag) {
  return (
    '<div class="cell' +
    (cls ? " " + cls : "") +
    '"' +
    (flag ? ' data-flag="' + flag + '"' : "") +
    '><dt class="label">' +
    label +
    "</dt><dd>" +
    value +
    "</dd></div>"
  );
}

function renderResults(dnsData, typesRendered, domain, isReverse, dmarcResults, ctx) {
  const container = document.getElementById("results");
  const names = ctx.resolvers;

  // IP values become buttons that open the IP info modal.
  function ipLink(ip) {
    return (
      '<button type="button" class="ip-link" data-action="ip" data-value="' +
      esc(ip) +
      '" title="Network and location for ' +
      esc(ip) +
      '">' +
      esc(ip) +
      "</button>"
    );
  }

  // DNS: CAA lives in the TLS section unless it was chosen as a record type.
  const caaInTls = userSettings.features.enableSecurity && !isReverse;
  const dnsTypes = typesRendered.filter(
    (t) => dnsData[t] && !(t === "CAA" && caaInTls && !userSettings.defaultRecords.includes("CAA")),
  );
  // A name that does not exist has no mail policy or CAA to check.
  const allNx =
    dnsTypes.length > 0 &&
    dnsTypes.every((t) => {
      const rs = Object.values(dnsData[t].resolvers);
      return (
        !dnsData[t].consensus &&
        rs.some((r) => r.error && !isFailure(r)) &&
        rs.every((r) => r.error)
      );
    });
  const showMail = userSettings.features.enableSecurity && !isReverse && !allNx;
  const showRegistry = userSettings.features.enableWhois && !isReverse;
  const showTls = !isReverse && !allNx && (showMail || userSettings.features.enableSsl);
  const subdomain = !isReverse && isSubdomain(domain);
  const answers = dnsTypes.reduce(
    (sum, t) => sum + (dnsData[t].consensus ? dnsData[t].consensus.values.length : 0),
    0,
  );
  const panels = [];
  if (dnsTypes.length || isReverse) {
    panels.push({
      id: "dns",
      title: isReverse ? "Reverse DNS" : "Records",
      total: dnsTypes.length,
      unit: "types",
      html: panel(
        "dns",
        isReverse ? "Reverse DNS" : "Records",
        '<span class="mono">' +
          dnsTypes.length +
          "</span> types · " +
          '<span class="mono">' +
          answers +
          "</span> answers",
        registerTable(
          names,
          allNx
            ? nxGroup(dnsTypes, dnsData, names)
            : dnsTypes.map((t) => recordGroup(t, dnsData[t], names, ipLink)).join(""),
          "DNS records by type, with the TTL each resolver returned",
        ) + '<p class="filter-empty">Every resolver returned the same answers for every type.</p>',
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
        monitoring ? "p=none" : "Found",
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
      total: 3,
      unit: "checks",
      html: panel(
        "mail",
        "Mail",
        '<span class="mono">3</span> checks',
        checksTable(rows, "Mail records"),
      ),
    });
  }

  if (showRegistry) {
    panels.push({
      id: "registry",
      title: "Registry",
      total: "",
      unit: "",
      html: panel(
        "registry",
        "Registry",
        "RDAP · " + esc(rdapSource()),
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
      ? checksTable(caaRow(dnsData, domain), "Certificate authority authorization")
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
    panels.push({
      id: "tls",
      title: "TLS",
      total: "",
      unit: "",
      html: panel(
        "tls",
        "TLS",
        showMail ? "CAA" + (userSettings.features.enableSsl ? " · CT logs" : "") : "CT logs",
        body,
      ),
    });
  }

  // The slowest answer per resolver across every type asked, and how many
  // types it failed to answer at all. A failing resolver is one issue,
  // reported here once rather than on every record type.
  const slowest = {};
  const failures = {};
  const asked = Object.keys(dnsData);
  for (const t of asked) {
    for (const [n, r] of Object.entries(dnsData[t].resolvers)) {
      slowest[n] = Math.max(slowest[n] || 0, r.duration || 0);
      if (isFailure(r)) failures[n] = (failures[n] || []).concat(r.error);
    }
  }
  const failing = names.filter((n) => failures[n]);
  const curl = curlFor(domain);
  const kind = isReverse
    ? 'Reverse (PTR) · <span class="mono">' + esc(latestData.query) + "</span>"
    : subdomain
      ? "Subdomain"
      : "Domain";
  const head =
    '<header class="zone"><div class="zone-title"><h1 class="zone-name mono">' +
    esc(domain) +
    '</h1><span id="zoneStatus" class="zone-status" aria-live="polite"></span></div>' +
    '<dl class="cells zone-cells">' +
    cell("Kind", kind) +
    cell(
      "Resolvers · slowest answer",
      names
        .map(
          (n) =>
            '<span class="res-time">' +
            esc(n) +
            ' <span class="mono ' +
            getTimingClass(slowest[n] || 0) +
            '">' +
            (slowest[n] || 0) +
            " ms</span>" +
            (failures[n]
              ? ' <span class="res-fail" title="' +
                esc(failures[n][0]) +
                '">' +
                esc(shortError(failures[n][0])) +
                " on " +
                failures[n].length +
                "/" +
                asked.length +
                "</span>"
              : "") +
            "</span>",
        )
        .join(""),
      "",
      failing.length ? (failing.length === names.length ? "fail" : "warn") : "",
    ) +
    cell("Queried (UTC)", '<span class="mono">' + esc(isoUtc(latestData.timestamp)) + "</span>") +
    cell(
      "From a terminal",
      '<code class="mono">' + esc(curl) + "</code>" + copyButton(curl, "curl command"),
      "cell-wide",
    ) +
    "</dl></header>";

  const hasDns = panels.some((p) => p.id === "dns");
  const bar =
    '<div class="sectionbar" id="sectionBar"><nav class="sections" aria-label="Sections">' +
    panels
      .map(
        (p) =>
          '<a href="#panel-' +
          p.id +
          '" data-panel="panel-' +
          p.id +
          '" data-total="' +
          esc(p.total) +
          '" data-unit="' +
          esc(p.unit) +
          '">' +
          esc(p.title) +
          '<span class="count"></span></a>',
      )
      .join("") +
    '</nav><div class="bar-tools">' +
    (hasDns
      ? '<label class="filter" title="Shortcut: D"><input type="checkbox" id="onlyDiff"><span class="box" aria-hidden="true">' +
        icon("tick") +
        "</span>Only disagreements</label>"
      : "") +
    '<div class="segmented" id="viewSwitch" role="radiogroup" aria-label="View">' +
    '<label title="Shortcut: 1"><input type="radio" name="resultView" value="form" checked><span>Form</span></label>' +
    '<label title="Shortcut: 2"><input type="radio" name="resultView" value="zone"><span>Zone</span></label>' +
    '<label title="Shortcut: 3"><input type="radio" name="resultView" value="json"><span>JSON</span></label>' +
    "</div>" +
    '<button class="btn" onclick="exportResultJSON()" title="Download this lookup as JSON" aria-label="Export JSON">' +
    icon("download") +
    '<span class="btn-text">Export</span></button>' +
    '<button class="btn btn-primary" data-action="rerun" title="Ask every resolver again" aria-label="Run again">' +
    icon("refresh") +
    '<span class="btn-text">Run again</span></button>' +
    "</div></div>";

  container.innerHTML =
    head +
    bar +
    '<div id="formView">' +
    panels.map((p) => p.html).join("") +
    '</div><div id="zoneView" class="alt-view" hidden></div><div id="jsonView" class="alt-view" hidden></div>';
  updateIndex();
}

// ===== FILTER AND VIEWS =====
function setOnlyDiff(on) {
  const view = document.getElementById("formView");
  if (view) view.classList.toggle("only-diff", on);
}

function setResultView(view) {
  const radio = document.querySelector('input[name="resultView"][value="' + view + '"]');
  if (!radio || !latestData) return;
  radio.checked = true;
  document.getElementById("formView").hidden = view !== "form";
  document.getElementById("zoneView").hidden = view !== "zone";
  document.getElementById("jsonView").hidden = view !== "json";
  enter(document.getElementById(view + "View"), true);
  const filter = document.querySelector(".filter");
  if (filter) filter.classList.toggle("is-off", view !== "form");
  if (view === "zone") renderZoneView();
  if (view === "json") renderJsonView();
}

function altViewHead(label, meta, copyText, copyLabel) {
  return (
    '<div class="alt-head"><span class="label">' +
    esc(label) +
    '</span><span class="alt-meta">' +
    meta +
    "</span>" +
    (copyText
      ? '<button class="copy-btn labelled" data-action="copy" data-value="' +
        esc(copyText) +
        '" aria-label="Copy ' +
        esc(copyLabel) +
        '">' +
        icon("copy") +
        "Copy</button>"
      : "") +
    "</div>"
  );
}

// The answers in zone-file notation: name, TTL, class, type, data. The TTL is
// the first resolver's; answers only some resolvers returned are marked.
function zoneText() {
  const d = latestData;
  const name = d.query.endsWith(".") ? d.query : d.query + ".";
  const types = Object.keys(d.dns);
  const names = types.length ? Object.keys(d.dns[types[0]].resolvers) : [];
  const lines = ["; " + d.domain + "  " + isoUtc(d.timestamp), "; resolvers: " + names.join(", ")];
  for (const type of types) {
    const sec = d.dns[type];
    const c = sec.consensus;
    lines.push("");
    if (!c) {
      const errs = Object.values(sec.resolvers).filter((r) => r.error);
      lines.push(
        errs.length
          ? "; " + type + "  " + errs.map((r) => r.resolver + ": " + errorCode(r.error)).join(", ")
          : "; " + type + "  NODATA",
      );
      continue;
    }
    for (const cv of c.values) {
      const norm = normalizeAnswer(cv.value, type);
      const from = sec.resolvers[cv.confirmedBy[0]];
      const answer = (from.answers || []).find((a) => normalizeAnswer(a.data, type) === norm);
      const data =
        type === "TXT" || type === "SPF"
          ? '"' + String(cv.value).replace(/"/g, '\\"') + '"'
          : cv.value;
      lines.push(
        name +
          "\t" +
          (answer ? answer.TTL : "") +
          "\tIN\t" +
          type +
          "\t" +
          data +
          (cv.confirmedBy.length < c.total ? "\t; only " + cv.confirmedBy.join(", ") : ""),
      );
    }
    for (const f of c.failed)
      lines.push("; " + type + "  " + f.resolver + ": " + errorCode(f.error));
  }
  return lines.join("\n") + "\n";
}

function renderZoneView() {
  const text = zoneText();
  document.getElementById("zoneView").innerHTML =
    altViewHead(
      "Zone file notation",
      "TTL from the first resolver that returned each answer",
      text,
      "zone text",
    ) +
    '<pre class="alt-pre">' +
    esc(text) +
    "</pre>";
}

// The API's own answer for the same URL, which is what the curl line returns.
async function renderJsonView() {
  const el = document.getElementById("jsonView");
  const d = latestData;
  const path = "/" + encodeURI(d.domain) + "?preview";
  if (d.apiJson) {
    el.innerHTML =
      altViewHead("GET " + path, d.apiJson.meta, d.apiJson.body, "API response") +
      '<pre class="alt-pre">' +
      esc(d.apiJson.body) +
      "</pre>";
    return;
  }
  el.innerHTML =
    altViewHead("GET " + path, "Requesting…") + pendingNote("Asking the API for the same lookup…");
  const started = Date.now();
  try {
    const res = await fetch(path, { headers: { accept: "application/json" } });
    const body = await res.text();
    if (latestData !== d) return;
    d.apiJson = {
      body,
      meta:
        '<span class="mono">' +
        res.status +
        "</span> · " +
        '<span class="mono">' +
        (Date.now() - started) +
        " ms</span> · the API's default resolvers",
    };
    renderJsonView();
  } catch (err) {
    if (latestData !== d) return;
    el.innerHTML =
      altViewHead("GET " + path, "Failed") +
      '<p class="panel-note">' +
      badge("fail", "Error") +
      "<span>The API did not answer: " +
      esc(err.message) +
      "</span></p>";
  }
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
  const source = "RDAP · " + esc(rdapSource());
  if (!whoisData || whoisData.error) {
    setPanelBody(
      "registry",
      source,
      '<p class="panel-note">' +
        badge("warn", "No data") +
        "<span>" +
        esc(rdapSource()) +
        " did not return registry data: " +
        esc((whoisData && whoisData.error) || "no response") +
        "</span></p>",
    );
    return;
  }
  const name = whoisData.ldhName || whoisData.handle || domain;
  const statuses = whoisData.status || [];
  const events = whoisData.events || [];
  const eventDate = (action) => {
    const e = events.find((ev) => ev.eventAction === action);
    return e ? e.eventDate : null;
  };
  const nameservers = (whoisData.nameservers || [])
    .map((ns) => ns.ldhName || ns.objectClassName)
    .filter(Boolean)
    .map((ns) => ns.toLowerCase());
  const registrar = (whoisData.entities || []).find((e) => (e.roles || []).includes("registrar"));
  const registrarName =
    registrar && registrar.vcardArray
      ? (registrar.vcardArray[1] || []).find((v) => v[0] === "fn")?.[3]
      : null;

  const mono = (v) => '<span class="mono">' + esc(v) + "</span>";
  const expires = eventDate("expiration");
  let expiresHtml = "Unknown";
  let expiresFlag = "";
  if (expires) {
    const days = Math.floor((new Date(expires) - Date.now()) / 86400000);
    expiresHtml =
      mono(isoDate(expires)) +
      ' <span class="rel">' +
      (days < 0 ? Math.abs(days) + " days ago" : "in " + days + " days") +
      "</span>";
    if (days < 0) {
      expiresFlag = "fail";
      expiresHtml += " " + badge("fail", "Expired");
    } else if (days < 30) {
      expiresFlag = "warn";
      expiresHtml += " " + badge("warn", "Soon");
    }
  }
  const dateCell = (label, action) => {
    const v = eventDate(action);
    return cell(label, v ? mono(isoDate(v)) : '<span class="empty">Unknown</span>');
  };

  setPanelBody(
    "registry",
    source +
      (whoisData._latency ? ' · <span class="mono">' + esc(whoisData._latency) + " ms</span>" : ""),
    '<dl class="cells reg-cells">' +
      cell("Domain", mono(String(name).toLowerCase())) +
      cell("Registrar", registrarName ? esc(registrarName) : '<span class="empty">Unknown</span>') +
      dateCell("Registered", "registration") +
      cell("Expires", expiresHtml, "", expiresFlag) +
      dateCell("Updated", "last changed") +
      cell(
        "Status",
        statuses.length
          ? statuses.map((s) => '<span class="line">' + esc(s) + "</span>").join("")
          : '<span class="empty">None listed</span>',
        "cell-wide",
      ) +
      cell(
        "Nameservers",
        nameservers.length
          ? nameservers.map((ns) => '<span class="line mono">' + esc(ns) + "</span>").join("")
          : '<span class="empty">None listed</span>',
        "cell-wide",
      ) +
      "</dl>" +
      rawJson("Raw RDAP response", JSON.stringify(whoisData, null, 2)),
  );
}

function renderSslCard(sslData) {
  const panelEl = document.getElementById("panel-tls");
  const slot = panelEl && panelEl.querySelector(".tls-certs");
  if (!slot) return;
  const source = userSettings.advanced.sslProvider === "crt.sh" ? "crt.sh" : "CertSpotter";

  let html =
    '<div class="panel-sub"><h3>Recent certificates</h3><span class="card-meta">' +
    esc(source) +
    "</span></div>";
  if (!sslData || sslData.error || (Array.isArray(sslData) && sslData.length === 0)) {
    html +=
      '<p class="panel-note">' +
      esc((sslData && sslData.error) || "No certificates found in the logs.") +
      "</p>";
  } else {
    const records = Array.isArray(sslData) ? sslData.slice(0, 10) : [];
    // CertSpotter answers without issuers; drop the column rather than fill it with "Unknown".
    const hasIssuer = records.some((rec) => rec.issuer_name || (rec.issuer && rec.issuer.name));
    let rows = "";
    for (const rec of records) {
      const subjects = rec.dns_names
        ? rec.dns_names
        : (rec.name_value || "Unknown").split("\n").filter(Boolean);
      const expired = rec.not_after && new Date(rec.not_after) < new Date();
      let issuer = rec.issuer_name || (rec.issuer && rec.issuer.name) || "Unknown issuer";
      if (issuer.includes("CN=")) issuer = issuer.split("CN=")[1].split(",")[0];
      else if (issuer.includes("O=")) issuer = issuer.split("O=")[1].split(",")[0];
      rows +=
        "<tr" +
        (expired ? ' class="expired"' : "") +
        '><td class="c-names mono">' +
        subjects.map((s) => '<span class="line">' + esc(s) + "</span>").join("") +
        (hasIssuer ? '</td><td data-label="Issuer">' + esc(issuer) : "") +
        '</td><td class="c-date mono" data-label="Not before">' +
        esc(rec.not_before ? isoDate(rec.not_before) : "Unknown") +
        '</td><td class="c-date mono" data-label="Not after">' +
        esc(rec.not_after ? isoDate(rec.not_after) : "Unknown") +
        (expired ? ' <span class="badge badge-note">Expired</span>' : "") +
        "</td></tr>";
    }
    html +=
      '<div class="table-wrap"><table class="table certs"><caption class="sr-only">Recent certificates</caption><thead><tr>' +
      '<th scope="col">Hostnames</th>' +
      (hasIssuer ? '<th scope="col" class="c-issuer">Issuer</th>' : "") +
      '<th scope="col" class="c-date">Not before</th><th scope="col" class="c-date">Not after</th>' +
      "</tr></thead><tbody>" +
      rows +
      "</tbody></table></div>" +
      rawJson("Raw certificate response", JSON.stringify(sslData, null, 2));
  }
  slot.innerHTML = html;
  updateIndex();
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
  document.getElementById("homeTag").textContent = titleStr;
  submitOverride = (value) => {
    const v = String(value || "").trim();
    if (v) window.location.href = path + "/" + encodeURIComponent(v);
  };
}

if (domainToLookup) {
  applyView("results");
  lookup(domainToLookup);
} else {
  placeSearch("home");
  focusQuietly();
}

// Back and forward move between lookups instead of leaving the app.
window.addEventListener("popstate", () => {
  const q = new URLSearchParams(location.search).get("domain");
  if (q) lookup(q, true);
  else goHome(true);
});
