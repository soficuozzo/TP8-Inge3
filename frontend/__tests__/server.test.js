const request = require('supertest');
const app = require('../app');
const path = require('path');
const fs = require('fs');

describe('Frontend Server Tests', () => {

  // TEST 1: Servidor responde en la ruta raíz
  describe('GET /', () => {
    it('should return HTML page (status 200)', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/html/);
    });
  });

  // TEST 2: Healthcheck
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'OK',
        service: 'frontend'
      });
    });
  });

  // TEST 3: Archivos estáticos se sirven correctamente
  describe('Static files', () => {
    it('should serve index.html', async () => {
      const response = await request(app).get('/index.html');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/html/);
    });

    it('should serve CSS if exists', async () => {
      const cssExists = fs.existsSync(path.join(__dirname, '../public/style.css'));
      if (!cssExists) return; // skip gracefully

      const response = await request(app).get('/style.css');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/css/);
    });

    it('should serve JS if exists', async () => {
      const jsExists = fs.existsSync(path.join(__dirname, '../public/script.js'));
      if (!jsExists) return;

      const response = await request(app).get('/script.js');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/javascript/);
    });
  });

  // TEST 4: HEAD request
  describe('HEAD /', () => {
    it('should return headers only', async () => {
      const response = await request(app).head('/');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/html/);
    });
  });

  // TEST 5: Métodos no permitidos
  describe('Invalid methods', () => {
    it('should return 404 for PUT on /', async () => {
      const response = await request(app).put('/');
      expect(response.status).toBe(404);
    });

    it('should return 404 for POST on static file', async () => {
      const response = await request(app).post('/index.html');
      expect(response.status).toBe(404);
    });
  });

  // TEST 6: Cache-Control headers
  describe('Cache headers', () => {
    it('should send Cache-Control header for static files', async () => {
      const response = await request(app).get('/index.html');
      expect(response.headers).toHaveProperty('cache-control');
    });
  });

  // TEST 7: Ruta inexistente devuelve 404
  describe('404 handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/non-existent-route');
      expect(response.status).toBe(404);
    });
  });

});
