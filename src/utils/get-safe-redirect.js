export const getSafeRedirect = (redirect) => {
  if (!redirect?.startsWith('/')) {
    return '/'
  }
  return redirect
}
