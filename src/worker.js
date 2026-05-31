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
    return { resolver: resolverName, answers: data.Answer || [] };
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

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const userAgent = request.headers.get("user-agent") || "";
    const wantsAPI = /curl|wget|httpie/i.test(userAgent) || request.headers.get("sec-fetch-mode") === "cors" || request.headers.get("accept")?.includes("application/json") || request.headers.get("referer")?.includes("/api-docs");
    const jsonSpace = url.searchParams.has("preview") ? 2 : undefined;

    let apiResolvers = {
      Cloudflare: "https://cloudflare-dns.com/dns-query",
      Google: "https://dns.google/resolve",
      AdGuard: "https://dns.adguard-dns.com/resolve"
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
      const isFrontendRoute = url.pathname === '/' || /^\/(ip|ipv4|ipv6|whois)(\/.*)?$/.test(url.pathname);
      if (!isFrontendRoute) {
        let targetDomain = url.pathname.substring(1).toLowerCase();
        return Response.redirect(`${url.origin}/?domain=${targetDomain}`, 301);
      }
      return new Response(html, { headers: { "content-type": "text/html;charset=UTF-8" }});
    }

    if (url.pathname === '/help') {
      const cliHelpText = `nslookup API - Brutally clear usage:

1. DNS & WHOIS COMBINED (Default)
curl https://lookup.itzemoji.com/example.com
Gets DNS records (A, AAAA, MX, TXT, etc.) and WHOIS data in one JSON payload.

2. SPECIFIC DNS RECORDS
curl "https://lookup.itzemoji.com/example.com?type=TXT,MX"
Filters to just the DNS records you want.

3. IP-ADDRESSES ONLY (IPv4 & IPv6)
curl https://lookup.itzemoji.com/ip/example.com
Returns JSON with the IPv4 and IPv6 addresses.

4. RAW IPv4 ONLY
curl https://lookup.itzemoji.com/ipv4/example.com
Returns just the raw IPv4 string (perfect for scripting).

5. RAW IPv6 ONLY
curl https://lookup.itzemoji.com/ipv6/example.com
Returns just the raw IPv6 string.

6. WHOIS / RDAP ONLY
curl https://lookup.itzemoji.com/whois/example.com
Returns pure JSON RDAP/WHOIS data.

7. YOUR OWN IP
curl https://lookup.itzemoji.com/
Returns the IP address you are calling from.
`;
      if (wantsAPI) {
        return new Response(cliHelpText, { headers: { "content-type": "text/plain", "Access-Control-Allow-Origin": "*" }});
      } else {
        const inner = `
          <div style="padding: 40px; max-width: 800px; width: 100%; margin: 0 auto;">
            <div class="card" style="opacity: 1; animation: fadeIn 0.2s ease;">
              <h2 style="margin-top: 0; margin-bottom: 20px; font-size: 28px;">Brutally Clear Help</h2>
              <p style="color: var(--text-secondary); margin-bottom: 25px; line-height: 1.6;">Here is exactly what this API can do for you, no fluff.</p>
              
              <div style="display:flex; flex-direction:column; gap:20px;">
                <div style="background: var(--bg); padding: 15px; border-radius: 10px; border: 1px solid var(--border);">
                  <h3 style="margin:0 0 10px 0; font-size:18px; color:var(--link);">1. Full Lookup</h3>
                  <code style="display:block; padding:8px; background:#111; color:#fff; border-radius:6px; margin-bottom:10px;">curl https://lookup.itzemoji.com/example.com</code>
                  <p style="margin:0; font-size:14px;">Gets DNS records and WHOIS data in one JSON payload.</p>
                </div>

                <div style="background: var(--bg); padding: 15px; border-radius: 10px; border: 1px solid var(--border);">
                  <h3 style="margin:0 0 10px 0; font-size:18px; color:var(--link);">2. Specific Records</h3>
                  <code style="display:block; padding:8px; background:#111; color:#fff; border-radius:6px; margin-bottom:10px;">curl "https://lookup.itzemoji.com/example.com?type=TXT,MX"</code>
                  <p style="margin:0; font-size:14px;">Filters to just the DNS records you want.</p>
                </div>

                <div style="background: var(--bg); padding: 15px; border-radius: 10px; border: 1px solid var(--border);">
                  <h3 style="margin:0 0 10px 0; font-size:18px; color:var(--link);">3. IP-Addresses (JSON)</h3>
                  <code style="display:block; padding:8px; background:#111; color:#fff; border-radius:6px; margin-bottom:10px;">curl https://lookup.itzemoji.com/ip/example.com</code>
                  <p style="margin:0; font-size:14px;">Returns JSON with both IPv4 and IPv6 addresses.</p>
                </div>

                <div style="background: var(--bg); padding: 15px; border-radius: 10px; border: 1px solid var(--border);">
                  <h3 style="margin:0 0 10px 0; font-size:18px; color:var(--link);">4. Raw IPv4</h3>
                  <code style="display:block; padding:8px; background:#111; color:#fff; border-radius:6px; margin-bottom:10px;">curl https://lookup.itzemoji.com/ipv4/example.com</code>
                  <p style="margin:0; font-size:14px;">Returns just the raw IPv4 string. Perfect for scripting.</p>
                </div>
                
                <div style="background: var(--bg); padding: 15px; border-radius: 10px; border: 1px solid var(--border);">
                  <h3 style="margin:0 0 10px 0; font-size:18px; color:var(--link);">5. Raw IPv6</h3>
                  <code style="display:block; padding:8px; background:#111; color:#fff; border-radius:6px; margin-bottom:10px;">curl https://lookup.itzemoji.com/ipv6/example.com</code>
                  <p style="margin:0; font-size:14px;">Returns just the raw IPv6 string.</p>
                </div>

                <div style="background: var(--bg); padding: 15px; border-radius: 10px; border: 1px solid var(--border);">
                  <h3 style="margin:0 0 10px 0; font-size:18px; color:var(--link);">6. WHOIS Only</h3>
                  <code style="display:block; padding:8px; background:#111; color:#fff; border-radius:6px; margin-bottom:10px;">curl https://lookup.itzemoji.com/whois/example.com</code>
                  <p style="margin:0; font-size:14px;">Returns pure JSON RDAP/WHOIS data.</p>
                </div>
                
                <div style="background: var(--bg); padding: 15px; border-radius: 10px; border: 1px solid var(--border);">
                  <h3 style="margin:0 0 10px 0; font-size:18px; color:var(--link);">7. Your Own IP</h3>
                  <code style="display:block; padding:8px; background:#111; color:#fff; border-radius:6px; margin-bottom:10px;">curl https://lookup.itzemoji.com/</code>
                  <p style="margin:0; font-size:14px;">Returns the IP address you are calling from.</p>
                </div>
              </div>
            </div>
          </div>`;
        return new Response(renderWithTheme(`Help`, inner), { headers: { "content-type": "text/html;charset=UTF-8", "Access-Control-Allow-Origin": "*" }});
      }
    }

    if (url.pathname === '/ip' || (url.pathname.startsWith('/ip/') && !url.pathname.startsWith('/ipv4/') && !url.pathname.startsWith('/ipv6/'))) {
      let d = url.pathname.replace(/^\/ip\/?/, '').toLowerCase();
      if (!d) d = url.searchParams.get("domain")?.toLowerCase();
      if (!d) {
        return new Response("Usage: curl https://lookup.itzemoji.com/ip/<DOMAIN>\n", { status: 400, headers: { "content-type": "text/plain", "Access-Control-Allow-Origin": "*" } });
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
        return new Response(`Usage: curl https://lookup.itzemoji.com${isV4 ? '/ipv4' : '/ipv6'}/<DOMAIN>\n`, { status: 400, headers: { "content-type": "text/plain", "Access-Control-Allow-Origin": "*" } });
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
        return new Response("Usage: curl https://lookup.itzemoji.com/whois/<DOMAIN>\n", { status: 400, headers: { "content-type": "text/plain", "Access-Control-Allow-Origin": "*" } });
      }
      const baseDomain = getBaseDomain(d);
      const start = Date.now();
      const res = await fetch(`https://rdap.org/domain/${baseDomain}`, { headers: { accept: "application/rdap+json, application/json", "User-Agent": "curl/8.0.1" }});
      const data = await (res.ok ? res.json() : Promise.resolve({ error: `HTTP ${res.status}` }));
      data._latency = Date.now() - start;
      
      return new Response(JSON.stringify(data, null, jsonSpace) + "\n", { headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" }});
    }

    let targetDomain = url.pathname.substring(1).toLowerCase();
    if (!targetDomain) targetDomain = url.searchParams.get("domain")?.toLowerCase();

    if (url.pathname === '/api-docs') {
      return new Response(`<!DOCTYPE html>
<html>
  <head>
    <title>nslookup API Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script id="api-reference" type="application/json">
      {
        "openapi": "3.1.0",
        "info": {
          "title": "nslookup API",
          "version": "1.0.0",
          "description": "API to query DNS and WHOIS data."
        },
        "servers": [{ "url": "https://lookup.itzemoji.com" }],
        "paths": {
          "/{domain}": {
            "get": {
              "summary": "Lookup DNS and WHOIS",
              "parameters": [
                { "name": "domain", "in": "path", "required": true, "schema": { "type": "string" }, "example": "google.com" },
                { "name": "type", "in": "query", "schema": { "type": "string" }, "description": "Comma-separated records e.g. A,AAAA,TXT or ALL" },
                { "name": "whois", "in": "query", "schema": { "type": "boolean" }, "description": "Include WHOIS data" },
                { "name": "resolvers", "in": "query", "schema": { "type": "string" }, "description": "Comma-separated custom resolver URLs" }
              ],
              "responses": { "200": { "description": "Success" } }
            }
          },
          "/ip/{domain}": {
            "get": {
              "summary": "Get IPv4 and IPv6 as JSON",
              "parameters": [
                { "name": "domain", "in": "path", "required": true, "schema": { "type": "string" }, "example": "google.com" },
                { "name": "ipv4", "in": "query", "schema": { "type": "boolean" }, "description": "Include IPv4" },
                { "name": "ipv6", "in": "query", "schema": { "type": "boolean" }, "description": "Include IPv6" }
              ],
              "responses": { "200": { "description": "Success" } }
            }
          },
          "/ipv4/{domain}": {
            "get": {
              "summary": "Get raw IPv4",
              "parameters": [{ "name": "domain", "in": "path", "required": true, "schema": { "type": "string" }, "example": "google.com" }],
              "responses": { "200": { "description": "Success" } }
            }
          },
          "/ipv6/{domain}": {
            "get": {
              "summary": "Get raw IPv6",
              "parameters": [{ "name": "domain", "in": "path", "required": true, "schema": { "type": "string" }, "example": "google.com" }],
              "responses": { "200": { "description": "Success" } }
            }
          },
          "/whois/{domain}": {
            "get": {
              "summary": "Get WHOIS / RDAP",
              "parameters": [{ "name": "domain", "in": "path", "required": true, "schema": { "type": "string" }, "example": "google.com" }],
              "responses": { "200": { "description": "Success" } }
            }
          },
          "/": {
            "get": {
              "summary": "Get your own IP",
              "responses": { "200": { "description": "Success" } }
            }
          }
        }
      }
    </script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`, { headers: { "content-type": "text/html;charset=UTF-8" }});
    }

    if (!targetDomain) {
      const clientIP = request.headers.get("CF-Connecting-IP") || "Unknown IP";
      return new Response(clientIP + "\n", { headers: { "content-type": "text/plain", "Access-Control-Allow-Origin": "*" }});
    }



    const ipv4Regex = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$/;
    const isIPv6 = targetDomain.includes(':') && /^[0-9a-fA-F:]+$/.test(targetDomain);

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

    const [allResults, whoisData] = await Promise.all([Promise.all(fetchPromises), whoisPromise]);

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

    return new Response(JSON.stringify({ target: targetDomain, isReverseSearch: isReverse, records_queried: lookupTypes, dns: finalResults, whois: whoisData }, null, jsonSpace) + "\n", { headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" }});
  }
};
