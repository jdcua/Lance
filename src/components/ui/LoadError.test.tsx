import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LoadError from './LoadError';

describe('LoadError', () => {
  it('renders nothing without an error', () => {
    const { container } = render(<LoadError error={null} onRetry={() => {}} />);
    expect(container.innerHTML).toBe('');
    const { container: c2 } = render(<LoadError error={undefined} onRetry={() => {}} />);
    expect(c2.innerHTML).toBe('');
  });

  it('shows the message with an alert role and fires retry', () => {
    const onRetry = vi.fn();
    render(<LoadError error="Database exploded" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Database exploded')).toBeTruthy();
    fireEvent.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
