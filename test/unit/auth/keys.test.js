import { vi, describe, beforeAll, beforeEach, test, expect } from 'vitest'
import crypto from 'node:crypto'

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

vi.mock('../../../src/auth/storage.js', () => ({
  getStorageDirectory: vi.fn(() => '/test/keys')
}))

const { createKeys, getPrivateKey, getPublicKeys } = await import('../../../src/auth/keys.js')

const generateKeyPairSyncSpy = vi.spyOn(crypto, 'generateKeyPairSync')

const privateKeyPath = '/test/keys/private.pem'
const publicKeyPath = '/test/keys/public.pem'

let testPrivateKey
let testPublicKey

beforeAll(() => {
  const generated = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  })

  testPrivateKey = generated.privateKey
  testPublicKey = generated.publicKey
})

beforeEach(() => {
  vi.clearAllMocks()
  mockExists.mockReturnValue(true)

  mockRead.mockImplementation((path) => {
    if (path === privateKeyPath) {
      return testPrivateKey
    }
    if (path === publicKeyPath) {
      return testPublicKey
    }
    return null
  })
})

describe('createKeys', () => {
  test('should create key pair if neither private nor public key exists', () => {
    mockExists.mockReturnValue(false)
    createKeys()
    expect(generateKeyPairSyncSpy).toHaveBeenCalledTimes(1)
    expect(mockWrite).toHaveBeenCalledTimes(2)
    expect(mockWrite).toHaveBeenCalledWith(privateKeyPath, expect.any(String))
    expect(mockWrite).toHaveBeenCalledWith(publicKeyPath, expect.any(String))
  })

  test('should not create key pair if both private and public key exist', () => {
    createKeys()
    expect(generateKeyPairSyncSpy).not.toHaveBeenCalled()
    expect(mockWrite).not.toHaveBeenCalled()
  })

  test('should create key pair if only private key exists', () => {
    mockExists.mockImplementation((path) => path === privateKeyPath)
    createKeys()
    expect(generateKeyPairSyncSpy).toHaveBeenCalledTimes(1)
    expect(mockWrite).toHaveBeenCalledTimes(2)
    expect(mockWrite).toHaveBeenCalledWith(privateKeyPath, expect.any(String))
    expect(mockWrite).toHaveBeenCalledWith(publicKeyPath, expect.any(String))
  })

  test('should create key pair if only public key exists', () => {
    mockExists.mockImplementation((path) => path === publicKeyPath)
    createKeys()
    expect(generateKeyPairSyncSpy).toHaveBeenCalledTimes(1)
    expect(mockWrite).toHaveBeenCalledTimes(2)
    expect(mockWrite).toHaveBeenCalledWith(privateKeyPath, expect.any(String))
    expect(mockWrite).toHaveBeenCalledWith(publicKeyPath, expect.any(String))
  })
})

describe('getPrivateKey', () => {
  test('should return the private key', () => {
    createKeys()
    const privateKey = getPrivateKey()
    expect(privateKey).toBe(testPrivateKey)
  })
})

describe('getPublicKeys', () => {
  test('should return the public keys in JWKS format', () => {
    createKeys()
    const publicKeys = getPublicKeys()
    expect(publicKeys).toHaveProperty('keys')
    expect(publicKeys.keys).toHaveLength(1)
    const jwk = publicKeys.keys[0]
    expect(jwk).toHaveProperty('kty', 'RSA')
    expect(jwk).toHaveProperty('n')
    expect(jwk).toHaveProperty('e')
    expect(jwk).toHaveProperty('use', 'sig')
    expect(jwk).toHaveProperty('kid', 'defra-id-stub-key')
    expect(jwk).toHaveProperty('alg', 'RS256')
  })
})
