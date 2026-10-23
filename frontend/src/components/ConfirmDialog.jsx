/**
 * src/components/ConfirmDialog.jsx
 * Native <dialog> confirmation modal with focus trap via dialog.showModal().
 */
import { useEffect, useRef } from 'react'

export default function ConfirmDialog({
  open = false,
  title = 'Are you sure?',
  message = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  confirmVariant = 'danger',
}) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      if (!dialog.open) {
        try {
          dialog.showModal()
        } catch {
          // fallback
          dialog.setAttribute('open', '')
        }
      }
    } else {
      if (dialog.open) {
        try {
          dialog.close()
        } catch {
          dialog.removeAttribute('open')
        }
      }
    }
  }, [open])

  const handleNativeCancel = (e) => {
    e.preventDefault()
    onCancel?.()
  }

  const confirmBtnClass =
    confirmVariant === 'danger'
      ? 'bg-risk-red hover:bg-red-600 text-white'
      : 'bg-cc-juniper hover:bg-cc-pine text-cc-mint'

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleNativeCancel}
      className="backdrop:bg-black/75 backdrop:backdrop-blur-sm bg-cc-deep border border-cc-pine rounded-2xl p-6 max-w-sm w-[calc(100vw-2rem)] shadow-2xl text-cc-mint m-auto"
    >
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-cc-mint tracking-tight">
          {title}
        </h3>

        {message && (
          <p className="text-xs sm:text-sm text-cc-glow leading-relaxed">
            {message}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 text-xs font-semibold text-cc-glow hover:text-cc-mint rounded-xl border border-cc-pine hover:border-cc-juniper transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-bold rounded-xl shadow transition-colors cursor-pointer ${confirmBtnClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
