'use client'

interface SubmitButtonProps {
  onClick: () => void
  disabled: boolean
  isLoading: boolean
  fullWidth?: boolean
  width?: number
}

export default function SubmitButton({ onClick, disabled, isLoading, fullWidth = true, width }: SubmitButtonProps) {
  const style: React.CSSProperties = fullWidth ? { alignSelf: 'stretch' } : {}
  if (width) {
    style.width = `${width}px`
  }
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`btn-primary btn-primary--small disabled:opacity-60 disabled:cursor-not-allowed ${fullWidth ? 'w-full' : ''}`}
      style={style}
    >
      {isLoading ? (
        <div className="flex items-center justify-center" style={{ height: '1.4em' }}>
          <div 
            className="w-4 h-4 rounded-full animate-spin" 
            style={{ 
              border: '2px solid var(--color-bg)',
              borderTopColor: 'transparent'
            }}
          ></div>
        </div>
      ) : (
        <span className="text-body-small">Submit</span>
      )}
    </button>
  )
}

