/**
 * NextSteps – numbered list of action steps.
 */

/**
 * @param {{ steps: string[], className?: string }} props
 */
export default function NextSteps({ steps = [], className = '' }) {
  if (!steps.length) return null

  return (
    <ol
      className={['space-y-2 text-sm text-cc-mint/90', className]
        .filter(Boolean)
        .join(' ')}
    >
      {steps.map((step, idx) => (
        <li key={idx} className="flex gap-2.5 leading-relaxed">
          <span
            aria-hidden="true"
            className="shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-cc-juniper text-[10px] font-black text-cc-mint"
          >
            {idx + 1}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  )
}
