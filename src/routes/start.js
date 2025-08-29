export const start = {
  method: 'GET',
  path: '/',
  handler: function (_request, h) {
    return h.view('start')
  }
}
