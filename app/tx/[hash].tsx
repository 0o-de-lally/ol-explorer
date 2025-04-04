import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, Stack } from 'expo-router';
import { TransactionDetailsScreen } from '../../src/screens/TransactionDetails';
import { formatAddressForDisplay } from '../../src/utils/addressUtils';
import { Platform } from 'react-native';

export default function TransactionDetailsPage() {
    const { hash } = useLocalSearchParams();
    const [title, setTitle] = useState('Transaction Details');

    // Update title based on hash
    useEffect(() => {
        if (hash) {
            try {
                const formattedHash = formatAddressForDisplay(hash as string, 4, 4);
                const pageTitle = `Transaction ${formattedHash}`;
                setTitle(pageTitle);

                // Set document.title directly for web
                if (Platform.OS === 'web') {
                    document.title = `${pageTitle} | Open Libra Explorer`;
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