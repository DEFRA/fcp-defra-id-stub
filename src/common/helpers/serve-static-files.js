import http2 from 'node:http2'
import { config } from '../../config/config.js'

const { constants: httpConstants } = http2

export const serveStaticFiles = {
  plugin: {
    name: 'staticFiles',
    register (server) {
      server.route([
        {
          options: {
            auth: false,
            cache: {
              expiresIn: config.get('staticCacheTimeout'),
              privacy: 'private'
            }
          },
          method: 'GET',
          path: '/favicon.ico',
          handler (_request, h) {
            return h.response().code(httpConstants.HTTP_STATUS_NO_CONTENT).type('image/x-icon')
          }
        },
        {
          options: {
            auth: false,
            cache: {
              expiresIn: config.get('staticCacheTimeout'),
              privacy: 'private'
            }
          },
          method: 'GET',
          path: `${config.get('assetPath')}/{param*}`,
          handler: {
            directory: {
              path: '.',
              redirectToSlash: true
            }
          }
        }
      ])
    }
  }
}
