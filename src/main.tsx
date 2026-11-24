import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { usePrefs } from './lib/prefs';
import { applyTheme, getTheme } from './themes/themes';
import { router } from './router';
import './index.css';

interface IdleDeadline {
  didTimeout: boolean;
  timeRemaining: () => number;
}

type IdleCallbackFn = (deadline: IdleDeadline) => void;

if (!('requestIdleCallback' in window)) {
  (
    window as unknown as {
      requestIdleCallback?: (cb: IdleCallbackFn) => ReturnType<typeof setTimeout>;
    }
  ).requestIdleCallback = function (cb: IdleCallbackFn) {
    const start = Date.now();
    return setTimeout(function () {
      cb({
        didTimeout: false,
        timeRemaining: function () {
          return Math.max(0, 50 - (Date.now() - start));
        },
      });
    }, 1);
  };
}

if (!('cancelIdleCallback' in window)) {
  (
    window as unknown as { cancelIdleCallback?: (handle: ReturnType<typeof setTimeout>) => void }
  ).cancelIdleCallback = function (id: ReturnType<typeof setTimeout>) {
    clearTimeout(id);
  };
}

// crypto.randomUUID requires a secure context (https, localhost, Tauri).
// Served over plain http (LAN IPs, some WebViews) it is missing and all
// 170+ id generations throw. Backfill once so every call site keeps working.
import { safeRandomUUID } from './utils/uuid';
if (typeof crypto !== 'undefined' && typeof crypto.randomUUID !== 'function') {
  (crypto as unknown as { randomUUID: () => string }).randomUUID = safeRandomUUID;
}

function Root() {
  const prefs = usePrefs();
  // The Motion pref must also silence CSS animations (spinners, skeletons,
  // entrances): MotionConfig only governs the motion library. 'auto' leaves
  // everything to the OS-level media query already in index.css.
  // Device auto-detect: contrast follows OS prefers-contrast unless the user
  // overrode it; text scale + motion-off come straight from prefs. Runs in
  // both the desktop app and the browser build (same code, same classes).
  useEffect(() => {
    document.documentElement.classList.toggle('motion-off', prefs.motion === 'off');
    document.documentElement.classList.toggle('textscale-112', prefs.textScale === '112');
    document.documentElement.classList.toggle('textscale-125', prefs.textScale === '125');
    document.documentElement.dataset.intensity = prefs.intensity || 'balanced';
  }, [prefs.motion, prefs.textScale, prefs.intensity]);
  // Contrast auto-detection is a SUBSCRIPTION, not a one-time read. Reading
  // matchMedia().matches at startup meant a user who turned on Increase Contrast
  // in OS Settings while Lance was running saw nothing happen until they
  // relaunched. Listening to 'change' makes "auto follows your device settings"
  // true for as long as the app is open.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-contrast: more)');
    const apply = () => {
      const osWantsContrast = query.matches;
      const high = prefs.contrast === 'high' || (prefs.contrast === 'auto' && osWantsContrast);
      document.documentElement.classList.toggle('contrast-high', high);
      document.documentElement.classList.toggle(
        'contrast-auto-boost',
        prefs.contrast === 'auto' && osWantsContrast,
      );
      // Re-apply the whole theme: the palette lives in inline custom props,
      // which beat the `.contrast-high` stylesheet rule, so the class alone
      // changes nothing. Re-applying rewrites the palette and re-pins the
      // boost exactly when the class is on.
      try {
        const themeId = localStorage.getItem('lance:theme') || 'default';
        applyTheme(getTheme(themeId));
      } catch {
        /* private mode: class toggle above still applies */
      }
    };
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [prefs.contrast]);
  return (
    <MotionConfig
      reducedMotion={prefs.motion === 'off' ? 'always' : prefs.motion === 'full' ? 'never' : 'user'}
    >
      <RouterProvider router={router} />
    </MotionConfig>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
