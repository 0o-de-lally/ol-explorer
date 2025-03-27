import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, ActivityIndicator, Animated, Platform, Linking } from 'react-native';
import { useSdk } from '../hooks/useSdk';
import { isValidAddressFormat } from '../utils/addressUtils';

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

    // Navigate to specific routes based on search results
    const navigateTo = (route: string, params: Record<string, string>) => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            // For web, construct the URL and navigate
            let url = `/${route}`;
            if (params) {
                const paramKey = Object.keys(params)[0];
                url += `/${params[paramKey]}`;
            }
            window.location.href = url;
        } else {
            // For native, use deep linking
            const paramKey = Object.keys(params)[0];
            const paramValue = params[paramKey];
            Linking.openURL(`/${route}/${paramValue}`);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        animateButton();
        setIsSearching(true);
        setError(null);

        try {
            const query = searchQuery.trim();

            // Check if query looks like an address 
            if (isValidAddressFormat(query)) {
                console.log(`Searching for account: ${query}`);

                // Address validation and normalization happens in the SDK
                const accountData = await sdk.getAccount(query);

                if (accountData) {
                    console.log('Account found, navigating to account details');
                    navigateTo('account', { address: query });
                    setSearchQuery('');
                    setIsSearching(false);
                    return;
                }
            }

            // If account lookup fails or not an address format, try transaction hash lookup
            console.log('Trying transaction lookup for:', query);
            const txDetails = await sdk.getTransactionByHash(query);

            if (txDetails) {
                console.log('Transaction found, navigating to transaction details');
                navigateTo('tx', { hash: query });
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
                    className="h-9 bg-secondary border-0 px-3 text-white rounded-l text-sm flex-1"
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