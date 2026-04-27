import React, { useState, useEffect } from 'react'
import Auth from './Auth.jsx'
import Dashboard from './Dashboard.jsx'
import TemplateSelection from './TemplateSelection.jsx'
import DiagramEditor from './DiagramEditor.jsx'
import CustomCursor from './CustomCursor.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import { validateDiagram } from './validation/diagramValidator.js'

function App() {
  const [user, setUser] = useState(null);
  const [backendStatus, setBackendStatus] = useState('Loading...');
  const [modelStatus, setModelStatus] = useState('Loading...');
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [editorData, setEditorData] = useState({ template: 'Blank', elements: [], connectors: [], diagramId: null });

  useEffect(() => {
    const storedUser = localStorage.getItem('odt_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
      .then((data) => setBackendStatus(data.status || 'Unknown'))
      .catch(() => setBackendStatus('Backend unreachable'));

    fetch('/api/health/model')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
      .then((data) => setModelStatus(data.status || 'Unknown'))
      .catch(() => setModelStatus('Model unreachable'));
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('odt_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('dashboard');
    localStorage.removeItem('odt_user');
  };

  const handleTemplateSelect = async (templateName, elements, connectors = []) => {
    try {
      const resp = await fetch('/api/diagrams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id, template: templateName })
      });
      const data = await resp.json();
      setEditorData({
        template: templateName,
        elements,
        connectors,
        diagramId: data.diagram_id || data.id,
      });
    } catch(e) { 
      console.error('Error auto-creating diagram', e); 
      setEditorData({ template: templateName, elements, connectors, diagramId: null });
    }

    setCurrentView('editor');
  };

  const handleOpenDiagram = async (diagram) => {
    try {
      const resp = await fetch(`/api/diagrams/${diagram.id}`);
      const data = await resp.json();
      setEditorData({
        template: diagram.template || 'Custom',
        elements: data.elements || [],
        connectors: data.connectors || [],
        diagramId: diagram.id
      });
      setCurrentView('editor');
    } catch (e) {
      console.error('Error opening diagram', e);
      alert('Failed to load diagram');
    }
  };

  const handleSaveDiagram = async (diagramId, elements, connectors) => {
    if (!diagramId) {
       alert("Cannot save: No diagram ID found.");
       return;
    }

    const templateType = editorData.template;
    const validationResult = validateDiagram(elements, connectors, templateType);
    if (!validationResult.valid) {
      alert(`Diagram validation failed:\n- ${validationResult.errors.join('\n- ')}`);
      return;
    }

    try {
      const resp = await fetch(`/api/diagrams/${diagramId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elements, connectors })
      });
      if (resp.ok) {
        alert('Diagram saved successfully!');
      } else {
        alert('Failed to save diagram.');
      }
    } catch(e) { 
      console.error('Error saving diagram', e); 
      alert('Failed to save diagram due to network error.');
    }
  };

  if (!user) {
    return (
      <>
        <CustomCursor />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
            <ThemeToggle />
          </div>
          <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>ODT</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', margin: 0 }}>Online Design Tool</p>
          </div>
          <Auth onLogin={handleLogin} />
        </div>
      </>
    );
  }

  if (currentView === 'templates') {
    return (
      <>
        <CustomCursor />
        <TemplateSelection onSelect={handleTemplateSelect} onCancel={() => setCurrentView('dashboard')} />
      </>
    );
  }

  if (currentView === 'editor') {
    return (
      <>
        <CustomCursor />
        <DiagramEditor 
          template={editorData.template} 
          elements={editorData.elements} 
          connectors={editorData.connectors}
          diagramId={editorData.diagramId}
          onBack={() => setCurrentView('dashboard')} 
          onSave={handleSaveDiagram}
        />
      </>
    );
  }

  return (
    <>
      <CustomCursor />
      <Dashboard 
        user={user} 
        backendStatus={backendStatus} 
        modelStatus={modelStatus} 
        onLogout={handleLogout} 
        onNewDiagram={() => setCurrentView('templates')} 
        onOpenDiagram={handleOpenDiagram}
      />
    </>
  );
}

export default App

