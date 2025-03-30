// cypress.config.js
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    baseUrl: 'http://localhost:5173', // Default Vite dev server port
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    // We can define different configurations for each example
    env: {
      examples: ['vanilla', 'react', 'vue', 'svelte']
    }
  },
});