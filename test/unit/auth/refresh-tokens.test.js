import { vi, describe, beforeEach, test, expect } from 'vitest'

const mockOidcConfig = { token_endpoint: 'https://example.com/token' }
const mockGetOidcConfig = vi.fn()
vi.mock('../../../src/entra/get-oidc-config.js', () => ({
  getOidcConfig: mockGetOidcConfig
}))

const mockTokenPayload = { access_token: 'DEFRA_ID_JWT', refresh_token: 'DEFRA_ID_REFRESH_TOKEN_NEW' }
const mockWreckPost = vi.fn()
vi.mock('@hapi/wreck', () => ({
  default: {
    post: mockWreckPost
  }
}))

const mockConfigGet = vi.fn()
vi.mock('../../../src/config/config.js', () => ({
  config: {
    get: mockConfigGet
  }
}))

const { refreshTokens } = await import('../../../src/auth/refresh-tokens.js')

const refreshToken = 'DEFRA_ID_REFRESH_TOKEN'

describe('refreshTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetOidcConfig.mockResolvedValue(mockOidcConfig)
    mockWreckPost.mockResolvedValue({ payload: mockTokenPayload })
    mockConfigGet.mockImplementation((key) => {
      switch (key) {
        case 'entra.clientId':
          return 'mockClientId'
        case 'entra.clientSecret':
          return 'mockClientSecret'
        case 'entra.redirectUrl':
          return 'https://mock-redirect-url.com'
        default:
          return 'defaultConfigValue'
      }
    })
  })

  test('should get oidc config', async () => {
    await refreshTokens(refreshToken)
    expect(mockGetOidcConfig).toHaveBeenCalled()
  })

  test('should get client id from config', async () => {
    await refreshTokens(refreshToken)
    expect(mockConfigGet).toHaveBeenCalledWith('entra.clientId')
  })

  test('should get client secret from config', async () => {
    await refreshTokens(refreshToken)
    expect(mockConfigGet).toHaveBeenCalledWith('entra.clientSecret')
  })

  test('should get redirect url from config', async () => {
    await refreshTokens(refreshToken)
    expect(mockConfigGet).toHaveBeenCalledWith('entra.redirectUrl')
  })

  test('should make api post request to token endpoint host', async () => {
    await refreshTokens(refreshToken)
    const url = new URL(mockWreckPost.mock.calls[0][0])
    expect(url.origin).toBe('https://example.com')
  })

  test('should make api post request to token endpoint path', async () => {
    await refreshTokens(refreshToken)
    const url = new URL(mockWreckPost.mock.calls[0][0])
    expect(url.pathname).toBe('/token')
  })

  test('should make api post request to token endpoint with query string', async () => {
    await refreshTokens(refreshToken)
    const url = new URL(mockWreckPost.mock.calls[0][0])
    expect(url.searchParams.get('client_id')).toBe('mockClientId')
    expect(url.searchParams.get('client_secret')).toBe('mockClientSecret')
    expect(url.searchParams.get('grant_type')).toBe('refresh_token')
    expect(url.searchParams.get('scope')).toBe('mockClientId/.default offline_access')
    expect(url.searchParams.get('refresh_token')).toBe(refreshToken)
    expect(url.searchParams.get('redirect_uri')).toBe('https://mock-redirect-url.com')
  })

  test('should make api post request to token endpoint with content type header', async () => {
    await refreshTokens(refreshToken)
    expect(mockWreckPost.mock.calls[0][1].headers).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded' })
  })

  test('should make api post request to token endpoint and parse response to json', async () => {
    await refreshTokens(refreshToken)
    expect(mockWreckPost.mock.calls[0][1].json).toBeTruthy()
  })

  test('should return the payload from the API response', async () => {
    const result = await refreshTokens(refreshToken)
    expect(result).toBe(mockTokenPayload)
  })

  test('should throw error if get oidc config fails', async () => {
    mockGetOidcConfig.mockRejectedValue(new Error('Unable to get OIDC config'))
    await expect(refreshTokens(refreshToken)).rejects.toThrow()
  })

  test('should throw an error if the api request fails', async () => {
    mockWreckPost.mockRejectedValue(new Error('Unable to get token'))
    await expect(refreshTokens(refreshToken)).rejects.toThrow()
  })
})
