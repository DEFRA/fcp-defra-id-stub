import Yar from '@hapi/yar'
import { config } from '../config/config.js'

export const session = {
  plugin: Yar,
  options: {
    storeBlank: false,
    cookieOptions: {
      password: config.get('cookie.password'),
      isSecure: config.get('isProduction'),
      isSameSite: 'Lax'
    }
  }
}
