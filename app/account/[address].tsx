import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { AccountDetailsScreen } from '../../src/screens/AccountDetails';

export default function AccountDetailsPage() {
    const { address } = useLocalSearchParams();

    return <AccountDetailsScreen
        address={address as string}
        route={{ params: { address: address as string } }}
    />;
} 