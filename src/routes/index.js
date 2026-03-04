export const index = {
  method: 'GET',
  path: '/',
  handler: (request, h) => h.view('index', { navigation: 'overview', auth: request.auth })
}
