import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  normalizeAnalyzeResponse,
  normalizeHealth,
  requestJson,
  getLanguages,
  analyze,
  admin,
  ApiError,
  NetworkError,
  FeatureUnavailableError,
  InvalidResponseError,
  isMockMode
} from '../api/index.js'
import { getAdminToken, setAdminToken } from '../lib/session.js'

import analyzeAmberJobHinglish from '@contracts/fixtures/analyze_amber_job_hinglish.json'
import analyzeGreenOtp from '@contracts/fixtures/analyze_green_otp.json'
import analyzeImageRed from '@contracts/fixtures/analyze_image_red.json'
import analyzeOnDevice from '@contracts/fixtures/analyze_on_device.json'
import analyzeRedKycEn from '@contracts/fixtures/analyze_red_kyc_en.json'
import analyzeTaTranslated from '@contracts/fixtures/analyze_ta_translated.json'
import analyzeTaTranslationFailed from '@contracts/fixtures/analyze_ta_translation_failed.json'
import analyzeUrlOnlyOfficial from '@contracts/fixtures/analyze_url_only_official.json'
import analyzeV1Legacy from '@contracts/fixtures/analyze_v1_legacy.json'

describe('API Layer: Normalization', () => {
  const analyzeFixtures = [
    ['analyze_amber_job_hinglish', analyzeAmberJobHinglish],
    ['analyze_green_otp', analyzeGreenOtp],
    ['analyze_image_red', analyzeImageRed],
    ['analyze_on_device', analyzeOnDevice],
    ['analyze_red_kyc_en', analyzeRedKycEn],
    ['analyze_ta_translated', analyzeTaTranslated],
    ['analyze_ta_translation_failed', analyzeTaTranslationFailed],
    ['analyze_url_only_official', analyzeUrlOnlyOfficial],
    ['analyze_v1_legacy', analyzeV1Legacy],
  ]

  it.each(analyzeFixtures)('normalizes %s without error', (_, fixture) => {
    expect(() => normalizeAnalyzeResponse(fixture)).not.toThrow()
    const norm = normalizeAnalyzeResponse(fixture)
    expect(norm).toHaveProperty('risk_score')
    expect(norm).toHaveProperty('level')
    expect(norm).toHaveProperty('entities')
    expect(norm).toHaveProperty('language')
  })

  it('supplies defaults for analyze_v1_legacy', () => {
    const norm = normalizeAnalyzeResponse(analyzeV1Legacy)
    expect(norm.entities.phones).toEqual([])
    expect(norm.entities.upi_ids).toEqual([])
    expect(norm.entities.urls).toEqual([])
    expect(norm.entities.amounts).toEqual([])
    expect(norm.entities.emails).toEqual([])
    expect(norm.entities.account_like).toEqual([])
    expect(norm.language.code).toBe('en')
    expect(norm.reputation).toEqual([])
    expect(norm.component_scores.text).toBe(0.93)
  })

  it('throws InvalidResponseError for out-of-range or invalid level', () => {
    expect(() => normalizeAnalyzeResponse({ risk_score: 120, level: 'red' })).toThrow(InvalidResponseError)
    expect(() => normalizeAnalyzeResponse({ risk_score: 50, level: 'purple' })).toThrow(InvalidResponseError)
    expect(() => normalizeAnalyzeResponse({ risk_score: -1, level: 'green' })).toThrow(InvalidResponseError)
    expect(() => normalizeAnalyzeResponse({ risk_score: 50.5, level: 'amber' })).toThrow(InvalidResponseError)
    expect(() => normalizeAnalyzeResponse(null)).toThrow(InvalidResponseError)
  })
})

describe('API Layer: requestJson HTTP Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('400 {"error": "x"} -> ApiError "x" status 400', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: 'x' }),
      })
    )

    await expect(requestJson('/test')).rejects.toThrow(ApiError)
    try {
      await requestJson('/test')
    } catch (err) {
      expect(err.message).toBe('x')
      expect(err.status).toBe(400)
    }
  })

  it('404 -> FeatureUnavailableError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ error: 'Not found' }),
      })
    )

    await expect(requestJson('/unknown')).rejects.toThrow(FeatureUnavailableError)
  })

  it('{"detail": [...]} 400 -> "Some fields are invalid."', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ detail: [{ loc: ['body', 'text'], msg: 'field required' }] }),
      })
    )

    try {
      await requestJson('/validate')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect(err.message).toBe('Some fields are invalid.')
      expect(err.status).toBe(400)
    }
  })

  it('fetch rejects -> NetworkError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    )

    await expect(requestJson('/any')).rejects.toThrow(NetworkError)
    await expect(requestJson('/any')).rejects.toThrow("Can't reach the CyberCheckmate server.")
  })

  it('401 with admin:true clears the admin token and fires event', async () => {
    setAdminToken('mock-secret')
    expect(getAdminToken()).toBe('mock-secret')

    const expiredHandler = vi.fn()
    window.addEventListener('cc:admin-expired', expiredHandler)

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ error: 'Invalid admin token' }),
      })
    )

    await expect(requestJson('/admin/ping', { admin: true })).rejects.toThrow(ApiError)
    expect(getAdminToken()).toBeNull()
    expect(expiredHandler).toHaveBeenCalledTimes(1)

    window.removeEventListener('cc:admin-expired', expiredHandler)
  })
})

describe('API Layer: getLanguages legacy fallback', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('getLanguages on 404 returns legacy en+hi', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ error: 'Not found' }),
      })
    )

    const res = await getLanguages()
    expect(res.legacy).toBe(true)
    expect(res.translator).toBe('not_loaded')
    expect(res.languages).toHaveLength(2)
    expect(res.languages.map((l) => l.code)).toEqual(['en', 'hi'])
  })
})

describe('API Layer: Mock Routing', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK', 'true')
    setAdminToken('mock')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    sessionStorage.clear()
  })

  it('recognizes mock mode', () => {
    expect(isMockMode()).toBe(true)
  })

  it('empty input throws 400 ApiError', async () => {
    await expect(analyze({})).rejects.toThrow(ApiError)
    try {
      await analyze({})
    } catch (err) {
      expect(err.status).toBe(400)
    }
  })

  it('tamil text routes to analyze_ta_translated', async () => {
    const res = await analyze({ text: 'உங்கள் SBI வங்கி கணக்கு' })
    expect(res.language.code).toBe('ta')
    expect(res.language.translated).toBe(true)
  })

  it('translation fail routes to analyze_ta_translation_failed', async () => {
    const res = await analyze({ text: 'translation fail test' })
    expect(res.language.code).toBe('ta')
    expect(res.language.translated).toBe(false)
  })

  it('image input routes to analyze_image_red', async () => {
    const res = await analyze({ image: new Blob(['image']) })
    expect(res.input_type).toBe('image')
    expect(res.level).toBe('red')
  })

  it('url only with no text routes to analyze_url_only_official', async () => {
    const res = await analyze({ url: 'https://www.onlinesbi.sbi/' })
    expect(res.input_type).toBe('url')
    expect(res.level).toBe('green')
  })

  it('otp routes to analyze_green_otp', async () => {
    const res = await analyze({ text: 'Your OTP is 492011' })
    expect(res.level).toBe('green')
  })

  it('job / earn routes to analyze_amber_job_hinglish', async () => {
    const res = await analyze({ text: 'Part time job earn money' })
    expect(res.level).toBe('amber')
  })

  it('default routes to analyze_red_kyc_en', async () => {
    const res = await analyze({ text: 'Update your KYC immediately or blocked' })
    expect(res.level).toBe('red')
    expect(res.language.code).toBe('en')
  })

  it('admin mock routes correctly and enforces mock token', async () => {
    const pingRes = await admin.ping()
    expect(pingRes.status).toBe('ok')

    const reports = await admin.listReports()
    expect(Array.isArray(reports)).toBe(true)

    const retrain1 = await admin.retrainStatus()
    expect(retrain1.state).toBe('running')

    // Test bad token
    setAdminToken('wrong-token')
    await expect(admin.ping()).rejects.toThrow('Invalid admin token')
  })
})
