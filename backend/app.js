const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// ---------- CORS por entorno ----------
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Helpers
const VALID_PRIORITIES = ['low', 'medium', 'high'];
const VALID_STATUS = ['pending', 'completed', 'cancelled'];

function normalizePriority(priority) {
  if (!priority) return 'medium';
  const p = String(priority).toLowerCase();
  return VALID_PRIORITIES.includes(p) ? p : 'medium';
}

function normalizeStatus(status) {
  if (!status) return 'pending';
  const s = String(status).toLowerCase();
  return VALID_STATUS.includes(s) ? s : 'pending';
}

function parseDueDate(dueDate) {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  return isNaN(d.getTime()) ? null : d;
}

// ---------- Task Schema ----------
const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },

  // Nuevos campos
  priority: {
    type: String,
    enum: VALID_PRIORITIES,
    default: 'medium'
  },
  status: {
    type: String,
    enum: VALID_STATUS,
    default: 'pending'
  },
  dueDate: {
    type: Date,
    default: null
  },

  createdAt: { type: Date, default: Date.now }
});

const Task = mongoose.model('Task', taskSchema);

// ---------- Rutas API ----------

// LISTAR TAREAS + SEARCH + (opcional) FILTROS
app.get('/api/tasks', async (req, res) => {
  try {
    const { search, status, priority } = req.query;
    const filter = {};

    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: regex },
        { description: regex }
      ];
    }

    if (status && VALID_STATUS.includes(status)) {
      filter.status = status;
    }

    if (priority && VALID_PRIORITIES.includes(priority)) {
      filter.priority = priority;
    }

    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// STATS: contador de tareas
app.get('/api/tasks/stats', async (req, res) => {
  try {
    const [total, completed, pending, cancelled] = await Promise.all([
      Task.countDocuments({}),
      Task.countDocuments({ status: 'completed' }),
      Task.countDocuments({ status: 'pending' }),
      Task.countDocuments({ status: 'cancelled' }),
    ]);

    res.json({
      total,
      completed,
      pending,
      cancelled
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// OBTENER POR ID
app.get('/api/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREAR
app.post('/api/tasks', async (req, res) => {
  try {
    const { title, description, priority, status, dueDate } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'El título es requerido' });
    }

    const task = new Task({
      title: title.trim(),
      description: (description || '').trim(),
      priority: normalizePriority(priority),
      status: normalizeStatus(status),
      dueDate: parseDueDate(dueDate)
    });

    const savedTask = await task.save();
    res.status(201).json(savedTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ACTUALIZAR GENERAL
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { title, description, priority, status, dueDate } = req.body;
    const updates = {};

    if (title !== undefined) {
      if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'El título es requerido' });
      }
      updates.title = title.trim();
    }

    if (description !== undefined) {
      updates.description = (description || '').trim();
    }

    if (priority !== undefined) {
      updates.priority = normalizePriority(priority);
    }

    if (status !== undefined) {
      updates.status = normalizeStatus(status);
    }

    if (dueDate !== undefined) {
      updates.dueDate = parseDueDate(dueDate);
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!task) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CAMBIAR SOLO EL ESTADO (pending/completed/cancelled)
app.put('/api/tasks/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const normalized = normalizeStatus(status);

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { status: normalized },
      { new: true, runValidators: true }
    );

    if (!task) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ELIMINAR
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- Health check ----------
app.get('/healthz', (req, res) => {
  res.json({
    status: 'OK',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    dbName: process.env.DB_NAME || 'crudbasico'
  });
});

// 404
app.use((req, res) => res.status(404).json({ error: 'Endpoint no encontrado' }));

module.exports = { app, Task };
