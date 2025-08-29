import { getHost } from './get-host.js'

export function getWellKnown () {
  const host = getHost()

  return {
    issuer: `${host}/131a35fb-0422-49c9-8753-15217cec5411/v2.0/`,
    authorization_endpoint: `${host}/dcidmtest.onmicrosoft.com/b2c_1a_cui_cpdev_signupsigninsfi/oauth2/v2.0/authorize`,
    token_endpoint: `${host}/dcidmtest.onmicrosoft.com/b2c_1a_cui_cpdev_signupsigninsfi/oauth2/v2.0/token`,
    end_session_endpoint: `${host}/idphub/b2c/b2c_1a_cui_cpdev_signupsigninsfi/signout`,
    jwks_uri: `${host}/dcidmtest.onmicrosoft.com/b2c_1a_cui_cpdev_signupsigninsfi/discovery/v2.0/keys`,
    response_modes_supported: [
      'query',
      'fragment',
      'form_post'
    ],
    response_types_supported: [
      'code',
      'code id_token',
      'code token',
      'code id_token token',
      'id_token',
      'id_token token',
      'token',
      'token id_token'
    ],
    scopes_supported: [
      'openid'
    ],
    subject_types_supported: [
      'pairwise'
    ],
    id_token_signing_alg_values_supported: [
      'RS256'
    ],
    token_endpoint_auth_methods_supported: [
      'client_secret_post',
      'client_secret_basic'
    ],
    claims_supported: [
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
    ]
  }
}
