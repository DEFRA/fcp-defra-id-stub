export const headers = {
  plugin: {
    name: 'headers',
    register: (server, _options) => {
      server.ext('onPreResponse', (request, h) => {
        const response = request.response

        const headerLocation = response.headers || response.output?.headers

        if (headerLocation) {
          headerLocation['X-Robots-Tag'] = 'noindex, nofollow'
          headerLocation['Cross-Origin-Opener-Policy'] = 'same-origin'
          headerLocation['Cross-Origin-Embedder-Policy'] = 'require-corp'
          headerLocation['Cross-Origin-Resource-Policy'] = 'same-site'
          headerLocation['Referrer-Policy'] = 'same-origin'
          headerLocation['Permissions-Policy'] = 'camera=(), geolocation=(), magnetometer=(), microphone=(), payment=(), usb=()'
        }

        return h.continue
      })
    }
  }
}
