import { vi, describe, beforeEach, test, expect } from 'vitest'

const mockExists = vi.fn()
const mockRead = vi.fn()
const mockWrite = vi.fn()

vi.mock('node:fs', () => ({
  default: {
    existsSync: (...args) => mockExists(...args),
    readFileSync: (...args) => mockRead(...args),
    writeFileSync: (...args) => mockWrite(...args)
  }
}))

vi.mock('../../../src/auth/storage.js')

const { getStorageDirectory } = await import('../../../src/auth/storage.js')

const { loadSessions, saveSessions, createSession, findSessionBy, endSession, clearExpiredSessions } = await import('../../../src/auth/session.js')

const sessionPath = '/test/sessions/sessions.json'

const testSessions = [
  { accessToken: 'token1', createdAt: Date.now() },
  { accessToken: 'token2', createdAt: Date.now() }
]

beforeEach(() => {
  vi.clearAllMocks()
  mockExists.mockReturnValue(true)
  getStorageDirectory.mockReturnValue('/test/sessions')
  mockRead.mockReturnValue(JSON.stringify(testSessions))
})

describe('loadSessions', () => {
  test('should load sessions from file if it exists', () => {
    loadSessions()

    const session = findSessionBy('accessToken', 'token1')

    expect(session).toBeDefined()
    expect(mockRead).toHaveBeenCalledTimes(1)
    expect(mockRead).toHaveBeenCalledWith(sessionPath, 'utf8')
  })

  test('should initialize sessions as empty array if file does not exist', () => {
    mockExists.mockReturnValue(false)

    loadSessions()

    const session = findSessionBy('accessToken', 'token1')

    expect(session).toBeUndefined()
    expect(mockRead).toHaveBeenCalledTimes(0)
  })

  test('should initialize sessions as empty array if file is invalid', () => {
    mockRead.mockReturnValue('invalid json')

    loadSessions()

    const session = findSessionBy('accessToken', 'token1')

    expect(session).toBeUndefined()
    expect(mockRead).toHaveBeenCalledTimes(1)
  })
})

describe('saveSessions', () => {
  beforeEach(() => {
    loadSessions()
    vi.clearAllMocks()
  })

  test('should save sessions to file', () => {
    saveSessions()

    expect(mockWrite).toHaveBeenCalledTimes(1)
    expect(mockWrite).toHaveBeenCalledWith(sessionPath, JSON.stringify(testSessions, null, 2))
  })
})

describe('createSession', () => {
  beforeEach(() => {
    loadSessions()
    vi.clearAllMocks()
  })

  test('should add a new session', () => {
    const newSession = { accessToken: 'token3', createdAt: Date.now() }

    createSession(newSession)

    const session = findSessionBy('accessToken', 'token3')

    expect(session).toBeDefined()
  })

  test('should save sessions after adding a new session', () => {
    const newSession = { accessToken: 'token3', createdAt: Date.now() }
    createSession(newSession)

    expect(mockWrite).toHaveBeenCalled()
    expect(mockWrite).toHaveBeenCalledWith(sessionPath, JSON.stringify([...testSessions, newSession], null, 2))
  })
})

describe('findSessionBy', () => {
  beforeEach(() => {
    loadSessions()
    vi.clearAllMocks()
  })

  test('should find a session by property name', () => {
    const session = findSessionBy('accessToken', 'token1')

    expect(session).toBeDefined()
    expect(session.accessToken).toBe('token1')
  })

  test('should return undefined if session not found', () => {
    const session = findSessionBy('accessToken', 'nonexistent')

    expect(session).toBeUndefined()
  })
})

describe('endSession', () => {
  beforeEach(() => {
    loadSessions()
    vi.clearAllMocks()
  })

  test('should remove a session by access token', () => {
    endSession('token1')

    const session = findSessionBy('accessToken', 'token1')

    expect(session).toBeUndefined()
  })

  test('should save sessions after removing a session', () => {
    endSession('token1')

    expect(mockWrite).toHaveBeenCalled()
    expect(mockWrite).toHaveBeenCalledWith(sessionPath, JSON.stringify([testSessions[1]], null, 2))
  })

  test('should do nothing if access token not found', () => {
    endSession('nonexistent')

    expect(mockWrite).not.toHaveBeenCalled()
  })
})

describe('clearExpiredSessions', () => {
  beforeEach(() => {
    const testSessionsWithExpired = [...testSessions]
    testSessionsWithExpired[0].createdAt = Date.now() - (2 * 60 * 60 * 1000) // 2 hours ago
    mockRead.mockReturnValue(JSON.stringify(testSessionsWithExpired))

    loadSessions()

    vi.clearAllMocks()
  })

  test('should remove expired sessions', () => {
    clearExpiredSessions()

    const session = findSessionBy('accessToken', 'token1')

    expect(session).toBeUndefined()
  })

  test('should save sessions after removing expired sessions', () => {
    clearExpiredSessions()

    expect(mockWrite).toHaveBeenCalled()
    expect(mockWrite).toHaveBeenCalledWith(sessionPath, JSON.stringify([testSessions[1]], null, 2))
  })
})
