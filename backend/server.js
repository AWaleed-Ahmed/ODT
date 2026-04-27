const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const MODEL_API = 'http://127.0.0.1:8000';

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend server is running', service: 'Node.js Express' });
});

/** Proxies to the Python FastAPI model so the frontend can check model status via one origin (and Vite proxy in dev). */
app.get('/api/health/model', async (req, res) => {
  try {
    const response = await fetch(`${MODEL_API}/api/health`);
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ status: 'Model unreachable', detail: data });
    }
    res.json(data);
  } catch (err) {
    res.status(503).json({
      status: 'Model unreachable',
      detail: err.message || 'Cannot connect to Python API on port 8000',
    });
  }
});

// Proxy Register request to Model
app.post('/api/register', async (req, res) => {
  try {
    const response = await fetch(`${MODEL_API}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error bridging to model API' });
  }
});

// Proxy Login request to Model
app.post('/api/login', async (req, res) => {
  try {
    const response = await fetch(`${MODEL_API}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error bridging to model API' });
  }
});

app.get('/api/templates', async (req, res) => {
  try {
    const response = await fetch(`${MODEL_API}/api/templates`);
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error bridging to model API' });
  }
});

app.get('/api/diagrams', async (req, res) => {
  try {
    const { user_id } = req.query;
    const response = await fetch(`${MODEL_API}/api/diagrams?user_id=${user_id}`);
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error bridging to model API' });
  }
});

app.get('/api/diagrams/:id', async (req, res) => {
  try {
    const response = await fetch(`${MODEL_API}/api/diagrams/${req.params.id}`);
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error bridging GET diagram to model API' });
  }
});

app.put('/api/diagrams/:id', async (req, res) => {
  try {
    const response = await fetch(`${MODEL_API}/api/diagrams/${req.params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error bridging to model API' });
  }
});

app.post('/api/diagrams', async (req, res) => {
  try {
    const response = await fetch(`${MODEL_API}/api/diagrams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error bridging to model API' });
  }
});

app.delete('/api/diagrams/:diagram_id', async (req, res) => {
  try {
    const { diagram_id } = req.params;
    const response = await fetch(`${MODEL_API}/api/diagrams/${diagram_id}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error bridging to model API' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});
