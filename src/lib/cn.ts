/**
 * Shared helpers for composing class names.
 *
 * `clsx` flattens conditionals and `tailwind-merge` resolves conflicting
 * utilities, so a component can accept a `className` override without the caller
 * having to know the base classes. Keeping the wrapper here means every
 * primitive behaves the same way.
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
