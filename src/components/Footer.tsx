import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { Logo } from './Logo';
import { Container } from './Layout';

export const Footer: React.FC = () => {
    const handleLinkPress = (url: string) => {
        Linking.openURL(url);
    };

    const links = [
        { url: 'https://openlibra.io', label: 'Website' },
        { url: 'https://docs.openlibra.io', label: 'Docs' },
        { url: 'http://github.com/0LNetworkCommunity', label: 'GitHub' }
    ];

    const websiteUrl = links[0].url;

    return (
        <View className="bg-background pt-1 pb-2 w-full">
            <Container className="py-0">
                <View className="flex flex-row items-center justify-center">
                    <TouchableOpacity onPress={() => handleLinkPress(websiteUrl)}>
                        <Logo size={24} className="mr-6" />
                    </TouchableOpacity>

                    {/* Navigation links */}
                    {links.map((link, index) => (
                        <TouchableOpacity
                            key={link.url}
                            onPress={() => handleLinkPress(link.url)}
                            className={`mx-3 ${index === links.length - 1 ? 'mr-0' : ''}`}
                        >
                            <Text className="text-white text-sm">
                                {link.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </Container>
        </View>
    );
}; 