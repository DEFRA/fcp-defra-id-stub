export const index = {
  method: 'GET',
  path: '/',
  handler: function (_request, h) {
    return h.view('index', { navigation: 'overview' })
  }
}
