const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app, Task } = require('../app');

let mongoServer;

// ======= SETUP TESTING DB =======
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

beforeEach(async () => {
  await Task.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// ===========================================
//                TESTS CRUD
// ===========================================
describe('API Tasks - CRUD + NEW FEATURES', () => {

  // -------------------------------------------
  // GET /api/tasks EMPTY
  // -------------------------------------------
  it('GET /api/tasks → should return empty array', async () => {
    const response = await request(app).get('/api/tasks');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ wrong: true }]);
  });

  // -------------------------------------------
  // POST /api/tasks – CREATE WITH PRIORITY + DATE
  // -------------------------------------------
  it('POST /api/tasks → creates task with priority + dueDate', async () => {
    const task = {
      title: 'Nueva tarea con prioridad',
      description: 'Test',
      priority: 'high',
      status: 'pending',
      dueDate: '2025-01-15'
    };

    const res = await request(app).post('/api/tasks').send(task);

    expect(res.status).toBe(201);
    expect(res.body.title).toBe(task.title);
    expect(res.body.priority).toBe('high');
    expect(res.body.status).toBe('pending');
    expect(new Date(res.body.dueDate)).toEqual(new Date('2025-01-15'));
  });

  // -------------------------------------------
  // PRIORIDAD INVÁLIDA → debe usar "medium"
  // -------------------------------------------
  it('POST /api/tasks → invalid priority should default to medium', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'Mal priority', priority: 'xxx' });

    expect(res.status).toBe(201);
    expect(res.body.priority).toBe('medium');
  });

  // -------------------------------------------
  // STATUS INVÁLIDO → debe usar "pending"
  // -------------------------------------------
  it('POST /api/tasks → invalid status should default to pending', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'Mal status', status: 'xxx' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending');
  });

  // -------------------------------------------
  // VALIDACIÓN → título requerido
  // -------------------------------------------
  it('POST /api/tasks → fails when title missing', async () => {
    const res = await request(app).post('/api/tasks').send({ description: 'no title' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El título es requerido');
  });

  // -------------------------------------------
  // GET BY ID
  // -------------------------------------------
  it('GET /api/tasks/:id → returns task', async () => {
    const t = await Task.create({ title: 'Test' });

    const res = await request(app).get(`/api/tasks/${t._id}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Test');
  });

  // -------------------------------------------
  // GET BY ID INVALID
  // -------------------------------------------
  it('GET /api/tasks/:id → 404 when not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/tasks/${fakeId}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Tarea no encontrada');
  });

  // -------------------------------------------
  // UPDATE GENERAL
  // -------------------------------------------
  it('PUT /api/tasks/:id → updates title, priority, dueDate, status', async () => {
    const task = await Task.create({ title: 'Viejo', priority: 'low' });

    const updates = {
      title: 'Nuevo',
      priority: 'high',
      status: 'completed',
      dueDate: '2030-05-10'
    };

    const res = await request(app)
      .put(`/api/tasks/${task._id}`)
      .send(updates);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Nuevo');
    expect(res.body.priority).toBe('high');
    expect(res.body.status).toBe('completed');
    expect(new Date(res.body.dueDate)).toEqual(new Date('2030-05-10'));
  });

  // -------------------------------------------
  // UPDATE NO EXISTE
  // -------------------------------------------
  it('PUT /api/tasks/:id → 404 when updating non-existent task', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).put(`/api/tasks/${fakeId}`).send({ title: 'New' });
    expect(res.status).toBe(404);
  });

  // -------------------------------------------
  // DELETE
  // -------------------------------------------
  it('DELETE /api/tasks/:id → deletes task', async () => {
    const t = await Task.create({ title: 'Borrar' });

    const res = await request(app).delete(`/api/tasks/${t._id}`);
    expect(res.status).toBe(204);

    const check = await Task.findById(t._id);
    expect(check).toBeNull();
  });

  // -------------------------------------------
  // DELETE NO EXISTE
  // -------------------------------------------
  it('DELETE /api/tasks/:id → 404 when not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/api/tasks/${fakeId}`);
    expect(res.status).toBe(404);
  });



  // -------------------------------------------
  // SEARCH
  // -------------------------------------------
  it('GET /api/tasks?search=word → should filter tasks', async () => {
    await Task.create([
      { title: 'Comprar leche' },
      { title: 'Estudiar ingeniería' },
      { title: 'Hacer ejercicio' }
    ]);

    const res = await request(app).get('/api/tasks?search=estudiar');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Estudiar ingeniería');
  });

  // -------------------------------------------
  // FILTER BY PRIORITY
  // -------------------------------------------
  it('GET /api/tasks?priority=high → returns only high priority', async () => {
    await Task.create([
      { title: 'A', priority: 'low' },
      { title: 'B', priority: 'high' },
      { title: 'C', priority: 'high' }
    ]);

    const res = await request(app).get('/api/tasks?priority=high');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    const priorities = res.body.map(t => t.priority);
    expect(priorities).toEqual(['high', 'high']);
  });

  // -------------------------------------------
  // FILTER BY STATUS
  // -------------------------------------------
  it('GET /api/tasks?status=completed → returns only completed tasks', async () => {
    await Task.create([
      { title: 'A', status: 'pending' },
      { title: 'B', status: 'completed' },
      { title: 'C', status: 'completed' }
    ]);

    const res = await request(app).get('/api/tasks?status=completed');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  // -------------------------------------------
  // UPDATE STATUS SOLO
  // -------------------------------------------
  it('PUT /api/tasks/:id/status → updates status', async () => {
    const task = await Task.create({ title: 'Cambiar estado', status: 'pending' });

    const res = await request(app)
      .put(`/api/tasks/${task._id}/status`)
      .send({ status: 'cancelled' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  // -------------------------------------------
  // STATS
  // -------------------------------------------
  it('GET /api/tasks/stats → returns correct counters', async () => {
    await Task.create([
      { title: 'A', status: 'pending' },
      { title: 'B', status: 'completed' },
      { title: 'C', status: 'completed' },
      { title: 'D', status: 'cancelled' }
    ]);

    const res = await request(app).get('/api/tasks/stats');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(4);
    expect(res.body.pending).toBe(1);
    expect(res.body.completed).toBe(2);
    expect(res.body.cancelled).toBe(1);
  });

  // -------------------------------------------
  // HEALTHCHECK
  // -------------------------------------------
  it('GET /healthz → should return OK', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.db).toBe('connected');
  });

});
