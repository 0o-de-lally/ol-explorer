import React, { useEffect, useRef } from 'react';
import './global.css';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import { TransactionDetailsScreen } from './src/screens/TransactionDetails';
import { AccountDetailsScreen } from './src/screens/AccountDetails';
import { RootStackParamList } from './src/navigation/types';
import ErrorBoundary from './src/components/ErrorBoundary';
import { Footer } from './src/components/Footer';
import { SdkProvider } from './src/context/SdkContext';
import { SdkLoadingIndicator } from './src/components/SdkLoadingIndicator';
import { setupPolyfills } from './src/utils/polyfills';

// Setup necessary polyfills
setupPolyfills();

// Constants
const OPENLIBRA_RPC_URL = 'https://rpc.openlibra.space:8080/v1';

// Ensure Buffer is available in the browser environment
if (typeof window !== 'undefined' && !window.Buffer) {
  try {
    window.Buffer = require('buffer/').Buffer;
  } catch (error) {
    console.warn('Failed to polyfill Buffer:', error);
  }
}

// Create the navigation stack
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  // Reference to the navigation container
  const navigationRef = useRef(null);

  // Log environment information for debugging
  useEffect(() => {
    console.log('App initialized');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Platform:', typeof window !== 'undefined' ? 'Browser' : 'Node.js');

    // Log SDK initialization information with the correct pattern
    console.log(`Using Open Libra SDK with direct RPC connection to: ${OPENLIBRA_RPC_URL}`);

    // Log the correct initialization pattern without custom fetch or header manipulation
    console.log('Using standard LibraClient initialization: new LibraClient(Network.MAINNET, OPENLIBRA_RPC_URL)');

    if (typeof window !== 'undefined') {
      console.warn(
        'Note: For browser environments, the server needs proper CORS headers configured to allow requests.'
      );
    }
  }, []);

  return (
    <ErrorBoundary>
      <SdkProvider>
        <View className="flex-1 bg-background flex flex-col min-h-screen">
          {/* Show loading indicator when SDK is initializing */}
          <SdkLoadingIndicator />

          <NavigationContainer
            ref={navigationRef}
            onReady={() => {
              // Ensure the app initializes properly with Home screen focused
              console.log('Navigation container is ready');
            }}
          >
            <StatusBar style="light" />
            <Stack.Navigator
              initialRouteName="Home"
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#0B1221' }
              }}
            >
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="TransactionDetails" component={TransactionDetailsScreen} />
              <Stack.Screen name="AccountDetails" component={AccountDetailsScreen} />
            </Stack.Navigator>
          </NavigationContainer>
          <Footer />
        </View>
      </SdkProvider>
    </ErrorBoundary>
  );
}
