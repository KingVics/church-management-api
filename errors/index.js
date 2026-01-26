const CustomAPIError = require('./custom-api')
const UnauthenticatedError = require('./Unauthenticated')
const NotFoundError = require('./not-found')
const BadRequestError = require('./BadRequest')

module.exports = {
  CustomAPIError,
  UnauthenticatedError,
  NotFoundError,
  BadRequestError,
}
