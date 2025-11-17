'use client'

interface AnagramDisplayProps {
  anagram: string
}

export default function AnagramDisplay({ anagram }: AnagramDisplayProps) {
  return (
    <p className="self-stretch flex-shrink-0 text-body-large-spaced text-[color:var(--color-accent-yellow)] text-center">
      {anagram.toUpperCase()}
    </p>
  )
}
