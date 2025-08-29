import http2 from 'node:http2'

const { constants: httpConstants } = http2

export function catchAll (request, h) {
  const { response } = request

  if (!('isBoom' in response)) {
    return h.continue
  }

  const statusCode = response.output.statusCode

  let template = 'errors/500'
  let pageTitle = 'Sorry, there is a problem with the service'

  if (statusCode === httpConstants.HTTP_STATUS_NOT_FOUND) {
    template = 'errors/404'
    pageTitle = 'Page not found'
  }

  if (statusCode >= httpConstants.HTTP_STATUS_INTERNAL_SERVER_ERROR) {
    request.logger.error(response?.stack)
  }

  const viewResponse = h.view(template, { pageTitle }).code(statusCode)

  // Preserve any existing headers from the boom response
  const originalHeaders = response.headers || response.output?.headers || {}
  for (const [key, value] of Object.entries(originalHeaders)) {
    if (key.toLowerCase() === 'content-type') {
      continue
    }
    viewResponse.header(key, value)
  }

  return viewResponse
}
