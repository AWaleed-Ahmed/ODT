import React, { useState, useEffect, useRef, useCallback } from 'react';
import ThemeToggle from './ThemeToggle.jsx';
import { ClipboardList, Ticket, Trash2, ArrowRightCircle } from 'lucide-react';

const PRIORITIES = ['low', 'medium', 'high'];
const TICKET_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' },
];

function formatShortDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function Dashboard({ user, backendStatus, modelStatus, onLogout, onNewDiagram, onOpenDiagram }) {
  const [diagrams, setDiagrams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef(null);

  const [workspace, setWorkspace] = useState({ requirements: [], tickets: [] });
  const [wsLoading, setWsLoading] = useState(true);
  const [wsError, setWsError] = useState('');

  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqPriority, setReqPriority] = useState('medium');

  const [tkTitle, setTkTitle] = useState('');
  const [tkDesc, setTkDesc] = useState('');
  const [tkPriority, setTkPriority] = useState('medium');

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

  const fetchWorkspace = useCallback(async () => {
    setWsLoading(true);
    setWsError('');
    try {
      const res = await fetch(`/api/workspace?user_id=${encodeURIComponent(user.user_id)}`);
      const data = await res.json();
      if (res.ok) {
        setWorkspace({
          requirements: data.requirements || [],
          tickets: data.tickets || [],
        });
      } else {
        setWsError(data.detail || data.error || 'Failed to load workspace');
      }
    } catch {
      setWsError('Could not load requirements and tickets (is the API running?)');
    } finally {
      setWsLoading(false);
    }
  }, [user.user_id]);

  useEffect(() => {
    fetchDiagrams();
  }, [user.user_id]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  const handleDelete = async (diagramId) => {
    if (!confirm('Are you sure you want to delete this diagram?')) return;
    try {
      const res = await fetch(`/api/diagrams/${diagramId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchDiagrams();
      } else {
        const data = await res.json();
        alert(data.error || data.detail || 'Failed to delete diagram');
      }
    } catch {
      alert('Network error');
    }
  };

  const startRename = (e, diagram) => {
    e.stopPropagation();
    setRenamingId(diagram.id);
    setRenameValue(diagram.name);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  };

  const commitRename = async (diagramId) => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenamingId(null);
      return;
    }
    try {
      const res = await fetch(`/api/diagrams/${diagramId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        setDiagrams((prev) => prev.map((d) => (d.id === diagramId ? { ...d, name: trimmed } : d)));
      } else {
        const data = await res.json();
        alert(data.detail || data.error || 'Failed to rename');
      }
    } catch {
      alert('Network error');
    } finally {
      setRenamingId(null);
    }
  };

  const addRequirement = async (e) => {
    e.preventDefault();
    const title = reqTitle.trim();
    if (!title) return;
    try {
      const res = await fetch('/api/workspace/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.user_id,
          title,
          description: reqDesc.trim(),
          priority: reqPriority,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || data.error || 'Failed to add requirement');
        return;
      }
      setReqTitle('');
      setReqDesc('');
      setReqPriority('medium');
      fetchWorkspace();
    } catch {
      alert('Network error');
    }
  };

  const deleteRequirement = async (id) => {
    if (!confirm('Remove this requirement?')) return;
    try {
      const res = await fetch(
        `/api/workspace/requirements/${id}?user_id=${encodeURIComponent(user.user_id)}`,
        { method: 'DELETE' }
      );
      if (res.ok) fetchWorkspace();
      else {
        const data = await res.json();
        alert(data.detail || 'Delete failed');
      }
    } catch {
      alert('Network error');
    }
  };

  const promoteRequirement = async (id) => {
    try {
      const res = await fetch(`/api/workspace/requirements/${id}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || data.error || 'Could not create ticket');
        return;
      }
      fetchWorkspace();
    } catch {
      alert('Network error');
    }
  };

  const addTicket = async (e) => {
    e.preventDefault();
    const title = tkTitle.trim();
    if (!title) return;
    try {
      const res = await fetch('/api/workspace/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.user_id,
          title,
          description: tkDesc.trim(),
          priority: tkPriority,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || data.error || 'Failed to add ticket');
        return;
      }
      setTkTitle('');
      setTkDesc('');
      setTkPriority('medium');
      fetchWorkspace();
    } catch {
      alert('Network error');
    }
  };

  const updateTicketStatus = async (ticketId, status) => {
    try {
      const res = await fetch(`/api/workspace/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id, status }),
      });
      if (res.ok) fetchWorkspace();
      else {
        const data = await res.json();
        alert(data.detail || 'Update failed');
      }
    } catch {
      alert('Network error');
    }
  };

  const deleteTicket = async (id) => {
    if (!confirm('Delete this ticket?')) return;
    try {
      const res = await fetch(
        `/api/workspace/tickets/${id}?user_id=${encodeURIComponent(user.user_id)}`,
        { method: 'DELETE' }
      );
      if (res.ok) fetchWorkspace();
      else {
        const data = await res.json();
        alert(data.detail || 'Delete failed');
      }
    } catch {
      alert('Network error');
    }
  };

  const cardStyle = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    borderRadius: '12px',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  };

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border-strong)',
    backgroundColor: 'var(--bg-input)',
    color: 'var(--text-primary)',
    caretColor: 'var(--text-primary)',
    fontSize: '0.95rem',
    outline: 'none',
  };

  const labelStyle = { display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-default)', paddingBottom: '1.5rem', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-primary)' }}>ODT</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <ThemeToggle />
          <span style={{ color: 'var(--text-muted)' }}>
            Welcome, <strong style={{ color: 'var(--text-primary)' }}>{user.username}</strong>
          </span>
          <button onClick={onLogout} style={{ padding: '8px 16px', backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
            Logout
          </button>
        </div>
      </header>

      <main>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--text-primary)' }}>Your Diagrams</h2>
          <button onClick={onNewDiagram} style={{ backgroundColor: 'var(--accent-inverse-bg)', color: 'var(--accent-inverse-text)', borderColor: 'var(--border-strong)' }}>
            + New Diagram
          </button>
        </div>

        {error && <p style={{ color: 'var(--error-soft-text)' }}>{error}</p>}
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading diagrams...</p>
        ) : diagrams.length === 0 ? (
          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px dashed var(--border-default)', borderRadius: '12px', padding: '4rem 2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>No diagrams found. Create one to get started!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {diagrams.map((diagram) => (
              <div
                key={diagram.id}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  transition: 'border-color 0.2s ease',
                  cursor: 'pointer',
                }}
                onClick={() => onOpenDiagram(diagram)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-emphasis)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-default)';
                }}
              >
                <div>
                  {renamingId === diagram.id ? (
                    <input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(diagram.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(diagram.id);
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        backgroundColor: 'var(--bg-muted)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-emphasis)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        outline: 'none',
                        marginBottom: '0.5rem',
                      }}
                    />
                  ) : (
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>{diagram.name}</h3>
                  )}
                  <span
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)',
                      backgroundColor: 'var(--bg-muted)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    {diagram.template}
                  </span>
                </div>
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-default)' }}>
                  <button
                    onClick={(e) => startRename(e, diagram)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.9rem',
                      backgroundColor: 'transparent',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                    }}
                  >
                    Rename
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(diagram.id);
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.9rem',
                      backgroundColor: 'transparent',
                      color: 'var(--error-soft-text)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      borderRadius: '6px',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <section style={{ marginTop: '3rem', borderTop: '1px solid var(--border-default)', paddingTop: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.35rem', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ClipboardList size={22} aria-hidden />
              Requirements &amp; tickets
            </h2>
            <button
              type="button"
              onClick={() => fetchWorkspace()}
              style={{
                padding: '6px 12px',
                fontSize: '0.85rem',
                backgroundColor: 'var(--bg-muted)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
              }}
            >
              Refresh
            </button>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0 0 1.5rem 0', maxWidth: '720px' }}>
            Capture needs before you diagram them. Promote a requirement to open a tracked ticket, or add tickets directly for bugs and tasks.
          </p>

          {wsError && <p style={{ color: 'var(--error-soft-text)', marginBottom: '1rem' }}>{wsError}</p>}
          {wsLoading ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading workspace…</p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1.5rem',
                alignItems: 'start',
              }}
            >
              <div style={cardStyle}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ClipboardList size={18} aria-hidden />
                  Requirements
                </h3>
                <form onSubmit={addRequirement} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={labelStyle}>Title</label>
                    <input
                      value={reqTitle}
                      onChange={(e) => setReqTitle(e.target.value)}
                      placeholder="e.g. Export diagrams as PDF"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Details</label>
                    <textarea
                      value={reqDesc}
                      onChange={(e) => setReqDesc(e.target.value)}
                      placeholder="Context, acceptance criteria, stakeholders…"
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical', minHeight: '72px' }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Priority</label>
                    <select value={reqPriority} onChange={(e) => setReqPriority(e.target.value)} style={inputStyle}>
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" style={{ alignSelf: 'flex-start', marginTop: '0.25rem' }}>
                    Add requirement
                  </button>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                  {workspace.requirements.length === 0 ? (
                    <p style={{ color: 'var(--text-faint)', fontSize: '0.9rem', margin: 0 }}>No requirements yet.</p>
                  ) : (
                    workspace.requirements.map((r) => (
                      <div
                        key={r.id}
                        style={{
                          padding: '1rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-muted)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{r.title}</strong>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              color: 'var(--text-muted)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {r.priority} · {r.status || 'draft'}
                          </span>
                        </div>
                        {r.description ? (
                          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                            {r.description}
                          </p>
                        ) : null}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
                          <button
                            type="button"
                            onClick={() => promoteRequirement(r.id)}
                            title="Create a ticket from this requirement"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '6px 10px',
                              fontSize: '0.8rem',
                              backgroundColor: 'var(--success-soft-bg)',
                              color: 'var(--success-soft-text)',
                              border: '1px solid var(--success-text)',
                              borderRadius: '6px',
                            }}
                          >
                            <ArrowRightCircle size={14} aria-hidden />
                            Create ticket
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteRequirement(r.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '6px 10px',
                              fontSize: '0.8rem',
                              backgroundColor: 'transparent',
                              color: 'var(--error-soft-text)',
                              border: '1px solid rgba(239, 68, 68, 0.35)',
                              borderRadius: '6px',
                            }}
                          >
                            <Trash2 size={14} aria-hidden />
                            Remove
                          </button>
                        </div>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-faint)' }}>{formatShortDate(r.created_at)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={cardStyle}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Ticket size={18} aria-hidden />
                  Tickets
                </h3>
                <form onSubmit={addTicket} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={labelStyle}>Title</label>
                    <input
                      value={tkTitle}
                      onChange={(e) => setTkTitle(e.target.value)}
                      placeholder="e.g. Fix connector labels on export"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Description</label>
                    <textarea
                      value={tkDesc}
                      onChange={(e) => setTkDesc(e.target.value)}
                      rows={2}
                      style={{ ...inputStyle, resize: 'vertical', minHeight: '56px' }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Priority</label>
                    <select value={tkPriority} onChange={(e) => setTkPriority(e.target.value)} style={inputStyle}>
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" style={{ alignSelf: 'flex-start', marginTop: '0.25rem' }}>
                    Add ticket
                  </button>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                  {workspace.tickets.length === 0 ? (
                    <p style={{ color: 'var(--text-faint)', fontSize: '0.9rem', margin: 0 }}>No tickets yet.</p>
                  ) : (
                    workspace.tickets.map((t) => (
                      <div
                        key={t.id}
                        style={{
                          padding: '1rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-muted)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem', flex: '1 1 160px' }}>{t.title}</strong>
                          <select
                            value={t.status || 'open'}
                            onChange={(e) => updateTicketStatus(t.id, e.target.value)}
                            style={{
                              ...inputStyle,
                              width: 'auto',
                              minWidth: '140px',
                              padding: '6px 10px',
                              fontSize: '0.85rem',
                            }}
                          >
                            {TICKET_STATUSES.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        {t.description ? (
                          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                            {t.description}
                          </p>
                        ) : null}
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginTop: '0.6rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Priority: <strong style={{ color: 'var(--text-secondary)' }}>{t.priority}</strong>
                            {t.source_requirement_id ? ' · from requirement' : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => deleteTicket(t.id)}
                            style={{
                              marginLeft: 'auto',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '4px 8px',
                              fontSize: '0.75rem',
                              backgroundColor: 'transparent',
                              color: 'var(--error-soft-text)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '6px',
                            }}
                          >
                            <Trash2 size={12} aria-hidden />
                            Delete
                          </button>
                        </div>
                        <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-faint)' }}>
                          Updated {formatShortDate(t.updated_at || t.created_at)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

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
