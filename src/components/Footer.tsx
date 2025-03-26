import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { Logo } from './Logo';

export const Footer: React.FC = () => {
    const handleLinkPress = (url: string) => {
        Linking.openURL(url);
    };

    return (
        <View className="bg-background py-6 border-t border-border">
            <View className="px-5 flex-row items-center justify-between flex-wrap">
                <View className="flex-row items-center mb-4 md:mb-0">
                    <Logo size={28} className="mr-2" />
                    <Text className="text-white font-medium">Open Libra Blockchain Explorer</Text>
                </View>

                <View className="flex-row items-center space-x-6">
                    <TouchableOpacity onPress={() => handleLinkPress('https://openlibra.io')}>
                        <Text className="text-white hover:text-primary">Website</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleLinkPress('https://docs.openlibra.io')}>
                        <Text className="text-white hover:text-primary">Docs</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleLinkPress('http://github.com/0LNetworkCommunity')}>
                        <Text className="text-white hover:text-primary">GitHub</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}; 