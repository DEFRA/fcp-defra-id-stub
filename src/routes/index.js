export const index = {
  method: 'GET',
  path: '/',
  handler: (_request, h) => h.view('index', { navigation: 'overview' })
}
