import { vi } from 'vitest'

const mockOidcConfig = {
  authorization_endpoint: 'https://oidc.example.com/authorize',
  token_endpoint: 'https://oidc.example.com/token',
  end_session_endpoint: 'https://oidc.example.com/logout',
  jwks_uri: 'https://oidc.example.com/jwks'
}

vi.mock('@hapi/catbox-redis', async () => {
  const CatboxMemory = await import('@hapi/catbox-memory')
  return CatboxMemory
})

vi.mock('../../../../src/entra/get-oidc-config.js', async () => {
  return {
    getOidcConfig: async () => (mockOidcConfig)
  }
})

export { mockOidcConfig }
