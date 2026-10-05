import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';

describe('createRenderLog guards (store boundary)', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState({ renderLogs: [] } as never);
  });

  it('stores a valid pass intact', async () => {
    const log = await useStore.getState().createRenderLog({
      project_id: 'p1',
      pass_name: 'Beauty',
      duration_minutes: 90,
      software: 'Blender',
    } as never);
    expect(log.duration_minutes).toBe(90);
    expect(useStore.getState().renderLogs).toHaveLength(1);
  });

  it('coerces garbage durations to undefined instead of storing NaN/negatives', async () => {
    for (const bad of [NaN, -5, Infinity, 'abc' as never, 99999999]) {
      const log = await useStore.getState().createRenderLog({
        project_id: 'p1',
        pass_name: 'X',
        duration_minutes: bad,
      } as never);
      expect(log.duration_minutes).toBeUndefined();
    }
  });

  it('sanitizes text payloads', async () => {
    const log = await useStore.getState().createRenderLog({
      project_id: 'p1',
      pass_name: '<img src=x onerror=alert(1)>Beauty',
      notes: 'ok<script>',
    } as never);
    expect(log.pass_name).not.toMatch(/<|>/);
    expect(log.notes).not.toMatch(/<|>/);
  });
});
