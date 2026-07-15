/**
 * Sanitization utilities for user input.
 * Prevents XSS and SQL injection in form fields.
 */

/**
 * Strips HTML tags and script content from user input.
 */
export function sanitizeText(value: string): string {
  if (!value) return '';
  // Remove HTML tags
  let sanitized = value.replace(/<[^>]*>/g, '');
  // Remove script content patterns
  sanitized = sanitized.replace(/javascript\s*:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  return sanitized;
}

/**
 * Sanitizes SQL-relevant characters to prevent injection.
 */
export function sanitizeSql(value: string): string {
  if (!value) return '';
  // Remove SQL injection patterns
  return value
    .replace(/['";\\]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*.*\*\//g, '');
}

/**
 * Combined sanitization for user-facing text fields.
 */
export function sanitizeInput(value: string): string {
  return sanitizeSql(sanitizeText(value));
}

/**
 * Truncate string to max length.
 */
export function truncate(value: string, maxLength: number): string {
  if (!value) return '';
  return value.slice(0, maxLength);
}

/**
 * Maximum lengths for form fields.
 */
export const MAX_LENGTHS = {
  name: 200,
  email: 254,
  company: 200,
  notes: 2000,
  title: 300,
  description: 2000,
  phone: 30,
  address: 500,
  tagline: 200,
  currency: 3,
};
