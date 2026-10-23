import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { analyze, getHealth, isMockMode } from '../api.js'
import mockAnalyzeResponse from '@contracts/fixtures/analyze_red_kyc_en.json'

describe('api.js tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('mock mode is off by default', () => {
    expect(isMockMode()).toBe(false)
  })

  it('extracts custom error message from API {"error"} on non-2xx status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: 'Please enter valid text or URL to analyze.' }),
        json: async () => ({ error: 'Please enter valid text or URL to analyze.' }),
      })
    )

    await expect(analyze({ text: '' })).rejects.toThrow(
      'Please enter valid text or URL to analyze.'
    )
  })

  it('handles 503 service unavailable with server error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => JSON.stringify({ error: 'Models are still loading on startup. Please retry in 10s.' }),
        json: async () => ({ error: 'Models are still loading on startup. Please retry in 10s.' }),
      })
    )

    await expect(getHealth()).rejects.toThrow(
      'Models are still loading on startup. Please retry in 10s.'
    )
  })

  it('returns friendly network error on connection failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    )

    await expect(analyze({ text: 'test' })).rejects.toThrow(
      "Can't reach the CyberCheckmate server."
    )
  })

  it('parses successful FR1 response from /analyze', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockAnalyzeResponse),
        json: async () => mockAnalyzeResponse,
      })
    )

    const data = await analyze({ text: 'Suspicious bank message' })
    expect(data.risk_score).toBe(91)
    expect(data.level).toBe('red')
    expect(data.red_flags.length).toBeGreaterThan(0)
    expect(data.next_steps.length).toBeGreaterThan(0)
  })
})
