import { vi, describe, beforeEach, test, expect } from 'vitest'

const mockOidcConfig = { end_session_endpoint: 'https://example.com/sign-out' }
const mockGetOidcConfig = vi.fn()
vi.mock('../../../src/entra/get-oidc-config.js', () => ({
  getOidcConfig: mockGetOidcConfig
}))

const mockCreateState = vi.fn()
vi.mock('../../../src/auth/state.js', () => ({
  createState: mockCreateState
}))

const mockSignOutRedirectUrl = 'https://example.com/sign-out-redirect'
const mockConfigGet = vi.fn()
vi.mock('../../../src/config/config.js', () => ({
  config: {
    get: mockConfigGet
  }
}))

const { getSignOutUrl } = await import('../../../src/auth/get-sign-out-url.js')

const request = { mock: 'request' }
const loginHint = 'Entra-Login-Hint'

describe('getSignOutUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetOidcConfig.mockResolvedValue(mockOidcConfig)
    mockConfigGet.mockReturnValue(mockSignOutRedirectUrl)
    mockCreateState.mockReturnValue('mock-state')
  })

  test('should get oidc config', async () => {
    await getSignOutUrl(request, loginHint)
    expect(mockGetOidcConfig).toHaveBeenCalled()
  })

  test('should create state from request', async () => {
    await getSignOutUrl(request, loginHint)
    expect(mockCreateState).toHaveBeenCalledWith(request)
  })

  test('should get redirect url from config', async () => {
    await getSignOutUrl(request, loginHint)
    expect(mockConfigGet).toHaveBeenCalledWith('entra.signOutRedirectUrl')
  })

  test('should return url with post_logout_redirect_uri as sign out url from config', async () => {
    const result = await getSignOutUrl(request, loginHint)
    expect(result).toContain(`post_logout_redirect_uri=${mockSignOutRedirectUrl}`)
  })

  test('should return url with logout_hint as loginHint', async () => {
    const result = await getSignOutUrl(request, loginHint)
    expect(result).toContain(`logout_hint=${loginHint}`)
  })

  test('should return url with created state', async () => {
    const result = await getSignOutUrl(request, loginHint)
    expect(result).toContain('state=mock-state')
  })

  test('should return url with all parameters encoded', async () => {
    mockCreateState.mockReturnValue('mock state')
    const result = await getSignOutUrl(request, loginHint)
    expect(result).toContain('state=mock%20state')
  })

  test('should return all properties in correctly formatted url', async () => {
    const result = await getSignOutUrl(request, loginHint)
    const url = new URL(result)
    const params = new URLSearchParams(url.searchParams)
    expect(url.protocol).toBe('https:')
    expect(url.host).toBe('example.com')
    expect(url.pathname).toBe('/sign-out')
    expect(params.get('post_logout_redirect_uri')).toBe(mockSignOutRedirectUrl)
    expect(params.get('logout_hint')).toBe(loginHint)
    expect(params.get('state')).toBe('mock-state')
  })

  test('should throw an error if oidc config request fails', async () => {
    mockGetOidcConfig.mockRejectedValue(new Error('Test error'))
    await expect(getSignOutUrl(request, loginHint)).rejects.toThrow('Test error')
  })

  test('should throw an error if state creation fails', async () => {
    mockCreateState.mockImplementation(() => { throw new Error('Test error') })
    await expect(getSignOutUrl(request, loginHint)).rejects.toThrow('Test error')
  })
})
