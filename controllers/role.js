const { BadRequestError, NotFoundError } = require('../errors');
const Roles = require('../model/config');
const { StatusCodes } = require('http-status-codes');
const members = require('../model/members');

const createRole = async (req, res) => {
  const { name, permissions } = req.body;

  if (permissions?.length <= 0) {
    throw new BadRequestError('No permissions set for role');
  }

  const data = await Roles.create({
    name,
    permissions,
  });

  res.status(StatusCodes.OK).json({ data, message: 'Role created' });
};

const getRoles = async (req, res) => {
  const data = await Roles.find();

  res.status(StatusCodes.OK).json({ data });
};

const updateRole = async (req, res) => {
  const { id } = req.params;
  const { permission } = req.body;

  Roles.findOne({
    _id: id,
  })
    .then(async (doc) => {
      const check = [...doc.permissions]?.filter(
        (c) => c.name === permission?.name
      );

      if (check?.length > 0) {
        throw new BadRequestError('Permission already exist');
      }

      doc.permissions.push(permission);
      await doc.save();
      res
        .status(StatusCodes.OK)
        .json({ data: doc, message: 'Updated successfully' });
    })
    .catch((error) => {
      res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
    });
};

const deleteARole = async (req, res) => {
  const { id } = req.params;
  const { permission } = req.body;

  const findRoles = await members.find({
    permission: { $elemMatch: { permissions: permission, permId: id } },
  });

  if (findRoles?.length > 0) {
    throw new BadRequestError(
      `Error removing permission. Permission used by ${findRoles?.length} user.`
    );
  }

  const data = await Roles.findOneAndUpdate(
    { _id: id },
    { $pull: { permissions: permission } },
    { safe: true, multi: true }
  );
  res.status(StatusCodes.OK).json({ data, message: 'Deleted successfully' });
};

module.exports = {
  createRole,
  getRoles,
  updateRole,
  deleteARole,
};
