import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { SearchBar } from './SearchBar';
import { Logo } from './Logo';

// Navigation type
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

type HeaderProps = {
  testID?: string;
};

export const Header: React.FC<HeaderProps> = ({ testID }) => {
  const navigation = useNavigation<NavigationProp>();

  const handleHomePress = () => {
    navigation.navigate('Home');
  };

  return (
    <View className="bg-background py-4 border-b border-border" testID={testID}>
      <View className="mx-auto w-full max-w-screen-xl px-4">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity className="flex-row items-center" onPress={handleHomePress}>
            <Logo size={36} className="mr-3" />
            <Text className="text-white text-xl font-bold">Open Libra Explorer</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <SearchBar />
      </View>
    </View>
  );
}; 