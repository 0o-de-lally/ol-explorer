import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, Platform } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { AccountDetailsScreen } from '../../src/screens/AccountDetails';
import { formatAddressForDisplay, normalizeAddress } from '../../src/utils/addressUtils';

export default function AccountDetailsPage() {
    const { address } = useLocalSearchParams();
    const [title, setTitle] = useState('Account Details');

    // Update title based on address
    useEffect(() => {
        if (address) {
            try {
                const formattedAddress = formatAddressForDisplay(address as string, 4, 4);
                const pageTitle = `Account ${formattedAddress}`;
                setTitle(pageTitle);

                // Set document.title directly for web
                if (Platform.OS === 'web') {
                    document.title = `${pageTitle} | Open Libra Explorer`;
                }
            } catch (e) {
                console.error('Error formatting address for title:', e);
            }
        }
    }, [address]);

    return (
        <>
            <Stack.Screen
                options={{
                    title,
                    headerTitle: title
                }}
            />
            <AccountDetailsScreen
                address={address as string}
                route={{ params: { address: address as string } }}
            />
        </>
    );
} 