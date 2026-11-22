import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Sheet } from '@/components/shared/Sheet'
import { CalendarDays, Tag } from 'lucide-react'
import { Duck } from '@/components/shared/Decor'
import { EstimateChips } from '@/components/backlog/EstimateChips'
import { PORTIONS } from '@/components/backlog/portions'
import { addDays, localToday } from '@/lib/utils/date'
import type { Task } from '@/types/models'

export interface TaskFormValues {
  title: string
  estimateMinutes: number
  deadline?: string
  tags?: string[]
}

function parseTags(input: string): string[] {
  const out: string[] = []
  for (const raw of input.split(',')) {
    const tag = raw.trim()
    if (tag && !out.includes(tag)) out.push(tag)
  }
  return out
}

const GOOSE_LINES = {
  ask: "what's on the menu?",
  size: 'ooh! how big a bite is it?',
  ready: 'yum. anything else before I eat?',
  edit: 'changed your mind about this one?',
}

interface AddTaskSheetProps {
  open: boolean
  onClose: () => void
  mode: 'add' | 'edit'
  initialTask?: Task
  submitLabel?: string
  onSubmit: (input: TaskFormValues) => Promise<void>
}

// Adding a task is a tiny conversation with duck2 rather than a form:
// name it → pick a bite size → (optional) sprinkle on a due date or tags →
// feed it. Each step slides in once the previous one has an answer, and
// Enter on the name feeds it straight away with the default bite size.
export function AddTaskSheet({ open, onClose, mode, initialTask, submitLabel, onSubmit }: AddTaskSheetProps) {
  const [title, setTitle] = useState('')
  const [minutes, setMinutes] = useState(30)
  const [isCustom, setIsCustom] = useState(false)
  const [customValue, setCustomValue] = useState('45')
  const [pickedSize, setPickedSize] = useState(false)
  const [deadline, setDeadline] = useState('')
  const [showDeadline, setShowDeadline] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [tagDraft, setTagDraft] = useState('')
  const [showTags, setShowTags] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    if (initialTask) {
      const isPreset = PORTIONS.some((p) => p.minutes === initialTask.estimateMinutes)
      setTitle(initialTask.title)
      setIsCustom(!isPreset)
      setMinutes(initialTask.estimateMinutes)
      setCustomValue(String(initialTask.estimateMinutes))
      setPickedSize(true)
      setDeadline(initialTask.deadline ?? '')
      setShowDeadline(!!initialTask.deadline)
      setTags(initialTask.tags ?? [])
      setShowTags((initialTask.tags ?? []).length > 0)
    } else {
      setTitle('')
      setIsCustom(false)
      setMinutes(30)
      setCustomValue('45')
      setPickedSize(false)
      setDeadline('')
      setShowDeadline(false)
      setTags([])
      setShowTags(false)
    }
    setTagDraft('')
    setError(null)
    setSubmitting(false)
  }, [open, initialTask])

  const isEdit = mode === 'edit'
  const hasTitle = title.trim().length > 0
  const showSize = isEdit || hasTitle
  const showExtras = isEdit || (hasTitle && pickedSize)
  const effectiveMinutes = isCustom ? Number(customValue) : minutes
  const today = localToday()

  const gooseLine = isEdit ? GOOSE_LINES.edit : !hasTitle ? GOOSE_LINES.ask : !pickedSize ? GOOSE_LINES.size : GOOSE_LINES.ready

  function commitTagDraft() {
    const next = parseTags(tagDraft)
    if (next.length === 0) return tags
    const merged = [...tags, ...next.filter((t) => !tags.includes(t))]
    setTags(merged)
    setTagDraft('')
    return merged
  }

  function handleTagKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commitTagDraft()
    } else if (e.key === 'Backspace' && !tagDraft && tags.length > 0) {
      setTags(tags.slice(0, -1))
    }
  }

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    if (submitting) return
    if (!title.trim()) {
      setError('Give it a name, duck2 needs to know what it is.')
      titleRef.current?.focus()
      return
    }
    if (!Number.isFinite(effectiveMinutes) || effectiveMinutes <= 0) {
      setError('Estimate must be a positive number of minutes.')
      return
    }
    const finalTags = tagDraft.trim() ? commitTagDraft() : tags
    setSubmitting(true)
    try {
      await onSubmit({
        title,
        estimateMinutes: effectiveMinutes,
        deadline: deadline || undefined,
        tags: finalTags,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={isEdit ? 'Tweak the recipe' : 'Feed duck2'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* duck2 talks you through it. */}
        <div className="flex items-end gap-2">
          <Duck size={40} className="shrink-0 animate-bob" />
          <p
            key={gooseLine}
            className="relative animate-pop-in rounded-[22px] rounded-bl-md bg-butter px-4 py-2 font-hand text-xl font-bold leading-tight text-text-primary"
          >
            {gooseLine}
          </p>
        </div>

        {/* Step 1 — name it */}
        <label className="block">
          <span className="sr-only">Title</span>
          <input
            ref={titleRef}
            autoFocus
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (error) setError(null)
            }}
            placeholder="what needs doing?"
            className="lined-paper w-full rounded-[22px] border-2 border-butter-deep px-4 py-3 font-hand text-2xl font-bold text-text-primary outline-none placeholder:font-normal placeholder:text-text-secondary/60 focus:border-primary"
          />
        </label>

        {/* Step 2 — bite size */}
        {showSize && (
          <section className="flex animate-reveal flex-col gap-2">
            <h3 className="hand-label text-lg">How big a bite?</h3>
            <EstimateChips
              minutes={minutes}
              isCustom={isCustom}
              onSelectPreset={(m) => {
                setIsCustom(false)
                setMinutes(m)
                setPickedSize(true)
              }}
              onSelectCustom={() => {
                setIsCustom(true)
                setPickedSize(true)
              }}
            />
            {isCustom && (
              <div className="flex animate-reveal items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  aria-label="Five minutes less"
                  onClick={() => setCustomValue(String(Math.max(5, (Number(customValue) || 0) - 5)))}
                  className="h-10 w-10 rounded-full bg-butter font-display text-xl"
                >
                  −
                </button>
                <label className="flex items-baseline gap-1">
                  <span className="sr-only">Minutes</span>
                  <input
                    type="number"
                    min={1}
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    placeholder="Minutes"
                    className="input-cute w-20 text-center font-display text-xl"
                  />
                  <span className="font-hand text-lg font-bold text-text-secondary">min</span>
                </label>
                <button
                  type="button"
                  aria-label="Five minutes more"
                  onClick={() => setCustomValue(String((Number(customValue) || 0) + 5))}
                  className="h-10 w-10 rounded-full bg-butter font-display text-xl"
                >
                  +
                </button>
              </div>
            )}
          </section>
        )}

        {/* Step 3 — optional sprinkles */}
        {showExtras && (
          <section className="flex animate-reveal flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={showDeadline}
                onClick={() => {
                  setShowDeadline(!showDeadline)
                  if (showDeadline) setDeadline('')
                }}
                className={`chip ${showDeadline ? 'chip-on' : ''}`}
              >
                <CalendarDays size={15} className="-mt-0.5 mr-1 inline" />
                due date
              </button>
              <button
                type="button"
                aria-pressed={showTags}
                onClick={() => setShowTags(!showTags)}
                className={`chip ${showTags ? 'chip-on' : ''}`}
              >
                <Tag size={15} className="-mt-0.5 mr-1 inline" />
                tags
              </button>
            </div>

            {showDeadline && (
              <div className="flex animate-reveal flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeadline(today)}
                  className={`chip ${deadline === today ? 'chip-on' : ''}`}
                >
                  today
                </button>
                <button
                  type="button"
                  onClick={() => setDeadline(addDays(today, 1))}
                  className={`chip ${deadline === addDays(today, 1) ? 'chip-on' : ''}`}
                >
                  tomorrow
                </button>
                <label>
                  <span className="sr-only">Deadline</span>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="input-cute py-1.5 text-sm"
                  />
                </label>
              </div>
            )}

            {showTags && (
              <div className="input-cute flex animate-reveal flex-wrap items-center gap-1.5">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTags(tags.filter((t) => t !== tag))}
                    aria-label={`Remove tag ${tag}`}
                    className="animate-pop-in rounded-full bg-butter-deep/70 px-2.5 py-0.5 font-hand text-base font-bold text-text-primary"
                  >
                    #{tag} ×
                  </button>
                ))}
                <label className="min-w-24 flex-1">
                  <span className="sr-only">Tags</span>
                  <input
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={handleTagKey}
                    onBlur={commitTagDraft}
                    placeholder={tags.length ? 'another…' : 'work, urgent'}
                    className="w-full bg-transparent py-0.5 font-body text-sm outline-none"
                  />
                </label>
              </div>
            )}
          </section>
        )}

        {error && (
          <p role="alert" className="animate-reveal rounded-2xl border-2 border-dashed border-warning/40 px-3 py-2 font-hand text-lg font-bold text-warning">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={`btn-main text-lg transition-opacity ${!isEdit && !hasTitle ? 'opacity-50' : ''}`}
        >
          {isEdit ? 'Save changes' : (submitLabel ?? 'Feed it to duck2')}
        </button>
      </form>
    </Sheet>
  )
}
