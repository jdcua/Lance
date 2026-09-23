import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} />
    </MotionConfig>
  </React.StrictMode>
);
