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
 *
 * NOTE: all app queries are parameterized, so raw quotes are harmless data.
 * We only neutralize complete injection *sequences* (e.g. a lone trailing
 * quote immediately followed by SQL keywords, or comment tokens) instead of
 * stripping every apostrophe/semicolon, which corrupted legitimate text
 * like "O'Brien & Sons; LLC" -> "OBrien & Sons LLC".
 */
export function sanitizeSql(value: string): string {
  if (!value) return '';
  return value
    // Neutralize classic injection sequences
    .replace(/'\s*(OR|AND)\s+\d+\s*=\s*\d+\s*'/gi, " '")
    .replace(/'\s*(\s*(OR|AND)\s+['"]?[0-9a-z_-]+['"]?\s*=\s*['"]?[0-9a-z_-]+['"]?)/gi, '$1')
    .replace(/'(--|#|\s*(OR|AND)\b)/gi, '$1')
    .replace(/;\s*(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|TRUNCATE)\b/gi, ' $1')
    .replace(/\/\*.*\*\//g, '')
    .replace(/--/g, '');
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
