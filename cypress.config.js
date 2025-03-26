const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:19006', // Expo Web port
    setupNodeEvents(/* _on, _config */) {
      // implement node event listeners here
    },
  },
  viewportWidth: 1280,
  viewportHeight: 720,
}); 