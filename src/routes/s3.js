import http2 from 'node:http2'
import Joi from 'joi'
import { config } from '../config/config.js'
import { downloadS3File, getS3Datasets, uploadS3File, deleteS3File } from '../data/s3.js'

const { constants: httpConstants } = http2
const { HTTP_STATUS_BAD_REQUEST, HTTP_STATUS_NOT_FOUND, HTTP_STATUS_CREATED, HTTP_STATUS_NO_CONTENT } = httpConstants

const auth = config.get('entra.enabled') ? { strategy: 'session', scope: ['S3.Amend'] } : false

const view = {
  method: 'GET',
  path: '/s3',
  handler: async function (request, h) {
    const datasets = await getS3Datasets()
    return h.view('s3', { navigation: 's3', datasets, auth: request.auth })
  }
}

const create = {
  method: 'GET',
  path: '/s3/create',
  options: {
    auth
  },
  handler: async function (request, h) {
    return h.view('s3-create', { auth: request.auth })
  }
}

const upload = {
  method: 'POST',
  path: '/s3/upload',
  options: {
    auth,
    validate: {
      payload: Joi.object({
        clientId: Joi.string().required(),
        filename: Joi.string().required(),
        content: Joi.string().required()
      }),
      failAction: async (_request, h, error) => h.view('errors/400', {
        message: error.message
      }).code(HTTP_STATUS_BAD_REQUEST).takeover()
    }
  },
  handler: async function (request, h) {
    const { clientId, filename, content } = request.payload
    try {
      await uploadS3File(clientId, filename, content)
      return h.response({ success: true, message: 'File uploaded successfully' }).code(HTTP_STATUS_CREATED)
    } catch (error) {
      return h.view('errors/500', {
        message: `Failed to upload file: ${error.message}`
      }).code(500).takeover()
    }
  }
}

const deleteFile = {
  method: 'POST',
  path: '/s3/delete',
  options: {
    auth,
    validate: {
      payload: Joi.object({
        clientId: Joi.string().required(),
        filename: Joi.string().required()
      }),
      failAction: async (_request, h, error) => h.view('errors/400', {
        message: error.message
      }).code(HTTP_STATUS_BAD_REQUEST).takeover()
    }
  },
  handler: async function (request, h) {
    const { clientId, filename } = request.payload
    try {
      await deleteS3File(clientId, filename)
      return h.response({ success: true, message: 'File deleted successfully' }).code(HTTP_STATUS_NO_CONTENT)
    } catch (error) {
      return h.view('errors/500', {
        message: `Failed to delete file: ${error.message}`
      }).code(500).takeover()
    }
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

export const s3 = config.get('aws.s3Enabled') ? [view, create, upload, deleteFile, download] : []
