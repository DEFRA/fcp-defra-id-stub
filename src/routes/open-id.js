import { getWellKnown } from '../open-id/get-well-known.js'

const wellKnown = {
  method: 'GET',
  path: '/idphub/b2c/b2c_1a_cui_cpdev_signupsigninsfi/.well-known/openid-configuration',
  handler: (_request, h) => h.response(getWellKnown())
}

const authorization = {
  method: 'GET',
  path: '/dcidmtest.onmicrosoft.com/b2c_1a_cui_cpdev_signupsigninsfi/oauth2/v2.0/authorize',
  handler: function (request, h) {
    request.yar.set('auth-request', request.query)
    return h.redirect('/dcidmtest.onmicrosoft.com/oauth2/authresp')
  }
}

const token = {
  method: 'POST',
  path: '/dcidmtest.onmicrosoft.com/b2c_1a_cui_cpdev_signupsigninsfi/oauth2/v2.0/token',
  handler: function (_request, h) {
    console.log('Token request received')
    return h.response('token')
  }
}

const endSession = {
  method: 'GET',
  path: '/idphub/b2c/b2c_1a_cui_cpdev_signupsigninsfi/signout',
  handler: function (_request, h) {
    return h.response('end session')
  }
}

const jwks = {
  method: 'GET',
  path: '/dcidmtest.onmicrosoft.com/b2c_1a_cui_cpdev_signupsigninsfi/discovery/v2.0/keys',
  handler: function (_request, h) {
    return h.response('jwks')
  }
}

export const openId = [
  wellKnown,
  authorization,
  token,
  endSession,
  jwks
]
