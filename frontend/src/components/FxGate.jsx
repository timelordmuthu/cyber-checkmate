/**
 * src/components/FxGate.jsx
 *
 * Conditionally renders children based on:
 *  - The current FX tier (full > lite > off)
 *  - Page visibility (pauses when tab is backgrounded)
 *  - Exclusive WebGL claim (only one component may render GPU-heavy WebGL)
 *
 * Usage:
 *   <FxGate need="full" webgl id="dot-grid" fallback={<StaticDots />}>
 *     <DotGrid />
 *   </FxGate>
 *
 * Props:
 *   need     'full' | 'lite'   Minimum tier required. Default 'full'.
 *   webgl    boolean           Whether this component needs the GPU. Default false.
 *   id       string            Stable unique ID for WebGL claim (required when webgl=true).
 *   fallback ReactNode         What to render when the gate is closed. Default null.
 *   children ReactNode         The animation/effect component to render.
 */
import { useFxTier, usePageVisible, useOnlyOneWebGL } from '../lib/fx.js';

const TIER_RANK = { off: 0, lite: 1, full: 2 };

export default function FxGate({
  need = 'full',
  webgl = false,
  id,
  fallback = null,
  children,
}) {
  const tier = useFxTier();
  const pageVisible = usePageVisible();

  // Claim WebGL slot; pass null when webgl=false to skip registration
  const webglClaim = useOnlyOneWebGL(webgl ? (id ?? null) : null);

  // Gate conditions
  const tierMet = TIER_RANK[tier] >= TIER_RANK[need];
  const webglMet = !webgl || webglClaim;

  if (!tierMet || !pageVisible || !webglMet) return fallback;

  return children;
}
