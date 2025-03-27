import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { SdkProvider } from '../src/context/SdkContext';
import { StatusBar } from 'expo-status-bar';
import { SdkLoadingIndicator } from '../src/components/SdkLoadingIndicator';
import { setupPolyfills } from '../src/utils/polyfills';
import '../src/utils/bufferPolyfill';
import '../global.css';
import ErrorBoundary from '../src/components/ErrorBoundary';
import { Header } from '../src/components/Header';
import { Footer } from '../src/components/Footer';
import { BlockchainMetrics } from '../src/components/BlockchainMetrics';

// Setup necessary polyfills
setupPolyfills();

export default function RootLayout() {
    // Log environment information for debugging
    useEffect(() => {
        console.log('App initialized with Expo Router');
        console.log('Environment:', process.env.NODE_ENV);
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
                        <BlockchainMetrics />

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