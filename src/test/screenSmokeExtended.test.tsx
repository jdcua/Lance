/**
 * Screen coverage for the screens the original smoke suite never rendered.
 * Every case asserts a stable heading or a behavior that can actually fail.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useStore } from '../store';
import Dashboard from '../screens/Dashboard';
import Finance from '../screens/Finance';
import NewProposal from '../screens/NewProposal';
import NotFound from '../screens/NotFound';
import Onboarding from '../screens/Onboarding';
import Proposals from '../screens/Proposals';
import SearchScreen from '../screens/Search';
import Settings from '../screens/Settings';
import ShareView from '../screens/ShareView';
import AffordabilityBanner from '../screens/finance/AffordabilityBanner';
import { getMonthKey } from '../lib/forecast';
import type { UserProfile } from '../types';

vi.mock('../db', () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockResolvedValue([]),
    execute: vi.fn().mockResolvedValue(undefined),
  }),
  getCurrentSchemaVersion: vi.fn().mockReturnValue(1),
}));

function seedProfile() {
  const profile = { currency: 'CAD', name: 'Smoke Tester' } as UserProfile;
  localStorage.setItem('lance:profile', JSON.stringify(profile));
  useStore.setState({ profile, profileLoaded: true } as never);
}

const wrap = (node: React.ReactNode, path = '/') => (
  <MemoryRouter initialEntries={[path]}>{node}</MemoryRouter>
);

const thisMonth = getMonthKey(new Date());
const cases = [
  { name: 'Dashboard', node: <Dashboard />, text: 'Dashboard' },
  { name: 'Finance', node: <Finance />, text: 'Finance', seed: true },
  { name: 'NewProposal', node: <NewProposal />, text: 'New Proposal' },
  { name: 'NotFound', node: <NotFound />, text: 'Off the map' },
  { name: 'Onboarding', node: <Onboarding />, text: 'Set up Lance' },
  { name: 'Proposals', node: <Proposals />, text: 'Proposals' },
  { name: 'Search', node: <SearchScreen />, text: 'Start typing to search' },
  { name: 'Settings', node: <Settings />, text: 'Full name', seed: true },
  { name: 'ShareView', node: <ShareView />, text: 'Share link not found' },
  {
    name: 'AffordabilityBanner',
    node: (
      <AffordabilityBanner
        monthlyPaid={{ [thisMonth]: 1000 }}
        monthlyExpenses={{}}
        fmt={(n) => `$${n}`}
      />
    ),
    text: 'This month:',
  },
];

describe('extended screen smoke', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState(useStore.getInitialState());
    vi.clearAllMocks();
  });

  it.each(cases)('$name shows its stable heading', async ({ node, text, seed }) => {
    if (seed) seedProfile();
    render(wrap(node));
    expect(await screen.findByText(text)).toBeTruthy();
  });

  it('Proposals offers creation once a client exists', async () => {
    localStorage.setItem(
      'lance:store:clients',
      JSON.stringify([{ id: 'c1', name: 'Client One', created_at: '2026-01-01' }]),
    );
    render(wrap(<Proposals />));
    expect(await screen.findByText('No proposals yet')).toBeTruthy();
    const buttons = screen.getAllByText('New Proposal').map((el) => el.closest('button'));
    expect(buttons.some((button) => button && !button.disabled)).toBe(true);
  });

  it('Search reports an unmatched query instead of going blank', async () => {
    render(wrap(<SearchScreen />, '/search?q=zzzz-no-match'));
    expect(await screen.findByText('No results found')).toBeTruthy();
    expect(screen.getByText(/Search results for/)).toBeTruthy();
  });

  it('Onboarding advances from profession to features', async () => {
    render(wrap(<Onboarding />));
    expect(await screen.findByText('What do you do?')).toBeTruthy();
    fireEvent.click(screen.getByText('Continue →'));
    expect(await screen.findByText('Features')).toBeTruthy();
    expect(screen.getByText('Colours')).toBeTruthy();
  });
});
