import { describe, it, expect, beforeEach } from 'vitest'
import mockFakeKycResponse from '@contracts/fixtures/analyze_red_kyc_en.json'
import mockBankOtpResponse from '@contracts/fixtures/analyze_green_otp.json'
import mockShortenerUrlResponse from '@contracts/fixtures/analyze_amber_job_hinglish.json'
import { mockCall } from '../api/mock.js'
import { saveSummary, listSummaries, clearHistory } from '../history.js'

describe('FE-8 Demo Pass & Zero Leakage Verification', () => {
  beforeEach(() => {
    clearHistory()
  })

  describe('Scenario Discrimination (Red / Amber / Green)', () => {
    it('selects Checkmate (Red) for fake KYC urgency message', async () => {
      const resp = await mockCall('analyze', {
        text: 'Dear customer, your SBI account KYC has expired. Update within 24 hours at http://sbi-kyc-update.xyz/login',
      })
      expect(resp.level).toBe('red')
      expect(resp.risk_score).toBeGreaterThanOrEqual(70)
      expect(resp.red_flags.some((f) => f.category === 'urgency')).toBe(true)
      expect(resp.red_flags.some((f) => f.category === 'brand_lookalike')).toBe(true)
    })

    it('selects Safe (Green) for legitimate bank OTP message', async () => {
      const resp = await mockCall('analyze', {
        text: '492011 is your SBI NetBanking OTP for transaction of Rs 1,500.00 at AMAZON. Valid for 10 mins. Do not share OTP with anyone.',
      })
      expect(resp.level).toBe('green')
      expect(resp.risk_score).toBeLessThan(35)
      expect(resp.red_flags.length).toBe(0)
    })

    it('selects Check (Amber) for shortened URL / prize claim message', async () => {
      const resp = await mockCall('analyze', {
        text: 'Part time job earn 3000 daily',
        url: 'https://bit.ly/prize-claim',
      })
      expect(resp.level).toBe('amber')
      expect(resp.risk_score).toBeGreaterThanOrEqual(35)
      expect(resp.risk_score).toBeLessThanOrEqual(70)
    })
  })

  describe('Zero Data Leakage in localStorage (PRD 16.14 Guardrail)', () => {
    it('saves strictly the 9 authorized summary keys for all demo scenarios', () => {
      const scenarios = [
        mockFakeKycResponse,
        mockBankOtpResponse,
        mockShortenerUrlResponse,
        // Live backend-shaped responses from demo/demo_inputs.json
        {
          risk_score: 85,
          level: 'red',
          input_type: 'text',
          extracted_text: 'Dear customer, your SBI account KYC has expired. Update immediately at http://sbi.kyc-update.xyz/login',
          urls_found: ['http://sbi.kyc-update.xyz/login'],
          red_flags: [{ type: 'url', category: 'brand_lookalike', evidence: 'sbi.kyc-update.xyz', strength: 0.95 }],
          component_scores: { text: 0.85, url: 0.95, rules: 0.8 },
          advice_en: 'Scam warning advice',
          advice_hi: 'धोखाधड़ी चेतावनी',
          next_steps: ['Call 1930'],
          explanation_source: 'template',
          model_version: 'v1',
          processing_ms: 100,
        },
        {
          risk_score: 100,
          level: 'red',
          input_type: 'text',
          extracted_text: 'Dear User, your pending refund of Rs.2,499 from PhonePe has been approved. Claim immediately: enter your UPI PIN to receive money.',
          urls_found: [],
          red_flags: [{ type: 'keyword', category: 'upi', evidence: 'enter your UPI PIN', strength: 1.0 }],
          component_scores: { text: 0.99, url: null, rules: 0.9 },
          advice_en: 'Never enter UPI PIN to receive money',
          advice_hi: 'पैसे प्राप्त करने के लिए कभी यूपीआई पिन न डालें',
          next_steps: ['Do not enter UPI PIN'],
          explanation_source: 'template',
          model_version: 'v1',
          processing_ms: 80,
        },
        {
          risk_score: 20,
          level: 'green',
          input_type: 'text',
          extracted_text: 'Your BlueDart parcel with tracking number BD92847120 has been dispatched and will be delivered by 6 PM today.',
          urls_found: [],
          red_flags: [],
          component_scores: { text: 0.1, url: null, rules: 0.05 },
          advice_en: 'Legitimate parcel notification',
          advice_hi: 'वैध पार्सल सूचना',
          next_steps: ['Track package'],
          explanation_source: 'template',
          model_version: 'v1',
          processing_ms: 70,
        },
      ]

      for (const scenario of scenarios) {
        clearHistory()
        saveSummary(scenario)

        const raw = localStorage.getItem('cc_history_v1')
        expect(raw).toBeTruthy()

        const parsed = JSON.parse(raw)
        expect(parsed.length).toBe(1)
        const entry = parsed[0]

        // 1. Authorized keys whitelist check
        const allowedKeys = new Set([
          'id',
          'created_at',
          'level',
          'risk_score',
          'input_type',
          'flag_categories',
          'explanation_source',
          'model_version',
          'reported',
          'checked_on_device',
          'lang',
        ])

        const entryKeys = Object.keys(entry)
        for (const k of entryKeys) {
          expect(allowedKeys.has(k)).toBe(true)
        }

        // 2. Strict blacklisted keys check
        expect(entry).not.toHaveProperty('text')
        expect(entry).not.toHaveProperty('extracted_text')
        expect(entry).not.toHaveProperty('url')
        expect(entry).not.toHaveProperty('urls_found')
        expect(entry).not.toHaveProperty('evidence')
        expect(entry).not.toHaveProperty('image')
        expect(entry).not.toHaveProperty('advice_en')
        expect(entry).not.toHaveProperty('advice_hi')

        // 3. String content audit: verify sensitive message content does NOT appear anywhere in serialized JSON
        const rawJson = JSON.stringify(entry)
        expect(rawJson).not.toContain('sbi.kyc-update.xyz')
        expect(rawJson).not.toContain('492011')
        expect(rawJson).not.toContain('bit.ly')
        expect(rawJson).not.toContain('AMAZON')
        expect(rawJson).not.toContain('PhonePe')
        expect(rawJson).not.toContain('BlueDart')
        expect(rawJson).not.toContain('BD92847120')
        expect(rawJson).not.toContain('within 24 hours')
        expect(rawJson).not.toContain('enter your UPI PIN')
      }
    })
  })
})
