/**
 * TranslationBox – collapsed <details> showing what CyberCheckmate understood
 * from a non-English message.
 *
 * Props:
 *   language: { code, name, translated, translation }
 */

/**
 * @param {{ language: object, className?: string }} props
 */
export default function TranslationBox({ language, className = '' }) {
  if (!language?.translated || !language?.translation) return null

  const langName = language.name || language.code || 'another language'

  return (
    <details
      className={['rounded-xl border border-cc-pine bg-cc-black/40 text-sm', className]
        .filter(Boolean)
        .join(' ')}
    >
      <summary className="cursor-pointer select-none px-4 py-3 text-xs font-semibold uppercase tracking-wider text-cc-glow hover:text-cc-mint transition-colors list-none flex items-center gap-2">
        <span aria-hidden="true">🌐</span>
        What we understood
      </summary>

      <div className="border-t border-cc-pine px-4 py-3 space-y-2">
        <p className="text-cc-mint/90 leading-relaxed italic">
          &ldquo;{language.translation}&rdquo;
        </p>
        <p className="text-[11px] text-cc-glow/70">
          Translated from <span className="font-semibold">{langName}</span> on our server.
        </p>
      </div>
    </details>
  )
}
