import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, Text, Platform } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { AccountDetailsScreen } from '../../src/screens/AccountDetails';
import { formatAddressForDisplay, normalizeAddress, stripLeadingZeros } from '../../src/utils/addressUtils';

export default function AccountDetailsPage() {
    const { address } = useLocalSearchParams();
    const [title, setTitle] = useState('Account Details');
    const isMounted = useRef(false);

    // Handle component mounting state
    useEffect(() => {
        isMounted.current = true;

        return () => {
            isMounted.current = false;
        };
    }, []);

    // Normalize URL if address format doesn't match standard
    useEffect(() => {
        if (!address || !isMounted.current) return;

        // Use setTimeout to ensure we don't navigate too early
        const timer = setTimeout(() => {
            if (!isMounted.current) return;

            try {
                // First ensure the address has 0x prefix
                const withPrefix = address.toString().startsWith('0x') ? address.toString() : `0x${address}`;

                // Then apply our standard normalization for removing 32 leading zeros
                const standardAddress = stripLeadingZeros(withPrefix);

                // If current URL doesn't match the standard format, redirect
                if (standardAddress !== address && isMounted.current) {
                    console.log(`Redirecting from ${address} to canonical address format ${standardAddress}`);
                    router.replace(`/account/${standardAddress}`);
                }
            } catch (error) {
                console.error('Error normalizing address:', error);
            }
        }, 100); // Small delay to ensure layout is mounted

        return () => clearTimeout(timer);
    }, [address]);

    // Update title based on address
    useEffect(() => {
        if (address) {
            try {
                // First strip leading zeros, then format for display
                const strippedAddress = stripLeadingZeros(address as string);
                const formattedAddress = formatAddressForDisplay(strippedAddress, 4, 4);
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