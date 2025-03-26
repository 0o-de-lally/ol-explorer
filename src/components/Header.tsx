import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type HeaderProps = {
  testID?: string;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const Header: React.FC<HeaderProps> = ({ testID }) => {
  const navigation = useNavigation<NavigationProp>();

  const handleSearchPress = () => {
    navigation.navigate('Search');
  };

  const handleHomePress = () => {
    navigation.navigate('Home');
  };

  return (
    <View className="bg-background py-4 px-5 flex-row items-center justify-between border-b border-border" testID={testID}>
      <TouchableOpacity className="flex-row items-center" onPress={handleHomePress}>
        <View className="w-9 h-9 rounded-full bg-primary justify-center items-center mr-3">
          <Text className="text-white font-bold text-base">OL</Text>
        </View>
        <Text className="text-white text-xl font-bold">Open Libra Explorer</Text>
      </TouchableOpacity>

      <View className="flex-row items-center">
        <TouchableOpacity className="bg-primary px-4 py-2 rounded justify-center items-center" onPress={handleSearchPress}>
          <Text className="text-white font-bold">Search</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}; 