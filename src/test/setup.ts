import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// @testing-library/react's auto-cleanup only self-registers when it detects
// Jest/Vitest globals; we run with `globals: false`, so wire it up explicitly.
afterEach(() => {
  cleanup()
})
