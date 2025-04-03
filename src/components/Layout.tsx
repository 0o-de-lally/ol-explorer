import React from 'react';
import { View, useWindowDimensions } from 'react-native';

type LayoutProps = {
    children: React.ReactNode;
    className?: string;
};

/**
 * Container component that centers content with max-width and consistent padding
 */
export const Container: React.FC<LayoutProps> = ({ children, className = '' }) => (
    <View className={`w-full mx-auto max-w-screen-lg px-4 py-4 ${className}`}>
        {children}
    </View>
);

/**
 * Grid component for column-based layouts
 * Note: In React Native with NativeWind, we need to use flexbox for grid-like layouts
 */
export const Grid: React.FC<LayoutProps & {
    cols?: 1 | 2 | 3 | 4 | 5 | 6;
    mdCols?: 1 | 2 | 3 | 4 | 5 | 6;
    lgCols?: 1 | 2 | 3 | 4 | 5 | 6;
    gap?: 1 | 2 | 3 | 4 | 5 | 6 | 8;
}> = ({
    children,
    className = '',
    cols = 1,
    mdCols = 2,
    lgCols = 3,
    gap = 4
}) => {
        const { width } = useWindowDimensions();
        const isMobile = width < 768; // md breakpoint
        const isDesktop = width >= 1024; // lg breakpoint

        // Determine columns based on screen size
        const activeCols = isDesktop ? lgCols : (isMobile ? cols : mdCols);

        // Calculate column width as a number percentage
        const colWidth = 100 / activeCols;

        // Convert numeric gap to padding value
        const gapPadding = gap * 2;

        // Create array of children
        const childrenArray = React.Children.toArray(children);

        return (
            <View className={`flex flex-row flex-wrap ${className}`} style={{ margin: -gapPadding }}>
                {childrenArray.map((child, index) => (
                    <View key={index} style={{
                        width: `${colWidth}%`,
                        padding: gapPadding,
                    }}>
                        {child}
                    </View>
                ))}
            </View>
        );
    };

/**
 * TwoColumn layout with responsive stacking
 */
export const TwoColumn: React.FC<LayoutProps & {
    leftWidth?: string;
    rightWidth?: string;
    spacing?: string;
    stackOnMobile?: boolean;
}> = ({
    children,
    className = '',
    leftWidth = 'w-1/3',
    rightWidth = 'w-2/3',
    spacing = 'md:space-x-4',
    stackOnMobile = true
}) => {
        const { width } = useWindowDimensions();
        const isMobile = width < 768; // md breakpoint
        const childrenArray = React.Children.toArray(children);

        return (
            <View className={`flex ${isMobile ? 'flex-col' : 'flex-row'} ${spacing} ${className}`}>
                <View className={`${isMobile ? 'w-full mb-4' : leftWidth}`}>
                    {childrenArray[0]}
                </View>
                <View className={`${isMobile ? 'w-full' : rightWidth} ${!isMobile && childrenArray.length > 1 ? 'md:border-l md:border-border md:pl-4' : ''}`}>
                    {childrenArray.length > 1 ? childrenArray[1] : null}
                </View>
            </View>
        );
    };

/**
 * Row component for horizontal layouts
 */
export const Row: React.FC<LayoutProps & {
    alignItems?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
    justifyContent?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
    wrap?: boolean;
}> = ({
    children,
    className = '',
    alignItems = 'center',
    justifyContent = 'start',
    wrap = false
}) => {
        const alignClass = `items-${alignItems}`;
        const justifyClass = `justify-${justifyContent}`;
        const wrapClass = wrap ? 'flex-wrap' : 'flex-nowrap';

        return (
            <View className={`flex flex-row ${alignClass} ${justifyClass} ${wrapClass} ${className}`}>
                {children}
            </View>
        );
    };

/**
 * Column component for vertical layouts
 */
export const Column: React.FC<LayoutProps & {
    alignItems?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
    justifyContent?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
}> = ({
    children,
    className = '',
    alignItems = 'start',
    justifyContent = 'start'
}) => {
        const alignClass = `items-${alignItems}`;
        const justifyClass = `justify-${justifyContent}`;

        return (
            <View className={`flex flex-col ${alignClass} ${justifyClass} ${className}`}>
                {children}
            </View>
        );
    };

/**
 * Card component for consistent styling of card elements
 */
export const Card: React.FC<LayoutProps & {
    padded?: boolean;
}> = ({
    children,
    className = '',
    padded = true
}) => {
        return (
            <View className={`bg-secondary rounded-lg ${padded ? 'p-4' : ''} ${className}`}>
                {children}
            </View>
        );
    }; 