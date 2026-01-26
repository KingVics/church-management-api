const { BadRequestError, NotFoundError } = require('../errors');
const ArchiveModel = require('../model/archive');
const { StatusCodes } = require('http-status-codes');
const MembersModel = require('../model/members');

const CreateArchive = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    throw new BadRequestError('No userId found');
  }

  const user = await MembersModel.findOne({ _id: userId });

  if (!user?._id) {
    throw new NotFoundError('User not found');
  }

  ArchiveModel.create({
    title: user?.title,
    profilePicture: user?.profilePicture,
    firstName: user?.firstName,
    lastName: user?.lastName,
    gender: user?.gender,
    phone: user?.phone,
    category: user?.category,
    maritalStatus: user?.maritalStatus,
    spouseName: user?.spouseName,
    email: user?.email,
    userId,
    address: user?.address,
    departments: user?.departments,
    membershipType: user?.membershipType,
    joinedDate: user?.joinedDate,
    dateOfBirth: user?.dateOfBirth,
    attendance: user?.attendance,
    memberId: user?.memberId,
    permission: user?.permission,
    createdBy: req.user.name,
  })
    .then(async (doc) => {
      await MembersModel.findByIdAndDelete({ _id: userId });
      return res.status(StatusCodes.OK).json({ message: 'Archived created' });
    })
    .catch((error) => {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: error.message });
    });
};

const GetArchive = async (req, res) => {
  const {
    gender,
    address,
    department,
    fromDate,
    toDate,
    membershipType,
    maritalStatus,
    sort,
    dob,
    phone,
    category,
    lastName,
    name,
  } = req.query;

  const pageOptions = {
    page: parseInt(req.query.page - 1, 10) || 0,
    limit: parseInt(req.query.limit, 10) || 10,
  };

  let queryObject = {};

  if (name) {
    queryObject.$expr = {
      $regexMatch: {
        input: {
          $concat: ['$firstName', ' ', '$lastName'],
        },
        regex: name,
        options: 'i',
      },
    };
  }

  if (lastName) {
    queryObject.lastName = { $regex: lastName, $options: 'i' };
  }
  if (gender) {
    queryObject.gender = gender;
  }
  if (address) {
    queryObject.address = { $regex: address, $options: 'i' };
  }

  if (membershipType) {
    queryObject.membershipType = membershipType;
  }

  if (maritalStatus) {
    queryObject.maritalStatus = maritalStatus;
  }

  if (fromDate || toDate) {
    queryObject.joinedDate = { $gte: fromDate, $lte: toDate };
  }

  if (dob) {
    queryObject.dateOfBirth = dob;
  }

  if (department) {
    queryObject.departments = {
      $elemMatch: { name: department },
    };
  }

  if (phone) {
    queryObject.phone = phone;
  }

  if (category) {
    queryObject.category = category;
  }
  let users = ArchiveModel.find(queryObject)
    .skip(pageOptions.page * pageOptions.limit)
    .limit(pageOptions.limit)
    .sort([['createdAt', -1]])
    .select({ password: 0 });

  const Count = await ArchiveModel.countDocuments(queryObject);

  if (sort === 'true') {
    users = users.sort([['firstName', -1]]);
  } else {
    users = users.sort([['firstName', 1]]);
  }

  const result = await users;
  const totalPage = Math.round(Count / pageOptions.limit);

  const pagination =
    Math.round(Count % pageOptions.limit) === 0 ? totalPage : totalPage + 1;
  res.status(StatusCodes.OK).json({
    data: result,
    length: result.length,
    totalElement: Count,
    totalPage: pagination,
    numberofElement: result?.length,
    current: pageOptions?.page,
  });
};

const RestoreArchive = async (req, res) => {
  const { id } = req.params;

  const user = await ArchiveModel.findOne({ _id: id });

  if (!user?._id) {
    throw new NotFoundError('No user found');
  }
  const data = {
    title: user.title,
    firstName: user.firstName,
    lastName: user.lastName,
    gender: user.gender,
    phone: user.phone,
    category: user.category,
    maritalStatus: user.maritalStatus,
    departments: user.departments,
    membershipType: user.membershipType,
    joinedDate: user.joinedDate,
    attendance: user.attendance,
    memberId: user.memberId,
    permission: user.permission,
  };
  await MembersModel.create(data)
    .then(async (doc) => {
      await ArchiveModel.findByIdAndDelete({ _id: id });
      res
        .status(StatusCodes.OK)
        .json({ message: 'Member restored successful' });
    })
    .catch((error) => {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: error.message });
    });
};

module.exports = {
  CreateArchive,
  GetArchive,
  RestoreArchive,
};
