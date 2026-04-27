import React, { useState, useEffect } from 'react';
import ThemeToggle from './ThemeToggle.jsx';

export default function TemplateSelection({ onSelect, onCancel }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/templates')
      .then(res => res.json())
      .then(data => {
        setTemplates(data.templates || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching templates', err);
        setLoading(false);
      });
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
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {templates.map(template => (
            <div key={template.id} style={{
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
              <h3 style={{ fontSize: '1.3rem', margin: 0, color: 'var(--text-primary)' }}>{template.name}</h3>
              <p style={{ color: 'var(--text-muted)', margin: 0, flex: 1 }}>
                {template.elements.length === 0 ? 'Start from scratch' : `${template.elements.length} predefined elements`}
              </p>
              <button 
                onClick={() => onSelect(template.name, template.elements, template.connectors || [])}
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
          ))}
        </div>
      )}
    </div>
  );
}
