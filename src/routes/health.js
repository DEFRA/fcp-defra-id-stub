export const health = {
  method: 'GET',
  path: '/health',
  handler: function (_request, h) {
    return h.response({ message: 'success' })
  }
}
