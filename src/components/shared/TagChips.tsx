interface TagChipsProps {
  tags?: string[]
}

export function TagChips({ tags }: TagChipsProps) {
  if (!tags || tags.length === 0) return null
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full bg-butter-deep/60 px-2 py-0.5 font-hand text-sm font-bold leading-none text-text-primary"
        >
          {tag}
        </span>
      ))}
    </div>
  )
}
