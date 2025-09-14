import Joi from 'joi'
import { getWellKnown } from '../open-id/get-well-known.js'
import { getTokens, getPublicKeys, endSession } from '../auth/token.js'

const wellKnown = {
  method: 'GET',
  path: '/idphub/b2c/b2c_1a_cui_cpdev_signupsigninsfi/.well-known/openid-configuration',
  handler: (_request, h) => h.response(getWellKnown())
}

const authorization = {
  method: 'GET',
  path: '/dcidmtest.onmicrosoft.com/b2c_1a_cui_cpdev_signupsigninsfi/oauth2/v2.0/authorize',
  options: {
    validate: {
      query: {
        serviceId: Joi.string().guid().required(),
        p: Joi.string().required(),
        response_mode: Joi.string().required(),
        response_type: Joi.string().required(),
        client_id: Joi.string().required(),
        redirect_uri: Joi.string().uri().required(),
        state: Joi.string(),
        scope: Joi.string().required(),
        relationshipId: Joi.string(),
        prompt: Joi.string(),
        forceReselection: Joi.boolean()
      },
      failAction: async (_request, h, error) => h.view('errors/400', {
        message: error.message
      }).takeover()
    }
  },
  handler: function (request, h) {
    request.yar.set('auth-request', request.query)
    return h.redirect('/dcidmtest.onmicrosoft.com/oauth2/authresp')
  }
}

const token = {
  method: 'POST',
  path: '/dcidmtest.onmicrosoft.com/b2c_1a_cui_cpdev_signupsigninsfi/oauth2/v2.0/token',
  handler: function (request, h) {
    console.log('Token request', request.payload, request.query)
    const { code: accessCode } = request.payload
    const { grant_type: grantType, refresh_token: refreshToken } = request.query

    const tokens = getTokens(accessCode, grantType, refreshToken)

    if (!tokens) {
      return h.response('Invalid access code').code(401)
    }

    return h.response(tokens)
  }
}

const signOut = {
  method: 'GET',
  path: '/idphub/b2c/b2c_1a_cui_cpdev_signupsigninsfi/signout',
  handler: function (request, h) {
    console.log('Sign out request', request.query)
    const {
      post_logout_redirect_uri: redirectUri,
      id_token_hint: accessToken,
      state
    } = request.query

    endSession(accessToken)

    request.yar.reset()

    return h.redirect(`${redirectUri}?state=${state}`)
  }
}

const jwks = {
  method: 'GET',
  path: '/dcidmtest.onmicrosoft.com/b2c_1a_cui_cpdev_signupsigninsfi/discovery/v2.0/keys',
  handler: function (_request, h) {
    return h.response(getPublicKeys())
  }
}

export const openId = [
  wellKnown,
  authorization,
  token,
  signOut,
  jwks
]
