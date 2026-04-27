# Online Design Tool (ODT)

This is a scaffolded project for the ODT application, consisting of three main parts:
1. **Frontend**: React (Vite)
2. **Backend**: Node.js (Express)
3. **Model**: Python (FastAPI)

## Folder Structure
- `frontend/`: React app for diagram editor, template selection, and UI
- `backend/`: Node.js server to handle API requests from the frontend
- `model/`: Python backend for diagram model logic and file-based storage
- `ODT_STORAGE/`: Folder to store user and diagram files

## Installation & Running

Run **three terminals**: the Python model (`8000`), the Node gateway (`3001`), then the Vite dev server (`5173`). The frontend talks to `/api/*`, which Vite **proxies** to the Node server in development.

### 1. Model (Python + FastAPI) — start first
```bash
cd model
python -m venv venv
# On Windows, activate the environment with:
.\venv\Scripts\activate
# On Mac/Linux, activate with: source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn model:app --reload --port 8000
```

### 2. Backend (Node.js + Express)
```bash
cd backend
npm install
npm start
```
Listens on **port 3001** and forwards API calls to the model at `http://127.0.0.1:8000`.

### 3. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
After changing `vite.config.js`, restart `npm run dev`.

### Troubleshooting
- **Backend unreachable** / **Network error bridging to server**: Node is not running on `3001`, or the Vite dev server was started before `vite.config.js` had the proxy — restart `npm run dev` in `frontend/`.
- **Model unreachable**: Python/FastAPI is not running on port **8000**, or the backend cannot reach it.
