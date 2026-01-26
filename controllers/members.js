const { BadRequestError, NotFoundError } = require('../errors');
const MembersModel = require('../model/members');
const ActivitiesModel = require('../model/activities');
const { StatusCodes } = require('http-status-codes');
const generateUniqueRef = require('../middleware/generateId');
const CalculateTotal = require('../middleware/calculateTotal');
const Roles = require('../model/config');
const fs = require('fs');
var path = require('path');
const toTitleCase = require('../middleware/toLower');
const { AwsS3 } = require('../middleware/awsUpload');

const GetASingleMember = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new BadRequestError('No Id found');
  }

  await MembersModel.findOne({ _id: id })
    .select({ password: 0 })
    .then((doc) => {
      res.status(StatusCodes.OK).json({ data: doc });
    })
    .catch((error) => {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: error.message });
    });
};

const GetUser = async (req, res) => {
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
  let users = MembersModel.find(queryObject)
    .skip(pageOptions.page * pageOptions.limit)
    .limit(pageOptions.limit)
    .sort([['createdAt', -1]])
    .select({ password: 0 });

  const Count = await MembersModel.countDocuments(queryObject);

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

const CreateUser = async (req, res) => {
  const {
    title,
    profilePicture,
    firstName,
    lastName,
    gender,
    phone,
    category,
    maritalStatus,
    spouseName,
    email,
    address,
    departments,
    membershipType,
    joinedDate,
    dateOfBirth,
  } = req.body;

  if (email || phone) {
    let query = {};
    if (email) {
      query.email = email;
    }
    if (phone) {
      query.phone = phone;
    }
    const findMember = await MembersModel.findOne(query);

    if (findMember && findMember?._id) {
      throw new BadRequestError('Member phone or email already exist');
    }
  }

  // const month = dateOfBirth ? new Date(dateOfBirth).getMonth() + 1 : '';
  // const day = dateOfBirth ? new Date(dateOfBirth).getDay() + 1 : '';

  const Id = await generateUniqueRef();
  const data = {
    title,
    profilePicture,
    firstName: toTitleCase(firstName),
    lastName: toTitleCase(lastName),
    gender,
    phone,
    category,
    maritalStatus,
    spouseName: toTitleCase(spouseName),
    email,
    address,
    departments,
    membershipType,
    joinedDate,
    dateOfBirth: dateOfBirth,
    memberId: Id,
    // ? `${day.toString()?.padStart(2, '0')}-${month
    //     .toString()
    //     ?.padStart(2, '0')}`
    // : '',
  };

  for (const keys in Object.assign(data)) {
    if (data[keys] === '') {
      delete data[keys];
    }
  }

  const user = await MembersModel.create({ ...data })
    .then(async (doc) => {
      if (doc.membershipType !== 'Visitor') {
        const activities = await ActivitiesModel.find({});
        const allActivities = activities.map((item) => ({
          date: item.date,
          serviceName: item.serviceName,
          serviceId: item._id,
          time: item.time || '',
          attendance: 'Absent',
        }));
        doc.attendance = allActivities;
        doc.save();
        res
          .status(StatusCodes.CREATED)
          .json({ mesage: `${doc.firstName} created`, record: doc });
      } else {
        res
          .status(StatusCodes.CREATED)
          .json({
            mesage: `${doc.firstName} created for visitor`,
            record: doc,
          });
      }
    })
    .catch((error) => {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ mesage: error.message });
    });
};

const UpdateUser = async (req, res) => {
  const { id: _id } = req.params;
  const {
    firstName,
    lastName,
    phone,
    maritalStatus,
    address,
    departments,
    membershipType,
    email,
    title,
    dateOfBirth,
    category,
    gender,
  } = req.body;

  let user = await MembersModel.findOne({ _id });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  let data = {
    updatedBy: req.user.name,
  };

  if (firstName) {
    data.firstName = firstName;
  }

  if (lastName) {
    data.lastName = lastName;
  }

  if (phone) {
    data.phone = phone;
  }

  if (maritalStatus) {
    data.maritalStatus = maritalStatus;
  }

  if (address) {
    data.address = address;
  }

  if (departments) {
    data.departments = departments;
  }

  if (address) {
    data.address = address;
  }

  if (membershipType) {
    data.membershipType = membershipType;
  }

  if (email) {
    data.email = email;
  }

  if (title) {
    data.title = title;
  }

  if (dateOfBirth) {
    data.dateOfBirth = dateOfBirth;
  }

  if (category) {
    data.category = category;
  }

  if (gender) {
    data.gender = gender;
  }

  user = await MembersModel.findByIdAndUpdate({ _id }, data, { new: true });

  res
    .status(StatusCodes.OK)
    .json({ mesage: `${user.firstName} sucessfully updated` });
};

const DeleteUser = async (req, res) => {
  const { id: _id } = req.params;

  let user = await MembersModel.findOne({ _id });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  user = await MembersModel.findByIdAndDelete({ _id });

  res
    .status(StatusCodes.OK)
    .json({ mesage: `${user.firstName} sucessfully deleted` });
};

const AddPermissionMember = async (req, res) => {
  const { id, permission, memberId } = req.body;

  if (!id) {
    throw new BadRequestError('Id missing');
  }

  // if (permission?.length <= 0) {
  //   throw new BadRequestError('Please select permission to assign');
  // }

  const findRole = await Roles.findOne({ _id: id });

  if (!findRole?._id) {
    throw new BadRequestError('Role not found');
  }

  const findPerson = await MembersModel.findOne({ _id: memberId });

  if (findPerson?.permission?.length > 0) {
    let newPermission = findPerson?.permission;
    const findRoleName = newPermission?.find((c) => c.name === findRole.name);
    if (findRoleName?.name) {
      const d = await MembersModel.findOneAndUpdate(
        {
          permission: {
            $elemMatch: {
              name: findRole.name,
            },
          },
          _id: memberId,
        },
        {
          $set: {
            'permission.$.permissions': permission,
          },
        },
        { new: true }
      );

      return res
        .status(StatusCodes.OK)
        .json({ message: `permission sucessfully added` });
    } else {
      await MembersModel.findOneAndUpdate(
        { _id: memberId },
        {
          $push: {
            permission: [
              { name: findRole.name, permissions: permission, permId: id },
            ],
          },
        },
        {
          new: true,
        }
      );
      return res
        .status(StatusCodes.OK)
        .json({ message: `permission sucessfully added` });
    }
  } else {
    await MembersModel.findOneAndUpdate(
      { _id: memberId },
      {
        $push: {
          permission: [
            { name: findRole.name, permissions: permission, permId: id },
          ],
        },
      },
      {
        new: true,
      }
    );
    return res
      .status(StatusCodes.OK)
      .json({ message: `permission sucessfully added` });
  }
};

const GetProfileDetails = async (req, res) => {
  const { id } = req.params;

  const userId = req.user.userId;
  if (id !== userId) {
    throw new BadRequestError('Can only get your account details');
  }

  const data = await MembersModel.findOne({ _id: id }).select({
    password: 0,
    permission: 0,
    attendance: 0,
  });
  return res.status(StatusCodes.OK).json({ data });
};

const AddImageMember = async (req, res) => {
  const { memberId, image } = req.body;

  if (!memberId) {
    throw new BadRequestError('No id found for this upload');
  }

  if (!image) {
    throw new BadRequestError('Attach image to upload');
  }

  const finduser = await MembersModel.findOne({ _id: memberId });

  if (!finduser?._id) {
    throw new NotFoundError('User not found');
  }

  const upload = await AwsS3({ image, folder: '/members' });

  MembersModel.findByIdAndUpdate(
    { _id: memberId },
    { profilePicture: upload?.Location || '' }
  )
    .then(async (doc) => {
      return res.status(StatusCodes.OK).json({ data: doc });
    })
    .catch((error) => {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: error.message });
    });
};

const FindMemberStat = async (req, res) => {
  const { startDate, endDate, type } = req.query;

  let queryObject = {};
  if (startDate || endDate) {
    queryObject.attendance = { date: startDate };
  }
  const user = await MembersModel.aggregate([
    {
      $match: {
        'attendance.date': {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $match: {
        'attendance.attendance': type,
      },
    },
    { $unwind: { path: '$attendance' } },
    { $unwind: { path: '$attendance.date' } },
    {
      $match: {
        'attendance.date': {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $match: {
        'attendance.attendance': type,
      },
    },
    {
      $group: {
        _id: '$_id',
        firstName: {
          $first: '$firstName',
        },
        lastName: {
          $first: '$lastName',
        },

        attendance: {
          $push: '$attendance',
        },
      },
    },
  ]);

  function toTime(seconds) {
    var date = new Date(null);
    date.setSeconds(seconds);
    return date.toISOString().substr(11, 8);
  }

  const CalculateTotal = (attendance) => {
    let total = 0;

    for (let i = 0; i < attendance.length; i++) {
      const convert =
        attendance[i] && attendance[i].time
          ? attendance[i].time.split(' ')[0]
          : 0;

      const seconds = convert
        ? convert.split(':').reduce((acc, time) => 60 * acc + +time)
        : 0;

      total += seconds;
    }

    return toTime(total / 4);
  };

  const convertTime = user.map((item) => {
    return {
      ...item,
      // attendance: item.attendance.map((time) => {
      //   return {
      //     time:
      //       time && time.time
      //         ? time.time
      //             .split(' ')[0]
      //             ?.split(':')
      //             .reduce((acc, time) => 60 * acc + +time)
      //         : 0,
      //   };
      // }),
      total: CalculateTotal(item.attendance),
    };
  });
  res.status(StatusCodes.OK).json({
    data: convertTime,
    len: user?.length,
  });
};
module.exports = {
  CreateUser,
  UpdateUser,
  GetUser,
  DeleteUser,
  GetASingleMember,
  AddPermissionMember,
  GetProfileDetails,
  AddImageMember,
  FindMemberStat,
};
