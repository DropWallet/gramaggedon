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
      <span className="text-body-small">
        {isLoading ? 'Submitting...' : 'Submit'}
      </span>
    </button>
  )
}

