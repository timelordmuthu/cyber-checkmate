import { useState, useEffect, useCallback } from 'react';

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [actionPending, setActionPending] = useState(null);

  const fetchReports = useCallback(() => {
    setLoading(true);
    fetch(`/admin/reports?status=${filter}`)
      .then(r => r.json())
      .then(data => { setReports(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const action = (id, type) => {
    setActionPending(id + type);
    fetch(`/admin/reports/${id}/${type}`, { method: 'POST' })
      .then(() => { setActionPending(null); fetchReports(); })
      .catch(() => setActionPending(null));
  };

  const verdictColor = (v) => {
    if (!v || v === 'unknown') return 'text-cc-muted';
    if (v === 'red' || v === 'checkmate') return 'text-red-400';
    if (v === 'amber' || v === 'check') return 'text-amber-400';
    return 'text-green-400';
  };

  const verdictLabel = (v) => {
    if (v === 'red') return 'CHECKMATE';
    if (v === 'amber') return 'CHECK';
    if (v === 'green') return 'SAFE';
    return (v || 'UNKNOWN').toUpperCase();
  };

  return (
    <div className="p-4 sm:p-6 text-cc-text space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-cc-mint">Reported Messages</h2>
          <p className="text-xs text-cc-muted mt-0.5">Review user-submitted false positives and scam reports</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {['pending', 'approved', 'rejected', 'all'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-lg text-sm capitalize font-medium transition-colors ${
                filter === s
                  ? 'bg-cc-glow/20 text-cc-glow border border-cc-glow/40'
                  : 'bg-cc-surface text-cc-muted border border-cc-pine/40 hover:text-cc-text'
              }`}
            >
              {s}
            </button>
          ))}
          <button
            onClick={fetchReports}
            title="Refresh"
            className="px-3 py-1 rounded-lg text-sm bg-cc-surface text-cc-muted border border-cc-pine/40 hover:text-cc-text transition-colors"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <p className="text-cc-muted animate-pulse">Loading reports…</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && reports.length === 0 && (
        <div className="text-center py-14 rounded-2xl border border-cc-pine bg-cc-deep/40 space-y-3">
          <p className="text-4xl select-none">📭</p>
          <p className="text-cc-muted text-sm">No <span className="text-cc-glow">{filter}</span> reports</p>
        </div>
      )}

      {/* Report cards */}
      {!loading && reports.length > 0 && (
        <div className="space-y-3">
          {reports.map(r => {
            const isActing = actionPending === r.id + 'approve' || actionPending === r.id + 'reject';
            return (
              <div
                key={r.id}
                className="bg-cc-surface border border-cc-pine/60 rounded-xl p-4 hover:border-cc-glow/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Verdict + score + id row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        (r.verdict === 'red' || r.verdict === 'checkmate')
                          ? 'text-red-400 border-red-500/30 bg-red-900/20'
                          : (r.verdict === 'amber' || r.verdict === 'check')
                          ? 'text-amber-400 border-amber-500/30 bg-amber-900/20'
                          : (r.verdict === 'green')
                          ? 'text-green-400 border-green-500/30 bg-green-900/20'
                          : 'text-cc-muted border-cc-pine/40 bg-cc-deep/40'
                      }`}>
                        {verdictLabel(r.verdict)}
                      </span>
                      <span className="text-cc-muted text-xs font-mono">Score: {r.score}/100</span>
                      {r.duplicate_count > 1 && (
                        <span className="text-xs px-2 py-0.5 rounded bg-cc-pine/40 text-cc-glow border border-cc-juniper/30">
                          ×{r.duplicate_count} duplicates
                        </span>
                      )}
                      <span className="text-cc-muted/60 text-xs font-mono">#{r.id}</span>
                    </div>

                    {/* Message preview */}
                    <p className="text-sm text-cc-text leading-relaxed line-clamp-2">
                      {r.text_summary || <span className="text-cc-muted italic">No preview available</span>}
                    </p>

                    {/* Meta row */}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-cc-muted">
                      {r.category && r.category !== 'uncategorized' && (
                        <span className="capitalize">{r.category}</span>
                      )}
                      {r.user_label && (
                        <span>Label: <span className="text-cc-glow">{r.user_label}</span></span>
                      )}
                      {r.submitted_at && (
                        <span>{r.submitted_at.slice(0, 16).replace('T', ' ')}</span>
                      )}
                      {r.reviewed_at && (
                        <span>Reviewed: {r.reviewed_at.slice(0, 16).replace('T', ' ')}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0">
                    {filter === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => action(r.id, 'approve')}
                          disabled={isActing}
                          className="px-3 py-1.5 bg-green-900/30 border border-green-500/40 text-green-400 rounded-lg text-sm hover:bg-green-900/50 font-medium transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => action(r.id, 'reject')}
                          disabled={isActing}
                          className="px-3 py-1.5 bg-red-900/30 border border-red-500/40 text-red-400 rounded-lg text-sm hover:bg-red-900/50 font-medium transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          ✕ Reject
                        </button>
                      </div>
                    )}
                    {filter !== 'pending' && filter !== 'all' && (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                        filter === 'approved'
                          ? 'text-green-400 bg-green-900/20 border-green-500/30'
                          : 'text-red-400 bg-red-900/20 border-red-500/30'
                      }`}>
                        {filter}
                      </span>
                    )}
                    {filter === 'all' && r.status !== 'pending' && (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border capitalize ${
                        r.status === 'approved'
                          ? 'text-green-400 bg-green-900/20 border-green-500/30'
                          : 'text-red-400 bg-red-900/20 border-red-500/30'
                      }`}>
                        {r.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer count */}
      {!loading && reports.length > 0 && (
        <p className="text-xs text-cc-muted text-right">{reports.length} report{reports.length !== 1 ? 's' : ''}</p>
      )}
    </div>
  );
}
