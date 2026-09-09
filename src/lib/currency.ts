import type { Invoice, Client, UserProfile } from '../types';

export const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'AUD'] as const;

const CURRENCY_SYMBOLS: Record<string, string> = {
  CAD: 'CA$',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
};

export function getCurrencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] || code;
}

export type CurrencyCode = (typeof CURRENCIES)[number];

/** Best-guess default currency from the browser locale. Falls back to CAD. */
export function defaultCurrency(): CurrencyCode {
  try {
    const lang = typeof navigator !== 'undefined' ? navigator.language || '' : '';
    if (/^en-GB/i.test(lang)) return 'GBP';
    if (/^en-AU/i.test(lang)) return 'AUD';
    if (/^en-US/i.test(lang)) return 'USD';
    if (/^(de|fr|es|it|nl|pt|el|fi|ga)(-|$)/i.test(lang)) return 'EUR';
    if (/^en-CA/i.test(lang)) return 'CAD';
  } catch {
    /* private mode or no navigator */
  }
  return 'CAD';
}

export function getInvoiceCurrency(
  invoice: Invoice,
  client: Client,
  profile: UserProfile,
): string {
  return invoice.currency ?? client.preferred_currency ?? profile.currency;
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
  }).format(amount);
}
