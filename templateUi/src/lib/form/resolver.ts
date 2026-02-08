import { zodResolver } from '@hookform/resolvers/zod'
import type { FieldValues, Resolver } from 'react-hook-form'
import type { $ZodType } from 'zod/v4/core'

/**
 * Typed zodResolver wrapper for Zod 4 + react-hook-form compatibility.
 *
 * Zod 4's `z.coerce.number()` produces `unknown` in the schema input type,
 * which causes a type mismatch with react-hook-form's Resolver generic.
 * This wrapper accepts $ZodType with FieldValues as input so it matches
 * the zodResolver overload for Zod 4 directly.
 */
export function formResolver<T extends FieldValues>(
    schema: $ZodType<T, FieldValues>,
): Resolver<T> {
    return zodResolver(schema) as Resolver<T>
}
