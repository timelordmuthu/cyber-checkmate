/**
 * src/lib/fx.js
 * Animation / performance tier detection utilities.
 *
 * Tier hierarchy: 'off' < 'lite' < 'full'
 * Components should degrade gracefully as tier lowers.
 */
import { useState, useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// detectFxTier – synchronous, side-effect-free, call-anywhere
// ---------------------------------------------------------------------------

/**
 * Returns one of: 'off' | 'lite' | 'full'
 *
 * Decision tree (first match wins):
 *  1. prefers-reduced-motion: reduce  -> 'off'
 *  2. navigator.connection.saveData   -> 'off'
 *  3. No WebGL2 support               -> 'lite'
 *  4. Small screen + <= 4 CPU cores   -> 'lite'
 *  5. Otherwise                       -> 'full'
 */
export function detectFxTier() {
  // 1. Reduced-motion preference
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 'off';
  } catch {
    // matchMedia unavailable (e.g. test env without stub) — continue
  }

  // 2. Data-saver mode
  try {
    if (navigator.connection?.saveData) return 'off';
  } catch {
    // navigator.connection not supported — continue
  }

  // 3. WebGL2 availability
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('webgl2');
    if (ctx === null) return 'lite';
  } catch {
    return 'lite';
  }

  // 4. Small screen with few CPU cores
  try {
    if (
      innerWidth < 768 &&
      (navigator.hardwareConcurrency || 2) <= 4
    ) {
      return 'lite';
    }
  } catch {
    // innerWidth / hardwareConcurrency unavailable — continue
  }

  return 'full';
}

// ---------------------------------------------------------------------------
// useFxTier – reactive hook; re-evaluates when prefers-reduced-motion changes
// ---------------------------------------------------------------------------

/**
 * Returns the current FX tier as React state.
 * Re-renders when the user toggles reduced-motion at the OS level.
 */
export function useFxTier() {
  const [tier, setTier] = useState(() => detectFxTier());

  useEffect(() => {
    let mql;
    try {
      mql = matchMedia('(prefers-reduced-motion: reduce)');
      const handler = () => setTier(detectFxTier());
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    } catch {
      // matchMedia unavailable — tier stays at initial value
    }
  }, []);

  return tier;
}

// ---------------------------------------------------------------------------
// usePageVisible – returns false while the document is in the background
// ---------------------------------------------------------------------------

/**
 * Returns true when document.visibilityState === 'visible'.
 * Pausing animations while the tab is hidden saves CPU/GPU.
 */
export function usePageVisible() {
  const [visible, setVisible] = useState(() => {
    try {
      return document.visibilityState === 'visible';
    } catch {
      return true; // assume visible in environments without document
    }
  });

  useEffect(() => {
    const handler = () => {
      try {
        setVisible(document.visibilityState === 'visible');
      } catch {
        setVisible(true);
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  return visible;
}

// ---------------------------------------------------------------------------
// useOnlyOneWebGL – module-level registry so only one component holds the GPU
// ---------------------------------------------------------------------------

/**
 * Module-level Set of active WebGL IDs.
 * Persists across component instances and re-renders.
 */
const _webGLRegistry = new Set();

/**
 * Claim exclusive WebGL rendering for a given `id`.
 * Returns `true` for the first claimant; `false` for every subsequent one.
 * Releases the claim on unmount.
 *
 * Pass `null` as `id` to skip claiming (i.e. webgl=false on FxGate).
 *
 * @param {string|null} id - Stable unique identifier for the WebGL consumer.
 * @returns {boolean} Whether this instance holds the WebGL token.
 */
export function useOnlyOneWebGL(id) {
  // Use a ref so the claim value doesn't change on re-render
  const claimRef = useRef(false);

  useEffect(() => {
    if (id === null || id === undefined) {
      claimRef.current = false;
      return;
    }

    if (!_webGLRegistry.has(id)) {
      _webGLRegistry.add(id);
      claimRef.current = true;
      return () => {
        _webGLRegistry.delete(id);
        claimRef.current = false;
      };
    }

    // Already claimed by another instance
    claimRef.current = false;
  }, [id]);

  // Return the current claim state as a plain boolean (not reactive state)
  // because the caller (FxGate) only reads it on render, not as a subscription.
  // For the initial render before the effect fires, optimistically return true
  // for the first claimant (registry empty at that point).
  if (id === null || id === undefined) return false;
  return !_webGLRegistry.has(id) || claimRef.current;
}

/** Exported only for tests — do not use in application code. */
export function _resetWebGLRegistry() {
  _webGLRegistry.clear();
}
