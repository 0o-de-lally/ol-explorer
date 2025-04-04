import React from 'react';
import { View, Text, TouchableOpacity, Linking, useWindowDimensions } from 'react-native';
import { Logo } from './Logo';
import { Container } from './Layout';

export const Footer: React.FC = () => {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    const handleLinkPress = (url: string) => {
        Linking.openURL(url);
    };

    const links = [
        { url: 'https://openlibra.io', label: 'Website' },
        { url: 'https://docs.openlibra.io', label: 'Docs' },
        { url: 'http://github.com/0LNetworkCommunity', label: 'GitHub' }
    ];

    return (
        <View className="bg-background py-4 w-full border-t border-border">
            <Container className="py-0">
                <View
                    className={`flex w-full items-center ${isMobile ? 'flex-col' : 'flex-row justify-between'}`}
                >
                    {/* Logo and title */}
                    <View className={`flex flex-row items-center ${isMobile ? 'mb-6' : ''}`}>
                        <Logo size={28} className="mr-2" />
                        <Text className="text-white font-medium">
                            Open Libra Blockchain Explorer
                        </Text>
                    </View>

                    {/* Navigation links */}
                    <View className="flex flex-row">
                        {links.map((link, index) => (
                            <TouchableOpacity
                                key={link.url}
                                onPress={() => handleLinkPress(link.url)}
                                className={index > 0 ? "ml-6" : ""}
                            >
                                <Text className="text-white">
                                    {link.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Container>
        </View>
    );
}; 