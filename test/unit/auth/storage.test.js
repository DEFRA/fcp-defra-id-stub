import { vi, describe, beforeEach, test, expect } from 'vitest'

const mockExists = vi.fn()
const mockMkdir = vi.fn()

vi.mock('node:fs', () => ({
  default: {
    existsSync: (...args) => mockExists(...args),
    mkdirSync: (...args) => mockMkdir(...args)
  }
}))

const { getStorageDirectory } = await import('../../../src/auth/storage.js')

describe('getStorageDirectory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExists.mockReturnValue(true)
  })

  test('should return storage directory path', () => {
    const dir = getStorageDirectory()
    expect(dir).toBe('/home/node/keys')
  })

  test('should create storage directory if it does not exist', () => {
    mockExists.mockReturnValue(false)
    getStorageDirectory()
    expect(mockMkdir).toHaveBeenCalledTimes(1)
    expect(mockMkdir).toHaveBeenCalledWith('/home/node/keys', { recursive: true })
  })

  test('should not create storage directory if it exists', () => {
    getStorageDirectory()
    expect(mockMkdir).toHaveBeenCalledTimes(0)
  })
})
