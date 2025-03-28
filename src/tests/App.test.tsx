import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../../App';

// Mock Expo Router
jest.mock('expo-router', () => ({
  Stack: () => null,
  useRouter: () => ({
    navigate: jest.fn(),
  }),
}));

// Mock the useWindowDimensions hook
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => {
  return {
    __esModule: true,
    default: () => ({
      width: 1000,
      height: 1000,
      scale: 1,
      fontScale: 1,
    }),
  };
});

// Basic test for App component
describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    // If we get here without errors, the test passes
  });
}); 