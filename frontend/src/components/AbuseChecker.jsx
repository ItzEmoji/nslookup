import React, { useState, useEffect } from 'react';

function AbuseChecker({ domain, isIP }) {
  const [status, setStatus] = useState('checking'); // 'checking', 'clean', 'abused', 'error'
  const [resolver, setResolver] = useState('https://cloudflare-dns.com/dns-query');

  useEffect(() => {
    if (!domain) return;
    
    let isMounted = true;
    setStatus('checking');
    
    const checkAbuse = async () => {
      try {
        // Query the worker API backend for the abuse check!
        // This utilizes the server-side abuse check (which uses the custom resolver)
        const response = await fetch(`/abuse/${domain}?resolver=${encodeURIComponent(resolver)}`);
        if (!response.ok) throw new Error('API Error');
        const isAbused = await response.json();
        
        if (isMounted) {
          setStatus(isAbused ? 'abused' : 'clean');
        }
      } catch (err) {
        if (isMounted) setStatus('error');
      }
    };
    
    checkAbuse();
    return () => { isMounted = false; };
  }, [domain, resolver]);

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${status === 'abused' ? 'var(--error)' : status === 'clean' ? 'var(--success)' : 'var(--border)'}`,
      borderRadius: '20px',
      padding: '24px',
      marginTop: '24px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.05)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          🛡️ Security & Abuse Check
        </h3>
        <select 
          value={resolver} 
          onChange={(e) => setResolver(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          <option value="https://cloudflare-dns.com/dns-query">Cloudflare (Default)</option>
          <option value="https://dns.google/resolve">Google</option>
        </select>
      </div>

      <div style={{
        padding: '16px',
        borderRadius: '12px',
        background: 'var(--bg)',
        border: '1px solid var(--border)'
      }}>
        {status === 'checking' && <span style={{ color: 'var(--text-muted)' }}>Checking against Spamhaus DNSBL... ⏳</span>}
        {status === 'clean' && <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>✅ Domain/IP is completely clean!</span>}
        {status === 'abused' && <span style={{ color: 'var(--error)', fontWeight: 'bold' }}>⚠️ WARNING: Domain/IP is listed on Spamhaus blocklists!</span>}
        {status === 'error' && <span style={{ color: 'var(--warning)' }}>⚠️ Failed to perform abuse check.</span>}
      </div>
    </div>
  );
}

export default AbuseChecker;
