import Joi from 'joi'
import { validateCredentials } from '../auth/validate-credentials.js'
import { createTokens } from '../auth/token.js'
import { getPerson, getOrganisations, getSelectedOrganisation } from '../customers/data.js'

const signIn = [{
  method: 'GET',
  path: '/dcidmtest.onmicrosoft.com/oauth2/authresp',
  handler: (request, h) => {
    const authenticated = request.yar.get('authenticated')
    const { prompt } = request.yar.get('auth-request')

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
      }).takeover()
    }
  },
  handler: (request, h) => {
    const { crn, password } = request.payload

    const { client_id: clientId } = request.yar.get('auth-request')

    if (!validateCredentials(crn, password, clientId)) {
      return h.view('sign-in', {
        message: 'Your CRN and/or password is incorrect',
        crn: request.payload.crn
      }).takeover()
    }

    const person = getPerson(crn, clientId)

    request.yar.set('person', person)

    return h.redirect('/organisations')
  }
}]

const picker = [{
  method: 'GET',
  path: '/organisations',
  handler: (request, h) => {
    const person = request.yar.get('person')
    const { forceReselection, relationshipId } = request.yar.get('auth-request')
    const organisationId = request.yar.get('organisationId')

    if (relationshipId) {
      const organisation = getSelectedOrganisation(person.crn, { organisationId: relationshipId })

      if (organisationId) {
        return completeAuthentication(request, h, person, organisation)
      }
    }

    const currentOrganisation = getSelectedOrganisation(person.crn, { organisationId })

    if (currentOrganisation && !forceReselection) {
      return completeAuthentication(request, h, person, currentOrganisation)
    }

    const organisations = getOrganisations(person.crn)

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
      failAction: (request, h, _error) => {
        const { crn } = request.yar.get('person')
        const organisations = getOrganisations(crn)

        return h.view('picker', {
          message: 'Select an organisation',
          organisations
        }).takeover()
      }
    }
  },
  handler: (request, h) => {
    const { sbi } = request.payload

    const person = request.yar.get('person')

    const organisation = getSelectedOrganisation(person.crn, { sbi })

    return completeAuthentication(request, h, person, organisation)
  }
}]

function completeAuthentication (request, h, person, organisation) {
  const { organisationId, sbi, name } = organisation

  const authRequest = request.yar.get('auth-request')
  const relationships = request.yar.get('relationships') || []
  const roles = request.yar.get('roles') || []

  const relationship = `${organisationId}:${sbi}:${name}:1:External:0`

  if (!relationships.includes(relationship)) {
    relationships.push(relationship)
  }

  const role = `${organisationId}:Agent:3`

  if (!roles.includes(role)) {
    roles.push(role)
  }

  const { accessCode } = createTokens(person, organisationId, relationships, roles, authRequest)

  request.yar.clear('auth-request')

  request.yar.set('organisationId', organisationId)
  request.yar.set('relationships', relationships)
  request.yar.set('roles', roles)
  request.yar.set('authenticated', true)

  return h.redirect(`${authRequest.redirect_uri}?code=${accessCode}&state=${authRequest.state}`)
}

export const auth = [
  ...signIn,
  ...picker
]
