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
