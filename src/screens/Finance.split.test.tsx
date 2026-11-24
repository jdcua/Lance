/**
 * Characterization tests for the Finance god-screen split (wave3/4).
 * Written against the monolith first; must pass identically after the split.
 * Key flows: tab navigation, forecast visuals, aging empty state, expense entry.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Finance from './Finance';
import { useStore } from '../store';
import type { UserProfile } from '../types';

function ui() {
  return (
    <MemoryRouter>
      <Finance />
    </MemoryRouter>
  );
}

function seed() {
  localStorage.clear();
  const profile = { currency: 'CAD' } as UserProfile;
  localStorage.setItem('lance:profile', JSON.stringify(profile));
  useStore.setState({ profile, profileLoaded: true } as never);
}

describe('Finance tabs survive the split', () => {
  beforeEach(() => seed());

  it('shows all three tabs', async () => {
    render(ui());
    expect(await screen.findByText('Overview')).toBeTruthy();
    expect(screen.getByText('Aging')).toBeTruthy();
    expect(screen.getByText('Forecast')).toBeTruthy();
  });

  it('forecast tab shows runway scrubber, money flow and runway card', async () => {
    render(ui());
    await screen.findByText('Overview');
    fireEvent.click(screen.getByText('Forecast'));
    expect(await screen.findByText('Runway scrubber')).toBeTruthy();
    expect(screen.getByText('Money flow')).toBeTruthy();
    expect(screen.getByText('Months of Runway')).toBeTruthy();
    expect(screen.getByText('Revenue Forecast')).toBeTruthy();
    expect(screen.getByText('Expense Forecast')).toBeTruthy();
  });

  it('aging tab celebrates the empty state', async () => {
    render(ui());
    await screen.findByText('Overview');
    fireEvent.click(screen.getByText('Aging'));
    expect(await screen.findByText('All invoices are paid. Nice work.')).toBeTruthy();
  });

  it('overview offers expense entry', async () => {
    render(ui());
    expect(await screen.findByText('Overview')).toBeTruthy();
    expect(screen.getAllByText('Add Expense').length).toBeGreaterThanOrEqual(1);
  });
});
