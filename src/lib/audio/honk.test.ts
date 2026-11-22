import { describe, expect, it } from 'vitest'
import { HONK_DATA_URI, playHonk } from '@/lib/audio/honk'

describe('honk', () => {
  it('is a short base64-encoded audio data URI', () => {
    expect(HONK_DATA_URI.startsWith('data:audio/wav;base64,')).toBe(true)
    expect(HONK_DATA_URI.length).toBeGreaterThan(100)
  })

  it('never throws even where HTMLMediaElement.play() is unimplemented (e.g. JSDOM)', () => {
    expect(() => playHonk()).not.toThrow()
  })
})
