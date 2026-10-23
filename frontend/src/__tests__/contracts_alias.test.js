import { describe, it, expect } from 'vitest'
import red from '@contracts/fixtures/analyze_red_kyc_en.json'
import green from '@contracts/fixtures/analyze_green_otp.json'
import urlOnly from '@contracts/fixtures/analyze_url_only_official.json'

describe('@contracts alias resolution', () => {
  it('resolves contract fixtures correctly from Vitest', () => {
    expect(red.level).toBe('red')
    expect(red.risk_score).toBe(91)
    expect(green.level).toBe('green')
    expect(typeof red.component_scores.text).toBe('number')
    expect(urlOnly.component_scores.text).toBeNull()
  })
})
