import { getOidcConfig } from '../entra/get-oidc-config.js'
import { createState } from './state.js'
import { config } from '../config/config.js'

async function getSignOutUrl (request, loginHint) {
  const { end_session_endpoint: url } = await getOidcConfig()

  // To prevent CSRF attacks, the state parameter should be passed during redirection
  // It should be verified when the user is redirected back to the application
  // The `createState` function generates a unique state value and stores it in the session
  const state = createState(request)

  // `logout_hint` will only be used if the `login_hint` optional claim is included in the Entra token configuration and exposed in the token.  A normal change request to CCoE is required to enable this.
  // Once enabled, the value required will be within the JWT `login_hint` property.
  // Alternatively, the `id_token_hint` parameter can be used to pass the user's id token, but this often exceeds the querystring limit enforced by both the Entra signout endpoint and CDP WAF, resulting in errors during sign out.
  // If `logout_hint` is undefined or empty, the user will still be signed out, but will not be redirected to the specified URL after sign out, and may be prompted to select an account if they are signed in with multiple accounts in the same browser.
  const query = [
    `post_logout_redirect_uri=${config.get('entra.signOutRedirectUrl')}`,
    `logout_hint=${loginHint}`,
    `state=${state}`
  ].join('&')
  return encodeURI(`${url}?${query}`)
}

export { getSignOutUrl }
