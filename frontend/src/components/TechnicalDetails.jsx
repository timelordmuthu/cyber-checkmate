/**
 * TechnicalDetails – collapsed <details> showing model / scoring internals.
 *
 * Props:
 *   result: full analysis response object
 */

function pct(val) {
  if (val === null || val === undefined) return null
  return `${Math.round(val * 100)}%`
}

/**
 * @param {{ result: object, className?: string }} props
 */
export default function TechnicalDetails({ result, className = '' }) {
  if (!result) return null

  const cs = result.component_scores || {}
  const textScore = cs.text === null || cs.text === undefined ? null : cs.text
  const urlScore  = cs.url  === null || cs.url  === undefined ? null : cs.url
  const ruleScore = cs.rule === null || cs.rule === undefined ? null : cs.rule

  const textDisplay = textScore === null ? 'Not used (link only)' : pct(textScore)
  const urlDisplay  = urlScore  === null ? 'No link'              : pct(urlScore)
  const ruleDisplay = ruleScore === null ? 'Not used'             : pct(ruleScore)

  const sourceDisplay =
    result.explanation_source === 'llm'
      ? 'AI wording'
      : result.explanation_source === 'template'
      ? 'Templates'
      : result.explanation_source === 'on-device'
      ? 'On this device'
      : result.explanation_source || '—'

  const langCode = result.language?.code || '—'
  const langTranslated = result.language?.translated
    ? 'Translated'
    : result.language?.translated === false
    ? 'Not translated'
    : '—'

  const overrides = Array.isArray(result.overrides_fired) && result.overrides_fired.length
    ? result.overrides_fired.join(', ')
    : 'None'

  return (
    <details
      className={['rounded-xl border border-cc-pine/60 bg-cc-black/30 text-xs', className]
        .filter(Boolean)
        .join(' ')}
    >
      <summary className="cursor-pointer select-none px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-cc-glow/70 hover:text-cc-glow transition-colors list-none flex items-center gap-2">
        <span aria-hidden="true">⚙</span>
        Technical details
      </summary>

      <div className="border-t border-cc-pine/60 px-4 py-3">
        <table className="w-full text-[11px] border-collapse">
          <tbody>
            <Row label="Text model" value={textDisplay} />
            <Row label="Link check"  value={urlDisplay} />
            <Row label="Rules"       value={ruleDisplay} />
            <Row label="Overrides"   value={overrides} />
            <Row label="Model version" value={result.model_version || '—'} />
            <Row label="Explanation" value={sourceDisplay} />
            <Row label="Processing time" value={result.processing_ms != null ? `${result.processing_ms} ms` : '—'} />
            <Row label="Language" value={`${langCode} (${langTranslated})`} />
            {result._fallback && (
              <Row label="Server mode" value="On-device fallback" highlight />
            )}
            {result.model_version && !result._fallback && (
              <Row label="Server mode" value="Server" />
            )}
          </tbody>
        </table>
      </div>
    </details>
  )
}

function Row({ label, value, highlight = false }) {
  return (
    <tr className="border-b border-cc-pine/30 last:border-0">
      <td className="py-1.5 pr-4 font-semibold text-cc-glow/70 whitespace-nowrap">{label}</td>
      <td className={['py-1.5 font-mono', highlight ? 'text-risk-amber' : 'text-cc-mint/80'].join(' ')}>
        {value}
      </td>
    </tr>
  )
}
