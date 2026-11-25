import type { Invoice, Client, UserProfile } from '../types';
import { formatCurrency as formatCurrencyBase } from '../utils/format';

import { CURRENCIES, DEFAULT_CURRENCY } from './constants';

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
    if (/^en-CA/i.test(lang)) return DEFAULT_CURRENCY as CurrencyCode;
  } catch {
    /* private mode or no navigator */
  }
  return DEFAULT_CURRENCY as CurrencyCode;
}

export function getInvoiceCurrency(invoice: Invoice, client: Client, profile: UserProfile): string {
  return invoice.currency ?? client.preferred_currency ?? profile.currency;
}

export function formatCurrency(amount: number, currency: string): string {
  // Single implementation lives in utils/format (incl. non-finite guard).
  return formatCurrencyBase(amount, currency);
}

/**
 * Manual exchange rates (see UserProfile.exchange_rates).
 * Key: foreign currency code. Value: 1 unit of it in profile-currency units.
 * The profile currency itself is never listed — it converts at exactly 1.
 */

/** Drop garbage: unknown keys, non-finite or non-positive rates. */
export function sanitizeRates(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const code = String(k).trim().toUpperCase();
    const rate = typeof v === 'string' ? parseFloat(v) : (v as number);
    if (!/^[A-Z]{3}$/.test(code)) continue;
    if (typeof rate !== 'number' || !isFinite(rate) || rate <= 0) continue;
    out[code] = rate;
  }
  return out;
}

/** Accept the TEXT-column form (Tauri) as well as the object form. */
export function normalizeRates(raw: unknown): Record<string, number> {
  if (typeof raw === 'string') {
    try {
      return sanitizeRates(JSON.parse(raw));
    } catch {
      return {};
    }
  }
  return sanitizeRates(raw);
}

/** True when every non-profile currency in the list has a usable rate. */
export function ratesCover(
  currencies: Iterable<string>,
  profileCurrency: string,
  rates: Record<string, number>,
): boolean {
  const clean = sanitizeRates(rates);
  for (const cur of currencies) {
    if (cur === profileCurrency) continue;
    if (!(clean[cur] > 0)) return false;
  }
  return true;
}

/** Convert one amount into the profile currency. Returns null without a rate. */
export function convertAmount(
  amount: number,
  fromCurrency: string,
  profileCurrency: string,
  rates: Record<string, number>,
): number | null {
  if (fromCurrency === profileCurrency) return amount;
  const rate = sanitizeRates(rates)[fromCurrency];
  if (!(rate > 0)) return null;
  return amount * rate;
}

/** Sum a per-currency map into the profile currency. Null unless fully covered. */
export function convertByCurrency(
  byCurrency: Record<string, number>,
  profileCurrency: string,
  rates: Record<string, number>,
): number | null {
  const clean = sanitizeRates(rates);
  let total = 0;
  for (const [cur, amt] of Object.entries(byCurrency)) {
    if (amt === 0) continue;
    if (cur === profileCurrency) {
      total += amt;
      continue;
    }
    const rate = clean[cur];
    if (!(rate > 0)) return null;
    total += amt * rate;
  }
  return total;
}
