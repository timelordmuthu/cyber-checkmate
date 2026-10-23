/**
 * src/components/ReportPanel.jsx
 * Community feedback / report flow panel (FE PRD §7, contract §2.4).
 * Hidden if VITE_ENABLE_REPORTS === 'false'.
 */
import { useState } from 'react'
import ConfirmDialog from '@/components/ConfirmDialog.jsx'
import { sendReport } from '@/api.js'
import { FeatureUnavailableError, NetworkError } from '@/api/errors.js'
import { markReported, listSummaries } from '@/history.js'
import { useAnalysis } from '@/context/AnalysisContext.jsx'
import { useToast } from '@/context/ToastContext.jsx'

export default function ReportPanel({
  result: propResult,
  lastInput: propLastInput,
  summaryId: propSummaryId,
  className = '',
} = {}) {
  // Respect VITE_ENABLE_REPORTS
  if (import.meta.env.VITE_ENABLE_REPORTS === 'false') {
    return null
  }

  const analysisCtx = useAnalysis()
  const toast = useToast()

  const result = propResult || analysisCtx?.result
  const lastInput = propLastInput || analysisCtx?.lastInput || {}

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingLabel, setPendingLabel] = useState(null) // 'scam' | 'legit'
  const [isSending, setIsSending] = useState(false)
  const [isReported, setIsReported] = useState(false)

  if (!result) return null

  const handleOpenConfirm = (userLabel) => {
    if (isReported || isSending) return
    setPendingLabel(userLabel)
    setConfirmOpen(true)
  }

  const handleConfirmSend = async () => {
    if (!pendingLabel) return
    setIsSending(true)

    // Build payload per contract §2.4 and report-request.schema.json
    let reportText = (lastInput.text || result.extracted_text || '').slice(0, 2000)
    if (!reportText.trim() && lastInput.url) {
      reportText = lastInput.url.slice(0, 2000)
    }
    if (!reportText.trim() && Array.isArray(result.urls_found) && result.urls_found.length > 0) {
      reportText = result.urls_found[0].slice(0, 2000)
    }
    if (!reportText.trim()) {
      reportText = 'No message text provided'
    }

    const rawUrls = Array.isArray(result.urls_found)
      ? result.urls_found
      : (lastInput.url ? [lastInput.url] : [])
    const urls = rawUrls.filter((u) => typeof u === 'string')

    const payload = {
      text: reportText.slice(0, 2000),
      urls,
      user_label: pendingLabel,
      predicted_level:
        result.level === 'red' || result.level === 'amber' ? result.level : 'green',
      predicted_score:
        typeof result.risk_score === 'number' ? Math.round(result.risk_score) : 0,
      model_version: result.model_version || 'v2',
    }

    try {
      await sendReport(payload)

      toast.show({
        type: 'success',
        title: 'Thanks! Sent for review.',
      })

      const targetId =
        propSummaryId || lastInput.summaryId || (listSummaries()[0]?.id)
      if (targetId) {
        markReported(targetId)
      }

      setIsReported(true)
    } catch (err) {
      if (err?.status === 429) {
        toast.show({
          type: 'error',
          title: err?.message || 'Too many reports sent. Please try again later.',
        })
      } else if (
        err instanceof FeatureUnavailableError ||
        err?.name === 'FeatureUnavailableError'
      ) {
        toast.show({
          type: 'error',
          title: "Reporting isn't available on this server yet.",
        })
      } else if (err instanceof NetworkError || err?.name === 'NetworkError') {
        toast.show({
          type: 'error',
          title: "Can't reach the server. Reporting needs the internet.",
        })
      } else {
        toast.show({
          type: 'error',
          title: err?.message || 'Failed to submit report.',
        })
      }
    } finally {
      setIsSending(false)
      setConfirmOpen(false)
    }
  }

  return (
    <div
      className={[
        'rounded-2xl border border-cc-pine bg-cc-deep/80 p-4 sm:p-5 shadow-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-0.5">
          <div className="text-xs font-bold uppercase tracking-wider text-cc-glow flex items-center gap-2">
            <span>Was this right?</span>
            {isReported && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-plum-700 text-cc-mint border border-plum-light/30">
                Reported
              </span>
            )}
          </div>
          <p className="text-xs text-cc-mint/70">
            Help improve CyberCheckmate detection by sending feedback.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={isReported || isSending}
            onClick={() => handleOpenConfirm('scam')}
            className="text-xs font-bold px-3.5 py-2 rounded-xl bg-cc-pine hover:bg-cc-juniper text-cc-mint border border-cc-juniper transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            It&apos;s a scam
          </button>

          <button
            type="button"
            disabled={isReported || isSending}
            onClick={() => handleOpenConfirm('legit')}
            className="text-xs font-bold px-3.5 py-2 rounded-xl bg-cc-pine hover:bg-cc-juniper text-cc-mint border border-cc-juniper transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            It&apos;s safe
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Send this message for review?"
        message="To improve CyberCheckmate, the message text and links will be sent to our team and stored for review. Nothing else is sent. Don't send messages with private details you don't want to share."
        confirmLabel="Send for review"
        cancelLabel="Cancel"
        confirmVariant="primary"
        onConfirm={handleConfirmSend}
        onCancel={() => {
          if (!isSending) setConfirmOpen(false)
        }}
      />
    </div>
  )
}
