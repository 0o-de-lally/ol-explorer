import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
    <View style={styles.container} testID={testID}>
      <TouchableOpacity style={styles.logoContainer} onPress={handleHomePress}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>OL</Text>
        </View>
        <Text style={styles.title}>Open Libra Explorer</Text>
      </TouchableOpacity>
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearchPress}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0B1221',
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#1E2736',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E75A5C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchButton: {
    backgroundColor: '#E75A5C',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
}); 