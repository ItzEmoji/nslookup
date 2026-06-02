import { html } from './frontend.js';

function renderWithTheme(title, innerContent) {
  return html.replace('<title>lookup &middot; Domain / IP</title>', `<title>${title}</title>`)
    .replace('<div class="home" id="homePage">', `<div style="position:relative; z-index:10; min-height:100vh; display:flex; align-items:center; justify-content:center;">${innerContent}</div><div class="home" id="homePage" style="display:none;">`);
}

// === API BACKEND ===
async function queryDNSServer(domain, type, resolverName, resolverUrl) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${resolverUrl}?name=${domain}&type=${type}`, { headers: { accept: "application/dns-json" }, signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    let errorStr = null;
    if (data.Status === 3) errorStr = 'NXDOMAIN (Domain does not exist)';
    else if (data.Status === 2) errorStr = 'SERVFAIL (Server failed to complete the request)';
    else if (data.Status === 5) errorStr = 'REFUSED (Query refused)';
    else if (data.Status === 1) errorStr = 'FORMERR (Format Error)';
    else if (data.Status === 4) errorStr = 'NOTIMP (Not Implemented)';
    else if (data.Status !== 0 && data.Status !== undefined) errorStr = `DNS Error (Status: ${data.Status})`;
    return { resolver: resolverName, answers: data.Answer || [], error: errorStr };
  } catch (err) {
    clearTimeout(timeoutId);
    return { resolver: resolverName, answers: [], error: err.name === 'AbortError' ? 'Timeout' : err.message };
  }
}

function buildConsensus(resolverResultsArray) {
  const map = {};
  for (const result of resolverResultsArray) {
    for (const answer of result.answers || []) {
      const value = answer.data;
      if (!map[value]) map[value] = [];
      map[value].push(result.resolver);
    }
  }
  const sorted = Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  if (!sorted.length) return null;
  return { value: sorted[0][0], confirmedBy: sorted[0][1] };
}

function isSubdomainServer(domain) {
  const parts = domain.split('.');
  if (parts.length > 2) { const isCcSld = parts.length === 3 && parts[1].length <= 3 && parts[2].length <= 3; if (!isCcSld) return true; }
  return false;
}

function getBaseDomain(domain) {
  const parts = domain.split('.');
  if (parts.length > 2) {
    const isCcSld = parts.length >= 3 && parts[parts.length-2].length <= 3 && parts[parts.length-1].length <= 3;
    if (isCcSld) return parts.slice(-3).join('.');
    return parts.slice(-2).join('.');
  }
  return domain;
}

function expandIPv6ToArpaServer(ip) {
  let expanded = ip.split("::"); let left = expanded[0] ? expanded[0].split(":") : []; let right = expanded[1] ? expanded[1].split(":") : [];
  let missing = 8 - (left.length + right.length); let middle = Array(missing).fill("0000"); let full = [...left, ...middle, ...right];
  let nibbles = full.map(block => block.padStart(4, "0")).join("").split("").reverse().join(".");
  return nibbles + ".ip6.arpa";
}

async function checkAbuse(targetDomain, isIPv4, isIPv6, customResolverUrl) {
  let queryName = "";
  if (isIPv4) {
    queryName = targetDomain.split('.').reverse().join('.') + ".zen.spamhaus.org";
  } else if (isIPv6) {
    let arpa = expandIPv6ToArpaServer(targetDomain);
    queryName = arpa.replace(".ip6.arpa", ".zen.spamhaus.org");
  } else {
    queryName = targetDomain + ".dbl.spamhaus.org";
  }
  
  // Default to Cloudflare DoH for abuse check, or use the first custom resolver if provided
  const resolverUrl = customResolverUrl || "https://cloudflare-dns.com/dns-query";
  
  try {
    const response = await fetch(`${resolverUrl}?name=${queryName}&type=A`, { headers: { accept: "application/dns-json" } });
    if (response.ok) {
      const data = await response.json();
      if (data.Answer && data.Answer.length > 0) {
        const ip = data.Answer[0].data;
        // 127.255.255.254 means query blocked due to rate limit, ignore it.
        if (ip.startsWith("127.") && ip !== "127.255.255.254") {
          return true; // Blacklisted
        }
      }
    }
  } catch(e) {}
  return false;
}

function checkPropagation(finalResults, lookupTypes) {
  let matches = 0;
  let mismatches = 0;

  for (const type of lookupTypes) {
    const result = finalResults[type];
    if (!result) continue;
    
    const resolversKeys = Object.keys(result.resolvers);
    if (resolversKeys.length < 2) continue;
    
    const sets = resolversKeys.map(rKey => {
      const answers = result.resolvers[rKey] || [];
      return answers.map(a => a.data).sort().join('|');
    });
    
    const firstSet = sets[0];
    let isMatch = true;
    for (let i = 1; i < sets.length; i++) {
      if (sets[i] !== firstSet) {
        isMatch = false; break;
      }
    }

    if (!isMatch && (type === 'A' || type === 'AAAA')) {
       const allHaveRecords = sets.every(s => s.length > 0);
       if (allHaveRecords) continue; 
    }

    if (isMatch) matches++;
    else mismatches++;
  }
  
  return mismatches === 0;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const userAgent = request.headers.get("user-agent") || "";
    const isHtmlNavigation = request.headers.get("sec-fetch-mode") === "navigate" || request.headers.get("accept")?.includes("text/html");
    const isCurl = /curl|wget|httpie/i.test(userAgent);
    const wantsAPI = !isHtmlNavigation && (isCurl || request.headers.get("sec-fetch-mode") === "cors" || request.headers.get("accept")?.includes("application/json") || request.headers.get("referer")?.includes("/api-docs"));
    const jsonSpace = url.searchParams.has("preview") ? 2 : undefined;

    let apiResolvers = {
      Cloudflare: "https://cloudflare-dns.com/dns-query",
      Google: "https://dns.google/resolve"
    };

    const customResolvers = url.searchParams.get("resolvers") || url.searchParams.get("resolver");
    if (customResolvers) {
      apiResolvers = {};
      const urls = customResolvers.split(",");
      urls.forEach((rUrl, index) => {
        apiResolvers[`Custom${index + 1}`] = rUrl.trim();
      });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "*" } });
    }

    if (!wantsAPI && url.pathname !== '/help' && url.pathname !== '/api-docs') {
      const isFrontendRoute = url.pathname === '/' || /^\/(ip|ipv4|ipv6|whois|abuse|propagated|ssl|security)(\/.*)?$/.test(url.pathname);
      if (!isFrontendRoute) {
        let targetDomain = url.pathname.substring(1).toLowerCase();
        return Response.redirect(`${url.origin}/?domain=${targetDomain}`, 301);
      }
      return new Response(html, { headers: { "content-type": "text/html;charset=UTF-8" }});
    }

    if (url.pathname === '/help') {
      const cliHelpText = `nslookup API - Manual Page

NAME
    lookup - DNS and WHOIS lookup tool

DESCRIPTION
    lookup is an advanced, privacy-friendly DNS and WHOIS lookup service.
    It resolves DNS records and WHOIS information from the terminal with
    beautifully formatted JSON payloads.

USAGE
    curl ${url.origin}/[endpoint]/<domain>

ENDPOINTS
    /                       Returns the IP address you are calling from.
    /<domain>               Gets ALL DNS records + WHOIS data in one payload.
    /<domain>?type=TXT,MX   Filters to just the specified DNS records.
    /ip/<domain>            Returns JSON with IPv4 and IPv6 addresses.
    /ipv4/<domain>          Returns just the raw IPv4 string.
    /ipv6/<domain>          Returns just the raw IPv6 string.
    /whois/<domain>         Returns pure JSON RDAP/WHOIS data.
    /ssl/<domain>           Returns certificate history from CertSpotter.
    /security/<domain>      Returns security analysis (SPF, DMARC, CAA).
    /history/<domain>       Returns historical DNS A records (Requires ?apikey=).

SETTINGS & FEATURES
    - Privacy: No tracking, no logs.
    - Resolvers: Queries Cloudflare and Google DNS in parallel.
    - Customization: Web UI allows you to set default records and custom DNS resolvers.

EXAMPLES
    curl ${url.origin}/example.com
    curl "${url.origin}/google.com?type=TXT"
    curl ${url.origin}/ipv4/github.com
`;
      const userAgent = request.headers.get("user-agent") || "";
      const isCurl = /curl|wget|httpie/i.test(userAgent);
      if (isCurl) {
        return new Response(cliHelpText, { headers: { "content-type": "text/plain", "Access-Control-Allow-Origin": "*" }});
      } else {
        const inner = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>nslookup CLI Help</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<script>
  try {
    const s = JSON.parse(localStorage.getItem('lookup_settings'));
    const t = s?.theme;
    const themes = {
      blue: { p:'#A8C7FA', op:'#062E6F', pc:'#17468D', opc:'#D3E3FD' },
      green: { p:'#93D5A5', op:'#073816', pc:'#0F5223', opc:'#B6ECC3' },
      purple: { p:'#D0BCFF', op:'#381E72', pc:'#4D2C87', opc:'#E8DEF8' },
      red: { p:'#FFB4AB', op:'#690005', pc:'#8C1D18', opc:'#FFDAD6' },
      orange: { p:'#FFB951', op:'#452B00', pc:'#825500', opc:'#FFDDB3' }
    };
    const c = t === 'custom' ? { p: s.customTheme.accent, op: '#131316', pc: s.customTheme.accent, opc: '#E4E1E6' } : themes[t || 'blue'];
    if(c) {
      document.documentElement.style.setProperty('--primary', c.p);
      document.documentElement.style.setProperty('--on-primary', c.op);
      document.documentElement.style.setProperty('--primary-container', c.pc);
      document.documentElement.style.setProperty('--on-primary-container', c.opc);
    }
  } catch(e) {}
</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --surface:#131316;--surface-container:#201F23;--surface-container-high:#2A2A2D;
  --surface-container-highest:#353538;--surface-container-low:#1B1B1F;--surface-container-lowest:#0E0E11;
  --primary:#A8C7FA;--on-primary:#062E6F;--primary-container:#17468D;--on-primary-container:#D3E3FD;
  --on-surface:#E4E1E6;--on-surface-variant:#C7C5D0;--outline:#918F9A;--outline-variant:#46464F;
  --inverse-surface:#E4E1E6;--inverse-on-surface:#313034;
}
body{background:var(--surface);color:var(--on-surface);font-family:'Roboto',sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:var(--primary);text-decoration:none}a:hover{text-decoration:underline}
.topbar{position:sticky;top:0;z-index:100;background:rgba(19,19,22,0.92);backdrop-filter:blur(16px);border-bottom:1px solid var(--outline-variant);padding:0 24px;height:64px;display:flex;align-items:center;gap:24px}
.topbar-logo{font-size:22px;font-weight:700;color:var(--primary);letter-spacing:-0.5px}
.topbar-nav{display:flex;gap:8px;margin-left:auto}
.topbar-nav a{padding:8px 16px;border-radius:9999px;font-size:14px;font-weight:500;color:var(--on-surface-variant);transition:background 200ms}
.topbar-nav a:hover{background:rgba(168,199,250,0.08);text-decoration:none;color:var(--on-surface)}
.topbar-nav a.active{background:var(--primary-container);color:var(--on-primary-container)}
.main{padding:40px;max-width:900px;margin:0 auto}
.main h1{font-size:32px;font-weight:400;margin-bottom:8px}
.main .subtitle{font-size:14px;color:var(--on-surface-variant);margin-bottom:40px;letter-spacing:0.25px}
.endpoint-card{background:var(--surface-container-low);border:1px solid var(--outline-variant);border-radius:16px;padding:24px;margin-bottom:24px}
.method-badge{background:rgba(168,199,250,0.12);color:var(--primary);padding:4px 12px;border-radius:8px;font-size:12px;font-weight:500;font-family:'JetBrains Mono',monospace;margin-right:12px}
.endpoint-title{font-size:18px;font-weight:500}
.code-block{background:var(--surface-container-lowest);border:1px solid var(--outline-variant);border-radius:12px;padding:14px 16px;margin:16px 0;font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--primary);overflow-x:auto}
.desc{font-size:14px;color:var(--on-surface-variant)}
</style>
</head>
<body>
<div class="topbar">
  <span class="topbar-logo">lookup</span>
  <nav class="topbar-nav">
    <a href="/">Home</a>
    <a href="/api-docs">API Docs</a>
    <a href="/help" class="active">CLI Help</a>
  </nav>
</div>
<div class="main">
  <h1>CLI Reference</h1>
  <p class="subtitle" style="margin-bottom: 24px;">Here is exactly what this API can do for you from your terminal—no fluff.</p>

  <div class="endpoint-card" style="margin-bottom: 32px; border-color: var(--primary);">
    <h2 style="font-size: 20px; font-weight: 500; margin-bottom: 12px; color: var(--primary);">About lookup</h2>
    <p class="desc" style="margin-bottom: 16px;">lookup is an advanced, privacy-friendly DNS and WHOIS lookup service. It supports querying multiple DNS resolvers in parallel, filtering record types, and returning perfectly formatted JSON for scripts.</p>
    <ul class="desc" style="margin-left: 20px; list-style-type: square; line-height: 1.8;">
      <li><strong>Settings:</strong> Use the web UI to configure custom DNS resolvers, change the default records (A, AAAA, MX, etc.), and customize your theme.</li>
      <li><strong>Privacy:</strong> Absolutely zero tracking or logging.</li>
      <li><strong>Speed:</strong> Parallel DNS resolution via Edge Workers.</li>
    </ul>
  </div>

  <div class="endpoint-card">
    <div style="display:flex;align-items:center"><span class="method-badge">GET</span><span class="endpoint-title">Full Lookup</span></div>
    <div class="code-block">curl ${url.origin}/example.com</div>
    <p class="desc">Gets DNS records and WHOIS data in one JSON payload.</p>
  </div>

  <div class="endpoint-card">
    <div style="display:flex;align-items:center"><span class="method-badge">GET</span><span class="endpoint-title">Specific Records</span></div>
    <div class="code-block">curl "${url.origin}/example.com?type=TXT,MX"</div>
    <p class="desc">Filters to just the DNS records you want.</p>
  </div>

  <div class="endpoint-card">
    <div style="display:flex;align-items:center"><span class="method-badge">GET</span><span class="endpoint-title">IP Addresses (JSON)</span></div>
    <div class="code-block">curl ${url.origin}/ip/example.com</div>
    <p class="desc">Returns JSON with both IPv4 and IPv6 addresses.</p>
  </div>

  <div class="endpoint-card">
    <div style="display:flex;align-items:center"><span class="method-badge">GET</span><span class="endpoint-title">Raw IPv4</span></div>
    <div class="code-block">curl ${url.origin}/ipv4/example.com</div>
    <p class="desc">Returns just the raw IPv4 string. Perfect for scripting.</p>
  </div>

  <div class="endpoint-card">
    <div style="display:flex;align-items:center"><span class="method-badge">GET</span><span class="endpoint-title">Raw IPv6</span></div>
    <div class="code-block">curl ${url.origin}/ipv6/example.com</div>
    <p class="desc">Returns just the raw IPv6 string.</p>
  </div>

  <div class="endpoint-card">
    <div style="display:flex;align-items:center"><span class="method-badge">GET</span><span class="endpoint-title">WHOIS Only</span></div>
    <div class="code-block">curl ${url.origin}/whois/example.com</div>
    <p class="desc">Returns pure JSON RDAP/WHOIS data.</p>
  </div>

  <div class="endpoint-card">
    <div style="display:flex;align-items:center"><span class="method-badge">GET</span><span class="endpoint-title">Your Own IP</span></div>
    <div class="code-block">curl ${url.origin}/</div>
    <p class="desc">Returns the IP address you are calling from.</p>
  </div>
</div>
</body>
</html>`;
        return new Response(inner, { headers: { "content-type": "text/html;charset=UTF-8", "Access-Control-Allow-Origin": "*" }});
      }
    }

    if (url.pathname === '/ip' || (url.pathname.startsWith('/ip/') && !url.pathname.startsWith('/ipv4/') && !url.pathname.startsWith('/ipv6/'))) {
      let d = url.pathname.replace(/^\/ip\/?/, '').toLowerCase();
      if (!d) d = url.searchParams.get("domain")?.toLowerCase();
      if (!d) {
        return new Response("Usage: curl ${url.origin}/ip/<DOMAIN>\n", { status: 400, headers: { "content-type": "text/plain", "Access-Control-Allow-Origin": "*" } });
      }
      
      const wantIPv4 = url.searchParams.get("ipv4") !== "false";
      const wantIPv6 = url.searchParams.get("ipv6") !== "false";
      
      const result = { domain: d };
      if (wantIPv4) {
        let allIps = [];
        for (const [rName, rUrl] of Object.entries(apiResolvers)) {
            const rA = await queryDNSServer(d, 'A', rName, rUrl);
            if (rA && rA.answers) allIps.push(...rA.answers.map(a => a.data));
        }
        result.ipv4 = [...new Set(allIps)];
      }
      if (wantIPv6) {
        let allIps = [];
        for (const [rName, rUrl] of Object.entries(apiResolvers)) {
            const rAAAA = await queryDNSServer(d, 'AAAA', rName, rUrl);
            if (rAAAA && rAAAA.answers) allIps.push(...rAAAA.answers.map(a => a.data));
        }
        result.ipv6 = [...new Set(allIps)];
      }

      return new Response(JSON.stringify(result, null, jsonSpace) + "\n", { headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" }});
    }

    if (url.pathname === '/ipv4' || url.pathname === '/ipv6' || url.pathname.startsWith('/ipv4/') || url.pathname.startsWith('/ipv6/')) {
      const isV4 = url.pathname.startsWith('/ipv4');
      let d = url.pathname.replace(isV4 ? /^\/ipv4\/?/ : /^\/ipv6\/?/, '').toLowerCase();
      if (!d) d = url.searchParams.get("domain")?.toLowerCase();
      if (!d) {
        return new Response(`Usage: curl ${url.origin}${isV4 ? '/ipv4' : '/ipv6'}/<DOMAIN>\n`, { status: 400, headers: { "content-type": "text/plain", "Access-Control-Allow-Origin": "*" } });
      }
      
      const recordType = isV4 ? 'A' : 'AAAA';
      let allIps = [];
      for (const [rName, rUrl] of Object.entries(apiResolvers)) {
          const r = await queryDNSServer(d, recordType, rName, rUrl);
          if (r && r.answers) allIps.push(...r.answers.map(a => a.data));
      }
      const ips = [...new Set(allIps)];
      const ip = ips.length > 0 ? ips[0] : "";
      
      if (!ip) return new Response("Not found\n", { status: 404, headers: { "Access-Control-Allow-Origin": "*" } });

      return new Response(ip + "\n", { headers: { "content-type": "text/plain", "Access-Control-Allow-Origin": "*" }});
    }

    if (url.pathname === '/whois' || url.pathname.startsWith('/whois/')) {
      let d = url.pathname.replace(/^\/whois\/?/, '').toLowerCase();
      if (!d) d = url.searchParams.get("domain")?.toLowerCase();
      if (!d) {
        return new Response("Usage: curl ${url.origin}/whois/<DOMAIN>\n", { status: 400, headers: { "content-type": "text/plain", "Access-Control-Allow-Origin": "*" } });
      }
      const baseDomain = getBaseDomain(d);
      const start = Date.now();
      const res = await fetch(`https://rdap.org/domain/${baseDomain}`, { headers: { accept: "application/rdap+json, application/json", "User-Agent": "curl/8.0.1" }});
      const data = await (res.ok ? res.json() : Promise.resolve({ error: `HTTP ${res.status}` }));
      data._latency = Date.now() - start;
      
      return new Response(JSON.stringify(data, null, jsonSpace) + "\n", { headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" }});
    }

    if (url.pathname === '/abuse' || url.pathname.startsWith('/abuse/')) {
      let d = url.pathname.replace(/^\/abuse\/?/, '').toLowerCase();
      if (!d) d = url.searchParams.get("domain")?.toLowerCase();
      if (!d) {
        return new Response("Usage: curl ${url.origin}/abuse/<DOMAIN>\n", { status: 400, headers: { "content-type": "text/plain", "Access-Control-Allow-Origin": "*" } });
      }
      const ipv4RegexLocal = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$/;
      const isIPv6Local = d.includes(':') && /^[0-9a-fA-F:]+$/.test(d);
      
      const customParam = url.searchParams.get("resolver");
      const firstResolverUrl = customParam || Object.values(apiResolvers)[0];
      const isAbuse = await checkAbuse(d, ipv4RegexLocal.test(d), isIPv6Local, firstResolverUrl);
      
      return new Response(JSON.stringify(isAbuse) + "\n", { headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" }});
    }

    if (url.pathname === '/ssl' || url.pathname.startsWith('/ssl/')) {
      let d = url.pathname.replace(/^\/ssl\/?/, '').toLowerCase();
      if (!d) d = url.searchParams.get("domain")?.toLowerCase();
      if (!d) {
        return new Response("Usage: curl ${url.origin}/ssl/<DOMAIN>?provider=certspotter|crt.sh\n", { status: 400, headers: { "content-type": "text/plain", "Access-Control-Allow-Origin": "*" } });
      }
      
      const provider = url.searchParams.get("provider") || "certspotter";
      
      try {
        let res;
        if (provider === "crt.sh") {
          res = await fetch(`https://crt.sh/?q=%25.${d}&output=json`, { headers: { accept: "application/json", "User-Agent": "curl/8.0.1" } });
        } else {
          res = await fetch(`https://api.certspotter.com/v1/issuances?domain=${d}&include_subdomains=true&expand=dns_names`, { headers: { accept: "application/json", "User-Agent": "nslookup-worker/1.0" } });
        }
        
        let data = [];
        if (res.ok) {
          let text = await res.text();
          if (provider === "crt.sh") {
            text = text.replace(/\]\s*\[/g, ',');
            text = text.replace(/}\s*{/g, '},{');
          }
          try {
            data = JSON.parse(text);
          } catch(err) {
            try {
              data = JSON.parse('[' + text.replace(/}\s*{/g, '},{') + ']');
            } catch(err2) {
              return new Response(JSON.stringify({ error: `Invalid JSON from ${provider}` }) + "\n", { status: 500, headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" }});
            }
          }
        }
        return new Response(JSON.stringify(data, null, jsonSpace) + "\n", { headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" }});
      } catch (e) {
        return new Response(JSON.stringify({ error: `Failed to fetch from ${provider}` }) + "\n", { status: 500, headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" }});
      }
    }

    if (url.pathname === '/history' || url.pathname.startsWith('/history/')) {
      let d = url.pathname.replace(/^\/history\/?/, '').toLowerCase();
      if (!d) d = url.searchParams.get("domain")?.toLowerCase();
      if (!d) {
        return new Response("Usage: curl ${url.origin}/history/<DOMAIN>?apikey=<KEY>\n", { status: 400, headers: { "content-type": "text/plain", "Access-Control-Allow-Origin": "*" } });
      }
      
      const apikey = url.searchParams.get("apikey") || request.headers.get("x-api-key");
      if (!apikey) {
        return new Response(JSON.stringify({ error: "API key is required for historical DNS. Please provide ?apikey= or X-API-Key header. (e.g. SecurityTrails API Key)" }) + "\n", { status: 401, headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" }});
      }

      try {
        const res = await fetch(`https://api.securitytrails.com/v1/history/${d}/dns/a`, { 
           headers: { accept: "application/json", "APIKEY": apikey }
        });
        const data = await res.json();
        return new Response(JSON.stringify(data, null, jsonSpace) + "\n", { headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" }, status: res.status});
      } catch(e) {
        return new Response(JSON.stringify({ error: "Failed to fetch DNS history from SecurityTrails." }) + "\n", { status: 500, headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" }});
      }
    }

    if (url.pathname === '/security' || url.pathname.startsWith('/security/')) {
      let d = url.pathname.replace(/^\/security\/?/, '').toLowerCase();
      if (!d) d = url.searchParams.get("domain")?.toLowerCase();
      if (!d) {
        return new Response("Usage: curl ${url.origin}/security/<DOMAIN>\n", { status: 400, headers: { "content-type": "text/plain", "Access-Control-Allow-Origin": "*" } });
      }
      
      const firstResolverUrl = Object.values(apiResolvers)[0];
      
      const [txtRes, dmarcRes, caaRes] = await Promise.all([
        queryDNSServer(d, "TXT", "Primary", firstResolverUrl),
        queryDNSServer(`_dmarc.${d}`, "TXT", "Primary", firstResolverUrl),
        queryDNSServer(d, "CAA", "Primary", firstResolverUrl)
      ]);
      
      let spf = null, dmarc = null, dkim = false, hasCAA = false;
      
      if (txtRes.answers) {
        for (const a of txtRes.answers) {
          if (a.data && a.data.includes('v=spf1')) spf = a.data;
          if (a.data && a.data.includes('v=DKIM1')) dkim = true;
        }
      }
      if (dmarcRes.answers) {
        for (const a of dmarcRes.answers) {
          if (a.data && a.data.includes('v=DMARC1')) dmarc = a.data;
        }
      }
      if (caaRes.answers && caaRes.answers.length > 0) {
        hasCAA = true;
      }
      
      const secData = { domain: d, spf, dmarc, dkim, hasCAA };
      return new Response(JSON.stringify(secData, null, jsonSpace) + "\n", { headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" }});
    }

    if (url.pathname === '/proxy-dns') {
      const targetUrl = url.searchParams.get("url");
      const name = url.searchParams.get("name");
      const type = url.searchParams.get("type");
      if (!targetUrl || !name || !type) return new Response("Missing params", { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
      
      try {
        const res = await fetch(`${targetUrl}?name=${name}&type=${type}`, { headers: { accept: "application/dns-json" }});
        const data = await res.text();
        return new Response(data, { 
          status: res.status, 
          headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" } 
        });
      } catch(e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Access-Control-Allow-Origin": "*" }});
      }
    }

    if (url.pathname === '/propagated' || url.pathname.startsWith('/propagated/')) {
      let d = url.pathname.replace(/^\/propagated\/?/, '').toLowerCase();
      if (!d) d = url.searchParams.get("domain")?.toLowerCase();
      if (!d) {
        return new Response("Usage: curl ${url.origin}/propagated/<DOMAIN>\n", { status: 400, headers: { "content-type": "text/plain", "Access-Control-Allow-Origin": "*" } });
      }
      
      const ipv4RegexLocal = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$/;
      const isIPv6Local = d.includes(':') && /^[0-9a-fA-F:]+$/.test(d);
      
      let checkTypes = ["A", "AAAA", "MX", "TXT", "NS"];
      let queryName = d;
      if (ipv4RegexLocal.test(d)) {
         queryName = d.split('.').reverse().join('.') + '.in-addr.arpa'; checkTypes = ["PTR"];
      } else if (isIPv6Local) {
         queryName = expandIPv6ToArpaServer(d); checkTypes = ["PTR"];
      }

      const pPromises = [];
      for (const type of checkTypes) {
        for (const [name, resolverUrl] of Object.entries(apiResolvers)) {
          pPromises.push(queryDNSServer(queryName, type, name, resolverUrl).then(result => ({ type, result })));
        }
      }
      const pResults = await Promise.all(pPromises);
      const pFinal = {};
      for (const item of pResults) {
        if (!pFinal[item.type]) pFinal[item.type] = { resolvers: {} };
        pFinal[item.type].resolvers[item.result.resolver] = item.result.answers;
      }
      
      const isPropagated = checkPropagation(pFinal, checkTypes);
      return new Response(JSON.stringify(isPropagated) + "\n", { headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" }});
    }


    let targetDomain = url.pathname.substring(1).toLowerCase();
    if (!targetDomain) targetDomain = url.searchParams.get("domain")?.toLowerCase();
    if (url.pathname === '/api-docs') {
      return new Response(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>nslookup API Reference</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet">
<script>
  try {
    const s = JSON.parse(localStorage.getItem('lookup_settings'));
    const t = s?.theme;
    const themes = {
      blue: { p:'#A8C7FA', op:'#062E6F', pc:'#17468D', opc:'#D3E3FD' },
      green: { p:'#93D5A5', op:'#073816', pc:'#0F5223', opc:'#B6ECC3' },
      purple: { p:'#D0BCFF', op:'#381E72', pc:'#4D2C87', opc:'#E8DEF8' },
      red: { p:'#FFB4AB', op:'#690005', pc:'#8C1D18', opc:'#FFDAD6' },
      orange: { p:'#FFB951', op:'#452B00', pc:'#825500', opc:'#FFDDB3' }
    };
    const c = t === 'custom' ? { p: s.customTheme.accent, op: '#131316', pc: s.customTheme.accent, opc: '#E4E1E6' } : themes[t || 'blue'];
    if(c) {
      document.documentElement.style.setProperty('--primary', c.p);
      document.documentElement.style.setProperty('--on-primary', c.op);
      document.documentElement.style.setProperty('--primary-container', c.pc);
      document.documentElement.style.setProperty('--on-primary-container', c.opc);
    }
  } catch(e) {}
</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --surface:#131316;--surface-container:#201F23;--surface-container-high:#2A2A2D;
  --surface-container-highest:#353538;--surface-container-low:#1B1B1F;--surface-container-lowest:#0E0E11;
  --primary:#A8C7FA;--on-primary:#062E6F;--primary-container:#17468D;--on-primary-container:#D3E3FD;
  --on-surface:#E4E1E6;--on-surface-variant:#C7C5D0;--outline:#918F9A;--outline-variant:#46464F;
  --inverse-surface:#E4E1E6;--inverse-on-surface:#313034;
  --error:#FFB4AB;--success:#6DD58C;
}
body{background:var(--surface);color:var(--on-surface);font-family:'Roboto',sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:var(--primary);text-decoration:none}a:hover{text-decoration:underline}
.topbar{position:sticky;top:0;z-index:100;background:rgba(19,19,22,0.92);backdrop-filter:blur(16px);border-bottom:1px solid var(--outline-variant);padding:0 24px;height:64px;display:flex;align-items:center;gap:24px}
.topbar-logo{font-size:22px;font-weight:700;color:var(--primary);letter-spacing:-0.5px}
.topbar-nav{display:flex;gap:8px;margin-left:auto}
.topbar-nav a{padding:8px 16px;border-radius:9999px;font-size:14px;font-weight:500;color:var(--on-surface-variant);transition:background 200ms}
.topbar-nav a:hover{background:rgba(168,199,250,0.08);text-decoration:none;color:var(--on-surface)}
.topbar-nav a.active{background:var(--primary-container);color:var(--on-primary-container)}
.layout{display:flex;min-height:calc(100vh - 64px)}
.sidenav{width:260px;flex-shrink:0;border-right:1px solid var(--outline-variant);padding:16px 12px;position:sticky;top:64px;height:calc(100vh - 64px);overflow-y:auto}
.sidenav-title{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:var(--outline);font-weight:700;padding:8px 16px;margin-bottom:4px}
.sidenav a{display:flex;align-items:center;gap:12px;padding:10px 16px;border-radius:9999px;font-size:14px;font-weight:400;color:var(--on-surface-variant);transition:all 200ms;margin-bottom:2px}
.sidenav a:hover{background:rgba(168,199,250,0.08);color:var(--on-surface);text-decoration:none}
.sidenav a .method{font-size:11px;font-weight:500;font-family:'JetBrains Mono',monospace;color:var(--primary);background:rgba(168,199,250,0.1);padding:2px 8px;border-radius:6px;flex-shrink:0}
.sidenav a .path{font-family:'JetBrains Mono',monospace;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.main{flex:1;padding:32px 40px 80px;max-width:900px}
.main h1{font-size:32px;font-weight:400;margin-bottom:8px}
.main .subtitle{font-size:14px;color:var(--on-surface-variant);margin-bottom:40px;letter-spacing:0.25px}
.endpoint-card{background:var(--surface-container-low);border:1px solid var(--outline-variant);border-radius:16px;padding:24px;margin-bottom:24px}
.endpoint-header{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.method-badge{background:rgba(168,199,250,0.12);color:var(--primary);padding:4px 12px;border-radius:8px;font-size:12px;font-weight:500;font-family:'JetBrains Mono',monospace}
.endpoint-path{font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:500}
.endpoint-desc{font-size:14px;color:var(--on-surface-variant);margin-bottom:20px;letter-spacing:0.25px}
.code-block{position:relative;background:var(--surface-container-lowest);border:1px solid var(--outline-variant);border-radius:12px;padding:14px 16px;margin-bottom:16px;font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--primary);overflow-x:auto;letter-spacing:0.5px}
.code-block .copy-btn{position:absolute;top:8px;right:8px;background:var(--surface-container-high);border:none;color:var(--on-surface-variant);padding:6px 12px;border-radius:9999px;font-size:12px;font-weight:500;cursor:pointer;font-family:'Roboto',sans-serif;transition:all 200ms}
.code-block .copy-btn:hover{background:var(--surface-container-highest);color:var(--on-surface)}
.try-section{background:var(--surface-container);border-radius:12px;padding:20px;border:1px solid var(--outline-variant);margin-bottom:16px}
.param-row{display:flex;flex-direction:column;gap:6px;margin-bottom:16px}
.param-row:last-child{margin-bottom:0}
.param-row label{font-size:11px;font-weight:700;color:var(--outline);text-transform:uppercase;letter-spacing:1.5px}
.param-input{width:100%;padding:10px 16px;background:var(--surface-container-high);border:1px solid var(--outline-variant);border-radius:12px;color:var(--on-surface);font-size:14px;font-family:'Roboto',sans-serif;outline:none;transition:border-color 200ms}
.param-input:focus{border-color:var(--primary)}
.checkbox-group{display:flex;flex-wrap:wrap;gap:8px}
.chip{display:inline-flex}
.chip input{display:none}
.chip span{display:inline-flex;align-items:center;justify-content:center;padding:0 16px;height:32px;border-radius:8px;border:1px solid var(--outline-variant);background:transparent;color:var(--on-surface-variant);font-size:12px;font-weight:500;font-family:'JetBrains Mono',monospace;letter-spacing:0.5px;cursor:pointer;transition:all 200ms;user-select:none}
.chip span:hover{background:rgba(168,199,250,0.08)}
.chip input:checked + span{border-color:var(--primary);color:var(--primary);background:rgba(168,199,250,0.05)}
.toggle-switch{position:relative;display:inline-block;width:44px;height:24px;flex-shrink:0}
.toggle-switch input{opacity:0;width:0;height:0}
.toggle-slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:var(--surface-container-highest);transition:.3s;border-radius:16px;border:2px solid var(--outline)}
.toggle-slider:before{position:absolute;content:"";height:12px;width:12px;left:4px;bottom:4px;background-color:var(--outline);transition:.3s;border-radius:50%}
.toggle-switch input:checked + .toggle-slider{background-color:var(--primary);border-color:var(--primary)}
.toggle-switch input:checked + .toggle-slider:before{transform:translateX(20px);background-color:var(--on-primary)}
.try-btn{padding:0 24px;height:40px;background:var(--primary);color:var(--on-primary);border:none;border-radius:9999px;font-size:14px;font-weight:500;cursor:pointer;font-family:'Roboto',sans-serif;transition:opacity 200ms}
.try-btn:hover{opacity:0.88}
.try-response{margin-top:16px;background:var(--surface-container-lowest);border:1px solid var(--outline-variant);border-radius:12px;padding:16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--on-surface-variant);max-height:400px;overflow:auto;white-space:pre-wrap;display:none}
.try-response.show{display:block}
.hamburger{display:none;background:none;border:none;color:var(--on-surface);cursor:pointer;padding:8px}
.hamburger .material-symbols-rounded{font-size:24px}
@media(max-width:768px){
  .sidenav{position:fixed;left:-280px;top:64px;bottom:0;z-index:200;background:var(--surface-container-low);transition:left 300ms;box-shadow:4px 0 24px rgba(0,0,0,0.3);border-radius:0 16px 16px 0}
  .sidenav.open{left:0}
  .hamburger{display:block}
  .main{padding:24px 16px 80px}
  .overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.32);z-index:199}
  .overlay.show{display:block}
}
</style>
</head>
<body>
<div class="topbar">
  <button class="hamburger" onclick="document.querySelector('.sidenav').classList.toggle('open');document.querySelector('.overlay').classList.toggle('show')"><span class="material-symbols-rounded">menu</span></button>
  <span class="topbar-logo">lookup</span>
  <nav class="topbar-nav">
    <a href="/">Home</a>
    <a href="/api-docs" class="active">API Docs</a>
    <a href="/help">Help</a>
  </nav>
</div>
<div class="overlay" onclick="document.querySelector('.sidenav').classList.remove('open');this.classList.remove('show')"></div>
<div class="layout">
<aside class="sidenav">
  <div class="sidenav-title">Endpoints</div>
  <a href="#lookup"><span class="method">GET</span><span class="path">/{domain}</span></a>
  <a href="#ip"><span class="method">GET</span><span class="path">/ip/{domain}</span></a>
  <a href="#ipv4"><span class="method">GET</span><span class="path">/ipv4/{domain}</span></a>
  <a href="#ipv6"><span class="method">GET</span><span class="path">/ipv6/{domain}</span></a>
  <a href="#whois"><span class="method">GET</span><span class="path">/whois/{domain}</span></a>
  <a href="#abuse"><span class="method">GET</span><span class="path">/abuse/{domain}</span></a>
  <a href="#propagated"><span class="method">GET</span><span class="path">/propagated/{domain}</span></a>
  <a href="#ssl"><span class="method">GET</span><span class="path">/ssl/{domain}</span></a>
  <a href="#security"><span class="method">GET</span><span class="path">/security/{domain}</span></a>
  <a href="#myip"><span class="method">GET</span><span class="path">/</span></a>
</aside>
<div class="main">
  <h1>API Reference</h1>
  <p class="subtitle">An advanced, interactive playground to test and integrate nslookup endpoints.</p>

  <!-- LOOKUP ENDPOINT -->
  <div class="endpoint-card" id="lookup">
    <div class="endpoint-header"><span class="method-badge">GET</span><span class="endpoint-path">/{domain}</span></div>
    <p class="endpoint-desc">Full DNS + WHOIS lookup. Returns all DNS records and optional WHOIS/RDAP data in a single JSON response.</p>
    
    <div class="try-section">
      <div class="param-row">
        <label>Domain</label>
        <input class="param-input" placeholder="e.g. google.com" id="lookup-domain" value="google.com" oninput="updateAll()">
      </div>
      <div class="param-row">
        <label>Record Types (type)</label>
        <div class="checkbox-group" id="lookup-types" onchange="updateAll()">
          <label class="chip"><input type="checkbox" value="A"><span>A</span></label>
          <label class="chip"><input type="checkbox" value="AAAA"><span>AAAA</span></label>
          <label class="chip"><input type="checkbox" value="CAA"><span>CAA</span></label>
          <label class="chip"><input type="checkbox" value="CERT"><span>CERT</span></label>
          <label class="chip"><input type="checkbox" value="CNAME"><span>CNAME</span></label>
          <label class="chip"><input type="checkbox" value="DNSKEY"><span>DNSKEY</span></label>
          <label class="chip"><input type="checkbox" value="DS"><span>DS</span></label>
          <label class="chip"><input type="checkbox" value="HTTPS"><span>HTTPS</span></label>
          <label class="chip"><input type="checkbox" value="LOC"><span>LOC</span></label>
          <label class="chip"><input type="checkbox" value="MX"><span>MX</span></label>
          <label class="chip"><input type="checkbox" value="NAPTR"><span>NAPTR</span></label>
          <label class="chip"><input type="checkbox" value="NS"><span>NS</span></label>
          <label class="chip"><input type="checkbox" value="PTR"><span>PTR</span></label>
          <label class="chip"><input type="checkbox" value="SMIMEA"><span>SMIMEA</span></label>
          <label class="chip"><input type="checkbox" value="SOA"><span>SOA</span></label>
          <label class="chip"><input type="checkbox" value="SRV"><span>SRV</span></label>
          <label class="chip"><input type="checkbox" value="SSHFP"><span>SSHFP</span></label>
          <label class="chip"><input type="checkbox" value="SVCB"><span>SVCB</span></label>
          <label class="chip"><input type="checkbox" value="TLSA"><span>TLSA</span></label>
          <label class="chip"><input type="checkbox" value="TXT"><span>TXT</span></label>
          <label class="chip"><input type="checkbox" value="URI"><span>URI</span></label>
          <label class="chip"><input type="checkbox" value="ALL"><span>ALL</span></label>
        </div>
      </div>
      <div class="param-row" style="flex-direction:row; align-items:center; justify-content:space-between;">
        <label style="margin:0;">Include WHOIS (whois)</label>
        <label class="toggle-switch"><input type="checkbox" id="lookup-whois" checked onchange="updateAll()"><span class="toggle-slider"></span></label>
      </div>
      <div class="param-row">
        <label>Custom Resolvers (resolvers)</label>
        <input class="param-input" placeholder="e.g. https://cloudflare-dns.com/dns-query" id="lookup-resolvers" oninput="updateAll()">
      </div>
    </div>
    
    <div class="code-block" style="display:flex; justify-content:space-between; align-items:center; padding-right:80px;">
      <code id="curl-lookup" style="white-space:pre-wrap; word-break:break-all;"></code>
      <button class="copy-btn" onclick="copyCurl('lookup')">Copy</button>
    </div>
    <div style="text-align: right;"><button class="try-btn" onclick="sendReq('lookup')">Send Request</button></div>
    <pre class="try-response" id="res-lookup"></pre>
  </div>

  <!-- IP ENDPOINT -->
  <div class="endpoint-card" id="ip">
    <div class="endpoint-header"><span class="method-badge">GET</span><span class="endpoint-path">/ip/{domain}</span></div>
    <p class="endpoint-desc">Get IPv4 and IPv6 addresses as JSON.</p>
    
    <div class="try-section">
      <div class="param-row">
        <label>Domain</label>
        <input class="param-input" placeholder="e.g. google.com" id="ip-domain" value="google.com" oninput="updateAll()">
      </div>
      <div class="param-row" style="flex-direction:row; align-items:center; justify-content:space-between;">
        <label style="margin:0;">Include IPv4 (ipv4)</label>
        <label class="toggle-switch"><input type="checkbox" id="ip-ipv4" checked onchange="updateAll()"><span class="toggle-slider"></span></label>
      </div>
      <div class="param-row" style="flex-direction:row; align-items:center; justify-content:space-between;">
        <label style="margin:0;">Include IPv6 (ipv6)</label>
        <label class="toggle-switch"><input type="checkbox" id="ip-ipv6" checked onchange="updateAll()"><span class="toggle-slider"></span></label>
      </div>
    </div>
    
    <div class="code-block" style="display:flex; justify-content:space-between; align-items:center; padding-right:80px;">
      <code id="curl-ip"></code>
      <button class="copy-btn" onclick="copyCurl('ip')">Copy</button>
    </div>
    <div style="text-align: right;"><button class="try-btn" onclick="sendReq('ip')">Send Request</button></div>
    <pre class="try-response" id="res-ip"></pre>
  </div>

  <!-- IPV4 ENDPOINT -->
  <div class="endpoint-card" id="ipv4">
    <div class="endpoint-header"><span class="method-badge">GET</span><span class="endpoint-path">/ipv4/{domain}</span></div>
    <p class="endpoint-desc">Get raw IPv4 address as plain text. Perfect for scripting.</p>
    <div class="try-section">
      <div class="param-row">
        <label>Domain</label>
        <input class="param-input" placeholder="e.g. google.com" id="ipv4-domain" value="google.com" oninput="updateAll()">
      </div>
    </div>
    <div class="code-block" style="display:flex; justify-content:space-between; align-items:center; padding-right:80px;">
      <code id="curl-ipv4"></code>
      <button class="copy-btn" onclick="copyCurl('ipv4')">Copy</button>
    </div>
    <div style="text-align: right;"><button class="try-btn" onclick="sendReq('ipv4', 'text/plain')">Send Request</button></div>
    <pre class="try-response" id="res-ipv4"></pre>
  </div>

  <!-- IPV6 ENDPOINT -->
  <div class="endpoint-card" id="ipv6">
    <div class="endpoint-header"><span class="method-badge">GET</span><span class="endpoint-path">/ipv6/{domain}</span></div>
    <p class="endpoint-desc">Get raw IPv6 address as plain text.</p>
    <div class="try-section">
      <div class="param-row">
        <label>Domain</label>
        <input class="param-input" placeholder="e.g. google.com" id="ipv6-domain" value="google.com" oninput="updateAll()">
      </div>
    </div>
    <div class="code-block" style="display:flex; justify-content:space-between; align-items:center; padding-right:80px;">
      <code id="curl-ipv6"></code>
      <button class="copy-btn" onclick="copyCurl('ipv6')">Copy</button>
    </div>
    <div style="text-align: right;"><button class="try-btn" onclick="sendReq('ipv6', 'text/plain')">Send Request</button></div>
    <pre class="try-response" id="res-ipv6"></pre>
  </div>

  <!-- WHOIS ENDPOINT -->
  <div class="endpoint-card" id="whois">
    <div class="endpoint-header"><span class="method-badge">GET</span><span class="endpoint-path">/whois/{domain}</span></div>
    <p class="endpoint-desc">Get WHOIS / RDAP data as JSON.</p>
    <div class="try-section">
      <div class="param-row">
        <label>Domain</label>
        <input class="param-input" placeholder="e.g. google.com" id="whois-domain" value="google.com" oninput="updateAll()">
      </div>
    </div>
    <div class="code-block" style="display:flex; justify-content:space-between; align-items:center; padding-right:80px;">
      <code id="curl-whois"></code>
      <button class="copy-btn" onclick="copyCurl('whois')">Copy</button>
    </div>
    <div style="text-align: right;"><button class="try-btn" onclick="sendReq('whois')">Send Request</button></div>
    <pre class="try-response" id="res-whois"></pre>
  </div>

  <!-- ABUSE ENDPOINT -->
  <div class="endpoint-card" id="abuse">
    <div class="endpoint-header"><span class="method-badge">GET</span><span class="endpoint-path">/abuse/{domain}</span></div>
    <p class="endpoint-desc">Check if a domain or IP is blacklisted on Spamhaus. Returns true or false.</p>
    <div class="try-section">
      <div class="param-row">
        <label>Domain or IP</label>
        <input class="param-input" placeholder="e.g. google.com" id="abuse-domain" value="google.com" oninput="updateAll()">
      </div>
      <div class="param-row">
        <label>Custom Resolver (resolver)</label>
        <input class="param-input" placeholder="e.g. 1.1.1.1" id="abuse-resolver" oninput="updateAll()">
      </div>
    </div>
    <div class="code-block" style="display:flex; justify-content:space-between; align-items:center; padding-right:80px;">
      <code id="curl-abuse"></code>
      <button class="copy-btn" onclick="copyCurl('abuse')">Copy</button>
    </div>
    <div style="text-align: right;"><button class="try-btn" onclick="sendReq('abuse')">Send Request</button></div>
    <pre class="try-response" id="res-abuse"></pre>
  </div>

  <!-- PROPAGATED ENDPOINT -->
  <div class="endpoint-card" id="propagated">
    <div class="endpoint-header"><span class="method-badge">GET</span><span class="endpoint-path">/propagated/{domain}</span></div>
    <p class="endpoint-desc">Check if DNS records have propagated across resolvers. Returns true or false.</p>
    <div class="try-section">
      <div class="param-row">
        <label>Domain</label>
        <input class="param-input" placeholder="e.g. google.com" id="propagated-domain" value="google.com" oninput="updateAll()">
      </div>
    </div>
    <div class="code-block" style="display:flex; justify-content:space-between; align-items:center; padding-right:80px;">
      <code id="curl-propagated"></code>
      <button class="copy-btn" onclick="copyCurl('propagated')">Copy</button>
    </div>
    <div style="text-align: right;"><button class="try-btn" onclick="sendReq('propagated')">Send Request</button></div>
    <pre class="try-response" id="res-propagated"></pre>
  </div>

  <!-- SSL ENDPOINT -->
  <div class="endpoint-card" id="ssl">
    <div class="endpoint-header"><span class="method-badge">GET</span><span class="endpoint-path">/ssl/{domain}</span></div>
    <p class="endpoint-desc">Returns SSL certificate history for the domain.</p>
    <div class="try-section">
      <div class="param-row">
        <label>Domain</label>
        <input class="param-input" placeholder="e.g. google.com" id="ssl-domain" value="google.com" oninput="updateAll()">
      </div>
      <div class="param-row">
        <label>Provider</label>
        <select class="param-input" id="ssl-provider" onchange="updateAll()">
          <option value="certspotter">CertSpotter</option>
          <option value="crt.sh">crt.sh</option>
        </select>
      </div>
    </div>
    <div class="code-block" style="display:flex; justify-content:space-between; align-items:center; padding-right:80px;">
      <code id="curl-ssl"></code>
      <button class="copy-btn" onclick="copyCurl('ssl')">Copy</button>
    </div>
    <div style="text-align: right;"><button class="try-btn" onclick="sendReq('ssl')">Send Request</button></div>
    <pre class="try-response" id="res-ssl"></pre>
  </div>

  <!-- SECURITY ENDPOINT -->
  <div class="endpoint-card" id="security">
    <div class="endpoint-header"><span class="method-badge">GET</span><span class="endpoint-path">/security/{domain}</span></div>
    <p class="endpoint-desc">Returns security analysis including SPF, DMARC, and CAA presence.</p>
    <div class="try-section">
      <div class="param-row">
        <label>Domain</label>
        <input class="param-input" placeholder="e.g. google.com" id="security-domain" value="google.com" oninput="updateAll()">
      </div>
    </div>
    <div class="code-block" style="display:flex; justify-content:space-between; align-items:center; padding-right:80px;">
      <code id="curl-security"></code>
      <button class="copy-btn" onclick="copyCurl('security')">Copy</button>
    </div>
    <div style="text-align: right;"><button class="try-btn" onclick="sendReq('security')">Send Request</button></div>
    <pre class="try-response" id="res-security"></pre>
  </div>

  <!-- HISTORY ENDPOINT -->
  <div class="endpoint-card" id="history">
    <div class="endpoint-header"><span class="method-badge">GET</span><span class="endpoint-path">/history/{domain}</span></div>
    <p class="endpoint-desc">Returns historical DNS A records from SecurityTrails.</p>
    <div class="try-section">
      <div class="param-row">
        <label>Domain</label>
        <input class="param-input" placeholder="e.g. google.com" id="history-domain" value="google.com" oninput="updateAll()">
      </div>
      <div class="param-row">
        <label>API Key</label>
        <input class="param-input" placeholder="SecurityTrails API Key" id="history-apikey" value="" oninput="updateAll()">
      </div>
    </div>
    <div class="code-block" style="display:flex; justify-content:space-between; align-items:center; padding-right:80px;">
      <code id="curl-history"></code>
      <button class="copy-btn" onclick="copyCurl('history')">Copy</button>
    </div>
    <div style="text-align: right;"><button class="try-btn" onclick="sendReq('history')">Send Request</button></div>
    <pre class="try-response" id="res-history"></pre>
  </div>

  <!-- MY IP ENDPOINT -->
  <div class="endpoint-card" id="myip">
    <div class="endpoint-header"><span class="method-badge">GET</span><span class="endpoint-path">/</span></div>
    <p class="endpoint-desc">Returns your own IP address as plain text.</p>
    <div class="code-block" style="display:flex; justify-content:space-between; align-items:center; padding-right:80px;">
      <code id="curl-myip"></code>
      <button class="copy-btn" onclick="copyCurl('myip')">Copy</button>
    </div>
    <div style="text-align: right;"><button class="try-btn" onclick="sendReq('myip', 'text/plain')">Send Request</button></div>
    <pre class="try-response" id="res-myip"></pre>
  </div>
</div>
</div>
<script>
const BASE_URL = '${url.origin}';

function getUrl(id) {
  if (id === 'myip') return BASE_URL + '/';
  
  let domain = document.getElementById(id + '-domain').value.trim();
  if (!domain) domain = '{domain}';
  
  let path = '/' + domain;
  if (id !== 'lookup') path = '/' + id + '/' + domain;
  
  const url = new URL(BASE_URL + path);
  
  if (id === 'lookup') {
    const types = Array.from(document.querySelectorAll('#lookup-types input:checked')).map(el => el.value);
    if (types.length > 0) url.searchParams.set('type', types.join(','));
    const whois = document.getElementById('lookup-whois').checked;
    if (!whois) url.searchParams.set('whois', 'false');
    const resolvers = document.getElementById('lookup-resolvers').value.trim();
    if (resolvers) url.searchParams.set('resolvers', resolvers);
  } else if (id === 'ip') {
    const ipv4 = document.getElementById('ip-ipv4').checked;
    const ipv6 = document.getElementById('ip-ipv6').checked;
    if (!ipv4) url.searchParams.set('ipv4', 'false');
    if (!ipv6) url.searchParams.set('ipv6', 'false');
  } else if (id === 'abuse') {
    const res = document.getElementById('abuse-resolver').value.trim();
    if (res) url.searchParams.set('resolver', res);
  } else if (id === 'ssl') {
    const provider = document.getElementById('ssl-provider').value;
    if (provider !== 'certspotter') url.searchParams.set('provider', provider);
  } else if (id === 'history') {
    const key = document.getElementById('history-apikey').value.trim();
    if (key) url.searchParams.set('apikey', key);
  }
  
  // Return decoded URL string to make cURL look clean
  return decodeURIComponent(url.toString());
}

function updateAll() {
  ['lookup', 'ip', 'ipv4', 'ipv6', 'whois', 'abuse', 'propagated', 'ssl', 'security', 'history', 'myip'].forEach(id => {
    document.getElementById('curl-' + id).textContent = 'curl "' + getUrl(id) + '"';
  });
}

function copyCurl(id) {
  navigator.clipboard.writeText(document.getElementById('curl-' + id).textContent);
  const btn = event.target;
  btn.textContent = 'Copied!';
  setTimeout(() => btn.textContent = 'Copy', 1500);
}

function sendReq(id, acceptType = 'application/json') {
  const resEl = document.getElementById('res-' + id);
  const url = getUrl(id);
  if (url.includes('{domain}')) {
    resEl.textContent = 'Please enter a valid domain.';
    resEl.classList.add('show');
    return;
  }
  
  resEl.textContent = 'Loading...';
  resEl.classList.add('show');
  
  fetch(url, { headers: { accept: acceptType } })
    .then(r => r.text())
    .then(text => {
      try { resEl.textContent = JSON.stringify(JSON.parse(text), null, 2); }
      catch(e) { resEl.textContent = text; }
    })
    .catch(e => resEl.textContent = 'Error: ' + e.message);
}

document.querySelectorAll('.sidenav a').forEach(a => {
  a.addEventListener('click', function() {
    document.querySelector('.sidenav').classList.remove('open');
    document.querySelector('.overlay').classList.remove('show');
  });
});

// Intersection Observer for sidebar highlighting
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      document.querySelectorAll('.sidenav a').forEach(a => {
        if (a.getAttribute('href') === '#' + entry.target.id) {
          a.classList.add('active');
        } else {
          a.classList.remove('active');
        }
      });
    }
  });
}, { rootMargin: '-20% 0px -70% 0px' });

document.querySelectorAll('.endpoint-card').forEach(card => observer.observe(card));

// Init
updateAll();
</script>
</body>
</html>`, { headers: { "content-type": "text/html;charset=UTF-8" }});
    }

    if (!targetDomain) {
      const clientIP = request.headers.get("CF-Connecting-IP") || "Unknown IP";
      return new Response(clientIP + "\n", { headers: { "content-type": "text/plain", "Access-Control-Allow-Origin": "*" }});
    }

    const ipv4Regex = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$/;
    const isIPv6 = targetDomain.includes(':') && /^[0-9a-fA-F:]+$/.test(targetDomain);
    const isValidDomain = /^[a-zA-Z0-9\u00A1-\uFFFF.-]+\.[a-zA-Z0-9\u00A1-\uFFFF]{2,}$/.test(targetDomain) || targetDomain === 'localhost';

    if (!ipv4Regex.test(targetDomain) && !isIPv6 && !isValidDomain) {
      return new Response(JSON.stringify({ error: "Invalid domain or IP address format" }, null, jsonSpace) + "\n", { status: 400, headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" }});
    }

    let lookupTypes = ["A", "AAAA", "MX", "TXT", "NS", "CAA", "CNAME", "SOA"];
    let dnsQueryName = targetDomain;
    let isReverse = false;

    if (ipv4Regex.test(targetDomain)) {
       isReverse = true; dnsQueryName = targetDomain.split('.').reverse().join('.') + '.in-addr.arpa'; lookupTypes = ["PTR"];
    } else if (isIPv6) {
       isReverse = true; dnsQueryName = expandIPv6ToArpaServer(targetDomain); lookupTypes = ["PTR"];
    } else {
       const paramTypes = url.searchParams.get("records") || url.searchParams.get("type");
       if (paramTypes && paramTypes.toUpperCase() !== "ALL") {
         lookupTypes = paramTypes.toUpperCase().split(",");
       }
    }

    const fetchPromises = [];
    for (const type of lookupTypes) {
      for (const [name, resolverUrl] of Object.entries(apiResolvers)) {
        fetchPromises.push(queryDNSServer(dnsQueryName, type, name, resolverUrl).then(result => ({ type, result })));
      }
    }

    let whoisPromise = null;
    const wantsWhois = url.searchParams.get("whois") !== "false";

    if (!wantsWhois || isReverse) {
      whoisPromise = Promise.resolve({ error: "Skipped" });
    } else {
      const rdapDomain = getBaseDomain(targetDomain);
      const start = Date.now();
      whoisPromise = fetch(`https://rdap.org/domain/${rdapDomain}`, { headers: { accept: "application/rdap+json, application/json", "User-Agent": "curl/8.0.1" }})
      .then(res => res.ok ? res.json() : { error: `HTTP ${res.status}` })
      .then(data => { data._latency = Date.now() - start; return data; })
      .catch(err => ({ error: err.message, _latency: Date.now() - start }));
    }

    const customParam = url.searchParams.get("resolver");
    const firstResolverUrl = customParam || Object.values(apiResolvers)[0];
    const [allResults, whoisData, isAbused] = await Promise.all([
      Promise.all(fetchPromises), 
      whoisPromise,
      checkAbuse(targetDomain, ipv4Regex.test(targetDomain), isIPv6, firstResolverUrl)
    ]);

    const finalResults = {};
    for (const item of allResults) {
      if (!finalResults[item.type]) finalResults[item.type] = { consensus: null, resolvers: {}, _raw: [] };
      finalResults[item.type].resolvers[item.result.resolver] = item.result.answers;
      finalResults[item.type]._raw.push(item.result);
    }

    for (const type of lookupTypes) {
      if (finalResults[type]) {
        finalResults[type].consensus = buildConsensus(finalResults[type]._raw);
        delete finalResults[type]._raw;
      }
    }

    const isPropagated = checkPropagation(finalResults, lookupTypes);

    return new Response(JSON.stringify({ target: targetDomain, isReverseSearch: isReverse, records_queried: lookupTypes, propagated: isPropagated, abuse: isAbused, dns: finalResults, whois: whoisData }, null, jsonSpace) + "\n", { headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" }});
  }
};
