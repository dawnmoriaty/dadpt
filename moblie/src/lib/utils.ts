import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import twrnc from 'twrnc'

/**
 * Merge tailwind classes.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Creates React Native style objects from Tailwind classes.
 * Usage: style={tw`flex-1 bg-white p-4`}
 */
 
export const tw = twrnc
