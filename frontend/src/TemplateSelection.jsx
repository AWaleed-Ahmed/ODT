import React, { useState, useEffect } from 'react';
import ThemeToggle from './ThemeToggle.jsx';

async function fetchTemplates(signal) {
  const res = await fetch('/api/templates', { signal });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.detail || data.error || `${res.status} ${res.statusText}`;
    throw new Error(typeof msg === 'string' ? msg : 'Templates request failed');
  }
  const list = data.templates;
  if (!Array.isArray(list)) {
    throw new Error(data.error || 'Invalid templates response from server');
  }
  return list;
}

export default function TemplateSelection({ onSelect, onCancel }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError('');
    fetchTemplates(ac.signal)
      .then(setTemplates)
      .catch((err) => {
        if (err.name === 'AbortError') return;
        console.error('Error fetching templates', err);
        setError(err.message || 'Could not load templates.');
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border-default)', paddingBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--text-primary)' }}>Select a Template</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <ThemeToggle />
          <button 
            onClick={onCancel} 
            style={{ backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
          >
            Cancel
          </button>
        </div>
      </header>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Loading templates from backend...</p>
      ) : error ? (
        <div style={{
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
        }}>
          <p style={{ margin: '0 0 0.75rem 0', color: 'var(--error-soft-text)', fontWeight: 600 }}>Could not load templates</p>
          <p style={{ margin: 0 }}>{error}</p>
          <p style={{ margin: '1rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Local dev: start the Python API on port <strong>8000</strong> and the Node gateway on port <strong>3001</strong>, then restart <code style={{ fontSize: '0.85em' }}>npm run dev</code> in <code style={{ fontSize: '0.85em' }}>frontend/</code>.
          </p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError('');
              fetchTemplates(new AbortController().signal)
                .then(setTemplates)
                .catch((err) => setError(err.message || 'Retry failed'))
                .finally(() => setLoading(false));
            }}
            style={{ marginTop: '1rem' }}
          >
            Retry
          </button>
        </div>
      ) : templates.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No templates available. Check the API storage and templates.json.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {templates.map((template) => {
            const els = template.elements;
            const count = Array.isArray(els) ? els.length : 0;
            return (
            <div key={template.id || template.name} style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: '12px',
              padding: '2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-emphasis)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
            >
              <h3 style={{ fontSize: '1.3rem', margin: 0, color: 'var(--text-primary)' }}>{template.name || 'Untitled'}</h3>
              <p style={{ color: 'var(--text-muted)', margin: 0, flex: 1 }}>
                {count === 0 ? 'Start from scratch' : `${count} predefined elements`}
              </p>
              <button 
                onClick={() => onSelect(template.name, Array.isArray(els) ? els : [], template.connectors || [])}
                style={{
                  backgroundColor: 'var(--bg-hover)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-strong)',
                  width: '100%'
                }}
              >
                Use Template
              </button>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
