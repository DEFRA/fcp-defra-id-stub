import { vi, describe, beforeEach, afterEach, test, expect } from 'vitest'

// These tests import the real config module (every other test in this repo mocks
// it wholesale), which is what config.js's auth.source derivation needs to be
// exercised against actual env vars rather than a mocked config.get.
describe('auth.source resolution', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    delete process.env.AUTH_MODE
    delete process.env.AUTH_OVERRIDE
    delete process.env.AUTH_OVERRIDE_FILE
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  test('defaults to basic when no auth env vars are set', async () => {
    const { config } = await import('../../../src/config/config.js')

    expect(config.get('auth.source')).toBe('basic')
  })

  test('resolves to mock when AUTH_MODE is mock', async () => {
    process.env.AUTH_MODE = 'mock'
    const { config } = await import('../../../src/config/config.js')

    expect(config.get('auth.source')).toBe('mock')
  })

  test('resolves to override when AUTH_OVERRIDE is set, taking precedence over AUTH_MODE', async () => {
    process.env.AUTH_MODE = 'mock'
    process.env.AUTH_OVERRIDE = '1234567890:John:Doe:1234567:123456789:Farm Inc'
    const { config } = await import('../../../src/config/config.js')

    expect(config.get('auth.source')).toBe('override')
  })

  test('resolves to file when AUTH_OVERRIDE_FILE is set, taking precedence over override and mode', async () => {
    process.env.AUTH_MODE = 'mock'
    process.env.AUTH_OVERRIDE = '1234567890:John:Doe:1234567:123456789:Farm Inc'
    process.env.AUTH_OVERRIDE_FILE = 'example.data.json'
    const { config } = await import('../../../src/config/config.js')

    expect(config.get('auth.source')).toBe('file')
  })
})
