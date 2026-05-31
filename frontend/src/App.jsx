import React, { useState } from 'react';
import SearchBar from './components/SearchBar';
import AbuseChecker from './components/AbuseChecker';
import DnsResults from './components/DnsResults';
import { queryDNS, buildConsensus } from './utils/dns';

const RESOLVERS = {
  Cloudflare: 'https://cloudflare-dns.com/dns-query',
  Google: 'https://dns.google/resolve'
};

function App() {
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  
  const handleSearch = async (domain) => {
    setTarget(domain);
    setLoading(true);
    setResults(null);
    
    const lookupTypes = ["A", "AAAA", "MX", "TXT", "NS", "CAA", "CNAME", "SOA"];
    const fetchPromises = [];
    
    for (const type of lookupTypes) {
      for (const [name, url] of Object.entries(RESOLVERS)) {
        fetchPromises.push(queryDNS(domain, type, name, url).then(result => ({ type, result })));
      }
    }
    
    const allResults = await Promise.all(fetchPromises);
    const finalResults = {};
    
    for (const item of allResults) {
      if (!finalResults[item.type]) finalResults[item.type] = { _raw: [] };
      finalResults[item.type]._raw.push(item.result);
    }
    
    for (const type of lookupTypes) {
      if (finalResults[type]) {
        finalResults[type].consensus = buildConsensus(finalResults[type]._raw);
      }
    }
    
    setResults(finalResults);
    setLoading(false);
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', fontSize: '48px', fontWeight: 800, marginBottom: '40px' }}>lookup</h1>
      
      <SearchBar onSearch={handleSearch} />
      
      {loading && <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-muted)' }}>Querying globally distributed resolvers... ⏳</div>}
      
      {target && !loading && (
        <div style={{ marginTop: '40px', animation: 'fadeIn 0.3s ease' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '20px' }}>Results for {target}</h2>
          
          <AbuseChecker domain={target} isIP={false} />
          
          <DnsResults results={results} />
        </div>
      )}
    </div>
  );
}

export default App;
