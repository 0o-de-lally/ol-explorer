import React, { useEffect } from 'react';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { AccountDetailsScreen } from '../../../src/screens/AccountDetails';

export default function AccountResourcePage() {
    const { address, resource } = useLocalSearchParams();
    const navigation = useNavigation();

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