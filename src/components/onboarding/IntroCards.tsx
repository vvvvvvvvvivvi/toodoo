import { useState } from 'react'
import { completeFirstRun } from '@/lib/mutations/settingsMutations'

const CARDS = [
  { emoji: '🍪', text: 'Tasks are food.' },
  { emoji: '🪿', text: 'I eat what fits.' },
  { emoji: '💩', text: "I poo when it's done." },
]

export function IntroCards() {
  const [index, setIndex] = useState(0)
  const card = CARDS[index]
  const isLast = index === CARDS.length - 1

  async function handleNext() {
    if (isLast) {
      // Single-page app now — finishing onboarding just reveals the one
      // main page (Today) underneath, no tab to land on.
      await completeFirstRun()
      return
    }
    setIndex((i) => i + 1)
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
      <span className="text-7xl">{card.emoji}</span>
      <p className="font-display text-2xl text-text-primary">{card.text}</p>

      <div className="flex gap-2">
        {CARDS.map((c, i) => (
          <span
            key={c.text}
            className={`h-2 w-2 rounded-full ${i === index ? 'bg-primary' : 'bg-circle-empty'}`}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={handleNext}
        className="rounded-2xl bg-primary px-6 py-3 font-display text-base text-background"
      >
        {isLast ? 'Get started' : 'Next'}
      </button>
    </div>
  )
}
