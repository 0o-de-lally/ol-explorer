import React from 'react';
import {View, useWindowDimensions} from 'react-native';

type LayoutProps = {
    children: React.ReactNode;
    className?: string;
};

/**
 * Container component that centers content with max-width and consistent padding
 */
export const Container: React.FC<LayoutProps & {
    width?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'; // Allow specifying container width
    centered?: boolean; // Whether to center the container at all screen sizes
}> = ({
    children,
    className = '',
    width = 'lg',
    centered = true
}) => {
        // Map width option to actual max-width class
        let maxWidthClass;
        switch (width) {
            case 'sm': maxWidthClass = 'max-w-screen-sm'; break; // 640px
            case 'md': maxWidthClass = 'max-w-screen-md'; break; // 768px
            case 'lg': maxWidthClass = 'max-w-screen-lg'; break; // 1024px
            case 'xl': maxWidthClass = 'max-w-screen-xl'; break; // 1280px
            case '2xl': maxWidthClass = 'max-w-screen-2xl'; break; // 1536px
            case 'full': maxWidthClass = 'w-full'; break; // No max width
            default: maxWidthClass = 'max-w-screen-lg'; // Default to lg
        }

        return (
            <View className={`w-full ${centered ? 'mx-auto' : ''} ${maxWidthClass} px-2 sm:px-4 py-4 ${className}`}>
                {children}
            </View>
        );
    };

/**
 * Grid component for column-based layouts with responsive behavior
 * Provides a consistent grid system that works across different screen sizes
 */
export const Grid: React.FC<LayoutProps & {
    cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
    smCols?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
    mdCols?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
    lgCols?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
    xlCols?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
    gap?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10;
    containerWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    fullBleed?: boolean; // Whether the grid should ignore container padding
    centered?: boolean; // Whether the grid should be centered
}> = ({
    children,
    className = '',
    cols = 1,
    smCols,
    mdCols = 2,
    lgCols = 3,
    xlCols,
    gap = 4,
    containerWidth = 'lg',
    fullBleed = false,
    centered = true
}) => {
        // Determine responsive column classes
        const colClasses = [`grid-cols-${cols}`];
        if (smCols) colClasses.push(`sm:grid-cols-${smCols}`);
        if (mdCols) colClasses.push(`md:grid-cols-${mdCols}`);
        if (lgCols) colClasses.push(`lg:grid-cols-${lgCols}`);
        if (xlCols) colClasses.push(`xl:grid-cols-${xlCols}`);

        // Map gap to Tailwind gap classes
        const gapClass = gap === 0 ? '' : `gap-${gap}`;

        // Map width option to actual max-width class
        let maxWidthClass = '';
        if (containerWidth !== 'full') {
            switch (containerWidth) {
                case 'sm': maxWidthClass = 'max-w-screen-sm'; break; // 640px
                case 'md': maxWidthClass = 'max-w-screen-md'; break; // 768px
                case 'lg': maxWidthClass = 'max-w-screen-lg'; break; // 1024px
                case 'xl': maxWidthClass = 'max-w-screen-xl'; break; // 1280px
                case '2xl': maxWidthClass = 'max-w-screen-2xl'; break; // 1536px
                default: maxWidthClass = 'max-w-screen-lg'; // Default to lg
            }
        }

        // Create array of children
        const childrenArray = React.Children.toArray(children);

        // Determine padding based on fullBleed option
        const paddingClass = fullBleed ? '' : 'px-2 sm:px-4';

        return (
            <View className={`w-full ${centered ? 'mx-auto' : ''} ${maxWidthClass} ${paddingClass}`}>
                <View className={`grid ${colClasses.join(' ')} ${gapClass} ${className}`}>
                    {childrenArray.map((child, index) => (
                        <View key={index} className="w-full">
                            {child}
                        </View>
                    ))}
                </View>
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
    leftWidth = 'w-full md:w-1/3',
    rightWidth = 'w-full md:w-2/3',
    spacing = 'space-y-4 md:space-y-0 md:space-x-4',
    stackOnMobile = true
}) => {
        const childrenArray = React.Children.toArray(children);

        return (
            <View className={`flex flex-col md:flex-row ${spacing} ${className}`}>
                <View className={`${leftWidth}`}>
                    {childrenArray[0]}
                </View>
                <View className={`${rightWidth} ${childrenArray.length > 1 ? 'md:border-l md:border-border md:pl-4' : ''}`}>
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
            <View className={`bg-secondary rounded-lg w-full ${padded ? 'p-4' : ''} ${className}`}>
                {children}
            </View>
        );
    }; 