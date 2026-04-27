import React, { useState, useRef, useEffect } from 'react';
import { FileCode, CheckSquare, CheckCircle, AlertTriangle, X } from 'lucide-react';
import ThemeToggle from './ThemeToggle.jsx';
import { useTheme } from './ThemeContext.jsx';
import { generatePythonClasses } from './generators/umlCodeGenerator';
import { validateDiagram } from './validation/diagramValidator';

const SHAPE_TYPES = [
  { type: 'class', label: 'UML Class', defaultWidth: 150, defaultHeight: 80 },
  { type: 'ellipse', label: 'Use Case', defaultWidth: 140, defaultHeight: 72 },
  { type: 'actor', label: 'Actor', defaultWidth: 56, defaultHeight: 128 },
  { type: 'package', label: 'Package', defaultWidth: 240, defaultHeight: 180 },
  { type: 'participant', label: 'Lifeline', defaultWidth: 110, defaultHeight: 360 },
  { type: 'node', label: 'Deployment Node', defaultWidth: 140, defaultHeight: 88 },
  { type: 'rectangle', label: 'Rectangle', defaultWidth: 120, defaultHeight: 60 },
  { type: 'circle', label: 'Circle / State', defaultWidth: 90, defaultHeight: 90 },
  { type: 'diamond', label: 'Decision', defaultWidth: 100, defaultHeight: 100 },
  { type: 'start', label: 'Start Node', defaultWidth: 60, defaultHeight: 60 },
  { type: 'end', label: 'End Node', defaultWidth: 60, defaultHeight: 60 },
];

// ─── CASE Tool: Code Generation Modal ───────────────────────────────────────
function CodeGenModal({ elements, connectors, onClose }) {
  const code = generatePythonClasses(elements, connectors);
  const hasClasses = elements.some(e => e.type === 'class');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--overlay-backdrop)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: 'var(--modal-surface)', border: '1px solid var(--border-strong)', borderRadius: '12px', padding: '2rem', width: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileCode size={20} /> Generate Python Code</h3>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        {!hasClasses ? (
          <div style={{ color: 'var(--warn-banner-text)', backgroundColor: 'var(--warn-banner-bg)', border: '1px solid var(--warn-banner-border)', borderRadius: '8px', padding: '1rem', margin: 0, display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ margin: '0 0 0.5rem 0' }}>No UML Class elements found on canvas. Add shapes using the <strong>"UML Class"</strong> type from the palette and label them like:</p>
              <code style={{ color: 'var(--code-syntax)', display: 'block', backgroundColor: 'var(--bg-muted)', padding: '0.5rem', borderRadius: '4px' }}>ClassName{`\n`}attribute1{`\n`}attribute2</code>
            </div>
          </div>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>Generated from {elements.filter(e => e.type === 'class').length} class(es) on the canvas:</p>
            <pre style={{ backgroundColor: 'var(--code-bg)', border: '1px solid var(--border-default)', borderRadius: '8px', padding: '1.5rem', overflowY: 'auto', flex: 1, color: 'var(--code-syntax)', fontFamily: 'monospace', fontSize: '0.9rem', margin: 0, whiteSpace: 'pre-wrap' }}>
              {code || '# No class content found. Add text labels to your UML Class shapes.'}
            </pre>
            <button onClick={handleCopy} style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', alignSelf: 'flex-end' }}>Copy to Clipboard</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── CASE Tool: Diagram Validation Modal ─────────────────────────────────────
function ValidationModal({ elements, connectors, template, onClose }) {
  const result = validateDiagram(elements, connectors, template);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--overlay-backdrop)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: 'var(--modal-surface)', border: `1px solid ${result.valid ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)'}`, borderRadius: '12px', padding: '2rem', width: '480px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckSquare size={20} /> Validate Diagram</h3>
          <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        {result.valid ? (
          <div style={{ backgroundColor: 'var(--success-bg)', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: '8px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <CheckCircle size={32} color="var(--success-text)" />
            <div>
              <p style={{ color: 'var(--success-text)', fontWeight: 'bold', margin: '0 0 0.25rem 0' }}>Diagram is valid!</p>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>No structural errors found. {elements.length} element(s), {connectors.length} connector(s).</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ color: 'var(--error-soft-text)', margin: 0 }}>Found {result.errors.length} error(s):</p>
            {result.errors.map((err, i) => (
              <div key={i} style={{ backgroundColor: 'var(--error-soft-bg)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: '6px', padding: '0.75rem 1rem', color: 'var(--error-soft-text)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} /> {err}
              </div>
            ))}
          </div>
        )}

        <button onClick={onClose} style={{ backgroundColor: 'var(--accent-inverse-bg)', color: 'var(--accent-inverse-text)', border: '1px solid var(--border-strong)', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Close</button>
      </div>
    </div>
  );
}

function ExportDialog({ onClose, onExport }) {
  const [format, setFormat] = useState('png');
  const [transparent, setTransparent] = useState(false);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--overlay-backdrop)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: 'var(--modal-surface)', border: '1px solid var(--border-default)', borderRadius: '12px', padding: '2rem', width: '320px' }}>
        <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-primary)', fontSize: '1.2rem' }}>Export Diagram</h3>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Format</label>
          <select value={format} onChange={e => setFormat(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: '6px', outline: 'none' }}>
            <option value="png">PNG Image (.png)</option>
            <option value="svg">SVG Vector (.svg)</option>
          </select>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input type="checkbox" checked={transparent} onChange={e => setTransparent(e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
            Transparent Background
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button onClick={onClose} style={{ backgroundColor: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => onExport(format, transparent)} style={{ backgroundColor: 'var(--accent-inverse-bg)', color: 'var(--accent-inverse-text)', border: '1px solid var(--border-strong)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Download</button>
        </div>
      </div>
    </div>
  );
}
function PropertiesPanel({ element, onChange, onDelete }) {
  const { theme } = useTheme();
  const defaultFill = theme === 'light' ? '#f4f4f5' : '#16161e';
  if (!element) return null;
  const style = element.style || { backgroundColor: defaultFill, borderColor: '#555555', borderWidth: 2, fontSize: 14 };

  const handleChange = (field, value) => {
    if (field === 'text') {
      const lines = value.split('\n');
      const maxLen = Math.max(...lines.map(l => l.length), 1);
      
      const isClassShape = element.type === 'class';
      const minW = isClassShape ? 150 : 120;
      const minH = isClassShape ? 80 : 60;
      
      const newWidth = Math.max(minW, maxLen * 8.5 + 40);
      const newHeight = Math.max(minH, lines.length * 20 + 40);
      
      onChange({ ...element, text: value, width: newWidth, height: newHeight });
    } else if (field === 'width' || field === 'height') {
      onChange({ ...element, [field]: value });
    } else {
      onChange({ ...element, style: { ...style, [field]: value } });
    }
  };

  return (
    <aside style={{ width: '280px', backgroundColor: 'var(--bg-surface)', borderLeft: '1px solid var(--border-default)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', zIndex: 10, overflowY: 'auto' }}>
      <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem' }}>Properties</h3>
      
      <div>
        <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>Text Label</label>
        <textarea 
          value={element.text || ''} 
          onChange={e => handleChange('text', e.target.value)}
          rows={4}
          style={{ width: '100%', padding: '8px', boxSizing: 'border-box', backgroundColor: 'var(--bg-muted)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: '4px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>Width</label>
          <input 
            type="number" 
            value={element.width || 0} 
            onChange={e => handleChange('width', parseInt(e.target.value) || 0)}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', backgroundColor: 'var(--bg-muted)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: '4px', outline: 'none' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>Height</label>
          <input 
            type="number" 
            value={element.height || 0} 
            onChange={e => handleChange('height', parseInt(e.target.value) || 0)}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', backgroundColor: 'var(--bg-muted)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: '4px', outline: 'none' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>Background Color</label>
          <input 
            type="color" 
            value={style.backgroundColor} 
            onChange={e => handleChange('backgroundColor', e.target.value)}
            style={{ width: '100%', height: '36px', padding: '0', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>Border Color</label>
          <input 
            type="color" 
            value={style.borderColor} 
            onChange={e => handleChange('borderColor', e.target.value)}
            style={{ width: '100%', height: '36px', padding: '0', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>Border Width ({style.borderWidth}px)</label>
          <input 
            type="range" 
            min="0" max="10" 
            value={style.borderWidth} 
            onChange={e => handleChange('borderWidth', parseInt(e.target.value) || 0)}
            style={{ width: '100%', cursor: 'pointer' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>Font Size ({style.fontSize}px)</label>
          <input 
            type="number" 
            value={style.fontSize} 
            onChange={e => handleChange('fontSize', parseInt(e.target.value) || 12)}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', backgroundColor: 'var(--bg-muted)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: '4px', outline: 'none' }}
          />
        </div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-default)' }}>
        <button 
          onClick={onDelete} 
          style={{ width: '100%', padding: '10px', backgroundColor: 'var(--error-soft-bg)', color: 'var(--error-soft-text)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Delete Element
        </button>
      </div>
    </aside>
  );
}
export default function DiagramEditor({ template, elements: initialElements, connectors: initialConnectors = [], diagramId, onBack, onSave }) {
  const { theme } = useTheme();
  const defaultShapeFill = theme === 'light' ? '#f4f4f5' : '#16161e';
  const defaultClassFill = theme === 'light' ? '#e0f2fe' : '#0d1a2a';
  const defaultClassBorder = theme === 'light' ? '#0284c7' : '#3a6ea8';

  const [elements, setElements] = useState(() =>
    initialElements.map((e) => {
      const def = SHAPE_TYPES.find((s) => s.type === e.type);
      return {
        ...e,
        id: e.id || `${Date.now()}${Math.random()}`,
        width: e.width ?? def?.defaultWidth ?? 120,
        height: e.height ?? def?.defaultHeight ?? 60,
        text: e.name || e.label || 'Text',
      };
    })
  );
  const [connectors, setConnectors] = useState(() =>
    (initialConnectors || []).map((c, i) => ({
      ...c,
      id: c.id ?? `conn_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 9)}`,
    }))
  );
  const [selectedId, setSelectedId] = useState(null);
  const [selectedConnectorId, setSelectedConnectorId] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [showCodeGen, setShowCodeGen] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const [connectingFrom, setConnectingFrom] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const canvasRef = useRef(null);

  const handleDragStartPalette = (e, shapeType) => {
    e.dataTransfer.setData('shapeType', shapeType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDropOnCanvas = (e) => {
    e.preventDefault();
    const shapeType = e.dataTransfer.getData('shapeType');
    if (shapeType) {
      const rect = canvasRef.current.getBoundingClientRect();
      const shapeDef = SHAPE_TYPES.find(s => s.type === shapeType) || SHAPE_TYPES[0];
      const newEl = {
        id: Date.now().toString() + Math.random(),
        type: shapeType,
        x: e.clientX - rect.left - shapeDef.defaultWidth / 2,
        y: e.clientY - rect.top - shapeDef.defaultHeight / 2,
        width: shapeDef.defaultWidth,
        height: shapeDef.defaultHeight,
        text: shapeDef.label
      };
      setElements([...elements, newEl]);
    }
  };

  const handleDragOverCanvas = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handlePointerDownElement = (e, id) => {
    e.stopPropagation();
    if (connectingFrom) {
       handleConnect(connectingFrom, id, 'arrow');
       setConnectingFrom(null);
       return;
    }
    
    setSelectedId(id);
    setSelectedConnectorId(null);
    setDraggingId(id);
    const el = elements.find(el => el.id === id);
    setDragOffset({ x: e.clientX - el.x, y: e.clientY - el.y });
  };

  const handlePointerDownConnector = (e, id) => {
    e.stopPropagation();
    setSelectedId(null);
    setSelectedConnectorId(id);
    setConnectingFrom(null);
  };

  const handlePointerMoveCanvas = (e) => {
    if (!draggingId) return;
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    setElements(elements.map(el => el.id === draggingId ? { ...el, x: newX, y: newY } : el));
  };

  const handlePointerUpCanvas = () => {
    setDraggingId(null);
  };

  const handleConnect = (fromId, toId, type) => {
    setConnectors([...connectors, { id: Date.now().toString() + Math.random(), fromElement: fromId, toElement: toId, type, text: '' }]);
  };

  const handleUpdateElement = (updatedElement) => {
    setElements(elements.map(el => el.id === updatedElement.id ? updatedElement : el));
  };

  const handleDeleteElement = (id) => {
    setElements(elements.filter(el => el.id !== id));
    setConnectors(connectors.filter(c => c.fromElement !== id && c.toElement !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleEditText = (id, newText) => {
    setElements(elements.map(el => {
      if (el.id === id) {
        const lines = newText.split('\n');
        const maxLen = Math.max(...lines.map(l => l.length), 1);
        
        let shapeDef = SHAPE_TYPES.find(s => s.type === el.type);
        const minW = shapeDef ? shapeDef.defaultWidth : 120;
        const minH = shapeDef ? shapeDef.defaultHeight : 60;
        
        const newWidth = Math.max(minW, maxLen * 8.5 + 40);
        const newHeight = Math.max(minH, lines.length * 20 + 40);
        
        return { ...el, text: newText, width: newWidth, height: newHeight };
      }
      return el;
    }));
  };

  const handleEditConnectorText = (id, newText) => {
    setConnectors(connectors.map(c => c.id === id ? { ...c, text: newText } : c));
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Backspace' || e.key === 'Delete')) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          if (selectedId) {
            setElements(elements.filter(el => el.id !== selectedId));
            setConnectors(connectors.filter(c => c.fromElement !== selectedId && c.toElement !== selectedId));
            setSelectedId(null);
          } else if (selectedConnectorId) {
            setConnectors(connectors.filter(c => c.id !== selectedConnectorId));
            setSelectedConnectorId(null);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, selectedConnectorId, elements, connectors]);

  const exportAsImage = (format, transparent) => {
    let minX = 0, minY = 0, maxX = 800, maxY = 600;
    if (elements.length > 0) {
      minX = Math.min(...elements.map(e => e.x)) - 50;
      minY = Math.min(...elements.map(e => e.y)) - 50;
      maxX = Math.max(...elements.map(e => e.x + e.width)) + 50;
      maxY = Math.max(...elements.map(e => e.y + e.height)) + 50;
    }
    const width = Math.max(800, maxX - minX);
    const height = Math.max(600, maxY - minY);

    const bgColor = transparent ? 'transparent' : '#ffffff';
    const elBgColor = transparent ? '#16161e' : '#ffffff';
    const strokeColor = transparent ? '#ffffff' : '#000000';
    const elStrokeColor = transparent ? '#555555' : '#000000';
    const textColor = transparent ? '#ffffff' : '#000000';
    const labelBgColor = transparent ? '#111111' : '#ffffff';

    let svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}">`;
    if (!transparent) {
      svgStr += `<rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="${bgColor}" />`;
    }

    svgStr += `<defs>
      <marker id="export-arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="${strokeColor}" />
      </marker>
    </defs>`;

    connectors.forEach(c => {
      const fromEl = elements.find(e => e.id === c.fromElement);
      const toEl = elements.find(e => e.id === c.toElement);
      if (!fromEl || !toEl) return;
      
      if (fromEl === toEl) {
        const x = fromEl.x + fromEl.width / 2;
        const y = fromEl.y; 
        const path = `M ${x} ${y} C ${x - 60} ${y - 100}, ${x + 60} ${y - 100}, ${x} ${y}`;
        svgStr += `<path d="${path}" fill="none" stroke="${strokeColor}" stroke-width="3" marker-end="url(#export-arrowhead)" />`;
        if (c.text) {
          svgStr += `<rect x="${x - c.text.length*4}" y="${y - 85}" width="${c.text.length*8}" height="20" fill="${labelBgColor}" rx="4" />`;
          svgStr += `<text x="${x}" y="${y - 71}" fill="${textColor}" font-size="12" font-family="sans-serif" text-anchor="middle">${c.text}</text>`;
        }
      } else {
        const x1 = fromEl.x + fromEl.width / 2;
        const y1 = fromEl.y + fromEl.height / 2;
        const x2 = toEl.x + toEl.width / 2;
        const y2 = toEl.y + toEl.height / 2;
        svgStr += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${strokeColor}" stroke-width="3" marker-end="url(#export-arrowhead)" />`;
        if (c.text) {
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          svgStr += `<rect x="${midX - c.text.length*4}" y="${midY - 10}" width="${c.text.length*8}" height="20" fill="${labelBgColor}" rx="4" />`;
          svgStr += `<text x="${midX}" y="${midY + 4}" fill="${textColor}" font-size="12" font-family="sans-serif" text-anchor="middle">${c.text}</text>`;
        }
      }
    });

    elements.forEach(el => {
      if (el.type === 'ellipse') {
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        const rx = el.width / 2;
        const ry = el.height / 2;
        svgStr += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${elBgColor}" stroke="${elStrokeColor}" stroke-width="2" />`;
        svgStr += `<text x="${cx}" y="${cy + 4}" fill="${textColor}" font-size="14" font-family="sans-serif" text-anchor="middle">${el.text}</text>`;
      } else if (el.type === 'circle') {
        const r = el.width / 2;
        svgStr += `<circle cx="${el.x + r}" cy="${el.y + r}" r="${r}" fill="${elBgColor}" stroke="${elStrokeColor}" stroke-width="2" />`;
        svgStr += `<text x="${el.x + r}" y="${el.y + r + 4}" fill="${textColor}" font-size="14" font-family="sans-serif" text-anchor="middle">${el.text}</text>`;
      } else if (el.type === 'participant') {
        const hh = Math.min(48, Math.max(36, el.height * 0.12));
        svgStr += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${hh}" fill="${elBgColor}" stroke="${elStrokeColor}" stroke-width="2" />`;
        svgStr += `<line x1="${el.x + el.width / 2}" y1="${el.y + hh}" x2="${el.x + el.width / 2}" y2="${el.y + el.height}" stroke="${elStrokeColor}" stroke-width="2" stroke-dasharray="6 5" />`;
        svgStr += `<text x="${el.x + el.width / 2}" y="${el.y + hh / 2 + 4}" fill="${textColor}" font-size="12" font-family="sans-serif" text-anchor="middle">${el.text}</text>`;
      } else if (el.type === 'actor') {
        svgStr += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="${elBgColor}" stroke="${elStrokeColor}" stroke-width="2" rx="8" />`;
        svgStr += `<text x="${el.x + el.width / 2}" y="${el.y + el.height - 10}" fill="${textColor}" font-size="11" font-family="sans-serif" text-anchor="middle">${el.text}</text>`;
      } else if (el.type === 'package') {
        svgStr += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="${elBgColor}" stroke="${elStrokeColor}" stroke-width="2" rx="8" />`;
        const title = (el.text || '').split('\n')[0];
        svgStr += `<text x="${el.x + 10}" y="${el.y + 20}" fill="${textColor}" font-size="12" font-family="sans-serif">${title}</text>`;
      } else if (el.type === 'diamond') {
        const cx = el.x + el.width/2;
        const cy = el.y + el.height/2;
        const pts = `${cx},${el.y} ${el.x+el.width},${cy} ${cx},${el.y+el.height} ${el.x},${cy}`;
        svgStr += `<polygon points="${pts}" fill="${elBgColor}" stroke="${elStrokeColor}" stroke-width="2" />`;
        svgStr += `<text x="${cx}" y="${cy + 4}" fill="${textColor}" font-size="14" font-family="sans-serif" text-anchor="middle">${el.text}</text>`;
      } else {
        svgStr += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="${elBgColor}" stroke="${elStrokeColor}" stroke-width="2" rx="8" />`;
        svgStr += `<text x="${el.x + el.width/2}" y="${el.y + el.height/2 + 4}" fill="${textColor}" font-size="14" font-family="sans-serif" text-anchor="middle">${el.text}</text>`;
      }
    });

    svgStr += `</svg>`;

    const fileName = `diagram_export_${Date.now()}`;
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    if (format === 'svg') {
      const a = document.createElement('a');
      a.href = url;
      a.download = `diagram_export_${Date.now()}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (format === 'png') {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!transparent) {
           ctx.fillStyle = '#ffffff';
           ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0);
        const pngUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `diagram_export_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };
      // Encode strict SVG dynamically to Base64 to bypass tainted canvas blob loading errors
      const encodedSvg = btoa(unescape(encodeURIComponent(svgStr)));
      img.src = 'data:image/svg+xml;base64,' + encodedSvg;
    }
  };

  const handleExport = (format, transparent) => {
    exportAsImage(format, transparent);
    setShowExport(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--canvas-bg)' }}>
      {showExport && <ExportDialog onClose={() => setShowExport(false)} onExport={handleExport} />}
      {showCodeGen && <CodeGenModal elements={elements} connectors={connectors} onClose={() => setShowCodeGen(false)} />}
      {showValidation && <ValidationModal elements={elements} connectors={connectors} template={template} onClose={() => setShowValidation(false)} />}
      
      <header style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-surface)', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button onClick={onBack} style={{ backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '6px 12px' }}>
            &larr; Back
          </button>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Editor - {template}</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
           <ThemeToggle />
           <button 
             onClick={() => setConnectingFrom(selectedId)} 
             disabled={!selectedId}
             style={{ 
                 backgroundColor: connectingFrom ? 'var(--accent-inverse-bg)' : 'var(--bg-hover)', 
                 color: connectingFrom ? 'var(--accent-inverse-text)' : 'var(--text-primary)', 
                 border: '1px solid var(--border-subtle)', 
                 padding: '6px 16px',
                 borderRadius: '8px',
                 opacity: selectedId ? 1 : 0.5,
                 cursor: selectedId ? 'pointer' : 'not-allowed'
             }}
           >
             {connectingFrom ? 'Click target...' : 'Connect'}
           </button>

           {/* CASE Tool Buttons */}
           <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--divider)' }} />
           <button
             onClick={() => setShowValidation(true)}
             title="Validate diagram structure and UML rules"
             style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: 'var(--success-text)', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
           >
             <CheckSquare size={16} /> Validate
           </button>
           <button
             onClick={() => setShowCodeGen(true)}
             title="Generate Python class code from UML Class shapes"
             style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', color: 'var(--code-syntax)', border: '1px solid rgba(59, 130, 246, 0.35)', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
           >
             <FileCode size={16} /> Generate Code
           </button>
           <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--divider)' }} />

           <button onClick={() => setShowExport(true)} style={{ backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer' }}>Export</button>
           <button onClick={() => onSave(diagramId, elements, connectors)} style={{ backgroundColor: 'var(--accent-inverse-bg)', color: 'var(--accent-inverse-text)', border: '1px solid var(--border-strong)', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Save</button>
        </div>
      </header>
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <aside style={{ width: '250px', backgroundColor: 'var(--bg-surface)', borderRight: '1px solid var(--border-default)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', zIndex: 10 }}>
          <h3 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Shapes Palette</h3>
          {SHAPE_TYPES.map(s => (
            <div 
              key={s.type}
              draggable 
              onDragStart={(e) => handleDragStartPalette(e, s.type)}
              style={{ padding: '1rem', backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border-strong)', borderRadius: s.type === 'circle' ? '40px' : '8px', cursor: 'grab', textAlign: 'center', color: 'var(--text-secondary)', userSelect: 'none' }}
            >
              {s.label}
            </div>
          ))}
          
          {selectedId && (
            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-default)', paddingTop: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Edit Element</h3>
                <textarea 
                  value={elements.find(e => e.id === selectedId)?.text || ''} 
                  onChange={(e) => handleEditText(selectedId, e.target.value)}
                  rows={4}
                  style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--bg-muted)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: '4px', padding: '8px', resize: 'vertical' }}
                />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.8rem' }}>Press Backspace/Delete key to remove.</p>
            </div>
          )}

          {selectedConnectorId && !selectedId && (
            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-default)', paddingTop: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Edit Connector</h3>
                <input 
                  type="text" 
                  value={connectors.find(c => c.id === selectedConnectorId)?.text || ''} 
                  onChange={(e) => handleEditConnectorText(selectedConnectorId, e.target.value)}
                  placeholder="Label..."
                  style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--bg-muted)' }}
                />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.8rem' }}>Press Backspace/Delete key to remove.</p>
            </div>
          )}
          
          {!selectedId && !selectedConnectorId && (
            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-default)', paddingTop: '1.5rem' }}>
              <p style={{ color: 'var(--text-faint)', fontSize: '0.9rem', margin: 0 }}>Select an element or connector to edit.</p>
            </div>
          )}
        </aside>

        <main 
          ref={canvasRef}
          onDrop={handleDropOnCanvas} 
          onDragOver={handleDragOverCanvas}
          onPointerMove={handlePointerMoveCanvas}
          onPointerUp={handlePointerUpCanvas}
          onPointerLeave={handlePointerUpCanvas}
          onClick={() => { setSelectedId(null); setSelectedConnectorId(null); setConnectingFrom(null); }}
          style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: connectingFrom ? 'crosshair' : (draggingId ? 'grabbing' : 'auto') }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'radial-gradient(var(--canvas-grid) 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.55, pointerEvents: 'none' }}></div>

          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
            <defs>
              <marker id="arrowhead-normal" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="var(--connector-normal)" />
              </marker>
              <marker id="arrowhead-selected" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="var(--connector-selected)" />
              </marker>
            </defs>
            {connectors.map(c => {
               const fromEl = elements.find(e => e.id === c.fromElement);
               const toEl = elements.find(e => e.id === c.toElement);
               if (!fromEl || !toEl) return null;
               
               const isSelected = c.id === selectedConnectorId;
               const strokeColor = isSelected ? 'var(--connector-selected)' : 'var(--connector-normal)';
               
               if (fromEl === toEl) {
                 const x = fromEl.x + fromEl.width / 2;
                 const y = fromEl.y; 
                 const path = `M ${x} ${y} C ${x - 60} ${y - 100}, ${x + 60} ${y - 100}, ${x} ${y}`;
                 return (
                    <g key={c.id}>
                        <path d={path} fill="none" stroke={strokeColor} strokeWidth="3" markerEnd={`url(#arrowhead-${isSelected ? 'selected' : 'normal'})`} pointerEvents="stroke" onClick={(e) => handlePointerDownConnector(e, c.id)} cursor="pointer" />
                        <path d={path} fill="none" stroke="transparent" strokeWidth="15" pointerEvents="stroke" onClick={(e) => handlePointerDownConnector(e, c.id)} cursor="pointer" />
                        {c.text && (
                           <g pointerEvents="none">
                             <rect x={x - (c.text.length * 4)} y={y - 85} width={c.text.length * 8} height="20" fill="var(--connector-label-bg)" rx="4" />
                             <text x={x} y={y - 71} fill="var(--diagram-shape-text)" fontSize="12" textAnchor="middle">{c.text}</text>
                           </g>
                        )}
                    </g>
                 )
               }
               
               const x1 = fromEl.x + fromEl.width / 2;
               const y1 = fromEl.y + fromEl.height / 2;
               const x2 = toEl.x + toEl.width / 2;
               const y2 = toEl.y + toEl.height / 2;
               const midX = (x1 + x2) / 2;
               const midY = (y1 + y2) / 2;
               
               return (
                 <g key={c.id}>
                   <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={strokeColor} strokeWidth="3" pointerEvents="stroke" markerEnd={`url(#arrowhead-${isSelected ? 'selected' : 'normal'})`} />
                   <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth="20" pointerEvents="stroke" onClick={(e) => handlePointerDownConnector(e, c.id)} cursor="pointer" />
                   {c.text && (
                     <g pointerEvents="none">
                       <rect x={midX - (c.text.length * 4)} y={midY - 10} width={c.text.length * 8} height="20" fill="var(--connector-label-bg)" rx="4" />
                       <text x={midX} y={midY + 4} fill="var(--diagram-shape-text)" fontSize="12" textAnchor="middle">{c.text}</text>
                     </g>
                   )}
                 </g>
               );
            })}
          </svg>

          {elements.map((el) => {
            const isSelected = el.id === selectedId;
            const isClassShape = el.type === 'class';
            const isParticipant = el.type === 'participant';
            const isActor = el.type === 'actor';
            const isPackageShape = el.type === 'package';
            const ink = isSelected ? 'var(--border-emphasis)' : (el.style?.borderColor || '#555555');
            const style = el.style || {
              backgroundColor: isClassShape ? defaultClassFill : defaultShapeFill,
              borderColor: isClassShape ? defaultClassBorder : '#555555',
              borderWidth: 2,
              fontSize: 14,
            };

            let shapeStyle = {
              position: 'absolute',
              left: `${el.x}px`,
              top: `${el.y}px`,
              width: `${el.width}px`,
              height: `${el.height}px`,
              backgroundColor: style.backgroundColor,
              border: `${style.borderWidth}px solid ${ink}`,
              color: 'var(--diagram-shape-text)',
              boxShadow: isSelected ? '0 0 0 2px var(--focus-ring)' : '0 4px 12px var(--shadow-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              zIndex: isSelected ? 10 : isPackageShape ? 3 : 1,
              cursor: draggingId === el.id ? 'grabbing' : 'grab',
              userSelect: 'none',
              padding: isParticipant || isPackageShape ? 0 : '0.5rem',
              boxSizing: 'border-box',
              overflow: isPackageShape ? 'visible' : 'hidden',
            };

            if (el.type === 'circle') shapeStyle.borderRadius = '50%';
            else if (el.type === 'ellipse') shapeStyle.borderRadius = '999px';
            else if (el.type === 'diamond') shapeStyle.transform = 'rotate(45deg)';
            else shapeStyle.borderRadius = '8px';

            const labelStyle = {
              display: 'block',
              wordWrap: 'break-word',
              overflow: 'hidden',
              fontSize: `${style.fontSize}px`,
              whiteSpace: 'pre-wrap',
              lineHeight: '1.35',
              fontWeight: el.type === 'node' ? 600 : undefined,
            };

            let inner = (
              <div style={el.type === 'diamond' ? { transform: 'rotate(-45deg)', maxWidth: '70%', maxHeight: '70%' } : {}}>
                <strong style={labelStyle}>{el.text}</strong>
              </div>
            );

            if (isParticipant) {
              inner = (
                <>
                  <div style={{ flexShrink: 0, padding: '10px 8px', borderBottom: `2px solid ${ink}`, textAlign: 'center', fontWeight: 600, fontSize: `${style.fontSize}px`, whiteSpace: 'pre-wrap', lineHeight: 1.25 }}>
                    {el.text}
                  </div>
                  <div style={{ flex: 1, position: 'relative', minHeight: 48 }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: 0,
                        bottom: 0,
                        width: 0,
                        marginLeft: '-1px',
                        borderLeft: `2px dashed var(--connector-normal)`,
                      }}
                    />
                  </div>
                </>
              );
              shapeStyle.flexDirection = 'column';
              shapeStyle.alignItems = 'stretch';
              shapeStyle.justifyContent = 'flex-start';
              shapeStyle.backgroundColor = style.backgroundColor || defaultShapeFill;
            }

            if (isActor) {
              inner = (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', padding: '6px 4px 8px', boxSizing: 'border-box' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 8 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${ink}`, marginBottom: 6, backgroundColor: style.backgroundColor }} />
                    <div style={{ width: 3, height: 26, borderRadius: 2, backgroundColor: ink }} />
                    <div style={{ display: 'flex', gap: 14, marginTop: 4 }}>
                      <div style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: ink, transform: 'rotate(-42deg)', transformOrigin: 'top center' }} />
                      <div style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: ink, transform: 'rotate(42deg)', transformOrigin: 'top center' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 22, marginTop: 8 }}>
                      <div style={{ width: 3, height: 22, borderRadius: 2, backgroundColor: ink }} />
                      <div style={{ width: 3, height: 22, borderRadius: 2, backgroundColor: ink }} />
                    </div>
                  </div>
                  <strong style={{ ...labelStyle, fontSize: `${Math.min(style.fontSize, 13)}px`, textAlign: 'center', maxWidth: '140px' }}>{el.text}</strong>
                </div>
              );
              shapeStyle.overflow = 'hidden';
            }

            if (isPackageShape) {
              const tabTitle = (el.text || '').split('\n')[0];
              const pkgBg = style.backgroundColor || defaultShapeFill;
              inner = (
                <div style={{ position: 'relative', width: '100%', height: '100%', boxSizing: 'border-box', paddingTop: 8 }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: 10,
                      bottom: '100%',
                      marginBottom: `-${style.borderWidth}px`,
                      padding: '4px 12px',
                      backgroundColor: pkgBg,
                      border: `${style.borderWidth}px solid ${ink}`,
                      borderBottom: 'none',
                      borderRadius: '6px 8px 0 0',
                      fontSize: `${Math.min(style.fontSize, 13)}px`,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      maxWidth: '90%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {tabTitle}
                  </div>
                </div>
              );
              shapeStyle.flexDirection = 'column';
              shapeStyle.justifyContent = 'flex-start';
              shapeStyle.alignItems = 'stretch';
              shapeStyle.padding = '28px 12px 12px';
              shapeStyle.overflow = 'visible';
            }

            return (
              <div key={el.id} style={shapeStyle} onPointerDown={(e) => handlePointerDownElement(e, el.id)} onClick={(e) => e.stopPropagation()}>
                {inner}

                {isSelected && !draggingId && (
                   <div 
                     onPointerDown={(e) => { e.stopPropagation(); setConnectingFrom(el.id); }}
                     style={{ position: 'absolute', right: '-12px', top: 'calc(50% - 12px)', width: '24px', height: '24px', backgroundColor: 'var(--bg-hover)', borderRadius: '50%', cursor: 'crosshair', zIndex: 20, border: '2px solid var(--border-emphasis)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: 'var(--text-primary)' }}
                     title="Click and then click target to connect"
                   >+</div>
                )}
              </div>
            );
          })}
        </main>
        
        {/* Right Properties Panel */}
        {selectedId && elements.find(e => e.id === selectedId) && (
          <PropertiesPanel 
            element={elements.find(e => e.id === selectedId)} 
            onChange={handleUpdateElement} 
            onDelete={() => handleDeleteElement(selectedId)} 
          />
        )}
      </div>
    </div>
  );
}
