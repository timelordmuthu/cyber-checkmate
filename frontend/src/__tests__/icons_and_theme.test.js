import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import * as icons from '../lib/icons.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('Design Tokens & Typography in src/index.css', () => {
  const css = fs.readFileSync(path.resolve(__dirname, '../index.css'), 'utf8')

  it('defines the required color tokens in @theme', () => {
    expect(css).toContain('--color-cc-black: #051F20;')
    expect(css).toContain('--color-cc-deep: #0B2B26;')
    expect(css).toContain('--color-cc-pine: #163832;')
    expect(css).toContain('--color-cc-juniper: #235347;')
    expect(css).toContain('--color-cc-glow: #8EB698;')
    expect(css).toContain('--color-cc-mint: #DAF1DE;')
    expect(css).toContain('--color-risk-red: #EF4444;')
    expect(css).toContain('--color-risk-amber: #F59E0B;')
    expect(css).toContain('--color-risk-green: #22C55E;')
  })

  it('defines heading and body fonts in @theme', () => {
    expect(css).toContain("--font-heading: 'Chakra Petch', system-ui, sans-serif;")
    expect(css).toContain("--font-body: 'Inter', system-ui, sans-serif;")
  })

  it('applies base styles to body and headings', () => {
    expect(css).toContain('background-color: var(--color-cc-black);')
    expect(css).toContain('color: var(--color-cc-mint);')
    expect(css).toContain('font-family: var(--font-body);')
    expect(css).toContain('font-family: var(--font-heading);')
  })

  it('includes accessible focus-visible, reduced-motion, and print blocks', () => {
    expect(css).toContain(':focus-visible')
    expect(css).toContain('var(--color-cc-glow)')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('animation-duration: 0.01ms !important;')
    expect(css).toContain('@media print')
    expect(css).toContain('.print-area')
  })
})

describe('Icons Re-exports (src/lib/icons.js)', () => {
  const expectedIcons = [
    'Shield',
    'Alert',
    'CheckmarkCircle',
    'Cancel',
    'Link',
    'Image',
    'Message',
    'Mic',
    'VolumeHigh',
    'Copy',
    'Share',
    'Call',
    'Clock',
    'Globe',
    'Settings',
    'Home',
    'Radar',
    'History',
    'Lock',
  ]

  it.each(expectedIcons)('exports component for %s', (name) => {
    expect(icons[name]).toBeDefined()
    expect(typeof icons[name]).toBe('function')
  })

  it('exports HugeiconsIcon base renderer', () => {
    expect(icons.HugeiconsIcon).toBeDefined()
  })
})
