import { vi, describe, beforeAll, test, expect } from 'vitest'

vi.mock('../../../src/auth/keys.js')
vi.mock('../../../src/auth/session.js')

const { createKeys } = await import('../../../src/auth/keys.js')
const { loadSessions } = await import('../../../src/auth/session.js')

const { initializeAuth } = await import('../../../src/auth/initialize.js')

describe('initialize', () => {
  beforeAll(() => {
    vi.clearAllMocks()
  })

  test('should ensure private/public keys are created',() => {
    initializeAuth()
    expect(createKeys).toHaveBeenCalledTimes(1)
  })

  test('should ensure sessions are loaded',() => {
    initializeAuth()
    expect(loadSessions).toHaveBeenCalledTimes(1)
  })
})
