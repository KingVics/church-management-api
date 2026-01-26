const { BadRequestError, NotFoundError } = require('../errors');
const DepartmentModel = require('../model/departments');
const { StatusCodes } = require('http-status-codes');

const GetDepartments = async (req, res) => {
  const { name } = req.query;
  let queryObject = {};

  if (name) {
    queryObject.name = { $regex: name, $options: 'i' };
  }

  let findDepartment = await DepartmentModel.find(queryObject);

  if (!findDepartment) {
    throw new NotFoundError('No department found');
  }

  res
    .status(StatusCodes.CREATED)
    .json({ mesage: ` successfully`, data: findDepartment });
};

const CreateDepartment = async (req, res) => {
  const { name, headOfDepartment, headOfDepartmentPhone, ministerInCharge } =
    req.body;

  let findDepartment = await DepartmentModel.findOne({ name });

  if (findDepartment && findDepartment._id) {
    throw new BadRequestError(`${name} Department already exist`);
  }

  findDepartment = await DepartmentModel.create({
    name,
    headOfDepartment,
    headOfDepartmentPhone,
    ministerInCharge,
    createdBy: req.user.userId,
  });

  res
    .status(StatusCodes.CREATED)
    .json({ mesage: `${name} Department created successfully` });
};

const UpdateDepartment = async (req, res) => {
  const { name, headOfDepartment, headOfDepartmentPhone, ministerInCharge } =
    req.body;
  const { id } = req.params;

  if (!id) {
    throw new BadRequestError('Please provide name');
  }

  let findDepartment = await DepartmentModel.findOne({ _id: id });

  if (!findDepartment) {
    throw new NotFoundError('No department found');
  }

  let updateObj = { modifiedBy: req.user.name };

  if (name) {
    updateObj.name = name;
  }

  if (headOfDepartment?.name) {
    updateObj.headOfDepartment = headOfDepartment;
  }

  if (headOfDepartmentPhone) {
    updateObj.headOfDepartmentPhone = headOfDepartmentPhone;
  }
  if (ministerInCharge?.name) {
    updateObj.ministerInCharge = ministerInCharge;
  }
  findDepartment = await DepartmentModel.findByIdAndUpdate(
    { _id: findDepartment._id },
    updateObj,
    { new: true }
  );

  res.status(StatusCodes.OK).json({ mesage: `Department updated` });
};

const DeleteDepartment = async (req, res) => {
  const { id } = req.params;

  let findDepartment = await DepartmentModel.findOne({ _id: id });

  if (!findDepartment) {
    throw new NotFoundError('No department found');
  }

  findDepartment = await DepartmentModel.findByIdAndDelete({
    _id: findDepartment._id,
  });

  res.status(StatusCodes.OK).json({ mesage: `Department deleted` });
};

module.exports = {
  CreateDepartment,
  UpdateDepartment,
  GetDepartments,
  DeleteDepartment,
};
