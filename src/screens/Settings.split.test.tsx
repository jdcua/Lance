/** Characterization tests for the Settings screen split into sections. */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Settings from './Settings';
import { useStore } from '../store';
import type { UserProfile } from '../types';

function seed(profile: Partial<UserProfile>) {
  localStorage.clear();
  const full = {
    currency: 'CAD',
    ...profile,
  } as UserProfile;
  // The screen loads its profile through the store (browser shim reads this
  // key); seeding only the store gets clobbered by loadProfile on mount.
  localStorage.setItem('lance:profile', JSON.stringify(full));
  useStore.setState({
    profile: full,
    profileLoaded: true,
  } as never);
}

function renderSettings() {
  return render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>,
  );
}

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
