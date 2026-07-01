import { vi, describe, beforeEach, test, expect } from 'vitest'

const mockConfigGet = vi.fn()
const mockCreateLogger = vi.fn()

vi.mock('../../../../src/config/config.js', () => ({
  config: {
    get: (...args) => mockConfigGet(...args)
  }
}))

vi.mock('../../../../src/common/helpers/logging/logger.js', () => ({
  createLogger: (...args) => mockCreateLogger(...args)
}))

describe('pulse', () => {
  beforeEach(() => {
    vi.resetModules()
    mockConfigGet.mockReset()
    mockCreateLogger.mockReturnValue({ info: vi.fn(), error: vi.fn() })
  })

  describe('When in development', () => {
    let pulse

    beforeEach(async () => {
      mockConfigGet.mockReturnValue(true)
      const mod = await import('../../../../src/common/helpers/pulse.js')
      pulse = mod.pulse
    })

    test('Should set timeout to 1 second', () => {
      expect(pulse.options.timeout).toBe(1000)
    })

    test('Should use hapi-pulse plugin', () => {
      expect(pulse.plugin).toBeDefined()
    })
  })

  describe('When not in development', () => {
    let pulse

    beforeEach(async () => {
      mockConfigGet.mockReturnValue(false)
      const mod = await import('../../../../src/common/helpers/pulse.js')
      pulse = mod.pulse
    })

    test('Should set timeout to 10 seconds', () => {
      expect(pulse.options.timeout).toBe(10000)
    })
  })
})
