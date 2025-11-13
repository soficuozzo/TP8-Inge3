const request = require('supertest');
const app = require('../app');

describe('Frontend Server Tests', () => {
  
  // TEST 1: Servidor responde en la ruta raíz
  describe('GET /', () => {
    it('should return HTML page (status 200)', async () => {
      // ACT
      const response = await request(app).get('/');

      // ASSERT
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/html/);
    });
  });

  // TEST 2: Healthcheck
  describe('GET /health', () => {
    it('should return health status', async () => {
      // ACT
      const response = await request(app).get('/health');

      // ASSERT
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
      // ACT
      const response = await request(app).get('/index.html');

      // ASSERT
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/html/);
    });
  });

  // TEST 4: Ruta inexistente devuelve 404
  describe('404 handling', () => {
    it('should return 404 for non-existent routes', async () => {
      // ACT
      const response = await request(app).get('/non-existent-route');

      // ASSERT
      expect(response.status).toBe(404);
    });
  });
});