import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import UpgradeModal from './UpgradeModal';
import { useStore } from '../../store';
import type { UserProfile } from '../../types';

describe('upgrade modal pricing order', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState({
      profile: { currency: 'USD', trial_started_at: new Date().toISOString() } as UserProfile,
    });
  });

  it('lists Yearly first with Recommended, Lifetime last with no badge', () => {
    render(<UpgradeModal isOpen={true} onClose={() => {}} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual([
      expect.stringContaining('Yearly'),
      expect.stringContaining('Monthly'),
      expect.stringContaining('Lifetime'),
    ]);
    // Yearly is the default selected tab.
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    // Recommended appears on the yearly tab and its card, nowhere else.
    expect(screen.getAllByText('Recommended')).toHaveLength(2);
    // No other badges: Popular, Best value, and Lifetime badges are gone.
    expect(screen.queryByText('Popular')).toBeNull();
    expect(screen.queryByText('Best value')).toBeNull();
  });

  it('shows the trial value proof to trial users who earned', () => {
    localStorage.setItem(
      'lance:trial-value',
      JSON.stringify([{ kind: 'change-order', amount: 280, at: new Date().toISOString() }]),
    );
    render(<UpgradeModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText(/Pro has already earned you/).textContent).toContain('20x');
  });

  it('renders nothing when closed', () => {
    const { container } = render(<UpgradeModal isOpen={false} onClose={() => {}} />);
    expect(container.textContent).toBe('');
  });
});
