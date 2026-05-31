export const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>lookup &middot; Domain / IP</title>
<meta name="description" content="Advanced DNS lookup tool with multi-resolver consensus, security analysis, and IP geolocation.">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin=""/>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%233b82f6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'/%3E%3C/svg%3E">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&family=Fira+Code:wght@400;500;600&display=swap">

<style>
/* === DESIGN TOKENS === */
:root {
  --bg: #131314;
  --bg-rgb: 19, 19, 20;
  --surface: #1E1F22;
  --surface-hover: #2E2F33;
  --border: #44474E;
  --text: #E3E2E6;
  --text-secondary: #C4C6D0;
  --text-muted: #8E9099;
  --accent: #004A77;
  --link: #A8C7FA;
  --link-hover: #D3E3FD;
  --error-bg: #4a1c1c;
  --error-border: #6a2c2c;
  --success: #22c55e;
  --success-rgb: 34, 197, 94;
  --error: #ef4444;
  --error-rgb: 239, 68, 68;
  --warning: #f59e0b;
  --warning-rgb: 245, 158, 11;
  --info: #3b82f6;
  --info-rgb: 59, 130, 246;
  --custom-font: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
}

/* === RESET === */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--custom-font);
  line-height: 1.6;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  transition: background 0.4s ease, color 0.4s ease;
}

body.no-animations *, body.no-animations *::before, body.no-animations *::after {
  animation-duration: 0s !important;
  transition-duration: 0s !important;
}

/* === SCROLLBAR === */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(150, 150, 150, 0.2); border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: rgba(150, 150, 150, 0.4); }

/* === ANIMATIONS === */
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUpFade { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
@keyframes slideDown { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); } 100% { transform: scale(0.95); } }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
@keyframes slideOutRight { from { transform: translateX(0); } to { transform: translateX(100%); } }

/* === HERO / HOME === */
.home {
  display: flex; align-items: center; justify-content: center;
  min-height: 100vh; flex-direction: column; padding: 20px;
  animation: fadeIn 0.2s ease-out; position: relative; width: 100%;
}
.container { width: 100%; max-width: 720px; margin: 0 auto; z-index: 2; position: relative; }

h1 {
  text-align: center; font-size: clamp(40px, 8vw, 64px);
  margin-bottom: 30px; font-weight: 800; letter-spacing: -1px;
}

.search {
  width: 100%; padding: 22px; background: var(--surface);
  border: 1px solid var(--border); border-radius: 28px;
  color: var(--text); font-size: 20px; outline: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  font-family: inherit;
}
.search:focus { border-color: var(--link); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2); transform: translateY(-2px); }
.search::placeholder { color: var(--text-muted); }

.autocomplete-dropdown {
  position: absolute; top: 100%; left: 0; right: 0;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 24px; margin-top: 8px; z-index: 50;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  display: none; overflow: hidden; text-align: left;
}
.autocomplete-dropdown.show { display: block; animation: slideDown 0.15s ease; }
.autocomplete-item {
  padding: 12px 20px; cursor: pointer; color: var(--text-secondary);
  transition: all 0.2s ease; font-family: var(--font-mono); font-size: 15px;
}
.autocomplete-item:hover { background: var(--surface-hover); color: var(--text); }

.toolbar { margin-top: 20px; display: flex; gap: 12px; flex-wrap: wrap; align-items: center; justify-content: center; }

/* === SUBTITLE === */
.brand-subtitle {
  text-align: center; font-size: 14px; color: var(--text-muted);
  margin-top: -18px; margin-bottom: 28px; font-weight: 400;
}
.brand-subtitle kbd {
  display: inline-block; padding: 2px 7px; font-size: 11px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 5px; font-family: var(--font-mono); color: var(--text-secondary);
  margin: 0 1px;
}

/* === QUICK ACTIONS === */
.quick-actions {
  display: flex; gap: 10px; margin-top: 16px;
  justify-content: center; flex-wrap: wrap;
}
.quick-action {
  padding: 8px 16px; border-radius: 16px;
  background: var(--surface); border: 1px solid var(--border);
  color: var(--text-muted); font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all 0.2s ease; font-family: inherit;
}
.quick-action:hover { background: var(--surface-hover); color: var(--text); transform: translateY(-1px); }

/* === HISTORY === */
.history-section { margin-top: 28px; text-align: center; }
.history-label {
  font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;
  color: var(--text-muted); font-weight: 600; margin-bottom: 10px;
}
.history-chips { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.history-chip {
  padding: 6px 14px; border-radius: 999px;
  background: var(--surface); border: 1px solid var(--border);
  color: var(--text-secondary); font-size: 13px;
  cursor: pointer; transition: all 0.2s ease;
  font-family: var(--font-mono); font-weight: 500;
}
.history-chip:hover { background: var(--surface-hover); color: var(--text); }
.history-chip .x {
  margin-left: 6px; opacity: 0; font-size: 11px;
  transition: opacity 0.15s ease;
}
.history-chip:hover .x { opacity: 0.7; }

/* === BUTTONS === */
button:not(.icon-btn):not(.scroll-top):not(.quick-action):not(.copy-btn):not(.record-pill) {
  background: var(--surface); color: var(--text); border: 1px solid var(--border);
  border-radius: 999px; padding: 12px 20px; font-size: 15px; font-weight: 500;
  cursor: pointer; transition: all 0.2s ease; font-family: inherit;
}
button:not(.icon-btn):not(.scroll-top):not(.quick-action):not(.copy-btn):not(.record-pill):hover {
  background: var(--surface-hover); transform: translateY(-1px);
}
button:not(.icon-btn):not(.scroll-top):not(.quick-action):not(.copy-btn):not(.record-pill):active { transform: translateY(1px); }
button:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }

.btn-sm { padding: 8px 14px !important; font-size: 13px !important; border-radius: 999px !important; }
.btn-ghost { background: transparent !important; border-color: transparent !important; }
.btn-ghost:hover { background: var(--surface) !important; border-color: var(--border) !important; }
.btn-danger { background: var(--error-bg) !important; border-color: var(--error-border) !important; color: #ffb4b4 !important; }
.btn-danger:hover { background: #5a2222 !important; }

/* === ICON BUTTON === */
.icon-btn {
  background: transparent; border: none; padding: 10px;
  color: var(--text-muted); display: flex; align-items: center;
  justify-content: center; cursor: pointer;
  transition: color 0.2s ease, transform 0.3s ease, background 0.2s ease;
  border-radius: 50%; width: 42px; height: 42px;
}
.icon-btn:hover { color: var(--text); transform: rotate(45deg); background: var(--surface-hover); }
.icon-btn.no-rotate:hover { transform: translateY(-2px); }
.icon-btn svg {
  width: 20px; height: 20px; fill: none; stroke: currentColor;
  stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
}

/* === CORNER === */
.corner-actions { position: absolute; top: 24px; right: 24px; z-index: 100; display: flex; gap: 8px; }

/* === SCROLL TOP === */
.scroll-top {
  position: fixed; bottom: 30px; right: 30px; width: 48px; height: 48px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 50%;
  color: var(--text); display: flex; align-items: center; justify-content: center;
  z-index: 90; cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  opacity: 0; transform: translateY(20px); pointer-events: none;
  box-shadow: 0 10px 20px rgba(0,0,0,0.3);
}
.scroll-top svg { width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.scroll-top.visible { opacity: 1; transform: translateY(0); pointer-events: auto; }
.scroll-top:hover { background: var(--surface-hover); color: var(--link); border-color: var(--link); transform: translateY(-3px); }

/* === RESULTS PAGE === */
.results-page { display: none; min-height: 100vh; }
.results-page.active { display: block; }

/* === TOPBAR === */
.topbar-wrapper {
  position: sticky; top: 0; z-index: 100; padding: 12px 16px;
  display: flex; justify-content: center; width: 100%;
  background: rgba(var(--bg-rgb), 0.85);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  animation: slideDown 0.3s ease;
}
.topbar {
  display: flex; gap: 12px; align-items: center;
  width: 100%; max-width: 800px;
}
.topbar .search {
  padding: 14px 20px; font-size: 16px; border-radius: 14px;
  margin: 0; flex: 1; box-shadow: none; width: 100%;
}
.topbar .search:focus { transform: none; }
.topbar .toolbar { margin-top: 0; display: flex; gap: 8px; flex-shrink: 0; }
.topbar .toolbar button:not(.icon-btn) { padding: 14px 20px; }

/* === RESULTS CONTAINER === */
.results { max-width: 1100px; margin: 0 auto; padding: 0 30px 80px 30px; animation: fadeIn 0.2s ease; }

/* === DOMAIN HEADER === */
.domain-header {
  margin-top: 28px; margin-bottom: 24px;
  animation: slideUpFade 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.domain-header h2 {
  font-size: 26px; font-weight: 800; letter-spacing: -0.5px;
  margin-bottom: 4px; display: flex; align-items: center; gap: 10px;
}
.domain-header .meta {
  font-size: 13px; color: var(--text-muted);
  display: flex; gap: 16px; align-items: center; flex-wrap: wrap;
}

/* === RECORD PILLS === */
.record-overview {
  display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px;
  animation: slideUpFade 0.2s cubic-bezier(0.16, 1, 0.3, 1) 0.05s both;
}
.record-pill {
  display: inline-flex; align-items: center; justify-content: center; text-align: center;
  padding: 5px 12px; border-radius: 999px;
  font-size: 12px; font-weight: 700; letter-spacing: 0.5px;
  font-family: var(--font-mono); cursor: pointer;
  transition: all 0.2s ease; border: 1px solid var(--border);
  background: var(--surface);
}
.record-pill.has-data { background: rgba(var(--success-rgb), 0.08); color: var(--success); border-color: rgba(var(--success-rgb), 0.2); }
.record-pill.no-data { color: var(--text-muted); }
.record-pill:hover { transform: translateY(-1px); }

/* === CARD === */
.card {
  background: var(--surface); border: 1px solid var(--border); border-radius: 24px;
  padding: 24px; margin-top: 24px; opacity: 0;
  animation: slideUpFade 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  box-shadow: 0 4px 24px rgba(0,0,0,0.05);
  transition: transform 0.2s ease, border-color 0.2s ease;
}
.card:hover { border-color: var(--accent); }
.card-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
}
.card-title {
  font-size: 20px; font-weight: 700; letter-spacing: -0.3px;
  display: flex; align-items: center; gap: 10px; margin-top: 0;
}
.type-badge {
  display: inline-flex; align-items: center; justify-content: center; text-align: center;
  padding: 4px 10px; border-radius: 12px;
  background: var(--bg); border: 1px solid var(--border);
  font-size: 12px; font-weight: 700; font-family: var(--font-mono);
  letter-spacing: 0.5px; color: var(--link);
}

/* === CONSENSUS === */
.consensus {
  background: var(--bg); border: 1px solid var(--border);
  border-radius: 24px; padding: 16px; margin-bottom: 12px;
}
.consensus-value {
  font-size: 17px; font-weight: 700; font-family: var(--font-mono);
  word-break: break-all; margin-bottom: 4px; line-height: 1.5;
}
.consensus-meta { font-size: 13px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
.consensus-meta .check { color: var(--success); }
.consensus-divider { border-top: 1px solid var(--border); margin: 10px 0; }
.consensus-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }

/* === COPY BUTTON === */
.copy-btn {
  padding: 6px 16px; border-radius: 999px;
  background: var(--surface-hover); border: none;
  color: var(--text); font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); font-family: inherit;
  display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
}
.copy-btn:hover { background: var(--border); transform: scale(1.02); }
.copy-btn.copied { background: rgba(var(--success-rgb), 0.15); color: var(--success); transform: scale(1); }

/* === TIMING CHART === */
.timing-chart { display: flex; gap: 6px; align-items: flex-end; height: 60px; margin: 16px 0 8px; padding: 12px 0; }
.timing-bar-wrapper { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end; }
.timing-bar { width: 100%; max-width: 60px; border-radius: 4px 4px 0 0; min-height: 4px; transition: height 0.5s ease; }
.timing-bar.fast { background: linear-gradient(to top, var(--success), rgba(var(--success-rgb), 0.4)); }
.timing-bar.medium { background: linear-gradient(to top, var(--warning), rgba(var(--warning-rgb), 0.4)); }
.timing-bar.slow { background: linear-gradient(to top, var(--error), rgba(var(--error-rgb), 0.4)); }
.timing-label { font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); white-space: nowrap; max-width: 70px; overflow: hidden; text-overflow: ellipsis; }
.timing-value { font-size: 10px; font-family: var(--font-mono); font-weight: 600; }
.timing-value.fast { color: var(--success); }
.timing-value.medium { color: var(--warning); }
.timing-value.slow { color: var(--error); }

/* === RESOLVER DETAILS === */
.resolver-result {
  padding: 14px 16px; border-radius: 24px;
  background: var(--bg); border: 1px solid var(--border);
  margin-bottom: 8px; transition: border-color 0.15s ease;
}
.resolver-result:hover { border-color: var(--accent); }
.resolver-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.resolver-name { font-weight: 600; font-size: 14px; }
.resolver-timing {
  font-size: 12px; font-family: var(--font-mono); color: var(--text-muted);
  padding: 3px 8px; border-radius: 8px; background: var(--surface);
}
.resolver-timing.fast { color: var(--success); }
.resolver-timing.medium { color: var(--warning); }
.resolver-timing.slow { color: var(--error); }

/* === RAW DETAILS === */
details { margin-top: 16px; }
summary {
  cursor: pointer; opacity: 0.8; font-weight: 600; user-select: none;
  transition: opacity 0.2s; padding: 8px 0; font-size: 14px;
  display: flex; align-items: center; gap: 6px;
}
summary:hover { opacity: 1; color: var(--link); }
summary::marker { content: ''; }
.chevron { transition: transform 0.25s ease; width: 14px; height: 14px; }
details[open] summary .chevron { transform: rotate(90deg); }
pre {
  white-space: pre-wrap; overflow-x: auto; font-size: 13px; color: var(--text-muted);
  background: var(--bg); padding: 16px; border-radius: 12px; border: 1px solid var(--border);
  font-family: var(--font-mono); margin-top: 8px; word-break: break-all; line-height: 1.7;
}

/* === SECURITY CARD === */
.security-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px; margin-top: 16px;
}
.security-item {
  padding: 16px; border-radius: 24px;
  background: var(--bg); border: 1px solid var(--border);
}
.security-item .label {
  font-size: 12px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 1px; margin-bottom: 6px;
}
.security-item .status { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
.security-item.found .label { color: var(--success); }
.security-item.found { border-color: rgba(var(--success-rgb), 0.15); }
.security-item.missing .label { color: var(--error); }
.security-item.missing { border-color: rgba(var(--error-rgb), 0.1); }

/* === WHOIS === */
.whois-grid {
  display: grid; grid-template-columns: auto 1fr; gap: 6px 16px;
  font-size: 13px; line-height: 1.8;
}
.whois-grid .wlabel { color: var(--text-muted); font-weight: 600; white-space: nowrap; }
.whois-grid .wvalue { color: var(--text-secondary); font-family: var(--font-mono); word-break: break-all; }

/* === IP LINK === */
.ip-link { color: var(--link); text-decoration: underline; cursor: pointer; transition: color 0.2s; }
.ip-link:hover { color: var(--link-hover); }

/* === BADGE === */
.badge {
  display: inline-block; margin-top: 8px; margin-right: 10px;
  background: var(--bg); border: 1px solid var(--border);
  border-radius: 999px; padding: 6px 14px; font-size: 13px; font-weight: 500;
}
.error-badge { background: var(--error-bg); border-color: var(--error-border); color: #ffb4b4; }

/* === LOADER === */
.loader-container {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; margin-top: 80px; gap: 20px; animation: fadeIn 0.15s;
}
.loader-dot { width: 24px; height: 24px; background: var(--link); border-radius: 50%; animation: pulse 1.5s infinite; }
.loader-text { color: var(--text-muted); font-size: 14px; }
.skeleton-area { max-width: 1100px; margin: 24px auto 0; padding: 0 30px; }
.skeleton-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 20px; padding: 24px; margin-bottom: 20px; animation: fadeIn 0.2s ease;
}
.skeleton-line {
  height: 14px; border-radius: 6px; margin-bottom: 12px;
  background: linear-gradient(90deg, var(--surface-hover) 25%, #1e1e1e 50%, var(--surface-hover) 75%);
  background-size: 200% 100%; animation: shimmer 1.5s infinite;
}
.skeleton-line.w-40 { width: 40%; }
.skeleton-line.w-60 { width: 60%; }
.skeleton-line.w-80 { width: 80%; }
.skeleton-line.h-20 { height: 20px; }

/* === MODAL === */
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.75); backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  z-index: 999; animation: fadeIn 0.2s ease-out;
}
.modal-overlay.hidden { display: none; }
.modal {
  background: var(--surface); border: 1px solid var(--border); border-radius: 32px;
  padding: 30px; width: 90%; max-width: 600px; position: relative;
  max-height: 85vh; overflow-y: auto; overflow-x: hidden;
  box-shadow: 0 25px 50px rgba(0,0,0,0.5); overscroll-behavior: contain;
}
.modal h2 { font-size: 22px; font-weight: 800; margin-bottom: 16px; }
.modal-close {
  position: absolute; top: 20px; right: 24px; cursor: pointer;
  font-size: 28px; line-height: 1; opacity: 0.5; transition: opacity 0.2s; z-index: 2;
}
.modal-close:hover { opacity: 1; }
#map { height: 280px; width: 100%; border-radius: 16px; margin-top: 20px; background: var(--bg); border: 1px solid var(--border); }
.modal-detail-grid {
  display: grid; grid-template-columns: auto 1fr; gap: 8px 16px;
  font-size: 14px; line-height: 1.8;
}
.modal-detail-grid .label { color: var(--text-muted); font-weight: 600; }
.modal-detail-grid .value { color: var(--text); font-family: var(--font-mono); font-size: 13px; }

/* === SETTINGS DRAWER === */
.settings-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 900; animation: fadeIn 0.2s ease;
}
.settings-overlay.hidden { display: none; }
.settings-drawer {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: min(480px, 90vw); background: var(--surface);
  border-left: 1px solid var(--border);
  z-index: 901; overflow-y: auto; overflow-x: hidden;
  animation: slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: -20px 0 60px rgba(0,0,0,0.5);
}
.settings-drawer.closing { animation: slideOutRight 0.15s ease forwards; }
.settings-header {
  position: sticky; top: 0; z-index: 2;
  padding: 24px 28px 20px; display: flex;
  justify-content: space-between; align-items: center;
  background: var(--surface); border-bottom: 1px solid var(--border);
}
.settings-header h2 { font-size: 20px; font-weight: 800; margin: 0; }
.settings-body { padding: 8px 28px 40px; }

.settings-section { padding: 24px 0; border-bottom: 1px solid var(--border); }
.settings-section:last-child { border-bottom: none; }
.settings-section-title {
  font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;
  color: var(--text-muted); font-weight: 700; margin-bottom: 16px;
}

.setting-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 24px; margin-bottom: 8px;
  background: var(--bg); border: 1px solid var(--border);
  border-radius: 24px; transition: border-color 0.2s ease;
}
.setting-row:hover { border-color: var(--accent); }
.setting-label strong { display: block; font-size: 14px; font-weight: 600; margin-bottom: 2px; }
.setting-label span { font-size: 12px; color: var(--text-muted); }

/* === TOGGLE === */
.toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider {
  position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
  background-color: var(--surface-hover); transition: .3s; border-radius: 24px;
  border: 1px solid var(--border);
}
.toggle-slider:before {
  position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px;
  background-color: var(--text-muted); transition: .3s; border-radius: 50%;
}
.toggle-switch input:checked + .toggle-slider { background-color: var(--link); border-color: var(--link); }
.toggle-switch input:checked + .toggle-slider:before { transform: translateX(20px); background-color: #fff; }

/* === SELECTABLE TAG === */
.selectable-tag {
  display: inline-flex; align-items: center; justify-content: center; text-align: center;
  padding: 8px 16px;
  border-radius: 16px; cursor: pointer; transition: all 0.2s ease;
  font-weight: 500; font-size: 14px; user-select: none;
  border: 1px solid var(--error);
  background: rgba(var(--error-rgb), 0.05);
  color: var(--error);
}
.selectable-tag:hover { background: rgba(var(--error-rgb), 0.1); }
.selectable-tag.active {
  border-color: var(--success);
  background: rgba(var(--success-rgb), 0.1);
  color: var(--success);
  box-shadow: 0 0 10px rgba(var(--success-rgb), 0.15);
}

/* === RESOLVER CARD === */
.selectable-row {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 10px; padding: 16px 24px;
  border-radius: 24px; transition: all 0.2s ease;
  cursor: pointer; user-select: none;
  border: 1px solid var(--error);
  background: rgba(var(--error-rgb), 0.05);
}
.selectable-row .row-title { color: var(--error); transition: color 0.2s; }
.selectable-row:hover { background: rgba(var(--error-rgb), 0.1); }
.selectable-row.active {
  border-color: var(--success);
  background: rgba(var(--success-rgb), 0.05);
  box-shadow: 0 0 10px rgba(var(--success-rgb), 0.1);
}
.selectable-row.active .row-title { color: var(--success); }

/* === SETTINGS INPUTS === */
.settings-input, select {
  width: 100%; padding: 16px 24px; border-radius: 24px;
  background: var(--bg); border: 1px solid var(--border);
  color: var(--text); font-size: 14px; font-family: inherit;
  outline: none; transition: border-color 0.2s ease; cursor: text;
}
select { cursor: pointer; }
.settings-input:focus, select:focus { border-color: var(--link); }
.settings-input::placeholder { color: var(--text-muted); }
input[type="number"] { -moz-appearance: textfield; }

.resolver-input-group { display: grid; grid-template-columns: 1fr 2fr auto; gap: 8px; margin-top: 12px; }

/* === THEME EDITOR === */
.theme-editor {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px;
  padding: 16px; background: var(--bg); border-radius: 12px;
  border: 1px solid var(--border); animation: slideUpFade 0.2s ease forwards;
}
.color-picker-group { display: flex; align-items: center; gap: 10px; }
input[type="color"] {
  -webkit-appearance: none; border: 1px solid var(--border);
  width: 32px; height: 32px; border-radius: 8px; cursor: pointer; padding: 0; background: none;
}
input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
input[type="color"]::-webkit-color-swatch { border: none; border-radius: 6px; }

/* === FONT PRESETS === */
.font-presets { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.font-preset-tag {
  padding: 6px 12px; border-radius: 10px;
  background: var(--bg); border: 1px solid var(--border);
  color: var(--text-muted); font-size: 13px; cursor: pointer;
  transition: all 0.2s ease;
}
.font-preset-tag:hover { border-color: var(--accent); color: var(--text-secondary); }
.font-preset-tag.active { border-color: var(--link); color: var(--link); background: rgba(var(--info-rgb), 0.05); }

/* === TOAST === */
.toast-container {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  z-index: 2000; display: flex; flex-direction: column; gap: 8px; align-items: center;
}
.toast {
  padding: 12px 20px; border-radius: 14px;
  background: var(--surface); border: 1px solid var(--border);
  color: var(--text); font-size: 13px; font-weight: 500;
  box-shadow: 0 10px 30px rgba(0,0,0,0.4);
  animation: slideUpFade 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex; align-items: center; gap: 8px;
}

/* === DATA BUTTONS === */
.data-buttons { display: flex; gap: 10px; flex-wrap: wrap; }

.gear-icon { width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.small { opacity: 0.7; font-size: 14px; }
.hidden { display: none !important; }

/* === RESPONSIVE === */
@media (max-width: 640px) {
  .topbar { flex-direction: column; gap: 8px; }
  .topbar .search { width: 100%; }
  .topbar .toolbar { width: 100%; justify-content: flex-end; }
  .results { padding: 0 16px 80px; }
  .card { padding: 20px; }
  .security-grid { grid-template-columns: 1fr; }
  .resolver-input-group { grid-template-columns: 1fr; }
  .theme-editor { grid-template-columns: 1fr; }
  .corner-actions { top: 16px; right: 16px; }
  .domain-header h2 { font-size: 22px; }
}
</style>
</head>

<body>

<!-- Scroll Top -->
<button id="scrollTopBtn" class="scroll-top" onclick="window.scrollTo({top: 0, behavior: 'smooth'})" title="Back to top">
  <svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
</button>

<!-- Toast Container -->
<div id="toastContainer" class="toast-container"></div>

<!-- IP Modal -->
<div id="ipModal" class="modal-overlay hidden" onclick="if(event.target===this) closeModal('ipModal')">
  <div class="modal">
    <div class="modal-close" onclick="closeModal('ipModal')">&times;</div>
    <h2 id="modalTitle">IP Info</h2>
    <div id="modalDetails" class="small" style="line-height: 1.6; font-size: 15px;">Loading...</div>
    <div id="map"></div>
  </div>
</div>

<!-- Help Modal -->
<div id="helpModal" class="modal-overlay hidden" onclick="if(event.target===this) closeModal('helpModal')">
  <div class="modal" style="max-width: 400px;">
    <div class="modal-close" onclick="closeModal('helpModal')">&times;</div>
    <h2>Keyboard Shortcuts</h2>
    <div class="modal-detail-grid" style="margin-top: 16px;">
      <span class="label"><kbd>Ctrl</kbd> + <kbd>K</kbd></span><span class="value">Search</span>
      <span class="label"><kbd>Ctrl</kbd> + <kbd>,</kbd></span><span class="value">Settings</span>
      <span class="label"><kbd>Enter</kbd></span><span class="value">Run Lookup</span>
      <span class="label"><kbd>Esc</kbd></span><span class="value">Close</span>
    </div>
  </div>
</div>

<!-- Settings Drawer -->
<div id="settingsOverlay" class="settings-overlay hidden" onclick="closeSettings()"></div>
<div id="settingsDrawer" class="settings-drawer hidden">
  <div class="settings-header">
    <h2>Settings</h2>
    <button class="icon-btn no-rotate" onclick="closeSettings()" title="Close" style="border-radius:12px;">
      <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
  </div>
  <div class="settings-body">

    <!-- APPEARANCE -->
    <div class="settings-section">
      <div class="settings-section-title">Appearance</div>

      <select id="themeSelect" onchange="changeTheme()" style="margin-bottom: 8px;">
        <option value="custom">Custom Theme</option>
        <option value="default">Material You Dark</option>
        <option value="materialYouLight">Material You Light</option>
        <option value="catppuccin">Catppuccin Mocha</option>
        <option value="nord">Nord</option>
        <option value="tokyo">Tokyo Night</option>
        <option value="dracula">Dracula</option>
        <option value="github-dark">GitHub Dark</option>
      </select>

      <div id="customThemeEditor" class="theme-editor hidden">
        <div class="color-picker-group"><input type="color" id="cBg" onchange="updateCustomTheme()"> <span class="small">Background</span></div>
        <div class="color-picker-group"><input type="color" id="cSurface" onchange="updateCustomTheme()"> <span class="small">Cards</span></div>
        <div class="color-picker-group"><input type="color" id="cAccent" onchange="updateCustomTheme()"> <span class="small">Accent</span></div>
        <div class="color-picker-group"><input type="color" id="cLink" onchange="updateCustomTheme()"> <span class="small">Links</span></div>
        <div class="color-picker-group"><input type="color" id="cSuccess" onchange="updateCustomTheme()"> <span class="small">Enabled</span></div>
        <div class="color-picker-group"><input type="color" id="cError" onchange="updateCustomTheme()"> <span class="small">Disabled</span></div>
      </div>

      <div style="margin-top: 24px;">
        <span class="small" style="display:block; margin-bottom: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Typography</span>
        <div class="font-presets" id="fontPresets">
          <div class="font-preset-tag active" data-font="Roboto" style="font-family: 'Roboto', sans-serif;" onclick="applyFont('Roboto')">Roboto</div>
          <div class="font-preset-tag" data-font="JetBrains Mono" style="font-family: 'JetBrains Mono', monospace;" onclick="applyFont('JetBrains Mono')">JetBrains</div>
          <div class="font-preset-tag" data-font="Space Grotesk" style="font-family: 'Space Grotesk', sans-serif;" onclick="applyFont('Space Grotesk')">Space Grotesk</div>
          <div class="font-preset-tag" data-font="Outfit" style="font-family: 'Outfit', sans-serif;" onclick="applyFont('Outfit')">Outfit</div>
          <div class="font-preset-tag" data-font="Fira Code" style="font-family: 'Fira Code', monospace;" onclick="applyFont('Fira Code')">Fira Code</div>
        </div>
        <input type="text" class="settings-input" id="customFontInput" placeholder="Or type any Google Font (e.g. Roboto)" onchange="applyFont(this.value)">
      </div>
    </div>

    <!-- FEATURES -->
    <div class="settings-section">
      <div class="settings-section-title">Features & Advanced</div>
      <div class="setting-row">
        <div class="setting-label">
          <strong>Enable Animations</strong>
          <span>Smooth transitions and fading effects</span>
        </div>
        <label class="toggle-switch"><input type="checkbox" id="setAnimations" onchange="toggleSetting('features','animations',this.checked)"><span class="toggle-slider"></span></label>
      </div>
      <div class="setting-row">
        <div class="setting-label">
          <strong>Enable WHOIS / RDAP</strong>
          <span>Query registry data for domains</span>
        </div>
        <label class="toggle-switch"><input type="checkbox" id="setWhois" onchange="toggleSetting('features','enableWhois',this.checked)"><span class="toggle-slider"></span></label>
      </div>
      <div class="setting-row">
        <div class="setting-label">
          <strong>Security Analysis</strong>
          <span>Detect SPF, DMARC, DKIM, CAA records</span>
        </div>
        <label class="toggle-switch"><input type="checkbox" id="setSecurity" onchange="toggleSetting('features','enableSecurity',this.checked)"><span class="toggle-slider"></span></label>
      </div>
      <div style="margin-top: 12px;">
        <span class="small" style="display:block; margin-bottom: 6px;">RDAP Server URL</span>
        <input type="text" class="settings-input" id="setRdapServer" onchange="updateSettingText('advanced','rdapServer',this.value)" placeholder="https://rdap.org/domain/">
      </div>
      <div style="margin-top: 12px;">
        <span class="small" style="display:block; margin-bottom: 6px;">Resolver Timeout (ms)</span>
        <input type="number" class="settings-input" id="setTimeout" onchange="updateSettingText('advanced','timeout',parseInt(this.value))" placeholder="5000">
      </div>
    </div>

    <!-- DEFAULT RECORDS -->
    <div class="settings-section">
      <div class="settings-section-title">Default Query Records</div>
      <span class="small" style="display:block; margin-bottom: 12px;">Click to toggle which records are queried.</span>
      <div id="recordCheckboxes" style="display: flex; gap: 8px; flex-wrap: wrap;"></div>
    </div>

    <!-- RESOLVERS -->
    <div class="settings-section">
      <div class="settings-section-title">Resolvers</div>
      <span class="small" style="display:block; margin-bottom: 12px;">Click a card to enable/disable the resolver.</span>
      <div id="resolverList"></div>
      <div class="resolver-input-group">
        <input type="text" class="settings-input" id="newResName" placeholder="Name">
        <input type="text" class="settings-input" id="newResUrl" placeholder="https://...">
        <button onclick="addResolver()">Save</button>
      </div>
    </div>

    <!-- HELP & DOCS -->
    <div class="settings-section">
      <div class="settings-section-title">Documentation & Help</div>
      <div class="setting-row">
        <div class="setting-label">
          <strong>API Documentation</strong>
          <span>View developer endpoints</span>
        </div>
        <button onclick="window.location.href='/api-docs'">View</button>
      </div>
      <div class="setting-row">
        <div class="setting-label">
          <strong>Keybindings</strong>
          <span>Keyboard shortcuts and hotkeys</span>
        </div>
        <button onclick="document.getElementById('helpModal').classList.remove('hidden')">View</button>
      </div>
    </div>

    <!-- DATA MANAGEMENT -->
    <div class="settings-section">
      <div class="settings-section-title">Settings Management</div>
      <div class="setting-row">
        <div class="setting-label">
          <strong>Export Settings</strong>
          <span>Save your configuration</span>
        </div>
        <button onclick="exportSettings()">Export</button>
      </div>
      <div class="setting-row">
        <div class="setting-label">
          <strong>Import Settings</strong>
          <span>Load a configuration</span>
        </div>
        <button onclick="document.getElementById('importFile').click()">Import</button>
        <input type="file" id="importFile" class="hidden" accept=".json" onchange="importSettings(event)">
      </div>
    </div>
    
    <!-- DANGER ZONE -->
    <div class="settings-section" style="border-bottom:none; border-top: 1px solid rgba(255, 97, 136, 0.2); background: rgba(255, 97, 136, 0.05); margin: 0 -28px -40px -28px; padding: 24px 28px;">
      <div class="settings-section-title" style="color: #ff6188; display:flex; align-items:center; gap:8px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> 
        DANGER ZONE
      </div>
      <div class="setting-row" style="border-color: rgba(255, 97, 136, 0.3);">
        <div class="setting-label">
          <strong style="color: #ffb4b4;">Clear History</strong>
          <span>Delete all recent lookups</span>
        </div>
        <button class="btn-danger" onclick="clearHistory()">Clear</button>
      </div>
      <div class="setting-row" style="border-color: rgba(255, 97, 136, 0.3);">
        <div class="setting-label">
          <strong style="color: #ffb4b4;">Factory Reset</strong>
          <span>Reset all settings to default</span>
        </div>
        <button class="btn-danger" onclick="resetSettings()">Reset</button>
      </div>
    </div>
  </div>
</div>

<!-- ===== HOME PAGE ===== -->
<div class="home" id="homePage">
  <div class="corner-actions">
    <button class="icon-btn" onclick="openSettings()" title="Settings (Ctrl+,)">
      <svg class="gear-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
    </button>
  </div>

  <div class="container">
    <h1>lookup</h1>
    <div style="position:relative; width:100%;">
      <input id="domainHome" class="search" placeholder="google.com or 8.8.8.8" autocomplete="off" spellcheck="false" onkeydown="handleEnter(event, 'domainHome')" oninput="handleAutocomplete(event, 'homeDropdown')" />
      <div id="homeDropdown" class="autocomplete-dropdown"></div>
    </div>
    <div class="toolbar">
      <button onclick="triggerLookup('domainHome')">Lookup Data</button>
    </div>



    <div id="historySection" class="history-section hidden">
      <div class="history-label">Recent Lookups</div>
      <div id="historyChips" class="history-chips"></div>
    </div>
  </div>
</div>

<!-- ===== RESULTS PAGE ===== -->
<div id="resultsPage" class="results-page">
  <div class="topbar-wrapper">
    <div class="topbar">
      <div style="position:relative; flex:1; width:100%;">
        <input id="domainTop" class="search" autocomplete="off" spellcheck="false" onkeydown="handleEnter(event, 'domainTop')" placeholder="google.com or 8.8.8.8" oninput="handleAutocomplete(event, 'topDropdown')" />
        <div id="topDropdown" class="autocomplete-dropdown"></div>
      </div>
      <div class="toolbar">
        <button onclick="triggerLookup('domainTop')">Lookup</button>
        <button class="icon-btn" onclick="openSettings()" title="Settings">
          <svg class="gear-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        </button>
        <button class="icon-btn no-rotate" onclick="exportResultJSON()" title="Export JSON">
          <svg class="gear-icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        </button>
        <button class="icon-btn no-rotate" onclick="goHome()" title="Home">
          <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </button>
      </div>
    </div>
  </div>

  <div id="loading" class="hidden">
    <div class="loader-container">
      <div class="loader-dot"></div>
      <div class="loader-text">Querying servers...</div>
    </div>
    <div class="skeleton-area">
      <div class="skeleton-card"><div class="skeleton-line h-20 w-40"></div><div class="skeleton-line w-80"></div><div class="skeleton-line w-60"></div></div>
      <div class="skeleton-card"><div class="skeleton-line h-20 w-40"></div><div class="skeleton-line w-60"></div><div class="skeleton-line w-80"></div></div>
    </div>
  </div>

  <div id="results" class="results"></div>
</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>

<script>
// ===== GLOBALS =====
let latestData = null;
let leafletMap = null;
let queryHistory = JSON.parse(localStorage.getItem('lookup_history') || '[]');

const themes = {
  default: { bg:'#131314', surface:'#1E1F22', surfaceHover:'#2E2F33', border:'#44474E', text:'#E3E2E6', textMuted:'#8E9099', accent:'#004A77', link:'#A8C7FA', linkHover:'#D3E3FD', errorBg:'#8C1D18', errorBorder:'#F2B8B5', success:'#6DD58C', error:'#F2B8B5' }, materialYouLight: { bg:'#FDFBFF', surface:'#F0F0F4', surfaceHover:'#E2E2E9', border:'#C4C6D0', text:'#1A1B1F', textMuted:'#44474E', accent:'#A8C7FA', link:'#005B8F', linkHover:'#004A77', errorBg:'#F9DEDC', errorBorder:'#F2B8B5', success:'#006D3A', error:'#B3261E' },
  catppuccin: { bg:'#1e1e2e', surface:'#181825', surfaceHover:'#313244', border:'#45475a', text:'#cdd6f4', textMuted:'#a6adc8', accent:'#cba6f7', link:'#89b4fa', linkHover:'#b4befe', errorBg:'#592030', errorBorder:'#8a2b45', success:'#a6e3a1', error:'#f38ba8' },
  nord: { bg:'#2e3440', surface:'#3b4252', surfaceHover:'#434c5e', border:'#4c566a', text:'#eceff4', textMuted:'#d8dee9', accent:'#88c0d0', link:'#81a1c1', linkHover:'#88c0d0', errorBg:'#bf616a33', errorBorder:'#bf616a', success:'#a3be8c', error:'#bf616a' },
  tokyo: { bg:'#1a1b26', surface:'#24283b', surfaceHover:'#292e42', border:'#414868', text:'#c0caf5', textMuted:'#a9b1d6', accent:'#7aa2f7', link:'#7dcfff', linkHover:'#b4f9f8', errorBg:'#db4b4b33', errorBorder:'#db4b4b', success:'#9ece6a', error:'#f7768e' },
  dracula: { bg:'#282a36', surface:'#21222c', surfaceHover:'#343746', border:'#44475a', text:'#f8f8f2', textMuted:'#6272a4', accent:'#bd93f9', link:'#8be9fd', linkHover:'#ff79c6', errorBg:'rgba(255,85,85,0.15)', errorBorder:'rgba(255,85,85,0.3)', success:'#50fa7b', error:'#ff5555' },
  'github-dark': { bg:'#0d1117', surface:'#161b22', surfaceHover:'#21262d', border:'#30363d', text:'#e6edf3', textMuted:'#7d8590', accent:'#58a6ff', link:'#58a6ff', linkHover:'#79c0ff', errorBg:'rgba(248,81,73,0.15)', errorBorder:'rgba(248,81,73,0.3)', success:'#3fb950', error:'#f85149' }
};

const defaultSettings = {
  theme: 'default',
  customTheme: { bg:'#120f18', surface:'#1e1826', accent:'#a472d6', link:'#ff6188', success:'#a4e868', error:'#ff6188' },
  customFont: '',
  resolvers: {
    Cloudflare: { url:'https://cloudflare-dns.com/dns-query', active:true },
    Google: { url:'https://dns.google/resolve', active:true }
  },
  features: { animations:true, enableWhois:false, enableSecurity:true },
  advanced: { rdapServer:'https://rdap.org/domain/', timeout:5000 },
  defaultRecords: ['A','AAAA','MX','TXT','NS','CNAME','SOA']
};

const availableRecords = ['A','AAAA','ALIAS','CAA','CNAME','DNSKEY','DS','HTTPS','LOC','MX','NAPTR','NS','PTR','SMIMEA','SOA','SRV','SSHFP','SVCB','TLSA','TXT','URI'];
let userSettings = JSON.parse(JSON.stringify(defaultSettings));

// ===== SCROLL =====
window.addEventListener('scroll', () => {
  const btn = document.getElementById('scrollTopBtn');
  if (window.scrollY > 300) btn.classList.add('visible');
  else btn.classList.remove('visible');
});

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    const home = document.getElementById('homePage');
    const input = home.style.display !== 'none' ? document.getElementById('domainHome') : document.getElementById('domainTop');
    input.focus(); input.select();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === ',') { e.preventDefault(); openSettings(); }
  if (e.key === 'Escape') { closeModal('ipModal'); closeModal('helpModal'); closeSettings(); }
});

// ===== TOAST =====
function showToast(msg, type) {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = 'toast';
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  t.innerHTML = '<span style="font-weight:700;">' + icon + '</span> ' + msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(10px)'; t.style.transition = 'all 0.3s ease'; setTimeout(() => t.remove(), 300); }, 2500);
}

// ===== MODAL =====
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ===== SETTINGS DRAWER =====
function openSettings() {
  document.getElementById('settingsOverlay').classList.remove('hidden');
  document.getElementById('settingsDrawer').classList.remove('hidden');
  document.getElementById('settingsDrawer').classList.remove('closing');
}
function closeSettings() {
  const drawer = document.getElementById('settingsDrawer');
  drawer.classList.add('closing');
  setTimeout(() => {
    document.getElementById('settingsOverlay').classList.add('hidden');
    drawer.classList.add('hidden');
    drawer.classList.remove('closing');
  }, 240);
}

// ===== SETTINGS =====
function loadSettings() {
  const saved = localStorage.getItem('lookup_settings');
  if (saved) {
    try {
      const p = JSON.parse(saved);
      if (p.resolvers) { for (const k in p.resolvers) { if (typeof p.resolvers[k] === 'string') p.resolvers[k] = { url: p.resolvers[k], active: true }; } }
      userSettings.theme = p.theme || defaultSettings.theme;
      userSettings.customTheme = { ...defaultSettings.customTheme, ...(p.customTheme || {}) };
      userSettings.customFont = p.customFont || '';
      userSettings.resolvers = p.resolvers || defaultSettings.resolvers;
      userSettings.features = { ...defaultSettings.features, ...(p.features || {}) };
      userSettings.advanced = { ...defaultSettings.advanced, ...(p.advanced || {}) };
      userSettings.defaultRecords = p.defaultRecords || defaultSettings.defaultRecords;
    } catch(e) { console.error('Error loading settings'); }
  }

  document.getElementById('themeSelect').value = userSettings.theme;
  document.getElementById('cBg').value = userSettings.customTheme.bg;
  document.getElementById('cSurface').value = userSettings.customTheme.surface;
  document.getElementById('cAccent').value = userSettings.customTheme.accent;
  document.getElementById('cLink').value = userSettings.customTheme.link;
  document.getElementById('cSuccess').value = userSettings.customTheme.success || '#22c55e';
  document.getElementById('cError').value = userSettings.customTheme.error || '#ef4444';
  document.getElementById('customFontInput').value = userSettings.customFont;
  document.getElementById('setAnimations').checked = userSettings.features.animations;
  document.getElementById('setWhois').checked = userSettings.features.enableWhois;
  document.getElementById('setSecurity').checked = userSettings.features.enableSecurity !== false;
  document.getElementById('setRdapServer').value = userSettings.advanced.rdapServer;
  document.getElementById('setTimeout').value = userSettings.advanced.timeout;

  applyTheme(userSettings.theme);
  applyFont(userSettings.customFont);
  toggleBodyAnimations();
  renderRecordSettings();
  renderSettingsResolvers();
  renderHistory();
}

function saveSettings() { localStorage.setItem('lookup_settings', JSON.stringify(userSettings)); }
function toggleSetting(cat, key, val) { userSettings[cat][key] = val; saveSettings(); if (key === 'animations') toggleBodyAnimations(); }
function updateSettingText(cat, key, val) { if (val !== undefined && val !== '') { userSettings[cat][key] = val; saveSettings(); } }
function toggleBodyAnimations() { if (userSettings.features.animations) document.body.classList.remove('no-animations'); else document.body.classList.add('no-animations'); }
function resetSettings() { if (confirm('Reset all settings to default?')) { localStorage.removeItem('lookup_settings'); userSettings = JSON.parse(JSON.stringify(defaultSettings)); loadSettings(); showToast('Settings reset', 'success'); } }

// ===== THEME =====
function hexToRgb(hex) {
  const r = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
  return r ? parseInt(r[1],16)+','+parseInt(r[2],16)+','+parseInt(r[3],16) : null;
}

function applyTheme(name) {
  const root = document.documentElement;
  const editor = document.getElementById('customThemeEditor');
  let source = (name === 'custom') ? userSettings.customTheme : (themes[name] || themes.default);

  if (name === 'custom') editor.classList.remove('hidden');
  else editor.classList.add('hidden');

  root.style.setProperty('--bg', source.bg);
  root.style.setProperty('--surface', source.surface);
  root.style.setProperty('--border', name === 'custom' ? source.accent + '44' : source.border);
  root.style.setProperty('--surface-hover', name === 'custom' ? source.accent + '22' : source.surfaceHover);
  root.style.setProperty('--accent', source.accent || source.link);
  root.style.setProperty('--link', source.link);
  root.style.setProperty('--link-hover', name === 'custom' ? source.accent : source.linkHover);

  if (name !== 'custom') {
    root.style.setProperty('--text', source.text);
    root.style.setProperty('--text-muted', source.textMuted);
    root.style.setProperty('--error-bg', source.errorBg);
    root.style.setProperty('--error-border', source.errorBorder);
  }

  const bgRgb = hexToRgb(source.bg); if(bgRgb) root.style.setProperty('--bg-rgb', bgRgb);
  root.style.setProperty('--success', source.success || '#22c55e');
  root.style.setProperty('--error', source.error || '#ef4444');
  const sRgb = hexToRgb(source.success || '#22c55e'); if(sRgb) root.style.setProperty('--success-rgb', sRgb);
  const eRgb = hexToRgb(source.error || '#ef4444'); if(eRgb) root.style.setProperty('--error-rgb', eRgb);

  userSettings.theme = name;
  saveSettings();
}

function changeTheme() { applyTheme(document.getElementById('themeSelect').value); }
function updateCustomTheme() {
  userSettings.customTheme = {
    bg: document.getElementById('cBg').value,
    surface: document.getElementById('cSurface').value,
    accent: document.getElementById('cAccent').value,
    link: document.getElementById('cLink').value,
    success: document.getElementById('cSuccess').value,
    error: document.getElementById('cError').value
  };
  applyTheme('custom');
}

// ===== FONT =====
function applyFont(fontName) {
  const actual = fontName || 'Roboto';
  userSettings.customFont = actual === 'Roboto' ? '' : actual;
  saveSettings();
  document.getElementById('customFontInput').value = userSettings.customFont;
  document.querySelectorAll('.font-preset-tag').forEach(tag => {
    tag.classList.toggle('active', tag.dataset.font === actual || (actual === 'Roboto' && tag.dataset.font === 'Roboto'));
  });

  const root = document.documentElement;
  if (actual === 'Roboto') {
    root.style.setProperty('--custom-font', "'Roboto', -apple-system, sans-serif");
    const old = document.getElementById('dynamic-google-font');
    if (old) old.remove();
    return;
  }

  const formatted = actual.replace(/ /g, '+');
  let link = document.getElementById('dynamic-google-font');
  if (!link) { link = document.createElement('link'); link.id = 'dynamic-google-font'; link.rel = 'stylesheet'; document.head.appendChild(link); }
  link.href = 'https://fonts.googleapis.com/css2?family=' + formatted + ':wght@400;500;600;700;800&display=swap';
  const fallback = (actual.includes('Mono') || actual.includes('Code')) ? 'monospace' : 'sans-serif';
  root.style.setProperty('--custom-font', "'" + actual + "', " + fallback);
}

// ===== RECORD SETTINGS =====
function renderRecordSettings() {
  const c = document.getElementById('recordCheckboxes'); c.innerHTML = '';
  if (!userSettings.defaultRecords) userSettings.defaultRecords = defaultSettings.defaultRecords;
  availableRecords.forEach(r => {
    const active = userSettings.defaultRecords.includes(r);
    c.innerHTML += '<div class="selectable-tag ' + (active ? 'active' : '') + '" onclick="toggleRecord(\\'' + r + '\\')">' + r + '</div>';
  });
}

function toggleRecord(record) {
  const idx = userSettings.defaultRecords.indexOf(record);
  if (idx > -1) {
    if (userSettings.defaultRecords.length <= 1) { showToast('Need at least one record type', 'error'); return; }
    userSettings.defaultRecords.splice(idx, 1);
  } else { userSettings.defaultRecords.push(record); }
  saveSettings(); renderRecordSettings();
}

// ===== RESOLVER SETTINGS =====
function renderSettingsResolvers() {
  const c = document.getElementById('resolverList'); c.innerHTML = '';
  for (const [name, data] of Object.entries(userSettings.resolvers)) {
    const activeClass = data.active ? 'active' : '';
    c.innerHTML += '<div class="selectable-row ' + activeClass + '" onclick="toggleResolver(\\'' + name + '\\')">'
      + '<div style="overflow:hidden;text-overflow:ellipsis;flex:1;">'
      + '<strong class="row-title" style="display:block;margin-bottom:4px;transition:color 0.2s;">' + name + '</strong>'
      + '<span class="small" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;">' + data.url + '</span>'
      + '</div><div style="display:flex;gap:8px;margin-left:12px;">'
      + '<button onclick="event.stopPropagation();editResolver(\\'' + name + '\\')">Edit</button>'
      + '<button class="btn-danger" onclick="event.stopPropagation();removeResolver(\\'' + name + '\\')">Del</button>'
      + '</div></div>';
  }
}

function toggleResolver(name) { if (userSettings.resolvers[name]) { userSettings.resolvers[name].active = !userSettings.resolvers[name].active; saveSettings(); renderSettingsResolvers(); } }

function addResolver() {
  const n = document.getElementById('newResName').value.trim();
  const u = document.getElementById('newResUrl').value.trim();
  if (n && u) {
    userSettings.resolvers[n] = { url: u, active: true };
    document.getElementById('newResName').value = '';
    document.getElementById('newResUrl').value = '';
    saveSettings(); renderSettingsResolvers();
    showToast('"' + n + '" added', 'success');
  }
}

function quickAddResolver(name, url) {
  if (userSettings.resolvers[name]) { showToast(name + ' already exists', 'error'); return; }
  userSettings.resolvers[name] = { url, active: true };
  saveSettings(); renderSettingsResolvers();
  showToast(name + ' added', 'success');
}

function editResolver(name) {
  const d = userSettings.resolvers[name];
  if (d) { document.getElementById('newResName').value = name; document.getElementById('newResUrl').value = d.url; document.getElementById('newResName').focus(); }
}

function removeResolver(name) {
  if (Object.keys(userSettings.resolvers).length <= 1) { showToast('Need at least one resolver', 'error'); return; }
  delete userSettings.resolvers[name]; saveSettings(); renderSettingsResolvers();
  showToast('Resolver removed', 'success');
}

// ===== EXPORT / IMPORT =====
function exportSettings() {
  const blob = new Blob([JSON.stringify(userSettings, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'lookup_settings.json'; a.click();
  showToast('Settings exported', 'success');
}
function importSettings(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const p = JSON.parse(e.target.result);
      userSettings = { ...defaultSettings, ...p }; saveSettings(); loadSettings();
      showToast('Settings imported!', 'success');
    } catch(err) { showToast('Invalid JSON file', 'error'); }
  };
  reader.readAsText(file);
}

// ===== HISTORY =====
function addToHistory(domain) {
  queryHistory = queryHistory.filter(d => d !== domain);
  queryHistory.unshift(domain);
  if (queryHistory.length > 10) queryHistory = queryHistory.slice(0, 10);
  localStorage.setItem('lookup_history', JSON.stringify(queryHistory));
  renderHistory();
}

function removeFromHistory(domain, e) {
  e.stopPropagation();
  queryHistory = queryHistory.filter(d => d !== domain);
  localStorage.setItem('lookup_history', JSON.stringify(queryHistory));
  renderHistory();
}

function clearHistory() {
  queryHistory = [];
  localStorage.setItem('lookup_history', '[]');
  renderHistory();
  showToast('History cleared', 'success');
}

function renderHistory() {
  const section = document.getElementById('historySection');
  const chips = document.getElementById('historyChips');
  if (!queryHistory.length) { section.classList.add('hidden'); return; }
  section.classList.remove('hidden');
  chips.innerHTML = queryHistory.map(d =>
    '<div class="history-chip" onclick="quickLookup(\\'' + d + '\\')">' + d + '<span class="x" onclick="removeFromHistory(\\'' + d + '\\', event)">✕</span></div>'
  ).join('');
}

// ===== NAVIGATION =====
function goHome() {
  document.getElementById('homePage').style.display = '';
  document.getElementById('resultsPage').classList.remove('active');
  document.getElementById('results').innerHTML = '';
  history.pushState({}, '', '/');
  document.getElementById('domainHome').focus();
}

function quickLookup(domain) {
  document.getElementById('homeDropdown')?.classList.remove('show');
  document.getElementById('topDropdown')?.classList.remove('show');
  document.getElementById('domainHome').value = domain;
  triggerLookup('domainHome');
}

function handleAutocomplete(e, dropdownId) {
  const val = e.target.value.trim().toLowerCase();
  const dd = document.getElementById(dropdownId);
  if (!val) { dd.classList.remove('show'); return; }
  
  const suggestions = new Set();
  queryHistory.forEach(h => { if (h.includes(val) && h !== val) suggestions.add(h); });
  if (!val.includes('.')) {
    ['.com', '.net', '.org', '.io'].forEach(t => suggestions.add(val + t));
  }
  
  if (suggestions.size === 0) { dd.classList.remove('show'); return; }
  
  dd.innerHTML = Array.from(suggestions).slice(0, 5).map(s => 
    '<div class="autocomplete-item" onclick="quickLookup(\\'' + s + '\\')">' + s + '</div>'
  ).join('');
  dd.classList.add('show');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search') && !e.target.closest('.autocomplete-dropdown')) {
    document.getElementById('homeDropdown')?.classList.remove('show');
    document.getElementById('topDropdown')?.classList.remove('show');
  }
});

// ===== HELPERS =====
function handleEnter(e, inputId) { if (e.key === 'Enter') triggerLookup(inputId); }

function isSubdomain(domain) {
  const parts = domain.split('.');
  if (parts.length > 2) { const isCcSld = parts.length === 3 && parts[1].length <= 3 && parts[2].length <= 3; if (!isCcSld) return true; }
  return false;
}

function expandIPv6ToArpa(ip) {
  let expanded = ip.split('::');
  let left = expanded[0] ? expanded[0].split(':') : [];
  let right = expanded[1] ? expanded[1].split(':') : [];
  let missing = 8 - (left.length + right.length);
  let middle = Array(missing).fill('0000');
  let full = [...left, ...middle, ...right];
  let nibbles = full.map(b => b.padStart(4, '0')).join('').split('').reverse().join('.');
  return nibbles + '.ip6.arpa';
}

function copyToClipboard(text, btnEl, isEncoded = false) {
  const actualText = isEncoded ? decodeURIComponent(text) : text;
  navigator.clipboard.writeText(actualText).then(() => {
    if (btnEl) { btnEl.classList.add('copied'); btnEl.textContent = '✓ Copied'; setTimeout(() => { btnEl.classList.remove('copied'); btnEl.textContent = 'Copy'; }, 1500); }
    else showToast('Copied!', 'success');
  });
}

function getTimingClass(ms) {
  if (ms < 100) return 'fast';
  if (ms < 300) return 'medium';
  return 'slow';
}

// ===== DNS QUERY =====
async function queryDNS(domain, type, resolverName, resolverUrl) {
  const started = Date.now();
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), userSettings.advanced.timeout || 5000);
  try {
    const res = await fetch(resolverUrl + '?name=' + domain + '&type=' + type, {
      headers: { accept: 'application/dns-json' }, signal: controller.signal
    });
    clearTimeout(tid);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return { resolver: resolverName, duration: Date.now() - started, answers: data.Answer || [], error: null };
  } catch (err) {
    clearTimeout(tid);
    return { resolver: resolverName, duration: Date.now() - started, answers: [], error: err.name === 'AbortError' ? 'Timeout exceeded' : err.message };
  }
}

// ===== CONSENSUS =====
function buildConsensus(arr) {
  const map = {};
  for (const r of arr) {
    for (const a of r.answers || []) {
      const v = a.data; if (!map[v]) map[v] = [];
      map[v].push(r.resolver);
    }
  }
  const sorted = Object.entries(map).sort((a,b) => b[1].length - a[1].length);
  if (!sorted.length) return null;
  return { values: sorted.map(([v, by]) => ({ value: v, confirmedBy: by })) };
}

// ===== SECURITY ANALYSIS =====
function analyzeSecurityRecords(dnsData) {
  const sec = { spf: null, dmarc: null, dkim: false, hasCAA: false };
  if (dnsData.TXT) {
    const all = [];
    for (const rn in dnsData.TXT.resolvers) {
      const rd = dnsData.TXT.resolvers[rn];
      if (rd.answers) all.push(...rd.answers);
    }
    for (const a of all) {
      if (a.data && a.data.includes('v=spf1')) sec.spf = a.data;
      if (a.data && a.data.includes('v=DMARC1')) sec.dmarc = a.data;
      if (a.data && a.data.includes('v=DKIM1')) sec.dkim = true;
    }
  }
  if (dnsData.CAA) {
    for (const rn in dnsData.CAA.resolvers) {
      const rd = dnsData.CAA.resolvers[rn];
      if (rd.answers && rd.answers.length) sec.hasCAA = true;
    }
  }
  return sec;
}

// ===== MAIN LOOKUP =====
async function triggerLookup(inputId) {
  let domain = document.getElementById(inputId).value.trim().toLowerCase();
  if (!domain) return;

  document.getElementById('domainHome').value = domain;
  document.getElementById('domainTop').value = domain;

  document.getElementById('homePage').style.display = 'none';
  document.getElementById('resultsPage').classList.add('active');
  document.getElementById('results').innerHTML = '';
  document.getElementById('loading').classList.remove('hidden');
  history.pushState({}, '', '/?domain=' + encodeURIComponent(domain));
  window.scrollTo({ top: 0 });
  addToHistory(domain);

  const ipv4Regex = /^(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}$/;
  const isIPv6 = domain.includes(':') && /^[0-9a-fA-F:]+$/.test(domain);

  let lookupTypes = [...userSettings.defaultRecords];
  let dnsQueryName = domain;
  let isReverseSearch = false;

  if (ipv4Regex.test(domain)) {
    isReverseSearch = true;
    dnsQueryName = domain.split('.').reverse().join('.') + '.in-addr.arpa';
    lookupTypes = ['PTR'];
    openIpModal(domain);
  } else if (isIPv6) {
    isReverseSearch = true;
    dnsQueryName = expandIPv6ToArpa(domain);
    lookupTypes = ['PTR'];
    openIpModal(domain);
  }

  if (userSettings.features.enableSecurity && !isReverseSearch && !lookupTypes.includes('CAA')) {
    lookupTypes.push('CAA');
  }

  const activeResolvers = Object.entries(userSettings.resolvers).filter(([_, d]) => d.active);
  if (!activeResolvers.length) {
    document.getElementById('results').innerHTML = '<div class="card" style="animation-delay:0s;opacity:1;"><span class="error-badge badge">No active resolvers! Go to settings.</span></div>';
    document.getElementById('loading').classList.add('hidden');
    return;
  }

  const fetchPromises = [];
  for (const type of lookupTypes) {
    for (const [name, data] of activeResolvers) {
      fetchPromises.push(queryDNS(dnsQueryName, type, name, data.url).then(result => ({ type, result })));
    }
  }

  let whoisPromise = null;
  if (userSettings.features.enableWhois && !isReverseSearch && !isSubdomain(domain)) {
    let rdapUrl = userSettings.advanced.rdapServer;
    if (!rdapUrl.endsWith('/')) rdapUrl += '/';
    whoisPromise = fetch(rdapUrl + domain, { headers: { accept: 'application/rdap+json, application/json' } })
      .then(r => r.ok ? r.json() : { error: 'HTTP ' + r.status })
      .catch(e => ({ error: e.message }));
  } else { whoisPromise = Promise.resolve(null); }

  const allResults = await Promise.all(fetchPromises);

  const finalResults = {};
  for (const item of allResults) {
    if (!finalResults[item.type]) finalResults[item.type] = { resolvers: {}, rawArray: [] };
    finalResults[item.type].resolvers[item.result.resolver] = item.result;
    finalResults[item.type].rawArray.push(item.result);
  }

  for (const type of lookupTypes) {
    if (finalResults[type]) {
      finalResults[type].consensus = buildConsensus(finalResults[type].rawArray);
      delete finalResults[type].rawArray;
    }
  }

  latestData = { domain, timestamp: new Date().toISOString(), isReverseSearch, dns: finalResults, whois: null };
  document.getElementById('loading').classList.add('hidden');
  renderResults(finalResults, null, lookupTypes, domain, isReverseSearch);

  if (whoisPromise) {
    whoisPromise.then(whoisResult => {
      latestData.whois = whoisResult;
      renderWhoisCard(whoisResult, domain);
    });
  }
}

// ===== RENDER =====
function renderResults(dnsData, whoisData, typesRendered, domain, isReverse) {
  const container = document.getElementById('results'); container.innerHTML = ''; let delayIndex = 0;
  const ipv4Regex = /\\b(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b/g;

  function linkifyIPs(str) {
    let linked = str.replace(ipv4Regex, m => '<span class="ip-link" onclick="openIpModal(\\'' + m + '\\')">' + m + '</span>');
    linked = linked.replace(/"([0-9a-fA-F:]+:[0-9a-fA-F:]+)"/g, (m, p1) => '"<span class="ip-link" onclick="openIpModal(\\'' + p1 + '\\')">' + p1 + '</span>"');
    return linked;
  }

  function appendCard(html) {
    const card = document.createElement('div'); card.className = 'card';
    card.style.animationDelay = (delayIndex * 0.08) + 's';
    card.innerHTML = html; container.appendChild(card); delayIndex++;
  }

  // Domain Header
  const hdr = document.createElement('div');
  hdr.className = 'domain-header';
  hdr.innerHTML = '<h2>' + domain + '</h2>';
  container.appendChild(hdr);

  // Record Overview Pills removed as requested

  // DNS Record Cards
  for (const type of typesRendered) {
    const section = dnsData[type]; if (!section) continue;

    let html = '<div class="card-header"><div class="card-title"><span class="type-badge">' + type + '</span> Record</div></div>';

    if (section.consensus && section.consensus.values && section.consensus.values.length) {
      html += '<div class="consensus">';
      for (let i = 0; i < section.consensus.values.length; i++) {
        const cv = section.consensus.values[i];
        let displayVal = cv.value;
        if (displayVal.match && (displayVal.match(ipv4Regex) || displayVal.includes(':'))) {
          displayVal = '<span class="ip-link" onclick="openIpModal(\\'' + cv.value + '\\')">' + cv.value + '</span>';
        }
        html += '<div class="consensus-row">'
          + '<div class="consensus-value">' + displayVal + '</div>'
          + '<button class="copy-btn" onclick="event.stopPropagation();copyToClipboard(\\'' + cv.value.replace(/'/g, "\\\\'") + '\\', this)">Copy</button></div>'
          + '<div class="consensus-meta"><span class="check">✓</span> Confirmed by ' + cv.confirmedBy.join(', ') + '</div>';
        if (i < section.consensus.values.length - 1) html += '<div class="consensus-divider"></div>';
      }
      html += '</div>';
    } else {
      html += '<div class="small" style="margin-top: 10px; opacity: 0.5;">No records found</div>';
    }

    html += '<details id="record-' + type + '"><summary><svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg> Resolver Details</summary>';
    for (const resName in section.resolvers) {
      const rd = section.resolvers[resName];
      html += '<div class="resolver-result"><div class="resolver-header">'
        + '<div class="resolver-name">' + resName + '</div>';
      if (rd.error) { html += '<span class="badge error-badge">' + rd.error + '</span>'; }
      else { 
        html += '<div style="display:flex;gap:8px;align-items:center;">';
        html += '<button class="copy-btn" onclick="event.stopPropagation();copyToClipboard(\\'' + encodeURIComponent(JSON.stringify(rd.answers, null, 2)) + '\\', this, true)">Copy JSON</button>';
        html += '<span class="resolver-timing ' + getTimingClass(rd.duration) + '">' + rd.duration + 'ms</span>';
        html += '</div>';
      }
      html += '</div>';
      if (!rd.error && rd.answers.length) { html += '<pre>' + linkifyIPs(JSON.stringify(rd.answers, null, 2)) + '</pre>'; }
      else if (!rd.error) { html += '<pre>No records</pre>'; }
      html += '</div>';
    }
    html += '</details>';
    appendCard(html);
  }

  // Security Analysis
  if (userSettings.features.enableSecurity && !isReverse) {
    const sec = analyzeSecurityRecords(dnsData);
    let secHtml = '<div class="card-header"><div class="card-title"><span class="type-badge">🛡</span> Security Analysis</div></div>';
    secHtml += '<div class="security-grid">';
    secHtml += '<div class="security-item ' + (sec.spf ? 'found' : 'missing') + '">'
      + '<div class="label">SPF</div>'
      + '<div class="status">' + (sec.spf ? '✓ Found' : '✕ Not found') + '</div>'
      + (sec.spf ? '<div style="margin-top:8px; display:flex; justify-content:flex-end;"><button class="copy-btn" onclick="copyToClipboard(\\'' + sec.spf.replace(/"/g, '').replace(/'/g, "\\\\'") + '\\', this)">Copy</button></div><pre style="font-size:11px;margin-top:4px;padding:10px;">' + sec.spf.replace(/"/g, '') + '</pre>' : '')
      + '</div>';
    secHtml += '<div class="security-item ' + (sec.dmarc ? 'found' : 'missing') + '">'
      + '<div class="label">DMARC</div>'
      + '<div class="status">' + (sec.dmarc ? '✓ Detected' : '✕ Not found') + '</div>'
      + (sec.dmarc ? '<div style="margin-top:8px; display:flex; justify-content:flex-end;"><button class="copy-btn" onclick="copyToClipboard(\\'' + sec.dmarc.replace(/"/g, '').replace(/'/g, "\\\\'") + '\\', this)">Copy</button></div><pre style="font-size:11px;margin-top:4px;padding:10px;">' + sec.dmarc.replace(/"/g, '') + '</pre>' : '')
      + '</div>';
    secHtml += '<div class="security-item ' + (sec.dkim ? 'found' : 'missing') + '">'
      + '<div class="label">DKIM</div>'
      + '<div class="status">' + (sec.dkim ? '✓ Detected' : '○ Not in TXT') + '</div></div>';
    secHtml += '<div class="security-item ' + (sec.hasCAA ? 'found' : 'missing') + '">'
      + '<div class="label">CAA</div>'
      + '<div class="status">' + (sec.hasCAA ? '✓ Configured' : '✕ Not found') + '</div></div>';
    secHtml += '</div>';
    appendCard(secHtml);
  }

  // WHOIS Render Placeholder handled async
}

function renderWhoisCard(whoisData, domain) {
  if (!whoisData || !userSettings.features.enableWhois) return;
  const container = document.getElementById('results');
  let html = '<div class="card-header"><div class="card-title"><span class="type-badge">📋</span> WHOIS / RDAP</div></div>';
  if (whoisData.error) {
    if (whoisData.error === "Skipped") return;
    html += '<div class="small" style="color:var(--text-muted);">' + whoisData.error + '</div>';
  } else {
    const name = whoisData.ldhName || whoisData.handle || domain;
    const status = (whoisData.status || []).join(', ') || 'Unknown';
    const events = whoisData.events || [];
    const reg = events.find(e => e.eventAction === 'registration');
    const exp = events.find(e => e.eventAction === 'expiration');
    const upd = events.find(e => e.eventAction === 'last changed');
    const nameservers = (whoisData.nameservers || []).map(ns => ns.ldhName || ns.objectClassName).filter(Boolean);
    const entities = whoisData.entities || [];
    const registrar = entities.find(e => (e.roles || []).includes('registrar'));
    const registrarName = registrar && registrar.vcardArray ? (registrar.vcardArray[1] || []).find(v => v[0] === 'fn')?.[3] : null;

    html += '<div class="whois-grid">';
    html += '<span class="wlabel">Domain</span><span class="wvalue">' + name + '</span>';
    if (registrarName) html += '<span class="wlabel">Registrar</span><span class="wvalue">' + registrarName + '</span>';
    html += '<span class="wlabel">Status</span><span class="wvalue" style="font-size:12px;">' + status + '</span>';
    if (reg) html += '<span class="wlabel">Registered</span><span class="wvalue">' + new Date(reg.eventDate).toLocaleDateString() + '</span>';
    if (exp) html += '<span class="wlabel">Expires</span><span class="wvalue">' + new Date(exp.eventDate).toLocaleDateString() + '</span>';
    if (upd) html += '<span class="wlabel">Updated</span><span class="wvalue">' + new Date(upd.eventDate).toLocaleDateString() + '</span>';
    if (nameservers.length) html += '<span class="wlabel">Nameservers</span><span class="wvalue">' + nameservers.join(', ') + '</span>';
    html += '</div>';

    html += '<details style="margin-top:16px;">'
      + '<summary><svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg> Raw RDAP JSON' 
      + (whoisData._latency ? ' <span style="font-size:12px;opacity:0.5;font-weight:normal;margin-left:8px;">(' + whoisData._latency + 'ms)</span>' : '')
      + '</summary>'
      + '<div style="display:flex; justify-content:flex-end; margin-bottom:-20px; position:relative; z-index:10; padding-right:10px; margin-top:10px;">'
      + '<button class="copy-btn" onclick="event.stopPropagation();copyToClipboard(\\'' + encodeURIComponent(JSON.stringify(whoisData, null, 2)) + '\\', this, true)">Copy JSON</button></div>'
      + '<pre>' + JSON.stringify(whoisData, null, 2) + '</pre></details>';
  }
  const card = document.createElement('div'); card.className = 'card';
  card.style.animationDelay = '0s';
  card.innerHTML = html;
  container.appendChild(card);
}

function scrollToRecord(type) {
  const el = document.getElementById('record-' + type);
  if (el) { const card = el.closest('.card'); if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}

// ===== IP MODAL =====
async function openIpModal(ip) {
  document.getElementById('ipModal').classList.remove('hidden');
  document.getElementById('modalTitle').innerText = ip;
  document.getElementById('modalDetails').innerHTML = 'Fetching provider info... ⏳';
  if (leafletMap) { leafletMap.remove(); leafletMap = null; }
  try {
    const res = await fetch('https://ipinfo.io/' + ip + '/json');
    const data = await res.json();
    document.getElementById('modalDetails').innerHTML = '<div class="modal-detail-grid">'
      + '<span class="label">Organization</span><span class="value">' + (data.org || 'Unknown') + '</span>'
      + '<span class="label">Location</span><span class="value">' + (data.city || '?') + ', ' + (data.region || '?') + ', ' + (data.country || '?') + '</span>'
      + '<span class="label">Hostname</span><span class="value">' + (data.hostname || 'N/A') + '</span>'
      + '<span class="label">Timezone</span><span class="value">' + (data.timezone || 'Unknown') + '</span>'
      + '<span class="label">Postal</span><span class="value">' + (data.postal || 'N/A') + '</span>'
      + '</div>';
    if (data.loc) {
      const [lat, lng] = data.loc.split(',').map(parseFloat);
      leafletMap = L.map('map').setView([lat, lng], 10);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap' }).addTo(leafletMap);
      L.marker([lat, lng]).addTo(leafletMap);
    }
  } catch(err) { document.getElementById('modalDetails').innerText = 'Failed to load IP info.'; }
}

// ===== EXPORT =====
function exportResultJSON() {
  if (!latestData) { showToast('No results to export', 'error'); return; }
  const blob = new Blob([JSON.stringify(latestData, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = latestData.domain + '_lookup.json'; a.click();
  showToast('Results exported', 'success');
}

// ===== INIT =====
loadSettings();
const path = window.location.pathname;
const params = new URLSearchParams(location.search);
let domainToLookup = params.get('domain');

if (path.startsWith('/ip/') || path === '/ip') {
    domainToLookup = path.replace(/^\\/ip\\/?/, '') || params.get('domain');
    userSettings.defaultRecords = ['A', 'AAAA'];
    userSettings.features.enableWhois = false;
    userSettings.features.enableSecurity = false;
} else if (path.startsWith('/ipv4/') || path === '/ipv4') {
    domainToLookup = path.replace(/^\\/ipv4\\/?/, '') || params.get('domain');
    userSettings.defaultRecords = ['A'];
    userSettings.features.enableWhois = false;
    userSettings.features.enableSecurity = false;
} else if (path.startsWith('/ipv6/') || path === '/ipv6') {
    domainToLookup = path.replace(/^\\/ipv6\\/?/, '') || params.get('domain');
    userSettings.defaultRecords = ['AAAA'];
    userSettings.features.enableWhois = false;
    userSettings.features.enableSecurity = false;
} else if (path.startsWith('/whois/') || path === '/whois') {
    domainToLookup = path.replace(/^\\/whois\\/?/, '') || params.get('domain');
    userSettings.defaultRecords = [];
    userSettings.features.enableWhois = true;
    userSettings.features.enableSecurity = false;
}

if (!domainToLookup && (path === '/ip' || path === '/ipv4' || path === '/ipv6' || path === '/whois')) {
    let titleStr = 'IP-Search';
    if (path === '/ipv4') titleStr = 'IPv4-Search';
    if (path === '/ipv6') titleStr = 'IPv6-Search';
    if (path === '/whois') titleStr = 'WHOIS-Search';
    document.title = titleStr;
    document.querySelector('h1').innerText = titleStr;
    const btn = document.querySelector('.toolbar button');
    btn.innerText = 'Search';
    btn.onclick = () => { window.location.href = path + '/' + document.getElementById('domainHome').value; };
    const input = document.getElementById('domainHome');
    input.onkeydown = (e) => { if(e.key === 'Enter') window.location.href = path + '/' + input.value; };
}

if (domainToLookup) {
    document.getElementById('domainHome').value = domainToLookup;
    triggerLookup('domainHome');
}
</script>
</body>
</html>
`;

