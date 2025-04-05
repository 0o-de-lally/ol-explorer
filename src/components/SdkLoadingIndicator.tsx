import React from 'react';
import {View, Text, ActivityIndicator, StyleSheet} from 'react-native';
import {useSdkContext} from '../context/SdkContext';

export const SdkLoadingIndicator: React.FC = () => {
    const { isInitialized, isInitializing, error } = useSdkContext();

    // Don't show anything if SDK is already initialized or not initializing
    if (isInitialized || !isInitializing) return null;

    return (
        <View style={styles.container}>
            <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#E75A5C" />
                <Text style={styles.loadingText}>Connecting to blockchain...</Text>
                {error && (
                    <Text style={styles.errorText}>
                        {error.message || 'Error connecting to blockchain'}
                    </Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(11, 18, 33, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    loadingBox: {
        backgroundColor: '#172234',
        borderRadius: 8,
        padding: 24,
        alignItems: 'center',
        maxWidth: '80%',
        minWidth: 250,
    },
    loadingText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8,
    },
    errorText: {
        color: '#E75A5C',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
    },
}); 