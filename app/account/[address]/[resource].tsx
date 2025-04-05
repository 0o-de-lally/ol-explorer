import React, { useEffect, useRef } from 'react';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { AccountDetailsScreen } from '../../../src/screens/AccountDetails';
import { stripLeadingZeros } from '../../../src/utils/addressUtils';

export default function AccountResourcePage() {
    const { address, resource } = useLocalSearchParams();
    const navigation = useNavigation();
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
                    router.replace(`/account/${standardAddress}/${resource}`);
                }
            } catch (error) {
                console.error('Error normalizing address:', error);
            }
        }, 100); // Small delay to ensure layout is mounted

        return () => clearTimeout(timer);
    }, [address, resource]);

    // Prevent scroll reset on parameter changes
    useEffect(() => {
        // Configure the navigation to preserve scroll
        if (navigation) {
            navigation.setOptions({
                preserveScrollPosition: true,
            });
        }
    }, [navigation]);

    console.log(`AccountResourcePage: Loading with address=${address}, resource=${resource}`);

    // Ensure we pass both parameters to AccountDetailsScreen
    return (
        <AccountDetailsScreen
            address={address as string}
            route={{
                params: {
                    address: address as string,
                    resource: resource as string
                }
            }}
        />
    );
} 