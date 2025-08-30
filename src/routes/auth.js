import Joi from 'joi'
import { validateCredentials } from '../auth/validate-credentials.js'
import { createTokens } from '../auth/token.js'
import { getOrganisations, getOrganisationBySbi } from '../customers/get-organisations.js'

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

    request.yar.set('crn', crn)

    return h.redirect('/organisations')
  }
}]

const picker = [{
  method: 'GET',
  path: '/organisations',
  handler: (_request, h) => {
    const organisations = getOrganisations()
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

    const organisation = getOrganisationBySbi(sbi)

    const crn = request.yar.get('crn')

    const { accessCode } = createTokens(crn, organisation)

    const authRequest = request.yar.get('auth-request')
    request.yar.clear('auth-request')

    return h.redirect(`${authRequest.redirect_uri}?code=${accessCode}&state=${authRequest.state}`)
  }
}]

export const auth = [
  ...signIn,
  ...picker
]
