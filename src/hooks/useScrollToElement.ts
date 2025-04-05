import {useRef} from 'react';
import {Platform, ScrollView} from 'react-native';

/**
 * Hook to provide scrolling functionality across web and native platforms
 * 
 * @returns An object with scrolling utility functions
 */
export const useScrollToElement = () => {
    // Store measured positions of elements for native scrolling
    const elementPositions = useRef<Record<string, number>>({});

    /**
     * Register an element's position for native scrolling
     * @param id Unique identifier for the element
     * @param position Y-position of the element
     */
    const registerElementPosition = (id: string, position: number) => {
        elementPositions.current[id] = position;
    };

    /**
     * Scroll to an element by ID (web) or to a position (native)
     * @param options Scrolling options
     */
    const scrollToElement = (options: {
        // Element ID to scroll to (for web)
        elementId?: string;
        // ScrollView ref for React Native
        scrollViewRef?: React.RefObject<ScrollView>;
        // Position to scroll to (for React Native)
        position?: number;
        // Element name in the stored positions
        elementName?: string;
        // Offset from the top (default: 20px)
        offset?: number;
        // Delay before scrolling (default: 100ms)
        delay?: number;
    }) => {
        const {
            elementId,
            scrollViewRef,
            position,
            elementName,
            offset = 20,
            delay = 100
        } = options;

        setTimeout(() => {
            if (Platform.OS === 'web') {
                try {
                    const element = elementId ? document.getElementById(elementId) : null;
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        window.scrollBy({ top: -offset, behavior: 'smooth' });
                    }
                } catch (err) {
                    console.log('Web scrolling failed:', err);
                }
            } else {
                // Native scrolling
                if (scrollViewRef?.current) {
                    // If a direct position is provided, use it
                    if (typeof position === 'number') {
                        const scrollToY = Math.max(0, position - offset);
                        scrollViewRef.current.scrollTo({
                            y: scrollToY,
                            animated: true
                        });
                    }
                    // If an element name is provided, look it up in our stored positions
                    else if (elementName && elementPositions.current[elementName]) {
                        const scrollToY = Math.max(0, elementPositions.current[elementName] - offset);
                        scrollViewRef.current.scrollTo({
                            y: scrollToY,
                            animated: true
                        });
                    }
                }
            }
        }, delay);
    };

    return {
        registerElementPosition,
        scrollToElement
    };
}; 