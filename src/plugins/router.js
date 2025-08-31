import Inert from '@hapi/inert'
import { health } from '../routes/health.js'
import { index } from '../routes/index.js'
import { openId } from '../routes/open-id.js'
import { auth } from '../routes/auth.js'
import { serveStaticFiles } from '../common/helpers/serve-static-files.js'

export const router = {
  plugin: {
    name: 'router',
    async register (server) {
      await server.register([Inert])
      await server.route(health)
      await server.route(index)
      await server.route(openId)
      await server.route(auth)
      await server.register([serveStaticFiles])
    }
  }
}
