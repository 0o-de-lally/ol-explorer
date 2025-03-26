# OL Explorer Dependency Installation

This document outlines the process of installing and setting up all the dependencies for the OL Explorer blockchain explorer project.

## Core Dependencies

The project uses the following core technologies:

- **React Native with Expo**: A framework for building cross-platform applications
- **TypeScript**: For type safety and improved developer experience
- **@legendapp/state**: For state management
- **React Navigation**: For routing and navigation

## Development Dependencies

- **Jest**: For unit and integration testing
- **Cypress**: For end-to-end testing
- **ESLint**: For code linting
- **TypeScript**: For static type checking

## Installation Process

The dependencies were installed using npm without the use of any flags like `--legacy-peer-deps`. The installation was performed with compatibility in mind, ensuring that all dependencies work well together.

### Key Steps in the Installation Process

1. **Updated existing packages**: Ran `npm update` to ensure all existing packages were at their latest compatible versions.

2. **Installed testing frameworks**:
   - Jest and related libraries for unit and integration testing
   - Cypress for end-to-end testing
   - Used a compatible version of `react-test-renderer` (18.3.1) to match React version

3. **Added AsyncStorage**: Installed `@react-native-async-storage/async-storage` for persistent storage support.

4. **Set up testing configuration**:
   - Created Jest configuration in `jest.config.js`
   - Added Jest setup file with mocks in `jest.setup.js`
   - Created basic mock for file imports in tests
   - Set up Cypress configuration for e2e testing

5. **Configured CI/CD pipeline**:
   - Added GitHub Actions workflow in `.github/workflows/ci.yml`
   - Set up steps for linting, type checking, unit tests, and e2e tests

## Dependency Version Compatibility

Some dependencies required specific version matching to ensure compatibility:

- `react-test-renderer` needs to match the React version (18.3.1)
- `jest-expo` version needed to be compatible with the Expo version
- For some packages, we used slightly older but stable versions to avoid compatibility issues

## Package.json Scripts

The following npm scripts were added:

- `test`: Run Jest tests
- `test:watch`: Run Jest in watch mode
- `test:coverage`: Run Jest with coverage reporting
- `cypress:open`: Open Cypress test runner
- `cypress:run`: Run Cypress tests headlessly
- `lint`: Run ESLint
- `typecheck`: Run TypeScript type checking
- `build`: Build the web version of the app

## Installation Verification

All dependencies were successfully installed and verified to work together without conflicts. The project is now ready for development with a solid foundation for testing and CI/CD. 