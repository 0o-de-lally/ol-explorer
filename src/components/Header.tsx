import React from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SearchBar } from './SearchBar';
import { Logo } from './Logo';
import { router } from 'expo-router';
import { Container, Row, Column } from './Layout';

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
    <View className="bg-background py-4" testID={testID}>
      <Container className="py-0">
        {isMobile ? (
          // Mobile layout - Logo above Search
          <Column>
            <TouchableOpacity
              className="flex-row items-center flex-none mb-4"
              onPress={handleHomePress}
            >
              <Logo size={36} className="mr-3" />
              <Text className="text-white text-xl font-bold whitespace-nowrap">
                Open Libra Explorer
              </Text>
            </TouchableOpacity>
            <View className="w-full">
              <SearchBar />
            </View>
          </Column>
        ) : (
          // Desktop layout - Logo and Search side-by-side
          <Row justifyContent="between">
            <TouchableOpacity
              className="flex-row items-center flex-none"
              onPress={handleHomePress}
            >
              <Logo size={36} className="mr-3" />
              <Text className="text-white text-xl font-bold whitespace-nowrap">
                Open Libra Explorer
              </Text>
            </TouchableOpacity>
            <View className="flex-1 pl-4 max-w-[70%]">
              <SearchBar />
            </View>
          </Row>
        )}
      </Container>
    </View>
  );
}; 