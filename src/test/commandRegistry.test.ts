import { describe, it, expect, vi } from 'vitest';
import { CommandRegistry } from '../lib/commands';

describe('command registry', () => {
  it('dispatches immediately when a handler is mounted', () => {
    const registry = new CommandRegistry();
    const handler = vi.fn();
    registry.on('lance:add-client', handler);
    registry.dispatchAfterMount('lance:add-client');
    expect(handler).toHaveBeenCalledOnce();
  });

  it('delivers a deep-link intent when the owning screen mounts', () => {
    const registry = new CommandRegistry();
    const handler = vi.fn();
    registry.dispatchAfterMount('lance:add-invoice');
    expect(handler).not.toHaveBeenCalled();
    registry.on('lance:add-invoice', handler);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('delivers a queued detail only once', () => {
    const registry = new CommandRegistry();
    const handler = vi.fn();
    registry.dispatchAfterMount('lance:edit-client', 'client-1');
    registry.on('lance:edit-client', handler);
    registry.on('lance:edit-client', vi.fn());
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith('client-1');
  });
});
