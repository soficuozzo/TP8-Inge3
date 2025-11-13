const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app, Task } = require('../app');

let mongoServer;

// ARRANGE: Configurar MongoDB en memoria antes de todos los tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Limpiar la BD entre tests
beforeEach(async () => {
  await Task.deleteMany({});
});

// Cerrar conexiones después de todos los tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('API Tasks - CRUD Operations', () => {
  
  // TEST 1: GET /api/tasks - Lista vacía
  describe('GET /api/tasks', () => {
    it('should return empty array when no tasks exist', async () => {
      // ACT
      const response = await request(app).get('/api/tasks');
      
      // ASSERT
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return all tasks', async () => {
      // ARRANGE
      await Task.create([
        { title: 'Task 1', description: 'Description 1' },
        { title: 'Task 2', description: 'Description 2' }
      ]);

      // ACT
      const response = await request(app).get('/api/tasks');

      // ASSERT
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].title).toBe('Task 2'); // Orden descendente por createdAt
    });
  });

  // TEST 2: POST /api/tasks - Crear tarea
  describe('POST /api/tasks', () => {
    it('should create a new task successfully', async () => {
      // ARRANGE
      const newTask = {
        title: 'Nueva tarea',
        description: 'Descripción de prueba',
        completed: false
      };

      // ACT
      const response = await request(app)
        .post('/api/tasks')
        .send(newTask);

      // ASSERT
      expect(response.status).toBe(201);
      expect(response.body.title).toBe(newTask.title);
      expect(response.body.description).toBe(newTask.description);
      expect(response.body.completed).toBe(false);
      expect(response.body._id).toBeDefined();
    });

    it('should fail when title is missing', async () => {
      // ARRANGE
      const invalidTask = {
        description: 'Sin título'
      };

      // ACT
      const response = await request(app)
        .post('/api/tasks')
        .send(invalidTask);

      // ASSERT
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('El título es requerido');
    });

    it('should fail when title is empty string', async () => {
      // ARRANGE
      const invalidTask = {
        title: '   ',
        description: 'Título vacío'
      };

      // ACT
      const response = await request(app)
        .post('/api/tasks')
        .send(invalidTask);

      // ASSERT
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('El título es requerido');
    });
  });

  // TEST 3: GET /api/tasks/:id - Obtener tarea por ID
  describe('GET /api/tasks/:id', () => {
    it('should return task by id', async () => {
      // ARRANGE
      const task = await Task.create({
        title: 'Test Task',
        description: 'Test Description'
      });

      // ACT
      const response = await request(app).get(`/api/tasks/${task._id}`);

      // ASSERT
      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Test Task');
      expect(response.body._id).toBe(task._id.toString());
    });

    it('should return 404 for non-existent task', async () => {
      // ARRANGE
      const fakeId = new mongoose.Types.ObjectId();

      // ACT
      const response = await request(app).get(`/api/tasks/${fakeId}`);

      // ASSERT
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Tarea no encontrada');
    });
  });

  // TEST 4: PUT /api/tasks/:id - Actualizar tarea
  describe('PUT /api/tasks/:id', () => {
    it('should update task successfully', async () => {
      // ARRANGE
      const task = await Task.create({
        title: 'Original Title',
        description: 'Original Description',
        completed: false
      });

      const updates = {
        title: 'Updated Title',
        description: 'Updated Description',
        completed: true
      };

      // ACT
      const response = await request(app)
        .put(`/api/tasks/${task._id}`)
        .send(updates);

      // ASSERT
      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated Title');
      expect(response.body.completed).toBe(true);
    });

    it('should return 404 when updating non-existent task', async () => {
      // ARRANGE
      const fakeId = new mongoose.Types.ObjectId();

      // ACT
      const response = await request(app)
        .put(`/api/tasks/${fakeId}`)
        .send({ title: 'Updated' });

      // ASSERT
      expect(response.status).toBe(404);
    });
  });

  // TEST 5: DELETE /api/tasks/:id - Eliminar tarea
  describe('DELETE /api/tasks/:id', () => {
    it('should delete task successfully', async () => {
      // ARRANGE
      const task = await Task.create({
        title: 'Task to delete',
        description: 'Will be deleted'
      });

      // ACT
      const response = await request(app).delete(`/api/tasks/${task._id}`);

      // ASSERT
      expect(response.status).toBe(204);
      
      // Verificar que realmente se eliminó
      const deletedTask = await Task.findById(task._id);
      expect(deletedTask).toBeNull();
    });

    it('should return 404 when deleting non-existent task', async () => {
      // ARRANGE
      const fakeId = new mongoose.Types.ObjectId();

      // ACT
      const response = await request(app).delete(`/api/tasks/${fakeId}`);

      // ASSERT
      expect(response.status).toBe(404);
    });
  });

  // TEST 6: Healthcheck
  describe('GET /healthz', () => {
    it('should return health status', async () => {
      // ACT
      const response = await request(app).get('/healthz');

      // ASSERT
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
      expect(response.body.db).toBe('connected');
    });
  });
});