import http2 from 'node:http2'
import { readFile } from 'node:fs/promises'
import Joi from 'joi'
import { config } from '../config/config.js'
import { downloadS3File, getS3Datasets, uploadS3File, deleteS3File } from '../data/s3.js'

const { constants: httpConstants } = http2
const { HTTP_STATUS_BAD_REQUEST, HTTP_STATUS_NOT_FOUND, HTTP_STATUS_INTERNAL_SERVER_ERROR } = httpConstants

const viewAuth = config.get('entra.enabled') ? { strategy: 'session', mode: 'try' } : false
const auth = config.get('entra.enabled') ? { strategy: 'session', scope: ['S3.Amend'] } : false

const view = {
  method: 'GET',
  path: '/s3',
  options: {
    auth: viewAuth
  },
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
    return h.view('s3-create', { navigation: 's3', auth: request.auth })
  }
}

const upload = {
  method: 'POST',
  path: '/s3/upload',
  options: {
    auth,
    payload: {
      maxBytes: 10 * 1024 * 1024,
      output: 'file',
      parse: true,
      allow: 'multipart/form-data',
      multipart: true,
      timeout: false
    },
    validate: {
      payload: Joi.object({
        clientId: Joi.string().required(),
        file: Joi.object({
          filename: Joi.string().min(1).required().custom((value, helpers) => {
            if (!value.endsWith('.json')) {
              return helpers.error('any.invalid', { message: 'Only .json files are permitted' })
            }
            return value
          })
        }).unknown().required()
      }),
      failAction: async (request, h, error) => {
        const errors = {}
        for (const detail of error.details) {
          if (detail.path[0] === 'clientId') {
            errors.clientId = 'Enter a Client ID'
          }
          if (detail.path[0] === 'file') {
            errors.file = detail.type === 'any.invalid' ? 'File must be a .json file' : 'Select a JSON file to upload'
          }
        }
        return h.view('s3-create', {
          navigation: 's3',
          auth: request.auth,
          errors,
          values: { clientId: request.payload?.clientId }
        }).code(HTTP_STATUS_BAD_REQUEST).takeover()
      }
    }
  },
  handler: async function (request, h) {
    const { clientId, file } = request.payload
    const { filename } = file
    const content = await readFile(file.path, 'utf-8')
    try {
      await uploadS3File(clientId, filename, content)
      return h.redirect('/s3')
    } catch (error) {
      return h.view('s3-create', {
        navigation: 's3',
        auth: request.auth,
        errors: { server: `Failed to upload file: ${error.message}` },
        values: { clientId }
      }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    }
  }
}

const deleteConfirm = {
  method: 'GET',
  path: '/s3/delete',
  options: {
    auth,
    validate: {
      query: Joi.object({
        clientId: Joi.string().required(),
        filename: Joi.string().required()
      }),
      failAction: async (_request, h, error) => h.view('errors/400', {
        message: error.message
      }).code(HTTP_STATUS_BAD_REQUEST).takeover()
    }
  },
  handler: async function (request, h) {
    const { clientId, filename } = request.query
    return h.view('s3-delete', { navigation: 's3', auth: request.auth, clientId, filename })
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
      return h.redirect('/s3')
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

export const s3 = config.get('aws.s3Enabled') ? [view, create, upload, deleteConfirm, deleteFile, download] : []
