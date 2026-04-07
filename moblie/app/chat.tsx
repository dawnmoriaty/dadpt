import { PublicLayout, ResponsiveFrame } from '@/src/components/common'
import { View, Text } from 'react-native'

import { tw } from '@/src/lib/utils'

export default function ChatPage() {
    return (
        <PublicLayout>
            <ResponsiveFrame style={tw`pt-8`}>
                <View style={tw`rounded-2xl border border-gray-200 bg-white p-6`}>
                    <Text style={tw`text-2xl font-bold text-gray-900`}>AI hỗ trợ</Text>
                    <Text style={tw`mt-2 text-sm text-gray-600`}>Tính năng chat sẽ được bổ sung trong vòng tiếp theo.</Text>
                </View>
            </ResponsiveFrame>
        </PublicLayout>
    )
}
