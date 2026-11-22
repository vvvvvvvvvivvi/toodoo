interface TagChipsProps {
  tags?: string[]
}

export function TagChips({ tags }: TagChipsProps) {
  if (!tags || tags.length === 0) return null
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span key={tag} className="rounded-full bg-primary/15 px-2 py-0.5 font-body text-[10px] text-text-secondary">
          {tag}
        </span>
      ))}
    </div>
  )
}
