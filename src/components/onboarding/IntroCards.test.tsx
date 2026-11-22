import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db, DEFAULT_SETTINGS } from '@/lib/db/db'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { IntroCards } from '@/components/onboarding/IntroCards'

beforeEach(async () => {
  await db.settings.clear()
  await db.settings.put(DEFAULT_SETTINGS)
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS })
})

describe('IntroCards (first run)', () => {
  it('steps through all three cards and completes first-run, persisting the flag', async () => {
    const user = userEvent.setup()
    render(<IntroCards />)

    expect(screen.getByText('Tasks are food.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /next/i }))

    expect(screen.getByText('I eat what fits.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /next/i }))

    expect(screen.getByText("I poo when it's done.")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /get started/i }))

    await waitFor(() => expect(useSettingsStore.getState().settings.firstRunComplete).toBe(true))
    expect((await db.settings.get('singleton'))?.firstRunComplete).toBe(true)
  })
})
