/**
 * Characterization tests for the Settings god-screen split (wave3/4).
 * Written against the monolith first; must pass identically after the split.
 * Key flows: license states (trial/expired/licensed), profile fields,
 * appearance themes, danger-zone licensing actions. Licensing copy and
 * logic are asserted byte-for-byte — the split moves them, never rewrites.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Settings from './Settings';
import { useStore } from '../store';
import type { UserProfile } from '../types';

function seed(profile: Partial<UserProfile>, extra: Record<string, unknown> = {}) {
  localStorage.clear();
  const full = {
    currency: 'CAD',
    trial_started_at: new Date().toISOString(),
    ...profile,
  } as UserProfile;
  // The screen loads its profile through the store (browser shim reads this
  // key); seeding only the store gets clobbered by loadProfile on mount.
  localStorage.setItem('lance:profile', JSON.stringify(full));
  useStore.setState({
    profile: full,
    profileLoaded: true,
    isLicensed: false,
    ...extra,
  } as never);
}

function renderSettings() {
  return render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>,
  );
}

describe('Settings license states', () => {
  beforeEach(() => seed({}));

  it('trial shows countdown, key entry and Pro price', async () => {
    renderSettings();
    expect(await screen.findByText(/days left/)).toBeTruthy();
    expect(screen.getByText('Enter license key')).toBeTruthy();
    expect(screen.getByText('Get Pro ($99/yr)')).toBeTruthy();
  });

  it('expired trial keeps data-safe copy', async () => {
    seed({ trial_started_at: new Date(Date.now() - 60 * 86400000).toISOString() });
    renderSettings();
    expect(await screen.findByText(/Your Pro trial ended/)).toBeTruthy();
    expect(screen.getByText(/Core stays free forever/)).toBeTruthy();
  });

  it('licensed shows badge, themes note and remove flow entry', async () => {
    seed(
      {
        license_key: 'LANCE-AAAA-BBBB-CCCC-DDDD',
        license_tier: 'pro',
        licensed_at: new Date().toISOString(),
      },
      { isLicensed: true },
    );
    renderSettings();
    // Licensed wordmark + Licensed pill (byte-for-byte copy, both present).
    expect((await screen.findAllByText('Licensed')).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/All themes unlocked/)).toBeTruthy();
    fireEvent.click(screen.getByText('Danger Zone'));
    expect(screen.getByText('Remove license')).toBeTruthy();
  });
});

describe('Settings sections survive the split', () => {
  beforeEach(() => seed({ name: 'Split Tester' }));

  it('profile fields render on General', async () => {
    renderSettings();
    expect(await screen.findByText('Full name')).toBeTruthy();
    expect(screen.getByText('Default currency')).toBeTruthy();
    expect(screen.getByText('Proposal voice')).toBeTruthy();
  });

  it('appearance lists all seven themes', async () => {
    renderSettings();
    fireEvent.click(await screen.findByText('Appearance'));
    for (const name of ['Default', 'Studio', 'Terminal', 'Craft', 'Motion', 'Lens', 'Scale']) {
      expect(screen.getByText(name, { selector: 'p' })).toBeTruthy();
    }
  });

  it('data section offers export and import', async () => {
    renderSettings();
    fireEvent.click(await screen.findByText('Data & Backup'));
    expect(screen.getByText('Export all data')).toBeTruthy();
    expect(screen.getByText('Import data')).toBeTruthy();
  });

  it('notifications explain the no-auto-send rule', async () => {
    renderSettings();
    fireEvent.click(await screen.findByText('Notifications'));
    expect(screen.getByText(/never\s*sent automatically/)).toBeTruthy();
  });
});
