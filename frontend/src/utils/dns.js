export async function queryDNS(domain, type, resolverName, resolverUrl) {
  const started = Date.now();
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 5000);
  try {
    let finalUrl = `${resolverUrl}?name=${domain}&type=${type}`;
    
    // Proxy resolvers that do not support CORS (like AdGuard) through our backend
    if (resolverUrl.includes('adguard') || resolverUrl.includes('quad9')) {
      finalUrl = `/proxy-dns?url=${encodeURIComponent(resolverUrl)}&name=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`;
    }

    const res = await fetch(finalUrl, {
      headers: { accept: 'application/dns-json' }, signal: controller.signal
    });
    clearTimeout(tid);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return { resolver: resolverName, duration: Date.now() - started, answers: data.Answer || [], error: null };
  } catch (err) {
    clearTimeout(tid);
    return { resolver: resolverName, duration: Date.now() - started, answers: [], error: err.name === 'AbortError' ? 'Timeout' : err.message };
  }
}

export function buildConsensus(arr) {
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
