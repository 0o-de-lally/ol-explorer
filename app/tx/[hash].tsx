import React, { useEffect, useState, useRef } from 'react';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { TransactionDetailsScreen } from '../../src/screens/TransactionDetails';
import { formatAddressForDisplay, normalizeTransactionHash } from '../../src/utils/addressUtils';
import { Platform } from 'react-native';

export default function TransactionDetailsPage() {
    const { hash } = useLocalSearchParams();
    const [title, setTitle] = useState('Transaction Details');
    const isMounted = useRef(false);

    // Handle component mounting state
    useEffect(() => {
        isMounted.current = true;

        return () => {
            isMounted.current = false;
        };
    }, []);

    // Normalize URL if transaction hash format doesn't match standard
    useEffect(() => {
        if (!hash || !isMounted.current) return;

        // Use setTimeout to ensure we don't navigate too early
        const timer = setTimeout(() => {
            if (!isMounted.current) return;

            try {
                // First ensure the hash has 0x prefix
                const withPrefix = hash.toString().startsWith('0x') ? hash.toString() : `0x${hash}`;

                // Then apply our standard normalization
                const normalizedHash = normalizeTransactionHash(withPrefix);

                // If current URL doesn't match the standard format and normalization succeeded, redirect
                if (normalizedHash && normalizedHash !== hash && isMounted.current) {
                    console.log(`Redirecting from ${hash} to canonical tx hash format ${normalizedHash}`);
                    router.replace(`/tx/${normalizedHash}`);
                }
            } catch (error) {
                console.error('Error normalizing transaction hash:', error);
            }
        }, 100); // Small delay to ensure layout is mounted

        return () => clearTimeout(timer);
    }, [hash]);

    // Update title based on hash
    useEffect(() => {
        if (hash) {
            try {
                // Ensure hash is normalized for display
                const normalizedHash = normalizeTransactionHash(hash as string) || hash as string;
                const formattedHash = formatAddressForDisplay(normalizedHash, 4, 4);
                const pageTitle = `Transaction ${formattedHash}`;
                setTitle(pageTitle);

                // Set document.title directly for web
                if (Platform.OS === 'web') {
                    document.title = `${pageTitle} | Twin Open Libra Explorer`;
                }
            } catch (e) {
                console.error('Error formatting hash for title:', e);
            }
        }
    }, [hash]);

    return (
        <>
            <Stack.Screen
                options={{
                    title,
                    headerTitle: title,
                }}
            />
            <TransactionDetailsScreen hash={hash as string} />
        </>
    );
} 