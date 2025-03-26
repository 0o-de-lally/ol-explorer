import React, { useState } from 'react';
import {
  View,
  Text,
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
      <SafeAreaView className="flex-1 bg-background">
        <Header testID="header" />
        <View className="flex-1 p-4 bg-background">
          <Text className="text-2xl font-bold text-white mb-2">Search Blockchain</Text>
          <Text className="text-base text-text-muted mb-6">
            Enter a transaction hash or account address
          </Text>

          <View className="flex-row mb-4">
            <TextInput
              className="flex-1 bg-secondary rounded-lg p-3 text-base text-white mr-2"
              placeholder="Transaction hash or account address"
              placeholderTextColor="#6b7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleSearch}
            />

            <TouchableOpacity
              className="bg-primary rounded-lg p-3 justify-center items-center w-[100px]"
              onPress={handleSearch}
              disabled={isLoading}
            >
              <Text className="text-white text-base font-bold">Search</Text>
            </TouchableOpacity>
          </View>

          {searchError && (
            <View className="bg-primary/20 p-4 rounded-lg mb-4">
              <Text className="text-primary text-sm">{searchError}</Text>
            </View>
          )}

          {isLoading && (
            <View className="flex-row items-center mb-4">
              <ActivityIndicator size="large" color="#E75A5C" />
              <Text className="text-white text-base ml-3">Searching...</Text>
            </View>
          )}

          <View className="bg-secondary rounded-lg p-5 mt-6">
            <Text className="text-lg font-bold text-white mb-4">Search Tips</Text>
            <Text className="text-sm text-text-muted mb-3">
              • Search for a specific transaction using its unique hash
            </Text>
            <Text className="text-sm text-text-muted mb-3">
              • Search for an account using its full address
            </Text>
            <Text className="text-sm text-text-muted mb-3">
              • Make sure to enter the complete hash or address
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}; 