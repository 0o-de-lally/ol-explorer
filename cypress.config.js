const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8082', // Expo Web port
    setupNodeEvents(on, config) {
      // Add environment variables for twin network
      config.env = {
        ...config.env,
        twinNetworkRpc: 'http://127.0.0.1:34597/v1',
        testAccount: '9A710919B1A1E67EDA335269C0085C91',
        testTransaction: '0xcf4776b92c291291e0ee31107ab5984acba3f3ed5a76b5406d8dcf22d1834d18'
      };
      return config;
    },
  },
  viewportWidth: 1280,
  viewportHeight: 720,
});