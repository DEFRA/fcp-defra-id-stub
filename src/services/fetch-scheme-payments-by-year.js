import { getUrlParams } from '../api/get-url-params.js'
import { get } from '../api/get.js'

export async function fetchSchemePaymentsByYear () {
  const url = getUrlParams('summary')
  const response = await get(url)

  return JSON.parse(response.payload)
}
