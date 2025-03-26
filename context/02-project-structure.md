# OL Explorer - Project Structure Documentation

This document provides a comprehensive overview of the OL Explorer blockchain explorer project structure, initialization process, and technology selections. It serves as a reference for understanding the project architecture and can be used to recreate the project from scratch if needed.

## Initial Project Requirements

The project was initiated with the following requirements as outlined in the original prompt:

> Create a blockchain explorer from scratch that dynamically displays the block height, epoch, chain ID, and a table of the most recent transactions on the home screen. A click to any of the transactions should render the transaction details page. A search on any page should try first for an account response for a valid account, or failover to a transaction search, with a failover to transaction not found upon no results from the RPC. An account lookup should render the resources for the account, with balance information up top.
>
> This project will only make use of an SDK using the RPC address for all chain data. The RPC should not be accessed directly, only through the functions available in the SDK. The SDK functions should always be used by the client side, and should not be used by the server side.
>
> Fetched data should be managed in the store, and should be observable by all components that need it. The store should have all data types defined with their types. The home page should keep store data updated on the fly, transaction by transaction, and not require all results to be fetched at once for display.

## Technology Stack Selection

Based on the requirements, the following technology stack was selected:

### Core Technologies

- **React Native with Expo**: For cross-platform development that works on web, iOS, and Android
- **TypeScript**: For type safety and better developer experience
- **@legendapp/state**: For observable state management
- **React Navigation**: For navigation between screens

### Key Development Tools

- **ESLint**: For code linting and ensuring code quality
- **Jest**: For unit and integration testing
- **Cypress**: For end-to-end testing
- **GitHub Actions**: For continuous integration

## Project Initialization

The project was initialized using Expo CLI with TypeScript template. The following commands were executed:

```bash
# Install Expo CLI globally
npm install -g expo-cli

# Create a new project with TypeScript template
npx create-expo-app ol-explorer --template expo-template-typescript

# Navigate to the project directory
cd ol-explorer
```

## Project Structure

The project follows a well-organized directory structure:

```
ol-explorer/
├── .github/
│   └── workflows/          # GitHub Actions workflows for CI/CD
├── assets/                 # Static assets like images and fonts
├── context/                # Project context and documentation
├── cypress/                # End-to-end tests with Cypress
│   └── e2e/                # Cypress test files
├── node_modules/           # Dependencies (git-ignored)
├── public/                 # Public files for web build
│   ├── manifest.json       # Web app manifest for PWA support
│   └── service-worker.js   # Service worker for offline capabilities
├── src/                    # Source code
│   ├── components/         # Reusable UI components
│   ├── constants/          # Application constants
│   ├── hooks/              # Custom React hooks
│   ├── navigation/         # Navigation configuration
│   ├── screens/            # Screen components
│   ├── services/           # API and other services
│   ├── store/              # State management with legendapp
│   ├── tests/              # Test files
│   │   └── __mocks__/      # Mock files for testing
│   ├── theme/              # Theming configurations
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── .eslintrc.js            # ESLint configuration
├── .gitignore              # Git ignore file
├── App.tsx                 # Main application component
├── app.json                # Expo configuration
├── babel.config.js         # Babel configuration
├── cypress.config.js       # Cypress configuration
├── index.ts                # Entry point for the application
├── jest.config.js          # Jest configuration
├── jest.setup.js           # Jest setup file
├── package.json            # Project metadata and dependencies
├── package-lock.json       # NPM package lock file
├── tsconfig.json           # TypeScript configuration
└── README.md               # Project documentation
```

## Key Configuration Files

### package.json

The `package.json` file defines the project metadata, dependencies, and scripts:

```json
{
  "name": "ol-explorer",
  "version": "1.0.0",
  "main": "index.ts",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "cypress:open": "cypress open",
    "cypress:run": "cypress run",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "tsc --noEmit",
    "build": "expo export:web"
  },
  "dependencies": {
    "@legendapp/state": "^2.1.15",
    "@react-native-async-storage/async-storage": "^1.22.2",
    "@react-navigation/native": "^7.0.19",
    "@react-navigation/native-stack": "^7.3.3",
    "expo": "~52.0.40",
    "expo-asset": "^11.0.5",
    "expo-constants": "^17.0.8",
    "expo-font": "^13.0.4",
    "expo-status-bar": "~2.0.1",
    "expo-updates": "^0.27.4",
    "expo-web-browser": "^14.0.2",
    "react": "18.3.1",
    "react-native": "0.76.7",
    "react-native-safe-area-context": "^5.3.0",
    "react-native-screens": "^4.9.2",
    "react-native-web": "^0.19.13",
    "react-navigation": "^5.0.0",
    "wait-on": "^7.2.0"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2",
    "@testing-library/jest-native": "^5.4.3",
    "@testing-library/react-native": "^12.4.3",
    "@types/jest": "^29.5.12",
    "@types/react": "~18.3.12",
    "@typescript-eslint/eslint-plugin": "^8.28.0",
    "@typescript-eslint/parser": "^8.28.0",
    "cypress": "^13.6.6",
    "eslint": "^9.23.0",
    "eslint-plugin-react": "^7.37.4",
    "eslint-plugin-react-hooks": "^5.2.0",
    "identity-obj-proxy": "^3.0.0",
    "jest": "^29.7.0",
    "jest-expo": "^49.0.0",
    "react-test-renderer": "18.3.1",
    "ts-jest": "^29.1.2",
    "typescript": "^5.3.3"
  },
  "private": true
}
```

### app.json

The `app.json` file contains Expo-specific configuration:

```json
{
  "expo": {
    "name": "ol-explorer",
    "slug": "ol-explorer",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      }
    },
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
```

### tsconfig.json

The TypeScript configuration:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true
  }
}
```

### jest.config.js

Jest configuration for testing:

```javascript
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: true,
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/coverage/**',
    '!**/node_modules/**',
    '!**/babel.config.js',
    '!**/jest.setup.js'
  ],
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/src/tests/__mocks__/fileMock.js',
    '\\.(css|less)$': 'identity-obj-proxy'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
}
```

### .eslintrc.js

ESLint configuration for code linting:

```javascript
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    browser: true,
    es2020: true,
    node: true,
    jest: true,
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
```

## Progressive Web App (PWA) Support

The project includes PWA support with the following files:

### public/manifest.json

```json
{
  "short_name": "OL Explorer",
  "name": "OL Blockchain Explorer",
  "icons": [
    {
      "src": "favicon.ico",
      "sizes": "64x64 32x32 24x24 16x16",
      "type": "image/x-icon"
    },
    {
      "src": "icon-192.png",
      "type": "image/png",
      "sizes": "192x192"
    },
    {
      "src": "icon-512.png",
      "type": "image/png",
      "sizes": "512x512"
    }
  ],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#E75A5C",
  "background_color": "#ffffff",
  "description": "A blockchain explorer for viewing and monitoring blockchain activity",
  "orientation": "portrait",
  "scope": "/"
}
```

### public/service-worker.js

A service worker for offline capabilities and caching.

## Continuous Integration

The project uses GitHub Actions for CI/CD with the following workflow:

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Use Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20.x'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run TypeScript check
      run: npx tsc --noEmit
      
    - name: Run ESLint
      run: npx eslint . --ext .ts,.tsx
      
    - name: Run Jest tests
      run: npm test
      
    - name: Install Cypress dependencies
      run: |
        sudo apt-get update
        sudo apt-get install -y libgtk2.0-0 libgtk-3-0 libgbm-dev libnotify-dev libnss3 libxss1 libasound2 libxtst6 xauth xvfb
        
    - name: Start Expo web server
      run: npm run web -- --no-dev --minify &
      
    - name: Wait for server to start
      run: npx wait-on http://localhost:19006 -t 60000
      
    - name: Run Cypress tests
      run: npx cypress run
      
    - name: Upload test coverage
      uses: coverallsapp/github-action@v2
      with:
        github-token: ${{ secrets.GITHUB_TOKEN }}
```

## State Management

The project uses `@legendapp/state` for observable state management. This allows components to reactively update when state changes without requiring manual subscriptions.

The state management structure is organized in the `src/store` directory, with separate files for different domains of state (blockchain data, UI state, etc.).

## Navigation

React Navigation is used for screen navigation with a well-defined navigation structure:

- Stack navigation for the main screens (Home, Transaction Details, Account Details)
- Tab navigation for different sections within screens
- Proper handling of deep linking for direct access to specific screens

## Testing Strategy

The project implements a comprehensive testing strategy:

1. **Unit and Integration Tests**: Using Jest and React Testing Library to test individual components and their interactions
2. **End-to-End Tests**: Using Cypress to test the complete application flow
3. **Continuous Integration**: Automated testing on every push and pull request

## Styling and Theme

The project implements a responsive design that works well on all devices with support for both light and dark themes. The theme preferences are stored and managed in the application state.

## Conclusion

This OL Explorer project follows modern best practices for React Native and web development. The well-organized directory structure, combined with TypeScript for type safety and comprehensive testing, ensures a maintainable and robust application.

The project can be extended in the future by adding more screens, features, or integrating with additional blockchain data sources while maintaining the existing architecture. 