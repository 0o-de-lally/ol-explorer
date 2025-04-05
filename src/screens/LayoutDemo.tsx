import React from 'react';
import {Text, View, useWindowDimensions, TouchableOpacity} from 'react-native';
import {Container, Row, Column, Card, Grid, TwoColumn} from '../components';
import {useNavigation} from '@react-navigation/native';

const ColorBlock = ({ color, title }: { color: string, title: string }) => (
    <View className={`${color} p-3 rounded-lg shadow-sm`}>
        <Text className="text-white font-bold text-center">{title}</Text>
    </View>
);

export const LayoutDemoScreen = () => {
    const navigation = useNavigation();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 768;

    return (
        <View className="bg-background flex-1">
            <Container>
                <Row alignItems="center" className="mb-5">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
                        <Text className="text-primary font-bold">← Back</Text>
                    </TouchableOpacity>
                    <Text className="text-white text-2xl font-bold">Layout Components Demo</Text>
                </Row>

                {/* Container Demo */}
                <Card className="mb-6">
                    <Text className="text-white text-lg font-bold mb-3">Container</Text>
                    <Text className="text-gray-400 mb-4">The Container component centers content with a max width and consistent padding.</Text>
                    <View className="bg-background p-4 rounded border border-gray-700">
                        <Text className="text-white text-center">This content is inside a Container</Text>
                    </View>
                </Card>

                {/* Row Demo */}
                <Card className="mb-6">
                    <Text className="text-white text-lg font-bold mb-3">Row</Text>
                    <Text className="text-gray-400 mb-4">The Row component creates a horizontal layout with flexbox.</Text>

                    <Text className="text-white text-sm mb-2">Default Row:</Text>
                    <Row className="mb-4">
                        <ColorBlock color="bg-red-500" title="Item 1" />
                        <ColorBlock color="bg-green-500" title="Item 2" />
                        <ColorBlock color="bg-blue-500" title="Item 3" />
                    </Row>

                    <Text className="text-white text-sm mb-2">Row with space-between:</Text>
                    <Row justifyContent="between" className="mb-4">
                        <ColorBlock color="bg-red-500" title="Item 1" />
                        <ColorBlock color="bg-green-500" title="Item 2" />
                        <ColorBlock color="bg-blue-500" title="Item 3" />
                    </Row>

                    <Text className="text-white text-sm mb-2">Row with center alignment:</Text>
                    <Row justifyContent="center" className="mb-4">
                        <ColorBlock color="bg-red-500" title="Item 1" />
                        <ColorBlock color="bg-green-500" title="Item 2" />
                        <ColorBlock color="bg-blue-500" title="Item 3" />
                    </Row>
                </Card>

                {/* Column Demo */}
                <Card className="mb-6">
                    <Text className="text-white text-lg font-bold mb-3">Column</Text>
                    <Text className="text-gray-400 mb-4">The Column component creates a vertical layout with flexbox.</Text>

                    <Column className="mb-4 space-y-2">
                        <ColorBlock color="bg-red-500" title="Item 1" />
                        <ColorBlock color="bg-green-500" title="Item 2" />
                        <ColorBlock color="bg-blue-500" title="Item 3" />
                    </Column>
                </Card>

                {/* Grid Demo */}
                <Card className="mb-6">
                    <Text className="text-white text-lg font-bold mb-3">Grid</Text>
                    <Text className="text-gray-400 mb-4">The Grid component creates a responsive grid layout. Current screen width: {width}px</Text>

                    <Text className="text-white text-sm mb-2">Grid with 2 columns (1 column on mobile):</Text>
                    <Grid cols={1} mdCols={2} lgCols={2} className="mb-4">
                        <ColorBlock color="bg-purple-500" title="Grid Item 1" />
                        <ColorBlock color="bg-indigo-500" title="Grid Item 2" />
                        <ColorBlock color="bg-blue-500" title="Grid Item 3" />
                        <ColorBlock color="bg-green-500" title="Grid Item 4" />
                    </Grid>

                    <Text className="text-white text-sm mb-2">Grid with 3 columns on desktop:</Text>
                    <Grid cols={1} mdCols={2} lgCols={3} className="mb-4">
                        <ColorBlock color="bg-red-500" title="Grid Item 1" />
                        <ColorBlock color="bg-orange-500" title="Grid Item 2" />
                        <ColorBlock color="bg-yellow-500" title="Grid Item 3" />
                        <ColorBlock color="bg-green-500" title="Grid Item 4" />
                        <ColorBlock color="bg-blue-500" title="Grid Item 5" />
                        <ColorBlock color="bg-purple-500" title="Grid Item 6" />
                    </Grid>
                </Card>

                {/* TwoColumn Demo */}
                <Card className="mb-6">
                    <Text className="text-white text-lg font-bold mb-3">TwoColumn</Text>
                    <Text className="text-gray-400 mb-4">
                        The TwoColumn component creates a two-column layout that stacks on mobile.
                        Current display mode: {isDesktop ? 'Desktop (side-by-side)' : 'Mobile (stacked)'}
                    </Text>

                    <TwoColumn leftWidth="w-1/3" rightWidth="w-2/3" className="mb-4">
                        <View className="bg-indigo-800 p-4 rounded-lg">
                            <Text className="text-white font-bold">Left Column (1/3)</Text>
                            <Text className="text-white mt-2">This column takes up 1/3 of the width on desktop and stacks on mobile.</Text>
                        </View>
                        <View className="bg-purple-800 p-4 rounded-lg">
                            <Text className="text-white font-bold">Right Column (2/3)</Text>
                            <Text className="text-white mt-2">This column takes up 2/3 of the width on desktop and stacks on mobile.</Text>
                        </View>
                    </TwoColumn>

                    <TwoColumn leftWidth="w-1/2" rightWidth="w-1/2" className="mb-4">
                        <View className="bg-blue-800 p-4 rounded-lg">
                            <Text className="text-white font-bold">Left Column (1/2)</Text>
                            <Text className="text-white mt-2">An even split with 50% width for each column on desktop.</Text>
                        </View>
                        <View className="bg-green-800 p-4 rounded-lg">
                            <Text className="text-white font-bold">Right Column (1/2)</Text>
                            <Text className="text-white mt-2">An even split with 50% width for each column on desktop.</Text>
                        </View>
                    </TwoColumn>
                </Card>

                {/* Card Demo */}
                <Card className="mb-6">
                    <Text className="text-white text-lg font-bold mb-3">Card</Text>
                    <Text className="text-gray-400 mb-4">The Card component creates a styled container with consistent appearance.</Text>

                    <Card className="bg-secondary-dark mb-4">
                        <Text className="text-white font-bold">Nested Card</Text>
                        <Text className="text-gray-300 mt-2">Cards can be nested inside each other for complex layouts.</Text>
                    </Card>

                    <Row className="space-x-4">
                        <Card className="bg-primary-dark flex-1">
                            <Text className="text-white font-bold">Card 1</Text>
                        </Card>
                        <Card className="bg-secondary-dark flex-1">
                            <Text className="text-white font-bold">Card 2</Text>
                        </Card>
                        <Card className="bg-gray-800 flex-1">
                            <Text className="text-white font-bold">Card 3</Text>
                        </Card>
                    </Row>
                </Card>
            </Container>
        </View>
    );
}; 