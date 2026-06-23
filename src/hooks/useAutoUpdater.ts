import { useEffect, useCallback, useRef } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { useToasts } from '../store/toastStore';

const LATER_KEY = 'lance_update_deferred_until';
const CHECK_INTERVAL = 4 * 60 * 60 * 1000;
const INITIAL_DELAY = 3000;
const DEFER_DURATION = 24 * 60 * 60 * 1000;

export function useAutoUpdater() {
  const addToast = useToasts((s) => s.add);
  const updateToast = useToasts((s) => s.update);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const doCheck = useCallback(async () => {
    try {
      const deferredUntil = localStorage.getItem(LATER_KEY);
      if (deferredUntil && Date.now() < parseInt(deferredUntil, 10)) return;

      const update = await check();
      if (!update) return;

      addToast(`Lance ${update.version} is available`, 'info', undefined, [
        {
          label: 'Update Now',
          onClick: () => {
            void (async () => {
              try {
                const toastId = addToast('Downloading update...', 'info');
                await update.downloadAndInstall((event) => {
                  if (event.event === 'Progress' && toastId) {
                    const mb = (event.data.chunkLength / (1024 * 1024)).toFixed(1);
                    updateToast(toastId, `Downloading update... (${mb} MB)`);
                  }
                });
                if (toastId) {
                  updateToast(toastId, 'Update installed — relaunching...');
                }
                await relaunch();
              } catch {
                /* silent */
              }
            })();
          },
        },
        {
          label: 'Later',
          onClick: () => {
            localStorage.setItem(LATER_KEY, String(Date.now() + DEFER_DURATION));
          },
        },
      ]);
    } catch {
      /* silent */
    }
  }, [addToast, updateToast]);

  useEffect(() => {
    timerRef.current = setTimeout(doCheck, INITIAL_DELAY);
    intervalRef.current = setInterval(doCheck, CHECK_INTERVAL);
    return () => {
      clearTimeout(timerRef.current);
      clearInterval(intervalRef.current);
    };
  }, [doCheck]);
}
