import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveSummary,
  listSummaries,
  stats,
  clearHistory,
  markReported,
  isStorageAvailable,
  STORAGE_KEY,
  MAX_HISTORY_ENTRIES,
} from '../history.js'
import redKycFixture from '@contracts/fixtures/analyze_red_kyc_en.json'

describe('history.js privacy and storage tests', () => {
  beforeEach(() => {
    clearHistory()
  })

  it('never stores text, extracted_text, urls, evidence, entities, or translation', () => {
    const rawResponse = {
      risk_score: 85,
      level: 'red',
      input_type: 'text',
      extracted_text: 'Confidential message text that must never be saved',
      urls_found: ['https://malicious-bank.com/steal-login'],
      red_flags: [
        { type: 'tactic', category: 'urgency', evidence: 'ACT NOW 24 HOURS', strength: 0.9 },
        { type: 'url', category: 'brand_lookalike', evidence: 'phishing URL sbi.fake', strength: 0.95 },
      ],
      entities: { upi_ids: ['scam@upi'], phones: ['9876543210'] },
      translation: { original: 'test', translated: 'test' },
      advice_en: 'Detailed scam explanation with sensitive clues',
      advice_hi: 'हिंदी विवरण',
      next_steps: ['Do not click'],
      explanation_source: 'llm',
      model_version: 'v1',
    }

    const saved = saveSummary(rawResponse, { checked_on_device: true, lang: 'hi' })
    expect(saved).toBeTruthy()
    expect(saved.checked_on_device).toBe(true)
    expect(saved.lang).toBe('hi')

    // 1. Check returned object
    expect(saved.text).toBeUndefined()
    expect(saved.extracted_text).toBeUndefined()
    expect(saved.urls_found).toBeUndefined()
    expect(saved.image).toBeUndefined()
    expect(saved.evidence).toBeUndefined()
    expect(saved.entities).toBeUndefined()
    expect(saved.translation).toBeUndefined()

    // 2. Check the raw string stored in localStorage
    const rawStored = globalThis.localStorage.getItem(STORAGE_KEY)
    expect(rawStored).not.toContain('Confidential message')
    expect(rawStored).not.toContain('malicious-bank')
    expect(rawStored).not.toContain('ACT NOW 24 HOURS')
    expect(rawStored).not.toContain('sbi.fake')
    expect(rawStored).not.toContain('Detailed scam explanation')
    expect(rawStored).not.toContain('scam@upi')
    expect(rawStored).not.toContain('evidence')
    expect(rawStored).not.toContain('entities')
    expect(rawStored).not.toContain('translation')

    // 3. Inspect parsed entry
    const entries = listSummaries()
    expect(entries.length).toBe(1)
    const entry = entries[0]
    expect(entry.level).toBe('red')
    expect(entry.risk_score).toBe(85)
    expect(entry.input_type).toBe('text')
    expect(entry.flag_categories).toEqual(['urgency', 'brand_lookalike'])
    expect(entry.reported).toBe(false)
    expect(entry.checked_on_device).toBe(true)
    expect(entry.lang).toBe('hi')
  })

  it('guarantees zero leakage for red KYC fixture', () => {
    const saved = saveSummary(redKycFixture, { checked_on_device: false, lang: 'en' })
    expect(saved).toBeTruthy()

    const rawStored = globalThis.localStorage.getItem(STORAGE_KEY)
    expect(rawStored).not.toBeNull()

    // Required assertions per FE PRD §7 / §13
    expect(rawStored).not.toContain(redKycFixture.extracted_text)
    expect(rawStored).not.toContain('sbi-kyc-update')
    expect(rawStored).not.toContain('evidence')
    expect(rawStored).not.toContain('entities')
    expect(rawStored).not.toContain('translation')
  })

  it('caps history at exactly 200 items, dropping oldest entries', () => {
    for (let i = 1; i <= 210; i++) {
      saveSummary({
        risk_score: i % 100,
        level: i % 2 === 0 ? 'red' : 'green',
        red_flags: [{ category: `cat_${i % 5}` }],
      })
    }

    const summaries = listSummaries()
    expect(summaries.length).toBe(MAX_HISTORY_ENTRIES)
    expect(summaries.length).toBe(200)
  })

  it('clearHistory removes stored history completely', () => {
    saveSummary({ risk_score: 40, level: 'amber' })
    expect(listSummaries().length).toBe(1)

    clearHistory()
    expect(listSummaries().length).toBe(0)
    expect(globalThis.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('marks a summary as reported', () => {
    const saved = saveSummary({ risk_score: 90, level: 'red' })
    expect(saved.reported).toBe(false)

    const updated = markReported(saved.id)
    expect(updated).toBe(true)

    const list = listSummaries()
    expect(list[0].reported).toBe(true)
  })

  it('calculates aggregate statistics correctly', () => {
    saveSummary({ risk_score: 90, level: 'red' })
    saveSummary({ risk_score: 50, level: 'amber' })
    saveSummary({ risk_score: 10, level: 'green' })

    const s = stats()
    expect(s.total).toBe(3)
    expect(s.red).toBe(1)
    expect(s.amber).toBe(1)
    expect(s.green).toBe(1)
    expect(s.last7days).toBe(3)
  })

  it('detects storage availability correctly', () => {
    expect(isStorageAvailable()).toBe(true)

    const origSetItem = globalThis.localStorage.setItem
    globalThis.localStorage.setItem = () => {
      throw new Error('Access denied')
    }
    expect(isStorageAvailable()).toBe(false)
    globalThis.localStorage.setItem = origSetItem
  })

  it('does not crash when localStorage throws errors (storage unavailable)', () => {
    const origGet = globalThis.localStorage.getItem
    const origSet = globalThis.localStorage.setItem
    const origRemove = globalThis.localStorage.removeItem

    globalThis.localStorage.getItem = () => {
      throw new Error('SecurityError: Access Denied')
    }
    globalThis.localStorage.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    globalThis.localStorage.removeItem = () => {
      throw new Error('StorageDisabled')
    }

    expect(() => saveSummary({ risk_score: 50, level: 'amber' })).not.toThrow()
    expect(() => listSummaries()).not.toThrow()
    expect(() => stats()).not.toThrow()
    expect(() => clearHistory()).not.toThrow()
    expect(listSummaries()).toEqual([])

    globalThis.localStorage.getItem = origGet
    globalThis.localStorage.setItem = origSet
    globalThis.localStorage.removeItem = origRemove
  })
})
