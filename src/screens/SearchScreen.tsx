import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Header } from '../components/Header';
import { useSdk } from '../hooks/useSdk';

type SearchScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Search'>;
};

export const SearchScreen: React.FC<SearchScreenProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const sdk = useSdk();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchError('Please enter a transaction hash or account address');
      return;
    }

    if (!sdk.isInitialized || sdk.error) {
      setSearchError(sdk.error?.message || 'SDK is not initialized');
      return;
    }

    setIsLoading(true);
    setSearchError(null);
    Keyboard.dismiss();

    try {
      // Try to get transaction by hash first
      const transaction = await sdk.getTransactionByHash(searchQuery);
      
      if (transaction) {
        navigation.navigate('TransactionDetails', { hash: searchQuery });
        return;
      }
      
      // If not a transaction, try to get account
      const account = await sdk.getAccount(searchQuery);
      
      if (account) {
        navigation.navigate('AccountDetails', { address: searchQuery });
        return;
      }
      
      // If neither, show error
      setSearchError('No transaction or account found with the provided ID');
    } catch (error) {
      console.error('Search error:', error);
      setSearchError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <SafeAreaView style={styles.safeArea}>
        <Header testID="header" />
        <View style={styles.container}>
          <Text style={styles.title}>Search Blockchain</Text>
          <Text style={styles.subtitle}>
            Enter a transaction hash or account address
          </Text>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Transaction hash or account address"
              placeholderTextColor="#6b7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleSearch}
            />
            
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleSearch}
              disabled={isLoading}
            >
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          </View>
          
          {searchError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{searchError}</Text>
            </View>
          )}
          
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#E75A5C" />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          )}
          
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Search Tips</Text>
            <Text style={styles.infoText}>
              • Search for a specific transaction using its unique hash
            </Text>
            <Text style={styles.infoText}>
              • Search for an account using its full address
            </Text>
            <Text style={styles.infoText}>
              • Make sure to enter the complete hash or address
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B1221',
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#0B1221',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ADBAC7',
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#172234',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
    marginRight: 8,
  },
  searchButton: {
    backgroundColor: '#E75A5C',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: 'rgba(231, 90, 92, 0.2)',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#E75A5C',
    fontSize: 14,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
  },
  infoCard: {
    backgroundColor: '#172234',
    borderRadius: 8,
    padding: 20,
    marginTop: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#ADBAC7',
    marginBottom: 12,
  },
}); 