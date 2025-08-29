export const headers = {
  plugin: {
    name: 'headers',
    register: (server, _options) => {
      server.ext('onPreResponse', (request, h) => {
        const response = request.response
        const isOAuthEndpoint = request.path.includes('/oauth2/') || request.path.includes('/.well-known/')

        const headerLocation = response.headers || response.output?.headers

        if (headerLocation) {
          headerLocation['X-Robots-Tag'] = 'noindex, nofollow'
          headerLocation['Cross-Origin-Opener-Policy'] = 'same-origin'
          headerLocation['Cross-Origin-Embedder-Policy'] = 'require-corp'

          // Allow cross-origin requests for OAuth endpoints
          if (!isOAuthEndpoint) {
            headerLocation['Cross-Origin-Resource-Policy'] = 'same-site'
          }

          headerLocation['Referrer-Policy'] = 'same-origin'
          headerLocation['Permissions-Policy'] = 'camera=(), geolocation=(), magnetometer=(), microphone=(), payment=(), usb=()'
        }

        return h.continue
      })
    }
  }
}
