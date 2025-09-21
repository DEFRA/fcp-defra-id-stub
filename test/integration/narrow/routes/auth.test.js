import { vi, describe, beforeAll, beforeEach, afterAll, test, expect } from 'vitest'
import http2 from 'node:http2'
import { AUTH_REQUEST, AUTHENTICATED, ORGANISATION_ID, PERSON, RELATIONSHIPS, ROLES } from '../../../../src/config/constants/cache-keys.js'

vi.mock('../../../../src/auth/credentials.js')
vi.mock('../../../../src/auth/token.js')
vi.mock('../../../../src/data/people.js')

const { validateCredentials } = await import('../../../../src/auth/credentials.js')
const { createTokens } = await import('../../../../src/auth/token.js')
const { getPerson, getOrganisations, getSelectedOrganisation } = await import('../../../../src/data/people.js')

const { createServer } = await import('../../../../src/server.js')

const { constants: httpConstants } = http2
const { HTTP_STATUS_OK, HTTP_STATUS_FOUND, HTTP_STATUS_BAD_REQUEST } = httpConstants

const person = {
  crn: 1234567890,
  firstName: 'John',
  lastName: 'Doe'
}

let yarSetSpy

let authRequest = null
let authenticated = null
let personSession = null
let organisationId = null
let relationships = null
let roles = null

describe('auth routes', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()

    server.ext('onPreAuth', (request, h) => {
      yarSetSpy = vi.spyOn(request.yar, 'set')

      if (authRequest) {
        request.yar.set(AUTH_REQUEST, authRequest)
      }
      if (authenticated) {
        request.yar.set(AUTHENTICATED, true)
      }
      if (personSession) {
        request.yar.set(PERSON, personSession)
      }
      if (organisationId) {
        request.yar.set(ORGANISATION_ID, organisationId)
      }
      if (relationships) {
        request.yar.set(RELATIONSHIPS, relationships)
      }
      if (roles) {
        request.yar.set(ROLES, roles)
      }

      return h.continue
    })
  })

  beforeEach(() => {
    vi.clearAllMocks()

    authRequest = {
      serviceId: '11111111-1111-1111-1111-111111111111',
      client_id: '00000000-0000-0000-0000-000000000000',
      redirect_uri: 'https://example.com/callback',
      scope: 'openid'
    }

    authenticated = null
    personSession = null
    organisationId = null
    relationships = null
    roles = null

    validateCredentials.mockResolvedValue(true)
    getPerson.mockResolvedValue(person)
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('sign in route', () => {
    const signInUrl = '/dcidmtest.onmicrosoft.com/oauth2/authresp'

    test('GET should provide return sign in page if user not authenticated', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: signInUrl
      })

      expect(statusCode).toBe(HTTP_STATUS_OK)
      expect(result).toContain('<h1 class="govuk-heading-l">Sign in to Farming</h1>')
    })

    test('GET should redirect to organisation selection if user is authenticated', async () => {
      authenticated = true

      const response = await server.inject({
        method: 'GET',
        url: signInUrl
      })

      expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(response.headers.location).toBe('/organisations')
    })

    test('GET should return sign in page if user is authenticated but prompt to force login is received', async () => {
      authenticated = true
      authRequest.prompt = 'login'

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: signInUrl
      })

      expect(statusCode).toBe(HTTP_STATUS_OK)
      expect(result).toContain('<h1 class="govuk-heading-l">Sign in to Farming</h1>')
    })

    test('GET should return 400 if auth request is missing', async () => {
      authRequest = null

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: signInUrl
      })

      expect(statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result).toContain('Cannot retrieve original request from session cookie')
    })

    test('POST should return 400 if crn and password not provided', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: signInUrl,
        payload: {}
      })

      expect(statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result).toContain('Your CRN and/or password is incorrect')
    })

    test('POST should return 400 if crn is not provided', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: signInUrl,
        payload: {
          password: 'password'
        }
      })

      expect(statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result).toContain('Your CRN and/or password is incorrect')
    })

    test('POST should return 400 if password is not provided', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: signInUrl,
        payload: {
          crn: 1234567890
        }
      })

      expect(statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result).toContain('Your CRN and/or password is incorrect')
    })

    test('POST should return 400 if crn is not an number', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: signInUrl,
        payload: {
          crn: 'not-an-integer',
          password: 'password'
        }
      })

      expect(statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result).toContain('Your CRN and/or password is incorrect')
    })

    test('POST should return 400 if crn is not an integer', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: signInUrl,
        payload: {
          crn: 123.456,
          password: 'password'
        }
      })

      expect(statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result).toContain('Your CRN and/or password is incorrect')
    })

    test('POST should return 400 if auth request is missing', async () => {
      authRequest = null

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: signInUrl,
        payload: {
          crn: 1234567890,
          password: 'password'
        }
      })

      expect(statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result).toContain('Cannot retrieve original request from session cookie')
    })

    test('POST should validate credentials against client Id data', async () => {
      await server.inject({
        method: 'POST',
        url: signInUrl,
        payload: {
          crn: 1234567890,
          password: 'password'
        }
      })

      expect(validateCredentials).toHaveBeenCalledWith(1234567890, 'password', authRequest.client_id)
    })

    test('POST should return 400 if credentials are invalid', async () => {
      validateCredentials.mockResolvedValue(false)

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: signInUrl,
        payload: {
          crn: 1234567890,
          password: 'password'
        }
      })

      expect(statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result).toContain('Your CRN and/or password is incorrect')
      expect(validateCredentials).toHaveBeenCalledWith(1234567890, 'password', authRequest.client_id)
    })

    test('POST should get person if credentials are valid', async () => {
      await server.inject({
        method: 'POST',
        url: signInUrl,
        payload: {
          crn: 1234567890,
          password: 'password'
        }
      })

      expect(getPerson).toHaveBeenCalledWith(1234567890, authRequest.client_id)
    })

    test('POST should save person to session', async () => {
      await server.inject({
        method: 'POST',
        url: signInUrl,
        payload: {
          crn: 1234567890,
          password: 'password'
        }
      })

      expect(yarSetSpy).toHaveBeenCalledWith(PERSON, person)
    })

    test('POST should redirect to organisations on successful credentials', async () => {
      const response = await server.inject({
        method: 'POST',
        url: signInUrl,
        payload: {
          crn: 1234567890,
          password: 'password'
        }
      })

      expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(response.headers.location).toBe('/organisations')
    })
  })

  describe('organisations route', () => {
    const organisationsUrl = '/organisations'

    beforeEach(() => {
      personSession = person
      personSession = person
      relationships = []
      roles = []
    })

    test('GET should return 400 if auth request missing', async () => {
      authRequest = null

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: organisationsUrl
      })

      expect(statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result).toContain('Cannot retrieve original request from session cookie')
    })

    test('GET should complete authentication immediately if organisationId already in session', async () => {
      organisationId = '5555555'
      relationships = []
      roles = []
      authRequest.state = 'test-state-123'

      getSelectedOrganisation.mockResolvedValue({ organisationId: '5555555', sbi: 999999999, name: 'Farmers' })
      createTokens.mockReturnValue({ accessCode: 'abc' })

      const response = await server.inject({
        method: 'GET',
        url: organisationsUrl
      })

      expect(getSelectedOrganisation).toHaveBeenCalledWith(person.crn, { organisationId: '5555555' }, authRequest.client_id)
      expect(createTokens).toHaveBeenCalledWith(person, '5555555', ['5555555:999999999:Farmers:1:External:0'], ['5555555:Agent:3'], authRequest)
      expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(response.headers.location).toBe('https://example.com/callback?code=abc&state=test-state-123')
    })

    test('GET should complete authentication when relationshipId provided in auth request and existing organisationId present', async () => {
      organisationId = '7777777'
      authRequest.relationshipId = '7777777'
      relationships = []
      roles = []
      getSelectedOrganisation.mockResolvedValue({ organisationId: '7777777', sbi: 123456789, name: 'Org 777' })
      createTokens.mockReturnValue({ accessCode: 'def' })

      const response = await server.inject({
        method: 'GET',
        url: organisationsUrl
      })

      expect(getSelectedOrganisation).toHaveBeenCalledWith(person.crn, { organisationId: '7777777' }, authRequest.client_id)
      expect(createTokens).toHaveBeenCalledWith(person, '7777777', ['7777777:123456789:Org 777:1:External:0'], ['7777777:Agent:3'], authRequest)
      expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(response.headers.location).toMatch(/code=def/)
    })

    test('GET should show no-organisations view if none returned', async () => {
      getOrganisations.mockResolvedValue([])
      getSelectedOrganisation.mockResolvedValue(null)

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: organisationsUrl
      })

      expect(getSelectedOrganisation).toHaveBeenCalledWith(person.crn, { organisationId: null }, authRequest.client_id)
      expect(getOrganisations).toHaveBeenCalledWith(person.crn, authRequest.client_id)
      expect(statusCode).toBe(HTTP_STATUS_OK)
      expect(result).toContain('No businesses found')
    })

    test('GET should auto-complete auth if single organisation returned', async () => {
      const singleOrg = { organisationId: 11, sbi: 111111111, name: 'Solo Org' }
      getOrganisations.mockResolvedValue([singleOrg])
      getSelectedOrganisation.mockResolvedValue(null) // No existing organisation in session
      createTokens.mockReturnValue({ accessCode: 'ghi' })

      const response = await server.inject({
        method: 'GET',
        url: organisationsUrl
      })

      expect(getSelectedOrganisation).toHaveBeenCalledWith(person.crn, { organisationId: null }, authRequest.client_id)
      expect(getOrganisations).toHaveBeenCalledWith(person.crn, authRequest.client_id)
      expect(createTokens).toHaveBeenCalledWith(person, 11, ['11:111111111:Solo Org:1:External:0'], ['11:Agent:3'], authRequest)
      expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(response.headers.location).toMatch(/code=ghi/)
    })

    test('GET should show picker view when forceReselection is true despite existing organisationId', async () => {
      organisationId = '5555555'
      authRequest.forceReselection = true
      const orgs = [
        { organisationId: '1111111', sbi: 111111111, name: 'Org 1' },
        { organisationId: '2222222', sbi: 222222222, name: 'Org 2' }
      ]
      getOrganisations.mockResolvedValue(orgs)
      getSelectedOrganisation.mockResolvedValue({ organisationId: '5555555', sbi: 999999999, name: 'Existing Org' })

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: organisationsUrl
      })

      expect(getSelectedOrganisation).toHaveBeenCalledWith(person.crn, { organisationId: '5555555' }, authRequest.client_id)
      expect(getOrganisations).toHaveBeenCalledWith(person.crn, authRequest.client_id)
      expect(statusCode).toBe(HTTP_STATUS_OK)
      expect(result).toContain('Who do you want to represent?')
      expect(result).toContain('Org 1')
      expect(result).toContain('Org 2')
    })

    test('GET should complete authentication when relationshipId provided and organisation found', async () => {
      authRequest.relationshipId = '7777777'
      organisationId = null
      relationships = []
      roles = []

      getSelectedOrganisation.mockResolvedValue({ organisationId: '7777777', sbi: 123456789, name: 'Org 777' })
      createTokens.mockReturnValue({ accessCode: 'relationship-token' })

      const response = await server.inject({
        method: 'GET',
        url: organisationsUrl
      })

      expect(getSelectedOrganisation).toHaveBeenCalledWith(person.crn, { organisationId: '7777777' }, authRequest.client_id)
      expect(createTokens).toHaveBeenCalledWith(person, '7777777', ['7777777:123456789:Org 777:1:External:0'], ['7777777:Agent:3'], authRequest)
      expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(response.headers.location).toMatch(/code=relationship-token/)
    })

    test('GET should show picker view when relationshipId provided but organisation not found', async () => {
      authRequest.relationshipId = '7777777'
      organisationId = null
      const orgs = [
        { organisationId: '1111111', sbi: 111111111, name: 'Org 1' },
        { organisationId: '2222222', sbi: 222222222, name: 'Org 2' }
      ]
      getOrganisations.mockResolvedValue(orgs)
      getSelectedOrganisation
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: organisationsUrl
      })

      expect(getSelectedOrganisation).toHaveBeenNthCalledWith(1, person.crn, { organisationId: '7777777' }, authRequest.client_id)
      expect(getSelectedOrganisation).toHaveBeenNthCalledWith(2, person.crn, { organisationId: null }, authRequest.client_id)
      expect(getOrganisations).toHaveBeenCalledWith(person.crn, authRequest.client_id)
      expect(statusCode).toBe(HTTP_STATUS_OK)
      expect(result).toContain('Who do you want to represent?')
      expect(result).toContain('Org 1')
      expect(result).toContain('Org 2')
    })

    test('GET should render picker view when multiple organisations returned', async () => {
      const orgs = [
        { organisationId: '1111111', sbi: 111111111, name: 'Org 1' },
        { organisationId: '2222222', sbi: 222222222, name: 'Org 2' }
      ]
      getOrganisations.mockResolvedValue(orgs)
      getSelectedOrganisation.mockResolvedValue(null)

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: organisationsUrl
      })

      expect(getSelectedOrganisation).toHaveBeenCalledWith(person.crn, { organisationId: null }, authRequest.client_id)
      expect(getOrganisations).toHaveBeenCalledWith(person.crn, authRequest.client_id)
      expect(statusCode).toBe(HTTP_STATUS_OK)
      expect(result).toContain('Who do you want to represent?')
      expect(result).toContain('Org 1')
      expect(result).toContain('Org 2')
    })

    test('POST should return 400 when sbi missing', async () => {
      const orgs = [
        { organisationId: '1111111', sbi: 111111111, name: 'Org 1' },
        { organisationId: '2222222', sbi: 222222222, name: 'Org 2' }
      ]
      getOrganisations.mockResolvedValue(orgs)

      const { statusCode, result } = await server.inject({
        method: 'POST',
        url: organisationsUrl,
        payload: {}
      })

      expect(getOrganisations).toHaveBeenCalledWith(person.crn, authRequest.client_id)
      expect(statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result).toContain('Select an organisation')
    })

    test('POST should return 400 when sbi not an integer', async () => {
      const orgs = [
        { organisationId: '1111111', sbi: 111111111, name: 'Org 1' },
        { organisationId: '2222222', sbi: 222222222, name: 'Org 2' }
      ]
      getOrganisations.mockResolvedValue(orgs)

      const { statusCode, result } = await server.inject({
        method: 'POST',
        url: organisationsUrl,
        payload: { sbi: 'not-an-int' }
      })

      expect(getOrganisations).toHaveBeenCalledWith(person.crn, authRequest.client_id)
      expect(statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result).toContain('Select an organisation')
    })

    test('POST should return 400 if auth request missing', async () => {
      authRequest = null

      const { statusCode, result } = await server.inject({
        method: 'POST',
        url: organisationsUrl,
        payload: { sbi: 111111111 }
      })

      expect(statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result).toContain('Cannot retrieve original request from session cookie')
    })

    test('POST should complete authentication and redirect with code', async () => {
      const selectedOrg = { organisationId: 42, sbi: 111111111, name: 'Selected Org' }
      getSelectedOrganisation.mockResolvedValue(selectedOrg)
      createTokens.mockReturnValue({ accessCode: 'xyz' })

      const response = await server.inject({
        method: 'POST',
        url: organisationsUrl,
        payload: { sbi: 111111111 }
      })

      expect(getSelectedOrganisation).toHaveBeenCalledWith(person.crn, { sbi: 111111111 }, authRequest.client_id)
      expect(createTokens).toHaveBeenCalledWith(person, 42, expect.arrayContaining(['42:111111111:Selected Org:1:External:0']), expect.arrayContaining(['42:Agent:3']), authRequest)
      expect(response.statusCode).toBe(HTTP_STATUS_FOUND)
      expect(response.headers.location).toMatch(/code=xyz/)
      expect(yarSetSpy).toHaveBeenCalledWith(RELATIONSHIPS, expect.any(Array))
      expect(yarSetSpy).toHaveBeenCalledWith(ROLES, expect.any(Array))
      expect(yarSetSpy).toHaveBeenCalledWith(AUTHENTICATED, true)
    })

    test('POST should not duplicate relationships and roles if already present', async () => {
      const selectedOrg = { organisationId: 42, sbi: 111111111, name: 'Selected Org' }
      relationships = ['42:111111111:Selected Org:1:External:0']
      roles = ['42:Agent:3']

      getSelectedOrganisation.mockResolvedValue(selectedOrg)
      createTokens.mockReturnValue({ accessCode: 'xyz' })

      await server.inject({
        method: 'POST',
        url: organisationsUrl,
        payload: { sbi: 111111111 }
      })

      expect(getSelectedOrganisation).toHaveBeenCalledWith(person.crn, { sbi: 111111111 }, authRequest.client_id)
      expect(createTokens).toHaveBeenCalledWith(person, 42, ['42:111111111:Selected Org:1:External:0'], ['42:Agent:3'], authRequest)
      expect(yarSetSpy).toHaveBeenCalledWith(RELATIONSHIPS, ['42:111111111:Selected Org:1:External:0'])
      expect(yarSetSpy).toHaveBeenCalledWith(ROLES, ['42:Agent:3'])
    })
  })
})
