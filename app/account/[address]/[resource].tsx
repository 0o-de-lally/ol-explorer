import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { AccountDetailsScreen } from '../../../src/screens/AccountDetails';

export default function AccountResourcePage() {
    const { address, resource } = useLocalSearchParams();

    return <AccountDetailsScreen address={address as string} route={{ params: { address: address as string, resource: resource as string } }} />;
} 