import React from 'react';
import { View, Text, TouchableOpacity, Linking, useWindowDimensions } from 'react-native';
import { Logo } from './Logo';

export const Footer: React.FC = () => {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    const handleLinkPress = (url: string) => {
        Linking.openURL(url);
    };

    return (
        <View className="bg-background py-8 w-full border-t border-border">
            <View className="mx-auto w-full max-w-screen-lg px-4">
                {isMobile ? (
                    // Mobile layout
                    <View className="flex-col">
                        <View className="flex-row items-center justify-center mb-6">
                            <Logo size={28} className="mr-2" />
                            <Text className="text-white font-medium">Open Libra Blockchain Explorer</Text>
                        </View>

                        <View className="flex-row items-center space-x-6 justify-center">
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
                ) : (
                    // Desktop layout
                    <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center flex-none">
                            <Logo size={28} className="mr-2" />
                            <Text className="text-white font-medium whitespace-nowrap">Open Libra Blockchain Explorer</Text>
                        </View>

                        <View className="flex-row items-center space-x-6 justify-end">
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
                )}
            </View>
        </View>
    );
}; 