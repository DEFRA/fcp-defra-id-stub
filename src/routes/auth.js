import Joi from 'joi'
import { validateCredentials } from '../auth/validate-credentials.js'
import { createTokens } from '../auth/token.js'

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
        message: `Your CRN and/or password is incorrect: ${_error}`,
        crn: request.payload.crn
      }).takeover()
    }
  },
  handler: (request, h) => {
    const { crn, password } = request.payload

    validateCredentials(crn, password)

    const authRequest = request.yar.get('auth-request')
    request.yar.clear('auth-request')

    const { accessCode } = createTokens(crn)
    return h.redirect(`${authRequest.redirect_uri}?code=${accessCode}&state=${authRequest.state}`)
  }
}]

export const auth = [
  ...signIn
]
