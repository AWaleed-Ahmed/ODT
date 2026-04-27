import React, { useState, useRef, useEffect } from 'react';
import { FileCode, CheckSquare, CheckCircle, AlertTriangle, X, Link, User } from 'lucide-react';
import { generatePythonClasses } from './generators/umlCodeGenerator';
import { validateDiagram } from './validation/diagramValidator';
import { connectorEndpointsSmart, selfLoopPath, PARTICIPANT_HEADER_PX } from './diagramGeometry';

const escapeXml = (str) =>
  String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** `input type="color"` only accepts hex; resolve `var(--token)` from the document theme. */
function hexForColorInput(value) {
  if (!value || typeof value !== 'string') return '#16161e';
  const t = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(t) || /^#[0-9a-fA-F]{3}$/.test(t)) return t;
  const m = t.match(/^var\(\s*(--[^)]+)\s*\)$/);
  if (m && typeof document !== 'undefined') {
    const resolved = getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim();
    if (/^#[0-9a-fA-F]{6}$/.test(resolved) || /^#[0-9a-fA-F]{3}$/.test(resolved)) return resolved;
  }
  return '#16161e';
}

const CONNECTOR_TYPES = [
  { value: 'arrow',       label: 'Arrow', description: 'Directed arrow (tip at target)' },
  { value: 'inheritance', label: 'Inheritance ▷', description: 'UML generalization (hollow triangle)' },
  { value: 'association', label: 'Association', description: 'UML association (open arrow tip)' },
  { value: 'dependency',  label: 'Dependency', description: 'Dashed dependency arrow' },
  { value: 'er_many',     label: 'ER — Many (crow\'s foot)', description: 'Cardinality “many” at target entity' },
  { value: 'er_one',      label: 'ER — One (|)', description: 'Cardinality “one” bar at target entity' },
];

const SHAPE_TYPES = [
  { type: 'class', label: 'UML Class', defaultWidth: 150, defaultHeight: 80 },
  { type: 'component', label: 'UML Component', defaultWidth: 190, defaultHeight: 110 },
  { type: 'package', label: 'UML Package', defaultWidth: 220, defaultHeight: 150 },
  { type: 'participant', label: 'Participant', defaultWidth: 110, defaultHeight: 360 },
  { type: 'ellipse', label: 'Use Case', defaultWidth: 130, defaultHeight: 90 },
  { type: 'actor', label: 'Actor', defaultWidth: 70, defaultHeight: 120 },
  { type: 'rectangle', label: 'Rectangle', defaultWidth: 120, defaultHeight: 60 },
  { type: 'circle', label: 'Circle / State', defaultWidth: 90, defaultHeight: 90 },
  { type: 'diamond', label: 'Decision', defaultWidth: 100, defaultHeight: 100 },
  { type: 'start', label: 'Start Node', defaultWidth: 60, defaultHeight: 60 },
  { type: 'end', label: 'End Node', defaultWidth: 60, defaultHeight: 60 },
  { type: 'entity', label: 'ER Entity', defaultWidth: 140, defaultHeight: 70 },
  { type: 'node', label: 'Arch. Component', defaultWidth: 130, defaultHeight: 56 },
  { type: 'database', label: 'Database', defaultWidth: 120, defaultHeight: 72 },
];

const SHAPE_MAP = Object.fromEntries(SHAPE_TYPES.map((s) => [s.type, s]));

/** UML Class / ER entity: name band + attribute list */
const UML_CLASS_HEADER_PX = 34;
const UML_CLASS_ATTR_LINE_PX = 17;

const PALETTE_BY_TEMPLATE = {
  blank: ['rectangle', 'circle', 'diamond', 'start', 'end'],
  flowchart: ['start', 'rectangle', 'diamond', 'circle', 'end'],
  uml: ['class', 'component', 'package'],
  'uml class diagram': ['class', 'component', 'package'],
  usecase: ['actor', 'ellipse', 'rectangle'],
  'uml use case': ['actor', 'ellipse', 'rectangle'],
  sequence: ['participant', 'rectangle'],
  'uml sequence': ['participant', 'rectangle'],
  activity: ['start', 'rectangle', 'diamond', 'end'],
  'uml activity': ['start', 'rectangle', 'diamond', 'end'],
  deployment: ['node', 'database', 'component'],
  'uml deployment': ['node', 'database', 'component'],
  package: ['package', 'class', 'component'],
  'uml package diagram': ['package', 'class', 'component'],
  component: ['component', 'database', 'node', 'rectangle'],
  'uml component diagram': ['component', 'database', 'node', 'rectangle'],
  er: ['entity', 'rectangle', 'diamond'],
  'er diagram': ['entity', 'rectangle', 'diamond'],
  architecture: ['node', 'database', 'component', 'rectangle'],
  'architecture diagram': ['node', 'database', 'component', 'rectangle'],
};

// ─── CASE Tool: Code Generation Modal ───────────────────────────────────────
function CodeGenModal({ elements, connectors, onClose }) {
  const code = generatePythonClasses(elements, connectors);
  const hasClasses = elements.some(e => e.type === 'class');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: '#1c1b1a', border: '1px solid #444', borderRadius: '12px', padding: '2rem', width: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileCode size={20} /> Generate Python Code</h3>
          <button onClick={onClose} style={{ background: 'transparent', color: '#aaa', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        {!hasClasses ? (
          <div style={{ color: '#f0a500', backgroundColor: '#2a2000', border: '1px solid #5a4000', borderRadius: '8px', padding: '1rem', margin: 0, display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ margin: '0 0 0.5rem 0' }}>No UML Class elements found on canvas. Add shapes using the <strong>"UML Class"</strong> type from the palette and label them like:</p>
              <code style={{ color: '#7ec8e3', display: 'block', backgroundColor: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px' }}>ClassName{`\n`}attribute1{`\n`}attribute2</code>
            </div>
          </div>
        ) : (
          <>
            <p style={{ color: '#aaa', margin: 0, fontSize: '0.9rem' }}>Generated from {elements.filter(e => e.type === 'class').length} class(es) on the canvas:</p>
            <pre style={{ backgroundColor: '#0d0d0d', border: '1px solid #333', borderRadius: '8px', padding: '1.5rem', overflowY: 'auto', flex: 1, color: '#7ec8e3', fontFamily: 'monospace', fontSize: '0.9rem', margin: 0, whiteSpace: 'pre-wrap' }}>
              {code || '# No class content found. Add text labels to your UML Class shapes.'}
            </pre>
            <button onClick={handleCopy} style={{ backgroundColor: '#333', color: '#fff', border: '1px solid #555', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', alignSelf: 'flex-end' }}>Copy to Clipboard</button>
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
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: '#1c1b1a', border: `1px solid ${result.valid ? '#2a5a2a' : '#5a2a2a'}`, borderRadius: '12px', padding: '2rem', width: '480px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckSquare size={20} /> Validate Diagram</h3>
          <button onClick={onClose} style={{ background: 'transparent', color: '#aaa', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        {result.valid ? (
          <div style={{ backgroundColor: '#0d2a0d', border: '1px solid #2a5a2a', borderRadius: '8px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <CheckCircle size={32} color="#7dce82" />
            <div>
              <p style={{ color: '#7dce82', fontWeight: 'bold', margin: '0 0 0.25rem 0' }}>Diagram is valid!</p>
              <p style={{ color: '#aaa', margin: 0, fontSize: '0.9rem' }}>No structural errors found. {elements.length} element(s), {connectors.length} connector(s).</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ color: '#f08080', margin: 0 }}>Found {result.errors.length} error(s):</p>
            {result.errors.map((err, i) => (
              <div key={i} style={{ backgroundColor: '#2a0d0d', border: '1px solid #5a2a2a', borderRadius: '6px', padding: '0.75rem 1rem', color: '#f08080', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} /> {err}
              </div>
            ))}
          </div>
        )}

        <button onClick={onClose} style={{ backgroundColor: '#fff', color: '#000', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Close</button>
      </div>
    </div>
  );
}

function ExportDialog({ onClose, onExport }) {
  const [format, setFormat] = useState('png');
  const [transparent, setTransparent] = useState(false);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: '#1c1b1a', border: '1px solid #333', borderRadius: '12px', padding: '2rem', width: '320px' }}>
        <h3 style={{ margin: '0 0 1.5rem 0', color: '#fff', fontSize: '1.2rem' }}>Export Diagram</h3>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ color: '#aaa', display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Format</label>
          <select value={format} onChange={e => setFormat(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', borderRadius: '6px', outline: 'none' }}>
            <option value="png">PNG Image (.png)</option>
            <option value="svg">SVG Vector (.svg)</option>
          </select>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ color: '#aaa', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input type="checkbox" checked={transparent} onChange={e => setTransparent(e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
            Transparent Background
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button onClick={onClose} style={{ backgroundColor: 'transparent', color: '#aaa', border: '1px solid #555', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => onExport(format, transparent)} style={{ backgroundColor: '#fff', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Download</button>
        </div>
      </div>
    </div>
  );
}
function PropertiesPanel({ element, onChange, onDelete }) {
  if (!element) return null;
  const style = element.style || {
    backgroundColor: 'var(--diagram-default-fill)',
    borderColor: 'var(--border-strong)',
    borderWidth: 2,
    fontSize: 14,
  };

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
          style={{ width: '100%', padding: '8px', boxSizing: 'border-box', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', caretColor: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: '4px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>Width</label>
          <input 
            type="number" 
            value={element.width || 0} 
            onChange={e => handleChange('width', parseInt(e.target.value) || 0)}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', caretColor: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: '4px', outline: 'none' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>Height</label>
          <input 
            type="number" 
            value={element.height || 0} 
            onChange={e => handleChange('height', parseInt(e.target.value) || 0)}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', caretColor: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: '4px', outline: 'none' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>Background Color</label>
          <input 
            type="color" 
            value={hexForColorInput(style.backgroundColor)} 
            onChange={e => handleChange('backgroundColor', e.target.value)}
            style={{ width: '100%', height: '36px', padding: '0', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>Border Color</label>
          <input 
            type="color" 
            value={hexForColorInput(style.borderColor)} 
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
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', caretColor: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: '4px', outline: 'none' }}
          />
        </div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #333' }}>
        <button 
          onClick={onDelete} 
          style={{ width: '100%', padding: '10px', backgroundColor: '#3a1a1a', color: '#ffaaaa', border: '1px solid #662222', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Delete Element
        </button>
      </div>
    </aside>
  );
}
export default function DiagramEditor({ template, elements: initialElements, connectors: initialConnectors = [], diagramId, onBack, onSave }) {
  const [elements, setElements] = useState(() =>
    initialElements.map((e) => {
      const def = SHAPE_MAP[e.type];
      return {
        ...e,
        id: e.id || Date.now().toString() + Math.random(),
        width: e.width ?? def?.defaultWidth ?? 120,
        height: e.height ?? def?.defaultHeight ?? 60,
        text: e.text || e.name || e.label || 'Text',
      };
    })
  );
  const [connectors, setConnectors] = useState(initialConnectors);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedConnectorId, setSelectedConnectorId] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [showCodeGen, setShowCodeGen] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const [connectingFrom, setConnectingFrom] = useState(null);
  const [selectedConnectorType, setSelectedConnectorType] = useState('arrow');
  const [draggingId, setDraggingId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const canvasRef = useRef(null);
  const paletteKey = String(template || '').toLowerCase();
  const paletteTypes = PALETTE_BY_TEMPLATE[paletteKey] || ['rectangle', 'circle', 'diamond', 'start', 'end', 'class'];
  const paletteShapes = paletteTypes.map((t) => SHAPE_MAP[t]).filter(Boolean);

  const handleDragStartPalette = (e, shapeType) => {
    e.dataTransfer.setData('shapeType', shapeType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDropOnCanvas = (e) => {
    e.preventDefault();
    const shapeType = e.dataTransfer.getData('shapeType');
    if (shapeType) {
      const rect = canvasRef.current.getBoundingClientRect();
      const shapeDef = SHAPE_MAP[shapeType] || SHAPE_TYPES[0];
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
       if (connectingFrom !== id) {
         handleConnect(connectingFrom, id, selectedConnectorType);
       }
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

        let shapeDef = SHAPE_MAP[el.type];
        const minW = shapeDef ? shapeDef.defaultWidth : 120;
        const minH = shapeDef ? shapeDef.defaultHeight : 60;

        if (el.type === 'class' || el.type === 'entity') {
          const attrs = Math.max(0, lines.length - 1);
          const nameW = (lines[0] || '').length * 8 + 36;
          const attrsW =
            attrs > 0 ? Math.max(...lines.slice(1).map((l) => l.length)) * 7.5 + 28 : minW * 0.85;
          const newWidth = Math.max(minW, nameW, attrsW);
          const bodyH = attrs * UML_CLASS_ATTR_LINE_PX + (attrs > 0 ? 14 : 8);
          const newHeight = Math.max(minH, UML_CLASS_HEADER_PX + bodyH);
          return { ...el, text: newText, width: newWidth, height: newHeight };
        }

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

  const handleUpdateConnector = (id, updates) => {
    setConnectors(connectors.map(c => c.id === id ? { ...c, ...updates } : c));
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

    const fillOpen = bgColor === 'transparent' ? '#1c1b1a' : '#ffffff';
    svgStr += `<defs>
      <marker id="export-arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
        <polygon points="0 0, 10 3.5, 0 7" fill="${strokeColor}" />
      </marker>
      <marker id="export-arrowhead-open" markerWidth="12" markerHeight="9" refX="11" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
        <polygon points="0 0, 12 4.5, 0 9" fill="${fillOpen}" stroke="${strokeColor}" stroke-width="1.5" />
      </marker>
      <marker id="export-arrow-assoc" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
        <polygon points="0 0, 8 3.5, 0 7" fill="${fillOpen}" stroke="${strokeColor}" stroke-width="1.2" />
      </marker>
      <marker id="export-crow" markerWidth="18" markerHeight="14" refX="16" refY="7" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M 0 0 L 6 7 L 0 14 M 6 7 L 16 7" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" />
      </marker>
      <marker id="export-er-one" markerWidth="8" markerHeight="16" refX="5" refY="8" orient="auto" markerUnits="userSpaceOnUse">
        <line x1="4" y1="1" x2="4" y2="15" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="square" />
      </marker>
    </defs>`;

    const buildTextTspan = (text, cx, cy, textColor, fontSize = 13) => {
      const lines = String(text || '').split('\n');
      if (lines.length === 1) {
        return `<text x="${cx}" y="${cy}" fill="${textColor}" font-size="${fontSize}" font-family="monospace" text-anchor="middle">${escapeXml(lines[0])}</text>`;
      }
      const lineH = fontSize * 1.4;
      const totalH = lines.length * lineH;
      const startY = cy - totalH / 2 + lineH * 0.8;
      const tspans = lines.map((line, i) =>
        `<tspan x="${cx}" dy="${i === 0 ? 0 : lineH}">${escapeXml(line)}</tspan>`
      ).join('');
      return `<text x="${cx}" y="${startY}" fill="${textColor}" font-size="${fontSize}" font-family="monospace" text-anchor="middle">${tspans}</text>`;
    };

    connectors.forEach(c => {
      const fromEl = elements.find(e => e.id === c.fromElement);
      const toEl = elements.find(e => e.id === c.toElement);
      if (!fromEl || !toEl) return;

      const t = c.type || 'arrow';
      const isDep = t === 'dependency';
      const isInherit = t === 'inheritance';
      const dashAttr = isDep ? ' stroke-dasharray="8 4"' : '';
      let markerAttr = ' marker-end="url(#export-arrowhead)"';
      if (isInherit) markerAttr = ' marker-end="url(#export-arrowhead-open)"';
      else if (t === 'association') markerAttr = ' marker-end="url(#export-arrow-assoc)"';
      else if (t === 'er_many') markerAttr = ' marker-end="url(#export-crow)"';
      else if (t === 'er_one') markerAttr = ' marker-end="url(#export-er-one)"';

      if (fromEl.id === toEl.id) {
        const { path, labelX, labelY } = selfLoopPath(fromEl, connectors, c);
        svgStr += `<path d="${path}" fill="none" stroke="${strokeColor}" stroke-width="2.5"${dashAttr}${markerAttr} />`;
        if (c.text) {
          const labelW = Math.max(c.text.length * 8, 20);
          svgStr += `<rect x="${labelX - labelW / 2}" y="${labelY - 12}" width="${labelW}" height="18" fill="${labelBgColor}" rx="3" />`;
          svgStr += `<text x="${labelX}" y="${labelY + 2}" fill="${textColor}" font-size="11" font-family="monospace" text-anchor="middle">${escapeXml(c.text)}</text>`;
        }
      } else {
        const { x1, y1, x2, y2 } = connectorEndpointsSmart(fromEl, toEl, connectors, c, elements, template);
        svgStr += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${strokeColor}" stroke-width="2.5"${dashAttr}${markerAttr} />`;
        if (c.text) {
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          const labelW = Math.max(c.text.length * 8, 20);
          svgStr += `<rect x="${midX - labelW / 2}" y="${midY - 10}" width="${labelW}" height="18" fill="${labelBgColor}" rx="3" />`;
          svgStr += `<text x="${midX}" y="${midY + 4}" fill="${textColor}" font-size="11" font-family="monospace" text-anchor="middle">${escapeXml(c.text)}</text>`;
        }
      }
    });

    elements.forEach(el => {
      const elStyle = el.style || {};
      const fillColor = elStyle.backgroundColor || elBgColor;
      const edgeColor = elStyle.borderColor || elStrokeColor;
      const bw = elStyle.borderWidth || 2;
      const fs = elStyle.fontSize || 13;

      if (el.type === 'circle') {
        const r = el.width / 2;
        svgStr += `<circle cx="${el.x + r}" cy="${el.y + r}" r="${r}" fill="${fillColor}" stroke="${edgeColor}" stroke-width="${bw}" />`;
        svgStr += buildTextTspan(el.text, el.x + r, el.y + r + 4, textColor, fs);
      } else if (el.type === 'ellipse') {
        svgStr += `<ellipse cx="${el.x + el.width / 2}" cy="${el.y + el.height / 2}" rx="${el.width / 2}" ry="${el.height / 2}" fill="${fillColor}" stroke="${edgeColor}" stroke-width="${bw}" />`;
        svgStr += buildTextTspan(el.text, el.x + el.width / 2, el.y + el.height / 2 + 4, textColor, fs);
      } else if (el.type === 'actor') {
        const cx = el.x + el.width / 2;
        const s = Math.min(el.width, el.height) / 26;
        const gy = el.y + s * 12 + 4;
        svgStr += `<g transform="translate(${cx},${gy}) scale(${s}) translate(-12,-10)" fill="none" stroke="${edgeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`;
        svgStr += `<circle cx="12" cy="7" r="4" />`;
        svgStr += `<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />`;
        svgStr += `</g>`;
        svgStr += `<text x="${cx}" y="${el.y + el.height - 6}" fill="${textColor}" font-size="${Math.max(fs - 1, 10)}" font-family="monospace" text-anchor="middle">${escapeXml(el.text || '')}</text>`;
      } else if (el.type === 'participant') {
        const hh = PARTICIPANT_HEADER_PX;
        svgStr += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${hh}" fill="${fillColor}" stroke="${edgeColor}" stroke-width="${bw}" rx="4" />`;
        svgStr += `<line x1="${el.x + el.width / 2}" y1="${el.y + hh}" x2="${el.x + el.width / 2}" y2="${el.y + el.height}" stroke="${edgeColor}" stroke-width="1.5" stroke-dasharray="5 5" />`;
        svgStr += `<text x="${el.x + el.width / 2}" y="${el.y + hh / 2 + 5}" fill="${textColor}" font-size="${fs}" font-family="monospace" text-anchor="middle">${escapeXml(el.text || '')}</text>`;
      } else if (el.type === 'database') {
        const ry = 10;
        svgStr += `<rect x="${el.x}" y="${el.y + ry}" width="${el.width}" height="${el.height - 2 * ry}" fill="${fillColor}" stroke="${edgeColor}" stroke-width="${bw}" />`;
        svgStr += `<ellipse cx="${el.x + el.width / 2}" cy="${el.y + ry}" rx="${el.width / 2}" ry="${ry}" fill="${fillColor}" stroke="${edgeColor}" stroke-width="${bw}" />`;
        svgStr += `<ellipse cx="${el.x + el.width / 2}" cy="${el.y + el.height - ry}" rx="${el.width / 2}" ry="${ry}" fill="${fillColor}" stroke="${edgeColor}" stroke-width="${bw}" />`;
        svgStr += buildTextTspan(el.text, el.x + el.width / 2, el.y + el.height / 2 + 4, textColor, fs);
      } else if (el.type === 'package') {
        svgStr += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="${fillColor}" stroke="${edgeColor}" stroke-width="${bw}" rx="6" />`;
        svgStr += `<rect x="${el.x + 10}" y="${el.y - 2}" width="${Math.min(90, el.width * 0.45)}" height="18" fill="${fillColor}" stroke="${edgeColor}" stroke-width="${bw}" rx="4" />`;
        svgStr += buildTextTspan(el.text, el.x + el.width / 2, el.y + el.height / 2 + 6, textColor, fs);
      } else if (el.type === 'component') {
        svgStr += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="${fillColor}" stroke="${edgeColor}" stroke-width="${bw}" rx="8" />`;
        svgStr += `<rect x="${el.x + el.width - 26}" y="${el.y + 10}" width="16" height="12" fill="${fillColor}" stroke="${edgeColor}" stroke-width="${bw}" rx="1" />`;
        svgStr += `<rect x="${el.x + el.width - 22}" y="${el.y + 13}" width="7" height="2.5" fill="${fillColor}" stroke="${edgeColor}" stroke-width="1" rx="1" />`;
        svgStr += `<rect x="${el.x + el.width - 22}" y="${el.y + 18}" width="7" height="2.5" fill="${fillColor}" stroke="${edgeColor}" stroke-width="1" rx="1" />`;
        svgStr += buildTextTspan(el.text, el.x + el.width / 2, el.y + el.height / 2 + 8, textColor, fs);
      } else if (el.type === 'diamond') {
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        const pts = `${cx},${el.y} ${el.x+el.width},${cy} ${cx},${el.y+el.height} ${el.x},${cy}`;
        svgStr += `<polygon points="${pts}" fill="${fillColor}" stroke="${edgeColor}" stroke-width="${bw}" />`;
        svgStr += buildTextTspan(el.text, cx, cy + 4, textColor, fs);
      } else if (el.type === 'class' || el.type === 'entity') {
        const lines = String(el.text || '').split('\n');
        const className = lines[0] || '';
        const members = lines.slice(1);
        const headerH = UML_CLASS_HEADER_PX;
        const separatorY = el.y + headerH;
        svgStr += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="${fillColor}" stroke="${edgeColor}" stroke-width="${bw}" rx="6" />`;
        svgStr += `<text x="${el.x + el.width / 2}" y="${el.y + 22}" fill="${textColor}" font-size="${fs}" font-family="monospace" text-anchor="middle" font-weight="bold">${escapeXml(className)}</text>`;
        svgStr += `<line x1="${el.x}" y1="${separatorY}" x2="${el.x + el.width}" y2="${separatorY}" stroke="${edgeColor}" stroke-width="1.5" />`;
        members.forEach((m, i) => {
          svgStr += `<text x="${el.x + 10}" y="${separatorY + 14 + i * UML_CLASS_ATTR_LINE_PX}" fill="${textColor}" font-size="${Math.max(fs - 1, 10)}" font-family="monospace">${escapeXml(m)}</text>`;
        });
      } else {
        svgStr += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="${fillColor}" stroke="${edgeColor}" stroke-width="${bw}" rx="8" />`;
        svgStr += buildTextTspan(el.text, el.x + el.width/2, el.y + el.height/2 + 4, textColor, fs);
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--bg-body)' }}>
      {showExport && <ExportDialog onClose={() => setShowExport(false)} onExport={handleExport} />}
      {showCodeGen && <CodeGenModal elements={elements} connectors={connectors} onClose={() => setShowCodeGen(false)} />}
      {showValidation && <ValidationModal elements={elements} connectors={connectors} template={template} onClose={() => setShowValidation(false)} />}
      
      <header style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={onBack} style={{ backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '6px 12px' }}>
            &larr; Back
          </button>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Editor - {template}</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
           <select
             value={selectedConnectorType}
             onChange={e => setSelectedConnectorType(e.target.value)}
             title="Connector type used for new connections"
             style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', padding: '6px 8px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', outline: 'none' }}
           >
             {CONNECTOR_TYPES.map(ct => (
               <option key={ct.value} value={ct.value}>{ct.label}</option>
             ))}
           </select>
           <button 
             onClick={() => setConnectingFrom(selectedId)} 
             disabled={!selectedId}
             style={{ 
                 backgroundColor: connectingFrom ? 'var(--accent-inverse-bg)' : 'var(--bg-button)', 
                 color: connectingFrom ? 'var(--accent-inverse-text)' : 'var(--text-primary)', 
                 border: `1px solid ${connectingFrom ? 'var(--border-emphasis)' : 'var(--border-subtle)'}`, 
                 padding: '6px 16px',
                 borderRadius: '8px',
                 opacity: selectedId ? 1 : 0.5,
                 cursor: selectedId ? 'pointer' : 'not-allowed',
                 display: 'flex', alignItems: 'center', gap: '0.4rem'
             }}
           >
             <Link size={14} /> {connectingFrom ? 'Click target...' : 'Connect'}
           </button>

           {/* CASE Tool Buttons */}
           <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-default)' }} />
           <button
             onClick={() => setShowValidation(true)}
             title="Validate diagram structure and UML rules"
             style={{ backgroundColor: 'var(--success-soft-bg)', color: 'var(--success-soft-text)', border: '1px solid var(--success-text)', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
           >
             <CheckSquare size={16} /> Validate
           </button>
           <button
             onClick={() => setShowCodeGen(true)}
             title="Generate Python class code from UML Class shapes"
             style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--code-syntax)', border: '1px solid var(--border-strong)', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
           >
             <FileCode size={16} /> Generate Code
           </button>
           <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-default)' }} />

           <button onClick={() => setShowExport(true)} style={{ backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer' }}>Export</button>
           <button onClick={() => onSave(diagramId, elements, connectors)} style={{ backgroundColor: 'var(--accent-inverse-bg)', color: 'var(--accent-inverse-text)', border: '1px solid var(--accent-inverse-bg)', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Save</button>
        </div>
      </header>
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <aside style={{ width: '250px', backgroundColor: 'var(--bg-surface)', borderRight: '1px solid var(--border-default)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', zIndex: 10 }}>
          <h3 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Shapes Palette</h3>
          {paletteShapes.map(s => (
            <div 
              key={s.type}
              draggable 
              onDragStart={(e) => handleDragStartPalette(e, s.type)}
              style={{ padding: '1rem', backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border-default)', borderRadius: s.type === 'circle' ? '40px' : '8px', cursor: 'grab', textAlign: 'center', color: 'var(--text-secondary)', userSelect: 'none' }}
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
                  style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', caretColor: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: '4px', padding: '8px', resize: 'vertical' }}
                />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.8rem' }}>Press Backspace/Delete key to remove.</p>
            </div>
          )}

          {selectedConnectorId && !selectedId && (() => {
            const selConn = connectors.find(c => c.id === selectedConnectorId);
            return selConn ? (
              <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-default)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <h3 style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase' }}>Edit Connector</h3>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.3rem' }}>Type</label>
                  <select
                    value={selConn.type || 'arrow'}
                    onChange={e => handleUpdateConnector(selectedConnectorId, { type: e.target.value })}
                    style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: '4px', padding: '8px', outline: 'none' }}
                  >
                    {CONNECTOR_TYPES.map(ct => (
                      <option key={ct.value} value={ct.value}>{ct.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.3rem' }}>Label</label>
                  <input 
                    type="text" 
                    value={selConn.text || ''} 
                    onChange={e => handleEditConnectorText(selectedConnectorId, e.target.value)}
                    placeholder="e.g. extends, uses, 1..*"
                    style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', caretColor: 'var(--text-primary)', border: '1px solid var(--border-strong)', borderRadius: '4px', padding: '8px', outline: 'none' }}
                  />
                </div>
                <p style={{ color: 'var(--text-faint)', fontSize: '0.8rem', margin: 0 }}>Press Backspace/Delete key to remove.</p>
              </div>
            ) : null;
          })()}
          
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
          style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: 'var(--canvas-bg)', cursor: connectingFrom ? 'crosshair' : (draggingId ? 'grabbing' : 'auto') }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'radial-gradient(var(--canvas-grid) 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.55, pointerEvents: 'none' }}></div>

          {elements.map((el) => {
            const isSelected = el.id === selectedId;
            const isClassShape = el.type === 'class' || el.type === 'entity';
            const style = el.style || {
              backgroundColor: isClassShape ? 'var(--diagram-class-fill)' : 'var(--diagram-default-fill)',
              borderColor: isClassShape ? 'var(--diagram-class-border)' : 'var(--border-strong)',
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
              border: `${style.borderWidth}px solid ${isSelected ? '#ffffff' : style.borderColor}`,
              color: 'var(--diagram-shape-text)',
              boxShadow: isSelected ? '0 0 0 2px rgba(255,255,255,0.2)' : '0 4px 12px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              zIndex: isSelected ? 3 : 1,
              cursor: draggingId === el.id ? 'grabbing' : 'grab',
              userSelect: 'none',
              padding: '0.5rem',
              boxSizing: 'border-box'
            };

            if (el.type === 'circle') shapeStyle.borderRadius = '50%';
            else if (el.type === 'ellipse') shapeStyle.borderRadius = '999px / 70%';
            else if (el.type === 'diamond') shapeStyle.transform = 'rotate(45deg)';
            else if (el.type === 'participant') {
              shapeStyle.borderRadius = '4px';
              shapeStyle.borderStyle = 'solid';
              shapeStyle.flexDirection = 'column';
              shapeStyle.alignItems = 'stretch';
              shapeStyle.justifyContent = 'flex-start';
              shapeStyle.padding = '0';
            } else if (el.type === 'actor') {
              shapeStyle.padding = '8px';
              shapeStyle.flexDirection = 'column';
              shapeStyle.justifyContent = 'flex-start';
            } else if (el.type === 'class' || el.type === 'entity') {
              shapeStyle.borderRadius = '6px';
              shapeStyle.flexDirection = 'column';
              shapeStyle.alignItems = 'stretch';
              shapeStyle.justifyContent = 'flex-start';
              shapeStyle.padding = '0';
              shapeStyle.textAlign = 'left';
            } else if (el.type === 'database') {
              shapeStyle.borderRadius = '16px / 12px';
            } else {
              shapeStyle.borderRadius = '8px';
            }

            return (
              <div key={el.id} style={shapeStyle} onPointerDown={(e) => handlePointerDownElement(e, el.id)} onClick={(e) => e.stopPropagation()}>
                {el.type === 'package' && (
                  <div style={{ position: 'absolute', top: '-2px', left: '12px', width: '64px', height: '18px', border: `${style.borderWidth}px solid ${isSelected ? '#ffffff' : style.borderColor}`, borderBottom: 'none', borderRadius: '6px 6px 0 0', backgroundColor: style.backgroundColor }} />
                )}
                {el.type === 'component' && (
                  <>
                    <div style={{ position: 'absolute', right: '8px', top: '10px', width: '18px', height: '14px', border: `${style.borderWidth}px solid ${isSelected ? '#ffffff' : style.borderColor}`, borderRadius: '2px' }} />
                    <div style={{ position: 'absolute', right: '13px', top: '13px', width: '8px', height: '3px', border: `${style.borderWidth}px solid ${isSelected ? '#ffffff' : style.borderColor}`, borderRadius: '1px', backgroundColor: style.backgroundColor }} />
                    <div style={{ position: 'absolute', right: '13px', top: '20px', width: '8px', height: '3px', border: `${style.borderWidth}px solid ${isSelected ? '#ffffff' : style.borderColor}`, borderRadius: '1px', backgroundColor: style.backgroundColor }} />
                  </>
                )}
                {el.type === 'participant' ? (
                  <>
                    <div
                      style={{
                        flexShrink: 0,
                        padding: '10px 8px',
                        borderBottom: `2px solid ${isSelected ? '#ffffff' : style.borderColor}`,
                        fontWeight: 600,
                        fontSize: `${Math.min(style.fontSize, 13)}px`,
                        textAlign: 'center',
                        lineHeight: 1.25,
                      }}
                    >
                      {el.text}
                    </div>
                    <div style={{ flex: 1, position: 'relative', minHeight: 24 }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          top: 0,
                          bottom: 0,
                          width: 0,
                          borderLeft: `2px dashed ${isSelected ? 'rgba(255,255,255,0.85)' : style.borderColor}`,
                        }}
                      />
                    </div>
                  </>
                ) : el.type === 'actor' ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      height: '100%',
                      width: '100%',
                      gap: 10,
                      boxSizing: 'border-box',
                    }}
                  >
                    <User
                      size={Math.min(Math.min(el.width, el.height) * 0.42, 44)}
                      strokeWidth={2}
                      color={isSelected ? '#fff' : style.borderColor}
                      style={{ flexShrink: 0 }}
                      aria-hidden
                    />
                    <strong
                      style={{
                        marginTop: 'auto',
                        fontSize: `${Math.min(style.fontSize, 13)}px`,
                        textAlign: 'center',
                        lineHeight: 1.35,
                        wordWrap: 'break-word',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {el.text}
                    </strong>
                  </div>
                ) : el.type === 'class' || el.type === 'entity' ? (
                  (() => {
                    const raw = String(el.text ?? '');
                    const lines = raw.split('\n');
                    const title =
                      lines[0]?.trim() !== ''
                        ? lines[0]
                        : el.type === 'entity'
                          ? 'Entity'
                          : 'ClassName';
                    const attrs = lines.slice(1);
                    const edgeCol = isSelected ? '#ffffff' : style.borderColor;
                    return (
                      <>
                        <div
                          style={{
                            flexShrink: 0,
                            minHeight: UML_CLASS_HEADER_PX - 8,
                            padding: '8px 10px 7px',
                            fontWeight: 700,
                            fontSize: `${Math.min(style.fontSize + 1, 15)}px`,
                            textAlign: 'center',
                            borderBottom: `1px solid ${edgeCol}`,
                            lineHeight: 1.25,
                            fontFamily: 'ui-monospace, monospace',
                          }}
                        >
                          {title}
                        </div>
                        <div
                          style={{
                            flex: 1,
                            minHeight: attrs.length ? undefined : 10,
                            padding: '8px 10px 10px',
                            fontSize: `${Math.max(style.fontSize - 1, 11)}px`,
                            fontFamily: 'ui-monospace, monospace',
                            lineHeight: `${UML_CLASS_ATTR_LINE_PX}px`,
                            whiteSpace: 'pre-wrap',
                            color: '#dbeafe',
                          }}
                        >
                          {attrs.length > 0 ? attrs.join('\n') : ' '}
                        </div>
                      </>
                    );
                  })()
                ) : (
                  <div style={el.type === 'diamond' ? { transform: 'rotate(-45deg)' } : {}}>
                    <strong
                      style={{
                        display: 'block',
                        wordWrap: 'break-word',
                        overflow: 'hidden',
                        fontSize: `${style.fontSize}px`,
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.4',
                      }}
                    >
                      {el.text}
                    </strong>
                  </div>
                )}

                {isSelected && !draggingId && (
                   <div 
                     onPointerDown={(e) => { e.stopPropagation(); setConnectingFrom(el.id); }}
                     style={{ position: 'absolute', right: '-12px', top: 'calc(50% - 12px)', width: '24px', height: '24px', backgroundColor: '#444', borderRadius: '50%', cursor: 'crosshair', zIndex: 20, border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#fff' }}
                     title="Click and then click target to connect"
                   >+</div>
                )}
              </div>
            );
          })}

          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
            <defs>
              <marker id="arrow-filled-normal" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="0 0, 10 3.5, 0 7" fill="var(--connector-normal)" />
              </marker>
              <marker id="arrow-filled-selected" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="0 0, 10 3.5, 0 7" fill="var(--connector-selected)" />
              </marker>
              <marker id="arrow-inherit-normal" markerWidth="12" markerHeight="9" refX="11" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="0 0, 12 4.5, 0 9" fill="var(--diagram-marker-fill-open)" stroke="var(--connector-normal)" strokeWidth="1.5" />
              </marker>
              <marker id="arrow-inherit-selected" markerWidth="12" markerHeight="9" refX="11" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="0 0, 12 4.5, 0 9" fill="var(--diagram-marker-fill-open)" stroke="var(--connector-selected)" strokeWidth="1.5" />
              </marker>
              <marker id="arrow-assoc-normal" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="0 0, 8 3.5, 0 7" fill="var(--diagram-marker-fill-open)" stroke="var(--connector-normal)" strokeWidth="1.2" />
              </marker>
              <marker id="arrow-assoc-selected" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
                <polygon points="0 0, 8 3.5, 0 7" fill="var(--diagram-marker-fill-open)" stroke="var(--connector-selected)" strokeWidth="1.2" />
              </marker>
              <marker id="crow-normal" markerWidth="18" markerHeight="14" refX="16" refY="7" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M 0 0 L 6 7 L 0 14 M 6 7 L 16 7" fill="none" stroke="var(--connector-normal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="miter" />
              </marker>
              <marker id="crow-selected" markerWidth="18" markerHeight="14" refX="16" refY="7" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M 0 0 L 6 7 L 0 14 M 6 7 L 16 7" fill="none" stroke="var(--connector-selected)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="miter" />
              </marker>
              <marker id="er-one-bar-normal" markerWidth="8" markerHeight="16" refX="5" refY="8" orient="auto" markerUnits="userSpaceOnUse">
                <line x1="4" y1="1" x2="4" y2="15" stroke="var(--connector-normal)" strokeWidth="2.5" strokeLinecap="square" />
              </marker>
              <marker id="er-one-bar-selected" markerWidth="8" markerHeight="16" refX="5" refY="8" orient="auto" markerUnits="userSpaceOnUse">
                <line x1="4" y1="1" x2="4" y2="15" stroke="var(--connector-selected)" strokeWidth="2.5" strokeLinecap="square" />
              </marker>
            </defs>
            {connectors.map(c => {
               const fromEl = elements.find(e => e.id === c.fromElement);
               const toEl = elements.find(e => e.id === c.toElement);
               if (!fromEl || !toEl) return null;

               const isSelected = c.id === selectedConnectorId;
               const strokeColor = isSelected ? 'var(--connector-selected)' : 'var(--connector-normal)';
               const t = c.type || 'arrow';
               const isDependency = t === 'dependency';
               const isInheritance = t === 'inheritance';
               const strokeDash = isDependency ? '8 4' : undefined;
               const suf = isSelected ? 'selected' : 'normal';
               let markerEnd;
               if (t === 'inheritance') markerEnd = `url(#arrow-inherit-${suf})`;
               else if (t === 'association') markerEnd = `url(#arrow-assoc-${suf})`;
               else if (t === 'er_many') markerEnd = `url(#crow-${suf})`;
               else if (t === 'er_one') markerEnd = `url(#er-one-bar-${suf})`;
               else markerEnd = `url(#arrow-filled-${suf})`;

               if (fromEl.id === toEl.id) {
                 const { path, labelX, labelY } = selfLoopPath(fromEl, connectors, c);
                 return (
                    <g key={c.id}>
                        <path d={path} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeDasharray={strokeDash} markerEnd={markerEnd} pointerEvents="none" />
                        <path d={path} fill="none" stroke="transparent" strokeWidth="15" pointerEvents="stroke" onClick={(e) => handlePointerDownConnector(e, c.id)} cursor="pointer" />
                        {c.text && (
                           <g pointerEvents="none">
                             <rect x={labelX - Math.max(c.text.length * 4, 10)} y={labelY - 10} width={Math.max(c.text.length * 8, 20)} height="18" fill="var(--connector-label-bg)" rx="4" />
                             <text x={labelX} y={labelY + 4} fill="var(--text-secondary)" fontSize="11" textAnchor="middle" fontFamily="monospace">{c.text}</text>
                           </g>
                        )}
                    </g>
                 );
               }

               const { x1, y1, x2, y2 } = connectorEndpointsSmart(fromEl, toEl, connectors, c, elements, template);
               const midX = (x1 + x2) / 2;
               const midY = (y1 + y2) / 2;

               return (
                 <g key={c.id}>
                   <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={strokeColor} strokeWidth="2.5" strokeDasharray={strokeDash} pointerEvents="none" markerEnd={markerEnd} />
                   <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth="20" pointerEvents="stroke" onClick={(e) => handlePointerDownConnector(e, c.id)} cursor="pointer" />
                   {c.text && (
                     <g pointerEvents="none">
                       <rect x={midX - Math.max(c.text.length * 4, 10)} y={midY - 10} width={Math.max(c.text.length * 8, 20)} height="20" fill="var(--connector-label-bg)" rx="4" />
                       <text x={midX} y={midY + 4} fill="var(--text-secondary)" fontSize="11" textAnchor="middle" fontFamily="monospace">{c.text}</text>
                     </g>
                   )}
                   {isInheritance && (
                     <text x={midX + 8} y={midY - 14} fill="#7ec8e3" fontSize="10" textAnchor="middle" fontFamily="monospace" pointerEvents="none">«extends»</text>
                   )}
                 </g>
               );
            })}
          </svg>
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
