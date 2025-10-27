import http2 from 'node:http2'
import Joi from 'joi'
import { config } from '../config/config.js'
import { downloadS3File, getS3Datasets } from '../data/s3.js'

const { constants: httpConstants } = http2
const { HTTP_STATUS_BAD_REQUEST, HTTP_STATUS_NOT_FOUND } = httpConstants

const view = {
  method: 'GET',
  path: '/s3',
  handler: async function (_request, h) {
    const datasets = await getS3Datasets()
    return h.view('s3', { navigation: 's3', datasets })
  }
}

const create = {
  method: 'GET',
  path: '/s3/create',
  options: {
    auth: { mode: 'required': strategy: 'entra' }
  }
  handler: async function (_request, h) {
    return h.view('s3-create')
  }
}

const download = {
  method: 'GET',
  path: '/s3/download',
  options: {
    validate: {
      query: {
        clientId: Joi.string().required(),
        filename: Joi.string().required()
      },
      failAction: async (_request, h, error) => h.view('errors/400', {
        message: error.message
      }).code(HTTP_STATUS_BAD_REQUEST).takeover()
    }
  },
  handler: async function (request, h) {
    const { clientId, filename } = request.query
    const fileContent = await downloadS3File(clientId, filename)
    if (!fileContent) {
      return h.response('File not found').code(HTTP_STATUS_NOT_FOUND)
    }
    return h.response(fileContent).type('application/json')
  }
}

export const s3 = config.get('aws.s3Enabled') ? [view, download, create] : []
