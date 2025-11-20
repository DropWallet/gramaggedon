'use client'

interface ClaimGameModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ClaimGameModal({ isOpen, onConfirm, onCancel }: ClaimGameModalProps) {
  if (!isOpen) return null

  return (
    <div className="relative z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onCancel}
      ></div>

      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className="relative transform overflow-hidden rounded-lg bg-[var(--color-surface-low)] px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 sm:ml-4 sm:mt-0 w-full">
                <h3 
                  className="text-body-medium text-[var(--color-accent-pink)] mb-4"
                  style={{ fontWeight: 500, textAlign: 'left' }}
                  id="modal-title"
                >
                  Link results with your account?
                </h3>
                <div className="mt-2">
                  <p className="text-body-small text-[var(--color-accent-pink)]" style={{ fontWeight: 500, textAlign: 'left' }}>
                    Would you like to link the results from the last game you played to your account? This will save your progress and stats.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-8 sm:mt-8 sm:flex sm:flex-row-reverse gap-3">
              <button
                type="button"
                className="btn-primary btn-primary--small w-full sm:w-auto"
                onClick={onConfirm}
              >
                <span className="text-body-small">Yes</span>
              </button>
              <button
                type="button"
                className="btn-secondary btn-secondary--small w-full sm:w-auto"
                onClick={onCancel}
              >
                <span className="text-body-small">No thanks</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

