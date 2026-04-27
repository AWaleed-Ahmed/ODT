from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import uuid
import bcrypt
import json
import shutil

app = FastAPI()

# Resolve storage path relative to this file so it works regardless of
# which directory uvicorn is launched from.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STORAGE_DIR = os.path.join(BASE_DIR, '..', 'ODT_STORAGE')
USERS_FILE = os.path.join(STORAGE_DIR, 'users.txt')
DIAGRAMS_DIR = os.path.join(STORAGE_DIR, 'diagrams')
TEMPLATES_FILE = os.path.join(STORAGE_DIR, 'templates.json')

os.makedirs(os.path.abspath(STORAGE_DIR), exist_ok=True)
os.makedirs(os.path.abspath(DIAGRAMS_DIR), exist_ok=True)
if not os.path.exists(USERS_FILE):
    open(USERS_FILE, 'w').close()

# CORS: explicit origins — wildcard + allow_credentials=True is invalid per spec.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "https://odt-app.vercel.app",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Default templates + merge logic ──────────────────────────────────────────

DEFAULT_TEMPLATES = [
    {"id": "blank", "name": "Blank Canvas", "elements": [], "connectors": []},
    {
        "id": "uml",
        "name": "UML Class Diagram",
        "elements": [
            {"id": "uc1", "type": "class", "name": "User", "x": 200, "y": 150, "width": 160, "height": 100},
            {"id": "uc2", "type": "class", "name": "Order", "x": 500, "y": 150, "width": 160, "height": 100},
        ],
        "connectors": [],
    },
    {
        "id": "flowchart",
        "name": "Flowchart",
        "elements": [
            {"id": "fc1", "type": "start", "label": "Start", "x": 400, "y": 80, "width": 64, "height": 64},
            {"id": "fc2", "type": "diamond", "label": "Valid?", "x": 380, "y": 200, "width": 110, "height": 110},
            {"id": "fc3", "type": "rectangle", "label": "Process", "x": 370, "y": 380, "width": 140, "height": 56},
            {"id": "fc4", "type": "end", "label": "End", "x": 400, "y": 500, "width": 64, "height": 64},
        ],
        "connectors": [],
    },
    {
        "id": "er",
        "name": "ER Diagram",
        "elements": [
            {"id": "er1", "type": "entity", "name": "Customer", "x": 200, "y": 200, "width": 140, "height": 72},
            {"id": "er2", "type": "entity", "name": "Product", "x": 500, "y": 200, "width": 140, "height": 72},
        ],
        "connectors": [],
    },
    {
        "id": "architecture",
        "name": "Architecture Diagram",
        "elements": [
            {"id": "ar1", "type": "node", "label": "Client App", "x": 120, "y": 200, "width": 130, "height": 56},
            {"id": "ar2", "type": "node", "label": "API Gateway", "x": 360, "y": 200, "width": 140, "height": 56},
            {"id": "ar3", "type": "database", "label": "PostgreSQL DB", "x": 620, "y": 190, "width": 150, "height": 72},
        ],
        "connectors": [],
    },
    {
        "id": "usecase",
        "name": "UML Use Case",
        "elements": [
            {
                "id": "uc_sys",
                "type": "rectangle",
                "name": "Online Store",
                "x": 300,
                "y": 100,
                "width": 460,
                "height": 400,
                "style": {
                    "backgroundColor": "rgba(0,0,0,0)",
                    "borderColor": "#94a3b8",
                    "borderWidth": 2,
                    "fontSize": 13,
                },
            },
            {"id": "uc_a1", "type": "actor", "name": "Customer", "x": 100, "y": 240, "width": 56, "height": 128},
            {"id": "uc_a2", "type": "actor", "name": "Administrator", "x": 100, "y": 400, "width": 56, "height": 128},
            {"id": "uc_e1", "type": "ellipse", "name": "Browse Catalog", "x": 380, "y": 160, "width": 160, "height": 76},
            {"id": "uc_e2", "type": "ellipse", "name": "Place Order", "x": 380, "y": 280, "width": 140, "height": 72},
            {"id": "uc_e3", "type": "ellipse", "name": "Manage Users", "x": 380, "y": 400, "width": 160, "height": 76},
        ],
        "connectors": [
            {"id": "ucc1", "fromElement": "uc_a1", "toElement": "uc_e1", "type": "arrow", "text": ""},
            {"id": "ucc2", "fromElement": "uc_a1", "toElement": "uc_e2", "type": "arrow", "text": ""},
            {"id": "ucc3", "fromElement": "uc_a2", "toElement": "uc_e3", "type": "arrow", "text": ""},
        ],
    },
    {
        "id": "sequence",
        "name": "UML Sequence",
        "elements": [
            {"id": "sq_u", "type": "participant", "name": ":User", "x": 120, "y": 90, "width": 108, "height": 380},
            {"id": "sq_ui", "type": "participant", "name": ":CartUI", "x": 280, "y": 90, "width": 118, "height": 380},
            {"id": "sq_api", "type": "participant", "name": ":OrderAPI", "x": 460, "y": 90, "width": 130, "height": 380},
            {"id": "sq_db", "type": "participant", "name": ":Database", "x": 640, "y": 90, "width": 118, "height": 380},
        ],
        "connectors": [
            {"id": "sqc1", "fromElement": "sq_u", "toElement": "sq_ui", "type": "arrow", "text": "addItem(itemId)"},
            {"id": "sqc2", "fromElement": "sq_ui", "toElement": "sq_api", "type": "arrow", "text": "POST /orders"},
            {"id": "sqc3", "fromElement": "sq_api", "toElement": "sq_db", "type": "arrow", "text": "INSERT"},
        ],
    },
    {
        "id": "activity",
        "name": "UML Activity",
        "elements": [
            {"id": "act1", "type": "start", "label": "Start", "x": 400, "y": 60, "width": 64, "height": 64},
            {"id": "act2", "type": "rectangle", "name": "Receive Request", "x": 350, "y": 160, "width": 180, "height": 52},
            {"id": "act3", "type": "diamond", "name": "Authorized?", "x": 375, "y": 260, "width": 130, "height": 130},
            {"id": "act4", "type": "rectangle", "name": "Process Payment", "x": 560, "y": 290, "width": 170, "height": 52},
            {"id": "act5", "type": "rectangle", "name": "Show Error", "x": 140, "y": 290, "width": 150, "height": 52},
            {"id": "act6", "type": "rectangle", "name": "Fulfill Order", "x": 350, "y": 440, "width": 180, "height": 52},
            {"id": "act7", "type": "end", "label": "End", "x": 400, "y": 560, "width": 64, "height": 64},
        ],
        "connectors": [],
    },
    {
        "id": "deployment",
        "name": "UML Deployment",
        "elements": [
            {"id": "dp_c", "type": "rectangle", "name": "<<executionEnvironment>>\nCloud VPC", "x": 140, "y": 120, "width": 620, "height": 380, "style": {"backgroundColor": "rgba(148,163,184,0.15)", "borderColor": "#64748b", "borderWidth": 2, "fontSize": 12}},
            {"id": "dp_w", "type": "node", "name": "<<device>>\nWeb Tier\nnginx + SPA", "x": 200, "y": 220, "width": 160, "height": 88},
            {"id": "dp_app", "type": "node", "name": "<<device>>\nApp Tier\nAPI services", "x": 400, "y": 210, "width": 170, "height": 100},
            {"id": "dp_db", "type": "node", "name": "<<device>>\nData Tier\nPostgreSQL", "x": 610, "y": 230, "width": 130, "height": 88},
        ],
        "connectors": [
            {"id": "dpc1", "fromElement": "dp_w", "toElement": "dp_app", "type": "arrow", "text": "HTTPS"},
            {"id": "dpc2", "fromElement": "dp_app", "toElement": "dp_db", "type": "arrow", "text": "JDBC"},
        ],
    },
    {
        "id": "package",
        "name": "UML Package Diagram",
        "elements": [
            {"id": "pkg1", "type": "package", "name": "com.myapp.orders", "x": 140, "y": 120, "width": 520, "height": 340},
            {"id": "pkg_c1", "type": "class", "name": "OrderService", "x": 220, "y": 240, "width": 170, "height": 88},
            {"id": "pkg_c2", "type": "class", "name": "Order", "x": 430, "y": 240, "width": 150, "height": 88},
            {"id": "pkg_c3", "type": "rectangle", "name": "«constraint» Audited only from OrderService", "x": 180, "y": 360, "width": 420, "height": 56, "style": {"backgroundColor": "rgba(251,191,36,0.12)", "borderColor": "#d97706", "borderWidth": 1, "fontSize": 11}},
        ],
        "connectors": [
            {"id": "pkgx1", "fromElement": "pkg_c1", "toElement": "pkg_c2", "type": "arrow", "text": "creates"},
        ],
    },
    {
        "id": "component",
        "name": "UML Component Diagram",
        "elements": [
            {"id": "cmp1", "type": "component", "name": "Web Client", "x": 140, "y": 200, "width": 190, "height": 110},
            {"id": "cmp2", "type": "component", "name": "API Gateway", "x": 390, "y": 200, "width": 210, "height": 110},
            {"id": "cmp3", "type": "component", "name": "Order Service", "x": 670, "y": 200, "width": 210, "height": 110},
        ],
        "connectors": [
            {"id": "cmpc1", "fromElement": "cmp1", "toElement": "cmp2", "type": "arrow", "text": "HTTPS"},
            {"id": "cmpc2", "fromElement": "cmp2", "toElement": "cmp3", "type": "arrow", "text": "REST"},
        ],
    },
]


def merge_default_templates():
    """Ensure templates.json contains all DEFAULT_TEMPLATES by id; keep custom ones."""
    if not os.path.exists(TEMPLATES_FILE):
        with open(TEMPLATES_FILE, "w") as f:
            json.dump(DEFAULT_TEMPLATES, f, indent=2)
        return

    try:
        with open(TEMPLATES_FILE, "r") as f:
            existing = json.load(f)
        if not isinstance(existing, list):
            existing = []
    except Exception:
        existing = []

    merged = []
    seen = set()
    for d in DEFAULT_TEMPLATES:
        merged.append(dict(d))
        seen.add(d["id"])

    for t in existing:
        tid = t.get("id")
        if tid and tid not in seen:
            merged.append(t)
            seen.add(tid)

    if json.dumps(merged, sort_keys=True) != json.dumps(existing, sort_keys=True):
        with open(TEMPLATES_FILE, "w") as f:
            json.dump(merged, f, indent=2)


merge_default_templates()

# ── Pydantic models ───────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class DiagramCreate(BaseModel):
    user_id: str
    template: str

class DiagramRename(BaseModel):
    name: str

# ── Helpers ───────────────────────────────────────────────────────────────────

def _read_metadata(diag_folder: str) -> dict:
    """Read plain-line metadata.txt → {user_id, template, name}."""
    path = os.path.join(diag_folder, 'metadata.txt')
    meta = {'user_id': '', 'template': '', 'name': 'Untitled'}
    if not os.path.exists(path):
        return meta
    with open(path, 'r') as f:
        lines = f.readlines()
    if len(lines) >= 1:
        meta['user_id'] = lines[0].strip()
    if len(lines) >= 2:
        meta['template'] = lines[1].strip()
    if len(lines) >= 3:
        meta['name'] = lines[2].strip()
    return meta

def _write_metadata(diag_folder: str, user_id: str, template: str, name: str):
    with open(os.path.join(diag_folder, 'metadata.txt'), 'w') as f:
        f.write(f"{user_id}\n{template}\n{name}\n")

def _load_json_file(path: str):
    if not os.path.exists(path):
        return []
    with open(path, 'r') as f:
        content = f.read().strip()
    return json.loads(content) if content else []

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get('/')
def root():
    """Avoid 404 when opening http://127.0.0.1:8000/ in a browser during demos."""
    return {
        'service': 'ODT Model API (FastAPI)',
        'interactive_docs': '/docs',
        'health': '/api/health',
        'note': 'The React app runs on Vite (e.g. http://localhost:5173).',
    }


@app.get('/api/health')
def health_check():
    return {'status': 'Model server is running', 'service': 'Python FastAPI'}

@app.get('/api/templates')
def list_templates():
    try:
        merge_default_templates()
        with open(TEMPLATES_FILE, 'r') as f:
            templates = json.load(f)
        if not isinstance(templates, list):
            return {'templates': list(DEFAULT_TEMPLATES)}
        return {'templates': templates}
    except Exception:
        return {'templates': list(DEFAULT_TEMPLATES)}

@app.post('/api/register')
def register_user(data: UserRegister):
    with open(USERS_FILE, 'r') as f:
        for line in f:
            if not line.strip():
                continue
            # Split with max 3 commas: user_id, username, email, hashed_pw
            parts = line.strip().split(',', 3)
            if len(parts) >= 3 and parts[2] == data.email:
                raise HTTPException(status_code=400, detail='Email already registered')

    user_id = str(uuid.uuid4())
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(data.password.encode('utf-8'), salt).decode('utf-8')

    with open(USERS_FILE, 'a') as f:
        f.write(f"{user_id},{data.username},{data.email},{hashed}\n")

    return {'message': 'User registered successfully', 'user_id': user_id}

@app.post('/api/login')
def login_user(data: UserLogin):
    with open(USERS_FILE, 'r') as f:
        for line in f:
            if not line.strip():
                continue
            parts = line.strip().split(',', 3)
            if len(parts) >= 4 and parts[2] == data.email:
                hashed = parts[3]
                if bcrypt.checkpw(data.password.encode('utf-8'), hashed.encode('utf-8')):
                    return {
                        'message': 'Login successful',
                        'user_id': parts[0],
                        'username': parts[1],
                        'token': f'simulated-token-{parts[0]}',
                    }
    raise HTTPException(status_code=401, detail='Invalid email or password')

@app.get('/api/diagrams')
def list_user_diagrams(user_id: str):
    diagrams = []
    if os.path.exists(DIAGRAMS_DIR):
        for diag_folder_name in os.listdir(DIAGRAMS_DIR):
            if not diag_folder_name.startswith('diagram_'):
                continue
            diag_folder = os.path.join(DIAGRAMS_DIR, diag_folder_name)
            meta = _read_metadata(diag_folder)
            if meta['user_id'] == user_id:
                diagrams.append({
                    'id': diag_folder_name.replace('diagram_', ''),
                    'name': meta['name'],
                    'template': meta['template'],
                })
    return {'diagrams': diagrams}

@app.post('/api/diagrams')
def create_diagram(data: DiagramCreate):
    diagram_id = str(uuid.uuid4())
    diag_folder = os.path.join(DIAGRAMS_DIR, f'diagram_{diagram_id}')
    os.makedirs(diag_folder, exist_ok=True)

    _write_metadata(diag_folder, data.user_id, data.template, 'New Diagram')
    open(os.path.join(diag_folder, 'elements.txt'), 'w').close()
    open(os.path.join(diag_folder, 'connectors.txt'), 'w').close()
    open(os.path.join(diag_folder, 'styles.txt'), 'w').close()

    return {'message': 'Diagram created successfully', 'id': diagram_id}

@app.get('/api/diagrams/{diagram_id}')
def get_diagram(diagram_id: str):
    diag_folder = os.path.join(DIAGRAMS_DIR, f'diagram_{diagram_id}')
    if not os.path.exists(diag_folder):
        raise HTTPException(status_code=404, detail='Diagram not found')

    meta = _read_metadata(diag_folder)
    elements = _load_json_file(os.path.join(diag_folder, 'elements.txt'))
    connectors = _load_json_file(os.path.join(diag_folder, 'connectors.txt'))

    return {
        'id': diagram_id,
        'metadata': meta,
        'elements': elements,
        'connectors': connectors,
    }

@app.put('/api/diagrams/{diagram_id}')
async def save_diagram(diagram_id: str, request: Request):
    diag_folder = os.path.join(DIAGRAMS_DIR, f'diagram_{diagram_id}')
    if not os.path.exists(diag_folder):
        raise HTTPException(status_code=404, detail='Diagram not found')

    data = await request.json()
    elements = data.get('elements', [])
    connectors = data.get('connectors', [])

    with open(os.path.join(diag_folder, 'elements.txt'), 'w') as f:
        json.dump(elements, f)
    with open(os.path.join(diag_folder, 'connectors.txt'), 'w') as f:
        json.dump(connectors, f)

    return {'message': 'Saved successfully'}

@app.patch('/api/diagrams/{diagram_id}')
def rename_diagram(diagram_id: str, data: DiagramRename):
    diag_folder = os.path.join(DIAGRAMS_DIR, f'diagram_{diagram_id}')
    if not os.path.exists(diag_folder):
        raise HTTPException(status_code=404, detail='Diagram not found')

    meta = _read_metadata(diag_folder)
    _write_metadata(diag_folder, meta['user_id'], meta['template'], data.name.strip() or 'Untitled')
    return {'message': 'Renamed successfully'}

@app.delete('/api/diagrams/{diagram_id}')
def delete_diagram(diagram_id: str):
    diag_folder = os.path.join(DIAGRAMS_DIR, f'diagram_{diagram_id}')
    if os.path.exists(diag_folder):
        shutil.rmtree(diag_folder)
        return {'message': 'Diagram deleted successfully'}
    raise HTTPException(status_code=404, detail='Diagram not found')
