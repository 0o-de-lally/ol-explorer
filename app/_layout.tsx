import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { SdkProvider } from '../src/context/SdkContext';
import { StatusBar } from 'expo-status-bar';
import { SdkLoadingIndicator } from '../src/components/SdkLoadingIndicator';
import { setupPolyfills } from '../src/utils/polyfills';
import { registerServiceWorker } from '../src/utils/serviceWorkerRegistration';
import '../src/utils/bufferPolyfill';
import '../global.css';
import ErrorBoundary from '../src/components/ErrorBoundary';
import { Header } from '../src/components/Header';
import { Footer } from '../src/components/Footer';

// Setup necessary polyfills
setupPolyfills();

export default function RootLayout() {
    // Log environment information for debugging
    useEffect(() => {
        console.log('App initialized with Expo Router');
        console.log('Environment:', process.env.NODE_ENV);

        // Register service worker for PWA functionality (web only)
        if (process.env.NODE_ENV === 'production') {
            registerServiceWorker();
        }
    }, []);

    return (
        <ErrorBoundary>
            <SdkProvider>
                <View className="bg-background font-sans min-h-screen flex flex-col">
                    {/* Show loading indicator when SDK is initializing */}
                    <SdkLoadingIndicator />

                    {/* Main content area that can scroll */}
                    <View className="flex-1 flex flex-col overflow-auto">
                        <StatusBar style="light" />
                        <Header testID="header" />

                        <Stack
                            screenOptions={{
                                headerShown: false,
                                contentStyle: { backgroundColor: '#0B1221' }
                            }}
                        />

                        <Footer />
                    </View>
                </View>
            </SdkProvider>
        </ErrorBoundary>
    );
} 