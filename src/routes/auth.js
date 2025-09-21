import http2 from 'node:http2'
import Joi from 'joi'
import Boom from '@hapi/boom'
import { validateCredentials } from '../auth/credentials.js'
import { createTokens } from '../auth/token.js'
import { getPerson, getOrganisations, getSelectedOrganisation } from '../data/people.js'
import { AUTH_REQUEST, AUTHENTICATED, ORGANISATION_ID, PERSON, RELATIONSHIPS, ROLES } from '../config/constants/cache-keys.js'

const { constants: httpConstants } = http2
const { HTTP_STATUS_BAD_REQUEST } = httpConstants

const signIn = [{
  method: 'GET',
  path: '/dcidmtest.onmicrosoft.com/oauth2/authresp',
  handler: (request, h) => {
    validateSession(request)

    const authenticated = request.yar.get(AUTHENTICATED)
    const { prompt } = request.yar.get(AUTH_REQUEST)

    if (!authenticated || prompt === 'login') {
      return h.view('sign-in')
    }

    return h.redirect('/organisations')
  }
}, {
  method: 'POST',
  path: '/dcidmtest.onmicrosoft.com/oauth2/authresp',
  options: {
    validate: {
      payload: {
        crn: Joi.number().integer().required(),
        password: Joi.string().required()
      },
      failAction: async (request, h, _error) => h.view('sign-in', {
        message: 'Your CRN and/or password is incorrect',
        crn: request.payload.crn
      }).code(HTTP_STATUS_BAD_REQUEST).takeover()
    }
  },
  handler: async (request, h) => {
    validateSession(request)

    const { crn, password } = request.payload

    const { client_id: clientId } = request.yar.get(AUTH_REQUEST)

    if (!await validateCredentials(crn, password, clientId)) {
      return h.view('sign-in', {
        message: 'Your CRN and/or password is incorrect',
        crn: request.payload.crn
      }).takeover()
    }

    const person = await getPerson(crn, clientId)

    request.yar.set(PERSON, person)

    return h.redirect('/organisations')
  }
}]

const picker = [{
  method: 'GET',
  path: '/organisations',
  handler: async (request, h) => {
    validateSession(request)

    const person = request.yar.get(PERSON)
    const { forceReselection, relationshipId, client_id: clientId } = request.yar.get(AUTH_REQUEST)

    const organisationId = request.yar.get(ORGANISATION_ID)

    if (relationshipId) {
      const organisation = await getSelectedOrganisation(person.crn, { organisationId: relationshipId }, clientId)

      if (organisationId) {
        return completeAuthentication(request, h, person, organisation)
      }
    }

    const currentOrganisation = await getSelectedOrganisation(person.crn, { organisationId }, clientId)

    if (currentOrganisation && !forceReselection) {
      return completeAuthentication(request, h, person, currentOrganisation)
    }

    const organisations = await getOrganisations(person.crn, clientId)

    if (organisations.length === 0) {
      return h.view('no-organisations')
    }

    if (organisations.length === 1) {
      return completeAuthentication(request, h, person, organisations[0])
    }

    return h.view('picker', { organisations })
  }
}, {
  method: 'POST',
  path: '/organisations',
  options: {
    validate: {
      payload: {
        sbi: Joi.number().integer().required()
      },
      failAction: async (request, h, _error) => {
        validateSession(request)

        const { crn } = request.yar.get(PERSON)
        const { client_id: clientId } = request.yar.get(AUTH_REQUEST)

        const organisations = await getOrganisations(crn, clientId)

        return h.view('picker', {
          message: 'Select an organisation',
          organisations
        }).code(HTTP_STATUS_BAD_REQUEST).takeover()
      }
    }
  },
  handler: async (request, h) => {
    validateSession(request)

    const { sbi } = request.payload

    const person = request.yar.get(PERSON)
    const { client_id: clientId } = request.yar.get(AUTH_REQUEST)

    const organisation = await getSelectedOrganisation(person.crn, { sbi }, clientId)

    return completeAuthentication(request, h, person, organisation)
  }
}]

function validateSession (request) {
  const { client_id: clientId } = request.yar.get(AUTH_REQUEST) || {}

  if (!clientId) {
    const message = 'Cannot retrieve original request from session cookie.  If host is http and not localhost, ensure SECURE_COOKIE=false'
    request.logger.error(message)
    throw Boom.badRequest(message)
  }
}

function completeAuthentication (request, h, person, organisation) {
  const { organisationId, sbi, name } = organisation

  const authRequest = request.yar.get(AUTH_REQUEST)
  const relationships = request.yar.get(RELATIONSHIPS) || []
  const roles = request.yar.get(ROLES) || []

  const relationship = `${organisationId}:${sbi}:${name}:1:External:0`

  if (!relationships.includes(relationship)) {
    relationships.push(relationship)
  }

  const role = `${organisationId}:Agent:3`

  if (!roles.includes(role)) {
    roles.push(role)
  }

  const { accessCode } = createTokens(person, organisationId, relationships, roles, authRequest)

  request.yar.clear(AUTH_REQUEST)

  request.yar.set(ORGANISATION_ID, organisationId)
  request.yar.set(RELATIONSHIPS, relationships)
  request.yar.set(ROLES, roles)
  request.yar.set(AUTHENTICATED, true)

  return h.redirect(`${authRequest.redirect_uri}?code=${accessCode}&state=${authRequest.state}`)
}

export const auth = [
  ...signIn,
  ...picker
]
