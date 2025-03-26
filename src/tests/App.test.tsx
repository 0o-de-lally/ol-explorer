import * as React from 'react';
import { render } from '@testing-library/react-native';
import App from '../../App';

// Mock the NavigationContainer to avoid navigation errors in tests
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Basic test for App component
describe('App', () => {
  it('renders without crashing', () => {
    // We're not asserting anything specific here,
    // just making sure the component renders without throwing
    render(<App />);
  });
}); 