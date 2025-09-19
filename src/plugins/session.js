import Yar from '@hapi/yar'
import { config } from '../config/config.js'

export const session = {
  plugin: Yar,
  options: {
    name: config.get('cookie.name'),
    storeBlank: false,
    cookieOptions: {
      password: config.get('cookie.password'),
      isSecure: config.get('cookie.isSecure'),
      isSameSite: 'Lax'
    }
  }
}
