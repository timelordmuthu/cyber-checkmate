/**
 * src/components/Layout.jsx
 * App shell: Skip link → Header → <main> → Footer → BottomNav.
 *
 * On every route change:
 *  1. window.scrollTo(0, 0)
 *  2. Focus the first <h1> inside #main (tabIndex=-1, so it doesn't tab-stop)
 *  3. stopSpeaking() if available (lib/speech.js arrives in FE3-17)
 */
import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from '@/components/Header.jsx'
import Footer from '@/components/Footer.jsx'
import BottomNav from '@/components/BottomNav.jsx'

import { stopSpeaking } from '@/lib/speech.js'

export default function Layout() {
  const location = useLocation()
  const mainRef = useRef(null)

  // ── Route-change side-effects ──────────────────────────────────
  useEffect(() => {
    // 1. Scroll to top
    window.scrollTo(0, 0)

    // 2. Focus first <h1> in main (tabIndex=-1 so it's not in tab order)
    const main = mainRef.current
    if (main) {
      const h1 = main.querySelector('h1')
      if (h1) {
        h1.tabIndex = -1
        h1.focus({ preventScroll: true })
      }
    }

    // 3. Stop any TTS in progress
    stopSpeaking()
  }, [location.pathname])

  return (
    <div className="min-h-dvh flex flex-col bg-cc-black text-cc-mint selection:bg-cc-glow selection:text-cc-black">

      {/* ── Skip to content (visible on focus) ────────────────── */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50
                   focus:px-4 focus:py-2 focus:rounded-lg focus:bg-cc-juniper focus:text-cc-mint
                   focus:font-semibold focus:text-sm focus:shadow-lg"
      >
        Skip to content
      </a>

      {/* ── Header ────────────────────────────────────────────── */}
      <Header />

      {/* ── Main content ─────────────────────────────────────── */}
      {/*
        pb-24 on mobile: 64px BottomNav + 32px breathing room
        pb-8  on desktop: no BottomNav
      */}
      <main
        id="main"
        ref={mainRef}
        className="mx-auto w-full max-w-[960px] px-4 pb-24 md:pb-8 flex-1"
        // tabIndex removed — h1 inside gets tabIndex=-1 dynamically
      >
        <Outlet />
      </main>

      {/* ── Footer (desktop only; hidden on mobile) ───────────── */}
      <Footer />

      {/* ── Mobile bottom nav ─────────────────────────────────── */}
      <BottomNav />
    </div>
  )
}
