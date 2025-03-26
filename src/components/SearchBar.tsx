import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useSdk } from '../hooks/useSdk';

export const SearchBar: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const sdk = useSdk();

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setError(null);

        try {
            // Normalize the address (remove 0x prefix if present for consistency)
            const query = searchQuery.trim();

            // Try account lookup first
            console.log(`Searching for account: ${query}`);
            const accountData = await sdk.getAccount(query);

            if (accountData) {
                console.log('Account found, navigating to account details');
                navigation.navigate('AccountDetails', { address: query });
                setSearchQuery('');
                setIsSearching(false);
                return;
            }

            // If account lookup fails, try transaction hash lookup
            console.log('Account not found, trying transaction lookup');
            const txDetails = await sdk.getTransactionByHash(query);

            if (txDetails) {
                console.log('Transaction found, navigating to transaction details');
                navigation.navigate('TransactionDetails', { hash: query });
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
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by account or transaction hash..."
                    placeholderTextColor="#8F9BB3"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                <TouchableOpacity
                    style={styles.searchButton}
                    onPress={handleSearch}
                    disabled={isSearching}
                >
                    {isSearching ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Text style={styles.searchButtonText}>Search</Text>
                    )}
                </TouchableOpacity>
            </View>
            {error && (
                <Text style={styles.errorText}>{error}</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        width: '100%',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchInput: {
        flex: 1,
        height: 40,
        backgroundColor: '#172234',
        borderRadius: 4,
        paddingHorizontal: 12,
        color: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#1E2736',
    },
    searchButton: {
        backgroundColor: '#E75A5C',
        height: 40,
        paddingHorizontal: 16,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    searchButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    errorText: {
        color: '#E75A5C',
        marginTop: 8,
        fontSize: 12,
    }
}); 