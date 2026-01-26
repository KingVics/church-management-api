const { StatusCodes } = require('http-status-codes');
const { NotFoundError, BadRequestError } = require('../errors');
const SendNotification = require('../middleware/sendNotification');

const SendMessage = async (req, res) => {
  const { title, body } = req.body;

  if (!title || !body) {
    throw new BadRequestError('Title and body are required');
  }

  const searchObject = {
    role: 'admin',
  };

  await SendNotification({ searchObject, title, body });

  res.status(StatusCodes.OK).json({ message: 'Notification sent' });
};

module.exports = {
  SendMessage,
};
