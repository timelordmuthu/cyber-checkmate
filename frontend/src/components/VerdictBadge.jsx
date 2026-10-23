/**
 * VerdictBadge – icon + word + colour chip.
 * Text is never colour-only: the icon provides an additional cue.
 */
import { verdictFor } from '@/lib/labels.js'

/**
 * @param {{ level: string, lang?: string, className?: string }} props
 */
export default function VerdictBadge({ level = 'green', className = '' }) {
  const { word, colorClass, bgClass, borderClass, icon } = verdictFor(level)

  return (
    <span
      role="img"
      aria-label={`Verdict: ${word}`}
      className={[
        'inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full',
        'text-xs font-bold uppercase tracking-wider border',
        bgClass,
        colorClass,
        borderClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{word}</span>
    </span>
  )
}
