import React, { useState } from 'react';

function SearchBar({ onSearch }) {
  const [query, setQuery] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '720px', margin: '0 auto' }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="google.com or 8.8.8.8"
        autoComplete="off"
        spellCheck="false"
        style={{
          width: '100%',
          padding: '22px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          color: 'var(--text)',
          fontSize: '20px',
          outline: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      />
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
        <button 
          onClick={() => query.trim() && onSearch(query.trim())}
          style={{
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '12px 20px',
            fontSize: '15px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          Lookup Data
        </button>
      </div>
    </div>
  );
}

export default SearchBar;
