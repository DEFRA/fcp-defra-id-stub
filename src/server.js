import path from 'node:path'
import Hapi from '@hapi/hapi'
import Scooter from '@hapi/scooter'
import { contentSecurityPolicy } from './plugins/content-security-policy.js'
import { headers } from './plugins/headers.js'
import { router } from './plugins/router.js'
import { config } from './config/config.js'
import { pulse } from './common/helpers/pulse.js'
import { catchAll } from './common/helpers/errors.js'
import { nunjucksConfig } from './config/nunjucks/nunjucks.js'
import { setupProxy } from './common/helpers/proxy/setup-proxy.js'
import { requestTracing } from './common/helpers/request-tracing.js'
import { requestLogger } from './common/helpers/logging/request-logger.js'
import { secureContext } from './common/helpers/secure-context/secure-context.js'

export async function createServer () {
  setupProxy()
  const server = Hapi.server({
    host: config.get('host'),
    port: config.get('port'),
    routes: {
      validate: {
        options: {
          abortEarly: false
        }
      },
      files: {
        relativeTo: path.resolve(config.get('root'), '.public')
      },
      security: {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true
        },
        xss: 'enabled',
        noSniff: true,
        xframe: true
      }
    },
    router: {
      stripTrailingSlash: true
    },
    state: {
      strictHeader: false
    }
  })
  await server.register([
    Scooter,
    requestLogger,
    requestTracing,
    secureContext,
    pulse,
    nunjucksConfig,
    contentSecurityPolicy,
    headers,
    router,
  ])

  server.ext('onPreResponse', catchAll)

  return server
}
