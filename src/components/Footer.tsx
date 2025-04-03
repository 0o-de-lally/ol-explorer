import React from 'react';
import { View, Text, TouchableOpacity, Linking, useWindowDimensions } from 'react-native';
import { Logo } from './Logo';
import { Container, Row, Column } from './Layout';

export const Footer: React.FC = () => {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    const handleLinkPress = (url: string) => {
        Linking.openURL(url);
    };

    return (
        <View className="bg-background py-4 w-full border-border">
            <Container className="py-0">
                {isMobile ? (
                    // Mobile layout
                    <Column>
                        <View className="flex-row items-center justify-center mb-6">
                            <Logo size={28} className="mr-2" />
                            <Text className="text-white font-medium">Open Libra Blockchain Explorer</Text>
                        </View>

                        <Row justifyContent="center" className="space-x-6">
                            <TouchableOpacity onPress={() => handleLinkPress('https://openlibra.io')}>
                                <Text className="text-white hover:text-primary">Website</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => handleLinkPress('https://docs.openlibra.io')}>
                                <Text className="text-white hover:text-primary">Docs</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => handleLinkPress('http://github.com/0LNetworkCommunity')}>
                                <Text className="text-white hover:text-primary">GitHub</Text>
                            </TouchableOpacity>
                        </Row>
                    </Column>
                ) : (
                    // Desktop layout
                    <Row justifyContent="between">
                        <View className="flex-row items-center flex-none">
                            <Logo size={28} className="mr-2" />
                            <Text className="text-white font-medium whitespace-nowrap">Open Libra Blockchain Explorer</Text>
                        </View>

                        <Row className="space-x-6">
                            <TouchableOpacity onPress={() => handleLinkPress('https://openlibra.io')}>
                                <Text className="text-white hover:text-primary">Website</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => handleLinkPress('https://docs.openlibra.io')}>
                                <Text className="text-white hover:text-primary">Docs</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => handleLinkPress('http://github.com/0LNetworkCommunity')}>
                                <Text className="text-white hover:text-primary">GitHub</Text>
                            </TouchableOpacity>
                        </Row>
                    </Row>
                )}
            </Container>
        </View>
    );
}; 