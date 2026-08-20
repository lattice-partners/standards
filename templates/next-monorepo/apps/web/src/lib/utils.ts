import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge conditional class names and let later Tailwind utilities win over
 * earlier conflicting ones. Every shadcn/ui component depends on this.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
