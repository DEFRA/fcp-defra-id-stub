import Joi from 'joi'
import Boom from '@hapi/boom'
import { getWellKnown } from '../open-id/get-well-known.js'
import { getTokens } from '../auth/token.js'
import { endSession } from '../auth/session.js'
import { getPublicKeys } from '../auth/keys.js'

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
        serviceId: Joi.string().required(),
        p: Joi.string(),
        response_mode: Joi.string(),
        response_type: Joi.string(),
        client_id: Joi.string().required(),
        redirect_uri: Joi.string().uri().required(),
        state: Joi.string(),
        nonce: Joi.string(),
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

const tokenSchema = Joi.object({
  grant_type: Joi.string().valid('authorization_code', 'refresh_token').required(),
  code: Joi.string(),
  redirect_uri: Joi.string().uri().required(),
  client_id: Joi.string().required(),
  client_secret: Joi.string().required(),
  scope: Joi.string(),
  refresh_token: Joi.string()
})

const token = {
  method: 'POST',
  path: '/dcidmtest.onmicrosoft.com/b2c_1a_cui_cpdev_signupsigninsfi/oauth2/v2.0/token',
  handler: function (request, h) {
    const params = { ...request.query, ...request.payload }

    const { error } = tokenSchema.validate(params)

    if (error) {
      throw Boom.badRequest(`${error.message}`)
    }

    const { code: accessCode, grant_type: grantType, refresh_token: refreshToken } = params

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
  options: {
    validate: {
      query: {
        post_logout_redirect_uri: Joi.string().uri().required(),
        id_token_hint: Joi.string().required(),
        state: Joi.string()
      },
      failAction: async (_request, h, error) => h.view('errors/400', {
        message: error.message
      }).takeover()
    }
  },
  handler: function (request, h) {
    const {
      post_logout_redirect_uri: redirectUri,
      id_token_hint: accessToken,
      state
    } = request.query

    endSession(accessToken)

    request.yar.reset()

    const stateResponse = state ? `?state=${state}` : ''

    return h.redirect(`${redirectUri}${stateResponse}`)
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
