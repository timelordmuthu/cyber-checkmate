import { beforeEach } from 'vitest'

// ── Observers stubs ────────────────────────────────────────────────────────
// jsdom does not implement ResizeObserver or IntersectionObserver.
// React Bits components (AnimatedList, MagicBento, CountUp) use them on mount.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// ── matchMedia stub ────────────────────────────────────────────────────────
// jsdom does not implement matchMedia.
// gsap (ScrollTrigger) and lib/fx.js call window.matchMedia on module load.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

// ── requestAnimationFrame stub ─────────────────────────────────────────────
// jsdom provides rAF but it stalls under vi.useFakeTimers() unless the test
// explicitly advances timers.  SwipeToast uses rAF on mount when
// CSSStartingStyleRule is absent (always true in jsdom).  We wrap it so the
// callback fires via a real (non-fake) microtask in tests.
const _nativeRAF = globalThis.requestAnimationFrame
globalThis.requestAnimationFrame = function safeRAF(cb) {
  // Use queueMicrotask so it resolves inside React's act() even under fake
  // timers, without needing the caller to advance time.
  return _nativeRAF
    ? _nativeRAF.call(globalThis, cb)
    : (queueMicrotask(cb), 0)
}
if (!globalThis.cancelAnimationFrame) {
  globalThis.cancelAnimationFrame = () => {}
}

// ── Web Animations API stub ────────────────────────────────────────────────
// jsdom does not implement element.animate().
// SwipeToast calls fuseRef.current.animate() for its fuse-bar countdown.
// Minimal no-op stub — toast removal is driven by ToastContext's own
// setTimeout, so we don't need onfinish to fire.
if (typeof Element !== 'undefined' && !Element.prototype.animate) {
  Element.prototype.animate = function stubAnimate(_keyframes, _options) {
    let _onfinish = null
    return {
      playState: 'running',
      pause()  {},
      play()   {},
      cancel() { _onfinish = null },
      get onfinish()     { return _onfinish },
      set onfinish(fn)   { _onfinish = fn },
    }
  }
}

// ── CSSStartingStyleRule: keep absent ─────────────────────────────────────
// SwipeToast checks `'CSSStartingStyleRule' in window`. When absent it uses
// the rAF path (handled above). We deliberately do NOT define it.

class StorageMock {
  constructor() {
    this.store = {}
  }

  get length() {
    return Object.keys(this.store).length
  }

  key(index) {
    const keys = Object.keys(this.store)
    return keys[index] !== undefined ? keys[index] : null
  }

  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null
  }

  setItem(key, value) {
    this.store[key] = String(value)
  }

  removeItem(key) {
    delete this.store[key]
  }

  clear() {
    this.store = {}
  }
}

export function createStorage() {
  return new StorageMock()
}

// Set React act environment
globalThis.IS_REACT_ACT_ENVIRONMENT = true

// Reset storage before each test
beforeEach(() => {
  const local = new StorageMock()
  const session = new StorageMock()

  try {
    globalThis.localStorage = local
    globalThis.sessionStorage = session
  } catch {
    // ignore
  }

  if (typeof window !== 'undefined') {
    try {
      Object.defineProperty(window, 'localStorage', {
        value: local,
        configurable: true,
        writable: true,
      })
      Object.defineProperty(window, 'sessionStorage', {
        value: session,
        configurable: true,
        writable: true,
      })
    } catch {
      window.localStorage = local
      window.sessionStorage = session
    }
  }
})
