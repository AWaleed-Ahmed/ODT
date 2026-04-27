from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import uuid
import bcrypt

app = FastAPI()

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STORAGE_DIR = "/tmp/ODT_STORAGE"
USERS_FILE = os.path.join(STORAGE_DIR, "users.txt")

# Ensure storage directory and users file exist
os.makedirs(os.path.abspath(STORAGE_DIR), exist_ok=True)
if not os.path.exists(USERS_FILE):
    open(USERS_FILE, 'w').close()

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

DIAGRAMS_DIR = os.path.join(STORAGE_DIR, "diagrams")
os.makedirs(os.path.abspath(DIAGRAMS_DIR), exist_ok=True)

import json
TEMPLATES_FILE = os.path.join(STORAGE_DIR, "templates.json")
if not os.path.exists(TEMPLATES_FILE):
    default_templates = [
        {"id": "blank", "name": "Blank Canvas", "elements": []},
        {"id": "uml", "name": "UML Class Diagram", "elements": [{"id": "1", "type": "class", "name": "User", "x": 200, "y": 150}, {"id": "2", "type": "class", "name": "Order", "x": 500, "y": 150}]},
        {"id": "flowchart", "name": "Flowchart", "elements": [{"id": "1", "type": "start", "label": "Start Entry", "x": 400, "y": 100}, {"id": "2", "type": "decision", "label": "Process Check", "x": 400, "y": 250}, {"id": "3", "type": "end", "label": "End Pipeline", "x": 400, "y": 400}]},
        {"id": "er", "name": "ER Diagram", "elements": [{"id": "1", "type": "entity", "name": "Customer", "x": 200, "y": 200}, {"id": "2", "type": "entity", "name": "Product", "x": 500, "y": 200}]},
        {"id": "architecture", "name": "Architecture Diagram", "elements": [{"id": "1", "type": "node", "label": "Client App", "x": 150, "y": 200}, {"id": "2", "type": "node", "label": "API Gateway", "x": 400, "y": 200}, {"id": "3", "type": "database", "label": "PostgreSQL DB", "x": 650, "y": 200}]}
    ]
    with open(TEMPLATES_FILE, "w") as f:
        json.dump(default_templates, f)

@app.get("/api/templates")
def list_templates():
    try:
        with open(TEMPLATES_FILE, "r") as f:
            templates = json.load(f)
        return {"templates": templates}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/diagrams/{diagram_id}")
def get_diagram(diagram_id: str):
    diag_folder = os.path.join(DIAGRAMS_DIR, f"diagram_{diagram_id}")
    if not os.path.exists(diag_folder):
        raise HTTPException(status_code=404, detail="Diagram not found")
    
    metadata = {}
    with open(os.path.join(diag_folder, "metadata.txt"), "r") as f:
        for line in f:
            if ":" in line:
                k, v = line.strip().split(":", 1)
                metadata[k] = v
                
    elements = []
    if os.path.exists(os.path.join(diag_folder, "elements.txt")):
        with open(os.path.join(diag_folder, "elements.txt"), "r") as f:
            content = f.read()
            if content.strip():
                elements = json.loads(content)
                
    connectors = []
    if os.path.exists(os.path.join(diag_folder, "connectors.txt")):
        with open(os.path.join(diag_folder, "connectors.txt"), "r") as f:
            content = f.read()
            if content.strip():
                connectors = json.loads(content)
                
    return {"id": diagram_id, "metadata": metadata, "elements": elements, "connectors": connectors}

@app.put("/api/diagrams/{diagram_id}")
async def save_diagram(diagram_id: str, request: Request):
    diag_folder = os.path.join(DIAGRAMS_DIR, f"diagram_{diagram_id}")
    if not os.path.exists(diag_folder):
        return {"error": "Diagram not found"}
        
    data = await request.json()
    elements = data.get("elements", [])
    connectors = data.get("connectors", [])
    
    with open(os.path.join(diag_folder, "elements.txt"), "w") as f:
        json.dump(elements, f)
        
    with open(os.path.join(diag_folder, "connectors.txt"), "w") as f:
        json.dump(connectors, f)
        
    return {"message": "Saved successfully"}

@app.get("/api/health")
def health_check():
    return {"status": "Model server is running", "service": "Python FastAPI"}

@app.post("/api/register")
def register_user(data: UserRegister):
    # Check if email exists
    with open(USERS_FILE, 'r') as f:
        for line in f:
            if not line.strip(): continue
            parts = line.strip().split(',')
            if len(parts) >= 3 and parts[2] == data.email:
                raise HTTPException(status_code=400, detail="Email already registered")
                
    user_id = str(uuid.uuid4())
    salt = bcrypt.gensalt()
    # bcrypt.hashpw returns bytes, decode to store as string
    hashed = bcrypt.hashpw(data.password.encode('utf-8'), salt).decode('utf-8')
    
    with open(USERS_FILE, 'a') as f:
        f.write(f"{user_id},{data.username},{data.email},{hashed}\n")
        
    return {"message": "User registered successfully", "user_id": user_id}

@app.post("/api/login")
def login_user(data: UserLogin):
    with open(USERS_FILE, 'r') as f:
        for line in f:
            if not line.strip(): continue
            parts = line.strip().split(',')
            if len(parts) >= 4 and parts[2] == data.email:
                hashed = parts[3]
                if bcrypt.checkpw(data.password.encode('utf-8'), hashed.encode('utf-8')):
                    # Successful login
                    return {
                        "message": "Login successful", 
                        "user_id": parts[0], 
                        "username": parts[1], 
                        "token": f"simulated-token-{parts[0]}"
                    }
    raise HTTPException(status_code=401, detail="Invalid email or password")

@app.get("/api/diagrams")
def list_user_diagrams(user_id: str):
    diagrams = []
    if os.path.exists(DIAGRAMS_DIR):
        for diag_folder in os.listdir(DIAGRAMS_DIR):
            if diag_folder.startswith("diagram_"):
                metadata_path = os.path.join(DIAGRAMS_DIR, diag_folder, "metadata.txt")
                if os.path.exists(metadata_path):
                    with open(metadata_path, 'r') as f:
                        lines = f.readlines()
                        if len(lines) >= 3:
                            file_user_id = lines[0].strip()
                            template = lines[1].strip()
                            name = lines[2].strip()
                            if file_user_id == user_id:
                                diagrams.append({
                                    "id": diag_folder.replace("diagram_", ""),
                                    "name": name,
                                    "template": template
                                })
    return {"diagrams": diagrams}

@app.post("/api/diagrams")
def create_diagram(data: DiagramCreate):
    diagram_id = str(uuid.uuid4())
    diag_folder = os.path.join(DIAGRAMS_DIR, f"diagram_{diagram_id}")
    os.makedirs(diag_folder, exist_ok=True)
    
    with open(os.path.join(diag_folder, "metadata.txt"), "w") as f:
        f.write(f"{data.user_id}\n{data.template}\nNew Diagram\n")
    open(os.path.join(diag_folder, "elements.txt"), "w").close()
    open(os.path.join(diag_folder, "connectors.txt"), "w").close()
    open(os.path.join(diag_folder, "styles.txt"), "w").close()
    
    return {"message": "Diagram created successfully", "id": diagram_id}

@app.delete("/api/diagrams/{diagram_id}")
def delete_diagram(diagram_id: str):
    import shutil
    diag_folder = os.path.join(DIAGRAMS_DIR, f"diagram_{diagram_id}")
    if os.path.exists(diag_folder):
        try:
            shutil.rmtree(diag_folder, ignore_errors=True)
        except Exception:
            pass
        return {"message": "Diagram deleted successfully"}
    raise HTTPException(status_code=404, detail="Diagram not found")
