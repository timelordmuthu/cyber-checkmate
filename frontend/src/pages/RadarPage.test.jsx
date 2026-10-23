import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import RadarPage from './RadarPage.jsx'
import * as apiModule from '../api/index.js'
import { ROUTES } from '../routes.js'

describe('RadarPage (Scam Radar)', () => {
  let container
  let root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    container = null
    root = null
    vi.restoreAllMocks()
  })

  function renderRadar() {
    act(() => {
      root.render(
        <MemoryRouter initialEntries={[ROUTES.radar || '/scam-radar']}>
          <Routes>
            <Route path={ROUTES.radar || '/scam-radar'} element={<RadarPage />} />
            <Route path={ROUTES.check || '/check'} element={<div>Check Page</div>} />
          </Routes>
        </MemoryRouter>
      )
    })
  }

  const mockRadarResponse = {
    updated_at: new Date().toISOString(),
    top_categories: [
      { category: 'kyc_scam', count: 42, trend: 'up' },
      { category: 'payment_scam', count: 31, trend: 'stable' },
    ],
    recent_entities: [
      { type: 'phone', masked: '98XX XXX 234', category: 'kyc_scam', seen: 3 },
      { type: 'upi', masked: 'refe****@ybl', category: 'payment_scam', seen: 5 },
    ],
    total_reports: 183,
    active_hours: { peak_hour: 14, timezone: 'IST' },
  }

  it('renders title, top categories, anonymized entities and stats', async () => {
    vi.spyOn(apiModule, 'getRadar').mockResolvedValue(mockRadarResponse)

    await act(async () => {
      renderRadar()
    })

    expect(container.textContent).toContain('SCAM RADAR')
    expect(container.textContent).toContain('KYC Scam')
    expect(container.textContent).toContain('42 reports')
    expect(container.textContent).toContain('98XX XXX 234')
    expect(container.textContent).toContain('refe****@ybl')
    expect(container.textContent).toContain('183 messages')
    expect(container.textContent).toContain('14:00 IST')

    const reportBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Report a scam')
    )
    expect(reportBtn).toBeTruthy()
  })

  it('handles 404/network error gracefully with offline notice and fallback data', async () => {
    vi.spyOn(apiModule, 'getRadar').mockRejectedValue(new Error('Network error or 404'))

    await act(async () => {
      renderRadar()
    })

    expect(container.textContent).toContain('SCAM RADAR')
    expect(container.textContent).toContain('Radar offline — showing last known data')
    expect(container.textContent).toContain('KYC Scam')
    expect(container.textContent).toContain('Report a scam')
  })
})
