import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRadar } from '@/api/index.js'
import { categoryLabel } from '@/lib/labels.js'
import { ROUTES } from '@/routes.js'
import LatticeLoader from '@/components/reactbits/LatticeLoader.jsx'

const DEFAULT_RADAR_DATA = {
  updated_at: new Date().toISOString(),
  top_categories: [
    { category: 'kyc_scam', count: 42, trend: 'up' },
    { category: 'payment_scam', count: 31, trend: 'stable' },
    { category: 'job_scam', count: 19, trend: 'down' },
    { category: 'lottery_scam', count: 12, trend: 'down' },
    { category: 'phishing', count: 10, trend: 'up' },
  ],
  recent_entities: [
    { type: 'phone', masked: '98XX XXX 234', category: 'kyc_scam', seen: 3 },
    { type: 'upi', masked: 'refe****@ybl', category: 'payment_scam', seen: 5 },
    { type: 'phone', masked: '91XX XXX 889', category: 'job_scam', seen: 2 },
  ],
  total_reports: 183,
  active_hours: { peak_hour: 14, timezone: 'IST' },
}

function timeAgo(dateString) {
  if (!dateString) return 'just now'
  const past = new Date(dateString).getTime()
  if (isNaN(past)) return 'just now'
  const diffSec = Math.floor((Date.now() - past) / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
}

function typeIcon(type) {
  if (type === 'phone') return '📞'
  if (type === 'upi' || type === 'upi_id') return '💳'
  if (type === 'url') return '🔗'
  return '⚠️'
}

export default function RadarPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)

  const fetchData = async () => {
    try {
      const res = await getRadar()
      if (res && (res.top_categories || res.top_scam_categories)) {
        // Normalize categories if old fixture shape was returned
        const normalized = {
          updated_at: res.updated_at || res.generated_at || new Date().toISOString(),
          top_categories: res.top_categories || (res.top_scam_categories || []).map((c) => ({
            category: c.category,
            count: c.count,
            trend: 'stable',
          })),
          recent_entities: res.recent_entities || (res.top_entities || []).map((e) => ({
            type: e.type,
            masked: e.masked || e.value,
            category: 'kyc_scam',
            seen: e.seen || e.reports || 1,
          })),
          total_reports: res.total_reports || (res.top_scam_categories ? 183 : 0),
          active_hours: res.active_hours || { peak_hour: 14, timezone: 'IST' },
        }
        setData(normalized)
        setOffline(false)
      } else {
        throw new Error('Invalid radar payload')
      }
    } catch {
      setOffline(true)
      setData((prev) => prev || DEFAULT_RADAR_DATA)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const timer = setInterval(fetchData, 60000)
    return () => clearInterval(timer)
  }, [])

  if (loading && !data) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <LatticeLoader color="#8EB698" />
        <span className="text-xs font-mono text-cc-glow">Loading live scam radar...</span>
      </div>
    )
  }

  const radarData = data || DEFAULT_RADAR_DATA
  const topCategories = radarData.top_categories || []
  const maxCount = topCategories[0]?.count || 1
  const recentEntities = radarData.recent_entities || []
  const activeHours = radarData.active_hours || { peak_hour: 14, timezone: 'IST' }

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      {/* ── 1. Page Title & Last-Updated Pill ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-cc-mint">
            SCAM RADAR
          </h1>
          <p className="text-xs sm:text-sm text-cc-glow mt-0.5">
            Real-time, community-flagged scam trends and threat intelligence
          </p>
        </div>

        <div className="flex items-center gap-2">
          {offline && (
            <span className="text-[11px] px-2.5 py-1 rounded-md bg-risk-amber-bg border border-risk-amber-border text-risk-amber font-medium">
              Radar offline — showing last known data
            </span>
          )}
          <span className="text-xs px-2.5 py-1 rounded-full border border-cc-pine bg-cc-deep text-cc-glow font-mono">
            Updated {timeAgo(radarData.updated_at)}
          </span>
        </div>
      </div>

      {/* ── 2. Top Categories Bar Chart ─────────────────────────────── */}
      <section className="bg-cc-deep border border-cc-pine rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
        <h2 className="text-xs font-bold uppercase tracking-wider text-cc-glow">
          Top Scam Categories
        </h2>

        <div className="space-y-3 pt-1">
          {topCategories.map((c) => {
            const pct = Math.round((c.count / maxCount) * 100)
            const trendArrow = c.trend === 'up' ? '↑' : c.trend === 'down' ? '↓' : '→'
            return (
              <div key={c.category} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-cc-mint font-medium">{categoryLabel(c.category)}</span>
                  <span className="text-xs font-mono text-cc-glow">
                    {c.count} reports {trendArrow}
                  </span>
                </div>
                <div className="h-2 rounded bg-cc-surface">
                  <div
                    className="h-2 rounded bg-cc-glow transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── 3. Recent Suspicious Entities List ──────────────────────── */}
      <section className="bg-cc-deep border border-cc-pine rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
        <h2 className="text-xs font-bold uppercase tracking-wider text-cc-glow">
          Recently spotted (anonymised)
        </h2>

        {recentEntities.length === 0 ? (
          <p className="text-sm text-cc-glow py-2">No entities reported yet.</p>
        ) : (
          <div className="divide-y divide-cc-pine/60">
            {recentEntities.map((ent, idx) => (
              <div
                key={idx}
                className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-sm"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base" aria-hidden="true">
                    {typeIcon(ent.type)}
                  </span>
                  <span className="font-mono text-cc-mint font-medium truncate">
                    {ent.masked}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-cc-pine border border-cc-juniper text-cc-glow shrink-0">
                    {categoryLabel(ent.category)}
                  </span>
                </div>
                <span className="text-xs font-mono text-cc-glow shrink-0">
                  seen {ent.seen}x
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 4. Community Stats & Peak Hour ──────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-cc-deep border border-cc-pine rounded-xl p-4 text-center sm:text-left">
          <div className="text-xs text-cc-glow font-medium">Community Reports</div>
          <div className="text-base sm:text-lg font-bold text-cc-mint mt-1">
            Community has flagged <span className="text-cc-glow font-mono font-black">{radarData.total_reports}</span> messages.
          </div>
        </div>

        <div className="bg-cc-deep border border-cc-pine rounded-xl p-4 text-center sm:text-left">
          <div className="text-xs text-cc-glow font-medium">Peak Activity</div>
          <div className="text-base sm:text-lg font-bold text-cc-mint mt-1">
            Most scams spotted around <span className="text-cc-glow font-mono font-black">{activeHours.peak_hour}:00 {activeHours.timezone || 'IST'}</span>.
          </div>
        </div>
      </section>

      {/* ── 5. Report CTA Button ────────────────────────────────────── */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={() => navigate(ROUTES.REPORT || ROUTES.CHECK || ROUTES.check)}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-cc-juniper hover:bg-cc-juniper/90 text-cc-mint font-bold text-sm sm:text-base shadow-lg transition-colors cursor-pointer"
        >
          Report a scam
        </button>
      </div>
    </div>
  )
}
