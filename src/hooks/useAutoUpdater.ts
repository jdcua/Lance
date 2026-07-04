import { useEffect, useCallback, useRef } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { useUpdaterStore } from '../store/updaterStore';

const LATER_KEY = 'lance_update_deferred_until';
const CHECK_INTERVAL = 4 * 60 * 60 * 1000;
const INITIAL_DELAY = 3000;

export function useAutoUpdater() {
  const setUpdateAvailable = useUpdaterStore((s) => s.setUpdateAvailable);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const doCheck = useCallback(async () => {
    try {
      const deferredUntil = localStorage.getItem(LATER_KEY);
      if (deferredUntil && Date.now() < parseInt(deferredUntil, 10)) return;

      const update = await check();
      if (!update) return;

      setUpdateAvailable(update);
    } catch {
      /* silent */
    }
  }, [setUpdateAvailable]);

  useEffect(() => {
    timerRef.current = setTimeout(doCheck, INITIAL_DELAY);
    intervalRef.current = setInterval(doCheck, CHECK_INTERVAL);
    return () => {
      clearTimeout(timerRef.current);
      clearInterval(intervalRef.current);
    };
  }, [doCheck]);
}
