import Joi from 'joi'
import { validateCredentials } from '../auth/validate-credentials.js'
import { createTokens } from '../auth/token.js'
import { getPerson, getOrganisations, getSelectedOrganisation } from '../customers/data.js'

const signIn = [{
  method: 'GET',
  path: '/dcidmtest.onmicrosoft.com/oauth2/authresp',
  handler: (_request, h) => h.view('sign-in')
},
{
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

    validateCredentials(crn, password)

    const person = getPerson(crn)

    request.yar.set('person', person)

    return h.redirect('/organisations')
  }
}]

const picker = [{
  method: 'GET',
  path: '/organisations',
  handler: (request, h) => {
    const { crn } = request.yar.get('person')

    const organisations = getOrganisations(crn)

    return h.view('picker', { organisations })
  }
},
{
  method: 'POST',
  path: '/organisations',
  options: {
    validate: {
      payload: {
        sbi: Joi.number().integer().required()
      },
      failAction: async (_request, h, _error) => h.view('picker', {
        message: 'Select an organisation'
      }).takeover()
    }
  },
  handler: (request, h) => {
    const { sbi } = request.payload

    const person = request.yar.get('person')

    const organisation = getSelectedOrganisation(person.crn, sbi)

    const authRequest = request.yar.get('auth-request')

    const { accessCode } = createTokens(person, organisation, authRequest)

    request.yar.clear('auth-request')

    return h.redirect(`${authRequest.redirect_uri}?code=${accessCode}&state=${authRequest.state}`)
  }
}]

export const auth = [
  ...signIn,
  ...picker
]
