import { useState } from 'react'

import { useChatStore } from './index'

export function useChatInput() {
    const [input, setInput] = useState('')
    const { isLoading, sendMessage } = useChatStore()

    const send = async () => {
        const text = input.trim()
        if (!text || isLoading) return
        setInput('')
        await sendMessage(text)
    }

    return {
        input,
        setInput,
        send,
        isLoading,
    }
}
