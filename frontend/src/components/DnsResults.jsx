import React from 'react';

function DnsResults({ results }) {
  if (!results) return null;

  return (
    <div style={{ marginTop: '24px' }}>
      {Object.entries(results).map(([type, data]) => (
        <div key={type} style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          padding: '24px',
          marginBottom: '20px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ padding: '4px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', color: 'var(--link)', fontFamily: 'var(--font-mono)' }}>{type}</span>
          </h3>
          
          {data.consensus ? (
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
              {data.consensus.values.map((v, i) => (
                <div key={i} style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '17px', fontWeight: 'bold', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{v.value}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Confirmed by: {v.confirmedBy.join(', ')}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)' }}>No records found</div>
          )}

          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: 'var(--text-muted)' }}>View Raw Resolver Data</summary>
            {data._raw.map((r, i) => (
              <div key={i} style={{ marginTop: '10px', padding: '10px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px' }}>
                <strong>{r.resolver}</strong> ({r.duration}ms)
                {r.error ? (
                  <div style={{ color: 'var(--error)' }}>{r.error}</div>
                ) : (
                  <pre style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)' }}>
                    {JSON.stringify(r.answers, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </details>
        </div>
      ))}
    </div>
  );
}

export default DnsResults;
