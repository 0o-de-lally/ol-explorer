import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { TransactionDetailsScreen } from '../../src/screens/TransactionDetails';

export default function TransactionDetailsPage() {
    const { hash } = useLocalSearchParams();

    return <TransactionDetailsScreen hash={hash as string} />;
} 