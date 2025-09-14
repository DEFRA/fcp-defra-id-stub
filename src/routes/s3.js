import { config } from '../config/config.js'
import { downloadS3File, getS3Datasets } from '../people/s3.js'

const view = {
  method: 'GET',
  path: '/s3',
  handler: async function (_request, h) {
    const datasets = await getS3Datasets()
    return h.view('s3', { navigation: 's3', datasets })
  }
}

const download = {
  method: 'GET',
  path: '/s3/download',
  handler: async function (request, h) {
    const { clientId, filename } = request.query
    const fileContent = await downloadS3File(clientId, filename)
    if (!fileContent) {
      return h.response('File not found').code(404)
    }
    return h.response(fileContent).type('application/json')
  }
}

export const s3 = config.get('aws.s3Enabled') ? [view, download] : []
