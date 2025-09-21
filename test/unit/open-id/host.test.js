import { vi, describe, beforeEach, test, expect } from 'vitest'

vi.mock('../../../src/config/config.js')

const { config } = await import('../../../src/config/config.js')

const { getHost, getApiHost } = await import('../../../src/open-id/host.js')

beforeEach(() => {
  vi.resetAllMocks()
})

describe('getHost', () => {
  test('should return overridden host if set in config', () => {
    config.get.mockImplementation((key) => key === 'wellKnown.host' ? 'https://override-host.com' : undefined)

    const host = getHost()
    expect(host).toBe('https://override-host.com')
  })

  test('should return localhost in local environment if not overridden', () => {
    config.get.mockImplementation((key) => {
      switch (key) {
        case 'wellKnown.host':
          return undefined
        case 'environment':
          return 'local'
        case 'port':
          return 3000
        default:
          return undefined
      }
    })

    const host = getHost()
    expect(host).toBe('http://localhost:3000')
  })

  test('should return constructed host in non-local environment if not overridden', () => {
    config.get.mockImplementation((key) => {
      switch (key) {
        case 'wellKnown.host':
          return undefined
        case 'environment':
          return 'test'
        default:
          return undefined
      }
    })

    const host = getHost()
    expect(host).toBe('https://fcp-defra-id-stub.test.cdp-int.defra.cloud')
  })
})

describe('getApiHost', () => {
  test('should return overridden API host if set in config', () => {
    config.get.mockImplementation((key) => key === 'wellKnown.apiHost' ? 'https://override-api-host.com' : undefined)

    const apiHost = getApiHost()
    expect(apiHost).toBe('https://override-api-host.com')
  })

  test('should return docker internal network host if host is localhost', () => {
    config.get.mockImplementation((key) => {
      switch (key) {
        case 'wellKnown.apiHost':
          return undefined
        case 'wellKnown.host':
          return 'http://localhost:3000'
        default:
          return undefined
      }
    })

    const apiHost = getApiHost()
    expect(apiHost).toBe('http://host.docker.internal:3000')
  })

  test('should return same host if not localhost and not overridden', () => {
    config.get.mockImplementation((key) => {
      switch (key) {
        case 'wellKnown.apiHost':
          return undefined
        case 'wellKnown.host':
          return 'https://fcp-defra-id-stub.test.cdp-int.defra.cloud'
        default:
          return undefined
      }
    })

    const apiHost = getApiHost()
    expect(apiHost).toBe('https://fcp-defra-id-stub.test.cdp-int.defra.cloud')
  })
})
