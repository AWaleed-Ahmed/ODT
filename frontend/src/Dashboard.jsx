import React, { useState, useEffect } from 'react';
import ThemeToggle from './ThemeToggle.jsx';

export default function Dashboard({ user, backendStatus, modelStatus, onLogout, onNewDiagram, onOpenDiagram }) {
  const [diagrams, setDiagrams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDiagrams = async () => {
    try {
      const res = await fetch(`/api/diagrams?user_id=${user.user_id}`);
      const data = await res.json();
      if (res.ok) {
        setDiagrams(data.diagrams || []);
      } else {
        setError(data.error || 'Failed to fetch diagrams');
      }
    } catch (err) {
      setError('Network error bridging to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagrams();
  }, [user.user_id]);

  const handleCreateNew = () => {
    onNewDiagram();
  };

  const handleDelete = async (diagramId) => {
    if (!confirm('Are you sure you want to delete this diagram?')) return;
    try {
      const res = await fetch(`/api/diagrams/${diagramId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchDiagrams();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete diagram');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-default)', paddingBottom: '1.5rem', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-primary)' }}>ODT</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <ThemeToggle />
          <span style={{ color: 'var(--text-muted)' }}>Welcome, <strong style={{ color: 'var(--text-primary)' }}>{user.username}</strong></span>
          <button 
            onClick={onLogout} 
            style={{ padding: '8px 16px', backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
          >
            Logout
          </button>
        </div>
      </header>
      
      <main>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Your Diagrams</h2>
          <button onClick={handleCreateNew} style={{ backgroundColor: 'var(--accent-inverse-bg)', color: 'var(--accent-inverse-text)', borderColor: 'var(--border-strong)' }}>
            + New Diagram
          </button>
        </div>

        {error && <p style={{ color: 'var(--error-soft-text)' }}>{error}</p>}
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading diagrams...</p>
        ) : diagrams.length === 0 ? (
          <div style={{ 
            backgroundColor: 'var(--bg-surface)', 
            border: '1px dashed var(--border-default)', 
            borderRadius: '12px', 
            padding: '4rem 2rem', 
            textAlign: 'center'
          }}>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>No diagrams found. Create one to get started!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {diagrams.map(diagram => (
              <div key={diagram.id} style={{ 
                backgroundColor: 'var(--bg-surface)', 
                border: '1px solid var(--border-default)', 
                borderRadius: '12px', 
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                transition: 'border-color 0.2s ease',
                cursor: 'pointer'
              }}
              onClick={() => onOpenDiagram(diagram)}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-emphasis)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
              >
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>{diagram.name}</h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-muted)', padding: '4px 8px', borderRadius: '4px' }}>
                    Type: {diagram.template}
                  </span>
                </div>
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-default)' }}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(diagram.id); }}
                    style={{ padding: '6px 12px', fontSize: '0.9rem', backgroundColor: 'transparent', color: 'var(--error-soft-text)', border: '1px solid rgba(239, 68, 68, 0.35)' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '3rem', borderTop: '1px solid var(--border-default)', paddingTop: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.2rem', color: 'var(--text-primary)' }}>System Status</h3>
          <div style={{ display: 'flex', gap: '2rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            <div>
              <span>API Gateway: </span>
              <strong style={{ color: backendStatus.includes('running') ? 'var(--text-primary)' : 'var(--text-muted)' }}>{backendStatus}</strong>
            </div>
            <div>
              <span>Model Engine: </span>
              <strong style={{ color: modelStatus.includes('running') ? 'var(--text-primary)' : 'var(--text-muted)' }}>{modelStatus}</strong>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
