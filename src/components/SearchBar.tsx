import React, { useState } from 'react';
import {View, TextInput, TouchableOpacity, Text, ActivityIndicator, Animated} from 'react-native';
import {useSdk} from '../hooks/useSdk';
import {isValidAddressFormat, stripLeadingZeros} from '../utils/addressUtils';
import {router} from 'expo-router';

export const SearchBar: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const sdk = useSdk();

    // Animation state
    const [buttonScale] = useState(new Animated.Value(1));

    const animateButton = () => {
        Animated.sequence([
            Animated.timing(buttonScale, {
                toValue: 0.95,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(buttonScale, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            })
        ]).start();
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        animateButton();
        setIsSearching(true);
        setError(null);

        try {
            const query = searchQuery.trim();

            // Ensure query has 0x prefix for testing as address or transaction hash
            const normalizedQuery = query.startsWith('0x') ? query : `0x${query}`;

            // Check if query looks like an address
            if (isValidAddressFormat(normalizedQuery)) {
                // Use normalized query for the SDK call
                const accountData = await sdk.getAccount(normalizedQuery);

                if (accountData) {
                    console.log('Account found, navigating to account details');
                    // Strip leading zeros before navigation
                    const cleanAddress = stripLeadingZeros(normalizedQuery);
                    router.push(`/account/${cleanAddress}`);
                    setSearchQuery('');
                    setIsSearching(false);
                    return;
                }
            }

            // If account lookup fails or not an address format, try transaction hash lookup
            console.log('Trying transaction lookup for:', normalizedQuery);
            const txDetails = await sdk.getTransactionByHash(normalizedQuery);

            if (txDetails) {
                console.log('Transaction found, navigating to transaction details');
                // Use normalized query with 0x prefix for transaction URLs as well
                router.push(`/tx/${normalizedQuery}`);
                setSearchQuery('');
                setIsSearching(false);
                return;
            }

            // If both lookups fail, show error
            setError('No account or transaction found with this identifier');
        } catch (err) {
            console.error('Search error:', err);
            setError('Error performing search');
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <View className="w-full">
            <View className="flex flex-row overflow-hidden rounded w-full">
                <TextInput
                    className="h-9 bg-secondary border-0 px-3 text-white rounded-l text-base flex-1"
                    placeholder="Search by account or tx hash..."
                    placeholderTextColor="#8F9BB3"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                    testID="search-input"
                />
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                    <TouchableOpacity
                        className={`bg-primary h-9 px-3 justify-center items-center rounded-r ${isSearching ? 'opacity-80' : ''}`}
                        onPress={handleSearch}
                        disabled={isSearching}
                        testID="search-button"
                    >
                        {isSearching ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text className="text-white font-bold text-sm">Search</Text>
                        )}
                    </TouchableOpacity>
                </Animated.View>
            </View>
            {error && (
                <Text className="text-primary mt-1 text-xs absolute -bottom-5 left-0 right-0 text-center">{error}</Text>
            )}
        </View>
    );
}; 