import React from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SearchBar } from './SearchBar';
import { Logo } from './Logo';
import { router } from 'expo-router';
import { Container } from './Layout';

type HeaderProps = {
  testID?: string;
};

export const Header: React.FC<HeaderProps> = ({ testID }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const handleHomePress = () => {
    // Use Expo Router directly
    router.push('/');
  };

  return (
    <View className="bg-background pt-2 pb-1" testID={testID}>
      <Container className="py-0">
        <View
          className={`flex w-full items-center ${isMobile ? 'flex-col' : 'flex-row justify-between'}`}
        >
          {/* Logo and title - centered on mobile, left-aligned on desktop */}
          <TouchableOpacity
            className={`flex flex-row items-center ${isMobile ? 'mb-4' : ''}`}
            onPress={handleHomePress}
          >
            <Logo size={36} className="mr-3" />
            <Text className="text-white text-xl font-bold whitespace-nowrap">
              Open Libra Explorer
            </Text>
          </TouchableOpacity>

          {/* Search bar - full width on mobile, partial width on desktop */}
          <View className={`${isMobile ? 'w-full' : 'w-[60%]'}`}>
            <SearchBar />
          </View>
        </View>
      </Container>
    </View>
  );
}; 