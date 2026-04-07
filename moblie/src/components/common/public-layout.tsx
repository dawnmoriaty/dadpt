import { ReactNode } from 'react'
import { View } from 'react-native'

import { userTheme } from '@/src/constants/user-theme'

import { PublicHeader } from './public-header'

interface PublicLayoutProps {
    children: ReactNode
}

export function PublicLayout({ children }: PublicLayoutProps) {
    return (
        <View style={{ flex: 1, backgroundColor: userTheme.colors.background }}>
            <PublicHeader />
            <View style={{ flex: 1, alignSelf: 'center', width: '100%', maxWidth: 1280 }}>{children}</View>
        </View>
    )
}
