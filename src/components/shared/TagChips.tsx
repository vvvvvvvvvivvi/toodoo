interface TagChipsProps {
  tags?: string[]
}

const TAG_TINTS = ['bg-blush/25', 'bg-accent/25', 'bg-primary/25', 'bg-sparkle/40']

export function TagChips({ tags }: TagChipsProps) {
  if (!tags || tags.length === 0) return null
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {tags.map((tag, i) => (
        <span
          key={tag}
          className={`rounded-full px-2 py-0.5 font-hand text-sm font-bold leading-none text-text-primary ${TAG_TINTS[i % TAG_TINTS.length]}`}
        >
          {tag}
        </span>
      ))}
    </div>
  )
}
