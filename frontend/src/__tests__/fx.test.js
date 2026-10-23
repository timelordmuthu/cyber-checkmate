/**
 * src/__tests__/fx.test.js
 * Tests for src/lib/fx.js — detectFxTier and useOnlyOneWebGL
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createElement, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { detectFxTier, useOnlyOneWebGL, _resetWebGLRegistry } from '../lib/fx.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Run a hook-returning component and collect returned values. */
function renderHookRaw(useHookFn) {
  const collected = [];
  function HookCapture() {
    collected.push(useHookFn());
    return null;
  }
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root;
  act(() => {
    root = createRoot(container);
    root.render(createElement(HookCapture));
  });
  return {
    get current() { return collected[collected.length - 1]; },
    collected,
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

// ---------------------------------------------------------------------------
// detectFxTier
// ---------------------------------------------------------------------------

describe('detectFxTier', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function stubMatchMedia(matches) {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  }

  function stubNavigator(overrides) {
    Object.defineProperty(globalThis, 'navigator', {
      value: { hardwareConcurrency: 8, ...overrides },
      configurable: true,
      writable: true,
    });
  }

  function stubWebGL2(supported) {
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') {
        return { getContext: (type) => (type === 'webgl2' && supported ? {} : null) };
      }
      return origCreate(tag);
    });
  }

  it("returns 'off' when prefers-reduced-motion matches", () => {
    stubMatchMedia(true);
    expect(detectFxTier()).toBe('off');
  });

  it("returns 'off' when navigator.connection.saveData is true", () => {
    stubMatchMedia(false);
    stubNavigator({ connection: { saveData: true }, hardwareConcurrency: 8 });
    stubWebGL2(true);
    expect(detectFxTier()).toBe('off');
  });

  it("returns 'lite' when WebGL2 is not available", () => {
    stubMatchMedia(false);
    stubNavigator({ connection: { saveData: false }, hardwareConcurrency: 8 });
    stubWebGL2(false);
    expect(detectFxTier()).toBe('lite');
  });

  it("returns 'lite' when screen is small and cores are <= 4", () => {
    stubMatchMedia(false);
    stubNavigator({ connection: { saveData: false }, hardwareConcurrency: 2 });
    stubWebGL2(true);
    vi.stubGlobal('innerWidth', 375);
    expect(detectFxTier()).toBe('lite');
  });

  it("returns 'full' when all conditions pass", () => {
    stubMatchMedia(false);
    stubNavigator({ connection: { saveData: false }, hardwareConcurrency: 8 });
    stubWebGL2(true);
    vi.stubGlobal('innerWidth', 1920);
    expect(detectFxTier()).toBe('full');
  });

  it("returns 'full' when screen < 768px but cores > 4", () => {
    stubMatchMedia(false);
    stubNavigator({ connection: { saveData: false }, hardwareConcurrency: 8 });
    stubWebGL2(true);
    vi.stubGlobal('innerWidth', 600);
    expect(detectFxTier()).toBe('full');
  });
});

// ---------------------------------------------------------------------------
// useOnlyOneWebGL
// ---------------------------------------------------------------------------

describe('useOnlyOneWebGL', () => {
  beforeEach(() => _resetWebGLRegistry());
  afterEach(() => _resetWebGLRegistry());

  it('lets the first claimant through', () => {
    const hook = renderHookRaw(() => useOnlyOneWebGL('scene-a'));
    expect(hook.current).toBe(true);
    hook.unmount();
  });

  it('blocks a second claimant with the same id', () => {
    const hook1 = renderHookRaw(() => useOnlyOneWebGL('scene-a'));
    const hook2 = renderHookRaw(() => useOnlyOneWebGL('scene-a'));
    expect(hook1.current).toBe(true);
    expect(hook2.current).toBe(false);
    hook1.unmount();
    hook2.unmount();
  });

  it('allows two claimants with different ids', () => {
    const hook1 = renderHookRaw(() => useOnlyOneWebGL('scene-a'));
    const hook2 = renderHookRaw(() => useOnlyOneWebGL('scene-b'));
    expect(hook1.current).toBe(true);
    expect(hook2.current).toBe(true);
    hook1.unmount();
    hook2.unmount();
  });

  it('releases the slot on unmount so a new claimant can take it', () => {
    const hook1 = renderHookRaw(() => useOnlyOneWebGL('scene-a'));
    expect(hook1.current).toBe(true);
    hook1.unmount();

    const hook2 = renderHookRaw(() => useOnlyOneWebGL('scene-a'));
    expect(hook2.current).toBe(true);
    hook2.unmount();
  });

  it('returns false when id is null (no-op mode)', () => {
    const hook = renderHookRaw(() => useOnlyOneWebGL(null));
    expect(hook.current).toBe(false);
    hook.unmount();
  });
});
