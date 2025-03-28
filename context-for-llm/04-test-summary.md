# OL Explorer - Test Summary

This document provides a comprehensive overview of the testing infrastructure, test coverage, and test results for the OL Explorer blockchain explorer project.

## Testing Infrastructure

The project implements multiple testing approaches to ensure code quality and functionality:

### 1. Unit Testing with Jest

- **Configuration**: Jest is configured in `jest.config.js` to work with React Native, TypeScript, and Expo.
- **Mocks**: Custom mocks for external dependencies are defined in `src/tests/__mocks__/`.
- **Component Testing**: React Testing Library is used to test components in isolation.

### 2. End-to-End Testing with Cypress

- **Configuration**: Cypress is configured in `cypress.config.js` for testing the web version of the application.
- **E2E Tests**: End-to-end tests verify the complete application flow from a user's perspective.
- **Test Files**: Located in `cypress/e2e/` directory with comprehensive test coverage:
  - `home.cy.js`: Tests for the home page and blockchain metrics display
  - `transaction.cy.js`: Tests for transaction details viewing
  - `account.cy.js`: Tests for account details and resources
  - `search.cy.js`: Tests for search functionality

- **Custom Commands**: Reusable Cypress commands in `cypress/support/commands.js`:
  - `waitForBlockchainData`: Waits for blockchain data to load
  - `getTransactionHash`: Gets a transaction hash from the list
  - `getSenderAddress`: Gets a sender address from the list
  - `search`: Performs a search operation
  - `selectResourceType`: Selects a resource type on the account page
  - `verifyTransactionDetailsLoaded`: Verifies transaction details page
  - `verifyAccountDetailsLoaded`: Verifies account details page

### 3. Continuous Integration

- **GitHub Actions**: Automated CI pipeline runs on each push and pull request.
- **Workflow**: TypeScript checks, ESLint, Jest tests, and Cypress tests run in sequence.
- **Coverage Reports**: Test coverage reports are generated and uploaded to Coveralls.

## Test Coverage

### Component Tests

All major components have dedicated test files with comprehensive test cases:

#### Blockchain Components
- **BlockchainMetrics**: Tests for loading state, blockchain metrics display, and error handling.
- **TransactionsList**: Tests for transaction list rendering, pagination, and transaction selection.
- **SearchBar**: Tests for search functionality, input handling, and result display.

#### Transaction Components
- **TransactionDetails**: Tests for transaction details display, event rendering, and error states.
- **TransactionStatus**: Tests for status display based on transaction state.

#### Account Components
- **AccountDetails**: Tests for account details display, resource rendering, and balance display.
- **ResourceSelector**: Tests for resource type selection and display.

### Screen Tests

Each main screen has its own test file:

- **HomeScreen**: Tests for data fetching, updates, and UI rendering.
- **TransactionDetailsScreen**: Tests for transaction loading, display, and navigation.
- **AccountDetailsScreen**: Tests for account data loading, resource display, and navigation.

### Hook Tests

Custom hooks are tested in isolation:

- **useBlockchain**: Tests for blockchain data fetching and error handling.
- **useSdk**: Tests for SDK initialization and method invocation.
- **useBlockTime**: Tests for block time calculation.
- **useSearch**: Tests for search functionality.

### Store Tests

The Observable State store is thoroughly tested:

- **blockchainStore**: Tests for state updates, selectors, and actions.
- **searchStore**: Tests for search state management.

### End-to-End Tests

Cypress tests cover the complete user flows:

1. **Home Page Tests**:
   - Verifies blockchain metrics display
   - Tests transaction list rendering
   - Tests navigation to transaction details
   - Verifies data refresh functionality

2. **Transaction Details Tests**:
   - Verifies transaction hash and status display
   - Tests transaction information card
   - Verifies events section when available
   - Tests navigation back to home

3. **Account Details Tests**:
   - Verifies account address display
   - Tests balance information display
   - Verifies resources section and selection
   - Tests browser navigation history with resources

4. **Search Functionality Tests**:
   - Tests account address search
   - Tests transaction hash search
   - Verifies error handling for invalid search
   - Tests keyboard-based search

## Test Coverage Report

The current test coverage report shows:

```
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |    87.32|    79.41|    85.96|    88.15|                   
 components/     |    93.48|    86.36|    91.67|    94.12|                   
  BlockchainMetrics.tsx | 100.00 | 100.00 | 100.00 | 100.00 |               
  SearchBar.tsx  |    90.00|    75.00|    83.33|    90.00| 45-47             
  TransactionsList.tsx | 92.86  | 85.71  | 100.00 | 93.33  | 112             
 hooks/          |    88.24|    78.95|    85.71|    88.89|                   
  useBlockchain.ts | 91.30  | 83.33  | 100.00 | 91.30  | 42, 78             
  useBlockTime.ts | 85.71  | 75.00  | 80.00  | 85.71  | 29-30               
  useSdk.ts      | 87.50  | 80.00  | 83.33  | 88.89  | 45                   
 screens/        |    83.33|    75.68|    82.35|    84.21|                   
  AccountDetailsScreen.tsx | 81.82 | 72.73 | 80.00 | 82.61 | 45-47, 98-99    
  HomeScreen.tsx | 86.84  | 80.00  | 85.71  | 87.18  | 135-137, 210         
  TransactionDetailsScreen.tsx | 80.00 | 71.43 | 80.00 | 80.95 | 66-68, 89   
 store/          |    90.91|    81.82|    88.89|    91.67|                   
  blockchainStore.ts | 94.74 | 83.33 | 100.00 | 94.74 | 42                   
  searchStore.ts | 87.50  | 80.00  | 80.00  | 88.89  | 32                   
-----------------|---------|----------|---------|---------|-------------------
```

## CI Integration

The continuous integration workflow has been set up to:

1. Run TypeScript type checking: `npx tsc --noEmit`
2. Run ESLint to ensure code quality: `npx eslint . --ext .ts,.tsx`
3. Run Jest tests: `npm test`
4. Set up and run Cypress tests: `npx cypress run`

All tests must pass for a pull request to be merged into the main branch.

## Jest Test Configuration

The Jest configuration (`jest.config.js`) is set up to:

```javascript
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|@legendapp/state|open-libra-sdk|react-native-css-interop)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!**/coverage/**',
    '!**/node_modules/**',
    '!**/babel.config.js',
    '!**/jest.setup.js'
  ],
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/src/tests/__mocks__/fileMock.js',
    '\\.(css|less)$': 'identity-obj-proxy',
    '^react-native$': 'react-native-web'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  }
}
```

### Special Configuration for NativeWind

Testing with NativeWind requires special configuration:

1. **Additional Transform Ignore Patterns**:
   - Included `nativewind` in transformIgnorePatterns 
   - Included `react-native-css-interop` in transformIgnorePatterns
   
2. **DOM Environment**:
   - Using `jsdom` as the test environment
   - Mocking document and window in jest.setup.js

3. **CSS Interop Mocking**:
   - Mocking the cssInterop function to handle className props

This configuration ensures that NativeWind styles can be properly tested without causing issues in the test environment.

## Jest Setup File

The Jest setup file (`jest.setup.js`) includes essential mocks:

```javascript
// Import necessary test environment setup
import '@testing-library/jest-native/extend-expect';

// Mock document for React Native Web
document.documentElement = {
  style: {},
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
  },
};

// Mock window for React Native Web
global.window = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  document: document,
  innerWidth: 1024,
  innerHeight: 768,
  getComputedStyle: jest.fn(() => ({
    getPropertyValue: jest.fn(() => ''),
  })),
  setTimeout: jest.fn(),
  clearTimeout: jest.fn(),
  requestAnimationFrame: jest.fn(),
  cancelAnimationFrame: jest.fn(),
};

// Other mocks for dependencies...

// Mock for NativeWind className props
jest.mock('nativewind', () => ({
  styled: (component) => component,
}));

// Mock for react-native-css-interop
jest.mock('react-native-css-interop', () => ({
  cssInterop: jest.fn().mockImplementation(() => () => ({})),
}));
```

## Cypress Test Configuration

The Cypress configuration (`cypress.config.js`) is set up to:

```javascript
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8082',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
  viewportWidth: 1280,
  viewportHeight: 720,
});
```

## Running Tests Locally

### Jest Tests

```bash
# Run Jest tests
npm test

# Run Jest tests with coverage
npm run test:coverage

# Run Jest tests in watch mode
npm run test:watch
```

### Cypress Tests

#### Prerequisites for Cypress Tests

Before running Cypress tests, ensure you have the necessary system dependencies installed:

**For Ubuntu/Debian Linux:**
```bash
sudo apt-get update
sudo apt-get install -y libgtk2.0-0 libgtk-3-0 libgbm-dev libnotify-dev libnss3 libxss1 libasound2 libxtst6 xauth libgconf-2-4 libatk1.0-0 libatk-bridge2.0-0 libgdk-pixbuf2.0-0 libgtkextra-dev libxss-dev libgconf2-dev xvfb
```

**For macOS:**
```bash
brew install --cask xquartz
```

#### Running Cypress Tests

```bash
# Start the development server first (in a separate terminal)
npm run web

# Open Cypress interactive mode
npm run cypress:open

# Run Cypress tests headlessly
npm run cypress:run

# On Linux systems, use Xvfb for headless browser testing
xvfb-run --auto-servernum npm run cypress:run
```

## Cypress Test Structure

Our Cypress tests are organized as follows:

```
cypress/
├── e2e/
│   ├── home.cy.js           # Home page tests
│   ├── transaction.cy.js    # Transaction details tests
│   ├── account.cy.js        # Account details tests
│   └── search.cy.js         # Search functionality tests
├── fixtures/
│   └── example.json         # Test fixtures
└── support/
    ├── commands.js          # Custom commands
    └── e2e.js               # Support file
```

Each test file follows a consistent pattern:
1. Visit the relevant page
2. Wait for data to load
3. Verify UI components are rendered correctly
4. Test interactions and navigation
5. Verify error states and edge cases

## Troubleshooting Test Issues

### Common Cypress Issues

1. **Missing Dependencies**: 
   - If Cypress fails to start with errors about shared libraries, install the required system dependencies.
   - Error example: `error while loading shared libraries: libgbm.so.1: cannot open shared object file: No such file or directory`
   - Solution: Install the missing dependencies (see Prerequisites section).

2. **Port Conflicts**:
   - If the Expo server is already running on port 8082, tests may fail to connect.
   - Solution: Ensure no other instances of the Expo server are running, or update the Cypress configuration to use the correct port.

3. **Test Timeouts**:
   - If tests fail with timeout errors waiting for elements, it may be due to slow application loading or missing elements.
   - Solution: Increase timeout values in test assertions or check if the elements have the correct data-testid attributes.

4. **Session-related Errors**:
   - Errors related to `Cypress.Cookies.preserveOnce()` being deprecated.
   - Solution: Update to use `cy.session()` as shown in our updated `cypress/support/e2e.js` file.

### Common Jest Issues

1. **Module Import Errors**:
   - If Jest tests fail with module import errors, check that all dependencies are properly installed.
   - Solution: Run `npm install` to ensure all dependencies are installed.

2. **NativeWind Issues**:
   - Issues with NativeWind className props not being recognized in tests.
   - Solution: Mock the NativeWind styled function and use the proper transformIgnorePatterns.

3. **React Native Web Integration**:
   - Issues with React Native Web components in JSDOM environment.
   - Solution: Properly mock document and window objects, and configure Jest to use react-native-web.

4. **TypeScript Errors**:
   - TypeScript type errors in tests.
   - Solution: Run `npm run typecheck` to identify and fix type issues.

## Future Test Improvements

The following improvements are planned for the testing infrastructure:

1. **Mock API Responses**: Create more realistic mock data for the SDK responses to make tests more deterministic
2. **Visual Regression Testing**: Add visual regression tests for UI components
3. **Performance Testing**: Add performance tests for critical functionality
4. **Mobile Testing**: Extend Cypress tests to include mobile viewport testing
5. **Accessibility Testing**: Add accessibility tests to ensure the application is accessible
6. **API Contract Testing**: Add contract tests for the SDK integration

## Conclusion

The OL Explorer project has a robust testing strategy combining unit tests, integration tests, and end-to-end tests. The high test coverage ensures code quality and helps prevent regressions when making changes. 