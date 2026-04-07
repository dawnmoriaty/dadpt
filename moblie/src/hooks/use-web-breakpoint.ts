import { useWindowDimensions } from 'react-native'

export function useWebBreakpoint() {
    const { width } = useWindowDimensions()

    const isSmUp = width >= 640
    const isMdUp = width >= 768
    const isLgUp = width >= 1024

    return {
        width,
        isSmUp,
        isMdUp,
        isLgUp,
        frame: {
            maxWidth: isLgUp ? 1152 : isSmUp ? 768 : 428,
            horizontalPadding: isSmUp ? 24 : 16,
            sectionGap: isSmUp ? 20 : 16,
        },
    }
}
