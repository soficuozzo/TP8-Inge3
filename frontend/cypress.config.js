const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.FRONT_URL || 'http://localhost:3000',
    video: false,
    screenshotOnRunFailure: true,
    env: {
      FRONT_URL: process.env.FRONT_URL || 'http://localhost:3000',
      API_URL: process.env.API_URL || 'http://localhost:8080/api/tasks'
    }
  }
});
