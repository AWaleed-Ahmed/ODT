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
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Seed default templates ────────────────────────────────────────────────────

if not os.path.exists(TEMPLATES_FILE):
    default_templates = [
        {"id": "blank", "name": "Blank Canvas", "elements": []},
        {
            "id": "uml",
            "name": "UML Class Diagram",
            "elements": [
                {"id": "1", "type": "class", "name": "User",  "x": 200, "y": 150},
                {"id": "2", "type": "class", "name": "Order", "x": 500, "y": 150},
            ],
        },
        {
            "id": "flowchart",
            "name": "Flowchart",
            "elements": [
                {"id": "1", "type": "start",    "label": "Start Entry",    "x": 400, "y": 100},
                {"id": "2", "type": "decision", "label": "Process Check",  "x": 400, "y": 250},
                {"id": "3", "type": "end",      "label": "End Pipeline",   "x": 400, "y": 400},
            ],
        },
        {
            "id": "er",
            "name": "ER Diagram",
            "elements": [
                {"id": "1", "type": "entity", "name": "Customer", "x": 200, "y": 200},
                {"id": "2", "type": "entity", "name": "Product",  "x": 500, "y": 200},
            ],
        },
        {
            "id": "architecture",
            "name": "Architecture Diagram",
            "elements": [
                {"id": "1", "type": "node",     "label": "Client App",    "x": 150, "y": 200},
                {"id": "2", "type": "node",     "label": "API Gateway",   "x": 400, "y": 200},
                {"id": "3", "type": "database", "label": "PostgreSQL DB", "x": 650, "y": 200},
            ],
        },
    ]
    with open(TEMPLATES_FILE, 'w') as f:
        json.dump(default_templates, f, indent=2)

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
        with open(TEMPLATES_FILE, 'r') as f:
            templates = json.load(f)
        return {'templates': templates}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
