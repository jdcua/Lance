import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { usePrefs } from './lib/prefs';
import { router } from './router';
import './index.css';

interface IdleDeadline {
  didTimeout: boolean;
  timeRemaining: () => number;
}

type IdleCallbackFn = (deadline: IdleDeadline) => void;

if (!('requestIdleCallback' in window)) {
  (window as unknown as { requestIdleCallback?: (cb: IdleCallbackFn) => ReturnType<typeof setTimeout> }).requestIdleCallback = function (cb: IdleCallbackFn) {
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
  (window as unknown as { cancelIdleCallback?: (handle: ReturnType<typeof setTimeout>) => void }).cancelIdleCallback = function (id: ReturnType<typeof setTimeout>) {
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
  useEffect(() => {
    document.documentElement.classList.toggle('motion-off', prefs.motion === 'off');
  }, [prefs.motion]);
  return (
    <MotionConfig reducedMotion={prefs.motion === 'off' ? 'always' : prefs.motion === 'full' ? 'never' : 'user'}>
      <RouterProvider router={router} />
    </MotionConfig>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
