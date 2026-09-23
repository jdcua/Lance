import '@testing-library/jest-dom';

// jsdom lacks IntersectionObserver (used by motion's whileInView) and
// matchMedia (used by MotionConfig reducedMotion="user"). Provide minimal
// mocks so component tests render instead of crashing.
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin = '';
  readonly thresholds: ReadonlyArray<number> = [];
  private callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element): void {
    // Report immediately intersecting so whileInView content renders.
    this.callback(
      [
        {
          isIntersecting: true,
          target,
          intersectionRatio: 1,
        } as IntersectionObserverEntry,
      ],
      this,
    );
  }

  unobserve(): void {
    /* noop */
  }

  disconnect(): void {
    /* noop */
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  static toString(): string {
    return 'function IntersectionObserver() { [native code] }';
  }
}

if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) {
  window.IntersectionObserver = MockIntersectionObserver;
}

if (typeof window !== 'undefined' && !('matchMedia' in window)) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
