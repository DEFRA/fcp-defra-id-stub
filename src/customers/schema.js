import Joi from 'joi'
export const schema = Joi.object({
  people: Joi.array().items(Joi.object({
    crn: Joi.number().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    organisations: Joi.array().items(Joi.object({
      organisationId: Joi.string().required(),
      sbi: Joi.number().required(),
      name: Joi.string().required()
    })).required()
  })).required()
})
