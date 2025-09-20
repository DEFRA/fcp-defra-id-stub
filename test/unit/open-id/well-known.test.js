import { vi, describe, beforeEach, test, expect } from 'vitest'

vi.mock('../../../src/open-id/host.js')

const { getHost, getApiHost } = await import('../../../src/open-id/host.js')

const { getWellKnown } = await import('../../../src/open-id/well-known.js')

const host = 'http://localhost:3000'
const apiHost = 'http://host.docker.internal:3000'

getHost.mockReturnValue(host)
getApiHost.mockReturnValue(apiHost)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getWellKnown', () => {
  test('should return well-known configuration', () => {
    const wellKnown = getWellKnown()
    expect(wellKnown).toBeDefined()
    expect(wellKnown).toBeTypeOf('object')
  })

  test('should include issuer with API host', () => {
    const wellKnown = getWellKnown()
    expect(wellKnown.issuer).toBe(`${apiHost}/131a35fb-0422-49c9-8753-15217cec5411/v2.0/`)
  })

  test('should include authorization endpoint with host', () => {
    const wellKnown = getWellKnown()
    expect(wellKnown.authorization_endpoint).toBe(`${host}/dcidmtest.onmicrosoft.com/b2c_1a_cui_cpdev_signupsigninsfi/oauth2/v2.0/authorize`)
  })

  test('should include token endpoint with API host', () => {
    const wellKnown = getWellKnown()
    expect(wellKnown.token_endpoint).toBe(`${apiHost}/dcidmtest.onmicrosoft.com/b2c_1a_cui_cpdev_signupsigninsfi/oauth2/v2.0/token`)
  })

  test('should include end session endpoint with host', () => {
    const wellKnown = getWellKnown()
    expect(wellKnown.end_session_endpoint).toBe(`${host}/idphub/b2c/b2c_1a_cui_cpdev_signupsigninsfi/signout`)
  })

  test('should include jwks uri with API host', () => {
    const wellKnown = getWellKnown()
    expect(wellKnown.jwks_uri).toBe(`${apiHost}/dcidmtest.onmicrosoft.com/b2c_1a_cui_cpdev_signupsigninsfi/discovery/v2.0/keys`)
  })

  test('should include supported response modes', () => {
    const wellKnown = getWellKnown()
    expect(wellKnown.response_modes_supported).toEqual([
      'query',
      'fragment',
      'form_post'
    ])
  })

  test('should include supported response types', () => {
    const wellKnown = getWellKnown()
    expect(wellKnown.response_types_supported).toEqual([
      'code',
      'code id_token',
      'code token',
      'code id_token token',
      'id_token',
      'id_token token',
      'token',
      'token id_token'
    ])
  })

  test('should include supported scopes', () => {
    const wellKnown = getWellKnown()
    expect(wellKnown.scopes_supported).toEqual([
      'openid'
    ])
  })

  test('should include supported subject types', () => {
    const wellKnown = getWellKnown()
    expect(wellKnown.subject_types_supported).toEqual([
      'pairwise'
    ])
  })

  test('should include supported id token signing algorithms', () => {
    const wellKnown = getWellKnown()
    expect(wellKnown.id_token_signing_alg_values_supported).toEqual([
      'RS256'
    ])
  })

  test('should include supported token endpoint auth methods', () => {
    const wellKnown = getWellKnown()
    expect(wellKnown.token_endpoint_auth_methods_supported).toEqual([
      'client_secret_post',
      'client_secret_basic'
    ])
  })

  test('should include supported claims', () => {
    const wellKnown = getWellKnown()
    expect(wellKnown.claims_supported).toEqual([
      'sub',
      'contactId',
      'email',
      'firstName',
      'lastName',
      'serviceId',
      'correlationId',
      'sessionId',
      'uniqueReference',
      'loa',
      'aal',
      'enrolmentCount',
      'enrolmentRequestCount',
      'currentRelationshipId',
      'relationships',
      'roles',
      'amr',
      'iss',
      'iat',
      'exp',
      'aud',
      'acr',
      'nonce',
      'auth_time'
    ])
  })
})
