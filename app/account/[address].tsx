import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { AccountDetailsScreen } from '../../src/screens/AccountDetails';

export default function AccountDetailsPage() {
    const { address } = useLocalSearchParams();

    return <AccountDetailsScreen address={address as string} />;
} 