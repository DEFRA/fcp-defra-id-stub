import { config } from '../config/config.js'

const auth = config.get('entra.enabled') ? { strategy: 'session', mode: 'try' } : false

export const index = {
  method: 'GET',
  path: '/',
  options: {
    auth
  },
  handler: (request, h) => h.view('index', { navigation: 'overview', auth: request.auth })
}
