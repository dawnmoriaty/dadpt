import { ReactNode } from 'react'
import { StyleProp, View, ViewStyle } from 'react-native'

import { useWebBreakpoint } from '@/src/hooks/use-web-breakpoint'

interface ResponsiveFrameProps {
    children: ReactNode
    style?: StyleProp<ViewStyle>
}

export function ResponsiveFrame({ children, style }: ResponsiveFrameProps) {
    const { frame } = useWebBreakpoint()

    return (
        <View
            style={[
                {
                    alignSelf: 'center',
                    width: '100%',
                    maxWidth: frame.maxWidth,
                    paddingHorizontal: frame.horizontalPadding,
                },
                style,
            ]}
        >
            {children}
        </View>
    )
}
