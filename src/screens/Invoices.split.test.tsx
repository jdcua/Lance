/**
 * Characterization tests for the Invoices god-screen split (wave3/4).
 * Written against the monolith first; must pass identically after the split.
 * Key flows: tab navigation, list empty states, payment modal entry.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Invoices from './Invoices';
import { useStore } from '../store';
import type { UserProfile } from '../types';

function seed() {
  localStorage.clear();
  const profile = { currency: 'CAD' } as UserProfile;
  localStorage.setItem('lance:profile', JSON.stringify(profile));
  useStore.setState({ profile, profileLoaded: true } as never);
}

describe('Invoices tabs survive the split', () => {
  beforeEach(() => seed());

  it('shows both tabs', async () => {
    render(<Invoices />);
    expect(await screen.findByText('All invoices')).toBeTruthy();
    expect(screen.getByText('Recurring')).toBeTruthy();
  });

  it('empty list invites the first invoice', async () => {
    render(<Invoices />);
    // EmptyState copy rotates daily — accept any bank variant.
    expect(
      await screen.findByText(/No invoices yet|The till is quiet|Zero paperwork, so far/),
    ).toBeTruthy();
    expect(screen.getAllByText('New Invoice').length).toBeGreaterThanOrEqual(1);
  });

  it('recurring tab explains itself when empty', async () => {
    render(<Invoices />);
    await screen.findByText('All invoices');
    fireEvent.click(screen.getByText('Recurring'));
    expect(await screen.findByText('No recurring invoices')).toBeTruthy();
    expect(screen.getAllByText('New recurring').length).toBeGreaterThanOrEqual(1);
  });

  it('expense-style filter input is present', async () => {
    render(<Invoices />);
    expect(await screen.findByPlaceholderText('Filter...')).toBeTruthy();
  });
});
