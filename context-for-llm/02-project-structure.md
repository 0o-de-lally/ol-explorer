# OL Explorer - Project Structure Documentation

This document provides a comprehensive overview of the OL Explorer blockchain explorer project structure, initialization process, and technology selections. It serves as a reference for understanding the project architecture and can be used to recreate the project from scratch if needed.

## Project Overview

OL Explorer is a blockchain explorer for the Open Libra blockchain, built as a cross-platform application using React Native with Expo. The application provides a user-friendly interface to explore blockchain data including blocks, transactions, and accounts.

## Repository Structure

The project follows a well-organized directory structure:

```
ol-explorer/
├── .github/                # GitHub configuration
│   └── workflows/          # GitHub Actions workflows for CI/CD
├── app/                    # Expo Router application screens
│   ├── index.tsx           # Home page
│   ├── _layout.tsx         # Root layout component
│   ├── account/            # Account-related routes
│   └── tx/                 # Transaction-related routes
├── assets/                 # Static assets like images and fonts
├── context/                # Project documentation files
├── context-for-llm/        # Detailed project documentation
├── cypress/                # End-to-end tests with Cypress
│   └── e2e/                # Cypress test files
├── node_modules/           # Dependencies (git-ignored)
├── public/                 # Public files for web build
│   ├── manifest.json       # Web app manifest for PWA support
│   └── service-worker.js   # Service worker for offline capabilities
├── src/                    # Source code
│   ├── components/         # Reusable UI components
│   ├── config/             # Application configuration
│   ├── context/            # React context providers
│   ├── hooks/              # Custom React hooks
│   ├── navigation/         # Navigation configuration
│   ├── screens/            # Screen components
│   ├── services/           # API and other services
│   ├── store/              # State management with LegendApp
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
├── global.css              # Global CSS styles
├── index.ts                # Entry point for the application
├── jest.config.js          # Jest configuration
├── jest.setup.js           # Jest setup file
├── metro.config.js         # Metro bundler configuration
├── package.json            # Project metadata and dependencies
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── README.md               # Project documentation
```

## Key Files and Their Purposes

### Configuration Files

1. **package.json**
   - Defines project metadata, dependencies, and scripts
   - Contains npm scripts for development, testing, and building
   
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
       "open-libra-sdk": "^1.0.0"
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

2. **app.json**
   - Expo-specific configuration
   - Defines app name, version, orientation, and more
   
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

3. **tsconfig.json**
   - TypeScript configuration
   - Sets strict type checking and other compiler options
   
   ```json
   {
     "extends": "expo/tsconfig.base",
     "compilerOptions": {
       "strict": true
     }
   }
   ```

4. **babel.config.js**
   - Babel configuration for JavaScript/TypeScript transpilation
   - Includes plugins for React Native and other dependencies

5. **metro.config.js**
   - Metro bundler configuration for React Native
   - Configured to work with NativeWind

6. **tailwind.config.js**
   - TailwindCSS configuration for styling
   - Defines theme colors, spacing, and other design tokens

7. **.eslintrc.js**
   - ESLint configuration for code quality and style
   - Enforces TypeScript and React best practices
   
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

8. **jest.config.js** and **jest.setup.js**
   - Jest configuration for testing
   - Setup code for test environment and mocks
   
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

9. **cypress.config.js**
   - Cypress configuration for end-to-end testing
   - Defines base URL and other testing options

### Core Application Files

1. **index.ts**
   - Entry point for the application
   - Registers the root component

2. **App.tsx**
   - Main application component
   - Sets up providers and navigation

3. **app/_layout.tsx**
   - Root layout for Expo Router
   - Sets up navigation container and global providers

4. **app/index.tsx**
   - Home screen route component
   - Renders the HomeScreen component

### Source Code Organization

#### Components (`src/components/`)
Contains reusable UI components organized by feature:

- **BlockchainMetrics.tsx** - Displays blockchain metrics (block height, epoch, chain ID)
- **TransactionsList.tsx** - Renders list of transactions with pagination
- **SearchBar.tsx** - Implements search functionality
- **TransactionDetails.tsx** - Displays transaction details
- **AccountDetails.tsx** - Displays account details and resources

#### Screens (`src/screens/`)
Contains screen components that compose the UI for each route:

- **HomeScreen.tsx** - Main screen with blockchain metrics and transaction list
- **TransactionDetailsScreen.tsx** - Screen for viewing transaction details
- **AccountDetailsScreen.tsx** - Screen for viewing account details and resources

#### State Management (`src/store/`)
Uses LegendApp/State for observable state management:

- **blockchainStore.ts** - Manages blockchain data (blocks, transactions, metrics)
- **searchStore.ts** - Manages search state and history

#### Custom Hooks (`src/hooks/`)
Contains custom React hooks for data fetching and business logic:

- **useSdk.ts** - Hook for interacting with the Open Libra SDK
- **useBlockchain.ts** - Hook for fetching and managing blockchain data
- **useSearch.ts** - Hook for search functionality
- **useBlockTime.ts** - Hook for calculating block time

#### Services (`src/services/`)
Contains service modules for external API interactions:

- **api.ts** - API client for HTTP requests
- **storage.ts** - Local storage service

#### Context Providers (`src/context/`)
Contains React context providers:

- **SdkContext.tsx** - Provides SDK instance to components
- **ThemeContext.tsx** - Manages theme state (dark/light mode)

#### Types (`src/types/`)
Contains TypeScript type definitions:

- **blockchain.ts** - Types for blockchain data
- **transaction.ts** - Types for transaction data
- **account.ts** - Types for account data

#### Utilities (`src/utils/`)
Contains utility functions:

- **format.ts** - Formatting utilities for dates, numbers, and addresses
- **validation.ts** - Validation functions

## Routing Structure

The project uses Expo Router for file-based routing:

- **app/index.tsx** - Home route (`/`)
- **app/tx/[hash].tsx** - Transaction details route (`/tx/:hash`)
- **app/account/[address].tsx** - Account details route (`/account/:address`)
- **app/account/[address]/resources/[resourceType].tsx** - Account resource route (`/account/:address/resources/:resourceType`)

## State Management Approach

The project uses LegendApp/State for observable state management:

1. **Observable Store**
   - Store objects defined with `observable()` function
   - Reactive updates with automatic subscriptions

2. **Store Structure**
   - Separate stores for different domains (blockchain, search)
   - Actions defined alongside stores for state manipulation

3. **Component Integration**
   - `useObservable()` hook for consuming state
   - Automatic re-renders when observed state changes

## Styling Approach

The project uses NativeWind (Tailwind CSS for React Native):

1. **Utility Classes**
   - Tailwind utility classes for styling (e.g., `className="bg-primary p-4"`)
   - Custom theme defined in `tailwind.config.js`

2. **Dark Mode Support**
   - Dark mode classes with `dark:` prefix
   - Theme system respects system preferences

3. **Responsive Design**
   - Responsive utility classes for different screen sizes
   - Mobile-first approach

## Testing Strategy

The project implements a comprehensive testing strategy:

1. **Unit Tests**
   - Jest tests for individual components and functions
   - Located in `src/tests/` directory

2. **Integration Tests**
   - Tests for component interactions
   - Mock services and API responses

3. **End-to-End Tests**
   - Cypress tests for user flows
   - Located in `cypress/e2e/` directory

## Build and Deployment

The project can be built for multiple platforms:

1. **Web**
   - `npm run build` generates a web build in `web-build/` directory
   - Progressive Web App capabilities

2. **Native**
   - `npm run build:ios` builds for iOS
   - `npm run build:android` builds for Android

3. **Deployment Options**
   - Static hosting (GitHub Pages, Cloudflare Pages)
   - Server deployment with Nginx
   - Continuous deployment with GitHub Actions

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

## Development Guidelines

When working on this project, follow these guidelines:

1. **Code Style**
   - Follow ESLint rules
   - Use TypeScript for type safety
   - Follow component and file naming conventions

2. **Component Creation**
   - Create reusable components in `src/components/`
   - Create screens in `src/screens/`
   - Use custom hooks for logic and data fetching

3. **State Management**
   - Use observable stores for global state
   - Define actions for state manipulation
   - Use local state for component-specific state

4. **Testing**
   - Write tests for new components and functions
   - Maintain test coverage above 85%
   - Test edge cases and error handling

5. **Pull Requests**
   - Create feature branches
   - Ensure tests pass before submitting PR
   - Document changes in PR description

## Conclusion

The OL Explorer project follows a well-structured architecture that separates concerns and promotes maintainability. The use of modern technologies like React Native, Expo, TypeScript, and LegendApp/State provides a solid foundation for building a high-quality blockchain explorer.

The comprehensive documentation, testing, and CI/CD setup ensures that the project can be extended and maintained by developers familiar with React and TypeScript ecosystems. 