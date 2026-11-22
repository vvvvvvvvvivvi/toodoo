import { useState } from 'react'
import { completeFirstRun } from '@/lib/mutations/settingsMutations'
import { Duck, Sparkle } from '@/components/shared/Decor'

const CARDS = [
  { emoji: '🍪', text: 'Tasks are food.' },
  { emoji: 'goose', text: 'I eat what fits.' },
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
    <div className="mx-auto flex h-full max-w-[480px] flex-col items-center justify-center gap-8 p-8 text-center">
      <p className="hand-label text-xl text-text-secondary">hi, I'm the toodoo goose</p>

      <div key={index} className="relative flex h-56 w-64 animate-pop-in items-center justify-center">
        <div className="blob absolute inset-0 bg-butter" />
        <Sparkle size={30} className="absolute -left-2 top-6" />
        <Sparkle size={24} className="absolute bottom-0 right-6" delay={1.3} />
        {card.emoji === 'goose' ? (
          <Duck size={104} className="relative animate-bob" />
        ) : (
          <span className="relative animate-bob text-8xl">{card.emoji}</span>
        )}
      </div>

      <p className="hand-label text-4xl leading-tight">{card.text}</p>

      <div className="flex gap-2">
        {CARDS.map((c, i) => (
          <span
            key={c.text}
            className={`h-2.5 rounded-full transition-all ${i === index ? 'w-7 bg-primary' : 'w-2.5 bg-butter-deep'}`}
          />
        ))}
      </div>

      <button type="button" onClick={handleNext} className="btn-main px-10 text-lg">
        {isLast ? 'Get started' : 'Next'}
      </button>
    </div>
  )
}
