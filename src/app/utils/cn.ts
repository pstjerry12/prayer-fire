export type ClassValue = string | number | null | false | undefined;

/**
 * Tiny className combiner. Joins truthy values with a space.
 * Keeps the bundle dependency-free (no clsx/tailwind-merge needed here).
 */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ');
}
