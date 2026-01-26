const { BadRequestError, NotFoundError } = require('../errors');
const { StatusCodes } = require('http-status-codes');
//const cookie = require('cookie');
const SendEmail = require('../middleware/sendEmail.js');
const MemberModel = require('../model/members.js');
const Role = require('../model/config.js');
const SaveNotification = require('../middleware/saveToken.js');

const CreateAdmin = async (req, res) => {
  const { phone, password } = req.body;

  if (!phone) {
    throw new BadRequestError('Phone number missing');
  }

  if (!password) {
    throw new BadRequestError('Temporary password is missing');
  }

  const findMember = await MemberModel.findOne({ phone });

  if (!findMember?._id) {
    throw new NotFoundError('No user exist');
  }

  const findPermissions = findMember?.permission
    ?.find((c) => c.name === 'AUTH')
    ?.permissions?.find((c) => c.name === 'login');

  if (!findPermissions?.name) {
    throw new BadRequestError('User has no AUTH permission to login');
  }

  if (findMember?.password) {
    throw new BadRequestError('User already has login permission and details');
  }

  const newPassword = await findMember.saltPassword(password);

  await MemberModel.findOneAndUpdate(
    { _id: findMember._id },
    { password: newPassword },
    { new: true }
  )
    .then((doc) => {
      if (doc?.email) {
        const msg = {
          from: {
            email: '',
          },
          personalizations: [
            {
              to: [
                {
                  email: doc?.email,
                },
              ],
              dynamic_template_data: {
                first_name: doc?.firstName,
                password: password,
                phone: doc?.phone,
              },
            },
          ],
          templateId: 'd-194c8826c94149f9bde3b8ba9cf409bd',
        };
        SendEmail({ msg });
        res.status(StatusCodes.OK).json({ message: 'Login details created' });
      } else {
        res.status(StatusCodes.OK).json({ message: 'Login details created' });
      }
    })
    .catch((error) => {
      res.status(StatusCodes.BAD_GATEWAY).json({ message: error.message });
    });
};

const LoginAdmin = async (req, res) => {
  const { phone, password, deviceToken } = req.body;

  if (!phone || !password) {
    throw new BadRequestError('Please provide phone and password');
  }

  const user = await MemberModel.findOne({ phone });

  if (!user) {
    throw new NotFoundError('Invalid phone or password');
  }

  // Check if the user has AUTH permission to log in
  const hasAuthPermission = user.permission?.some(
    (c) => c.name === 'AUTH' && c.permissions.some((p) => p.name === 'login')
  );

  if (!hasAuthPermission) {
    throw new BadRequestError('User has no AUTH permission to login');
  }

  // Validate password
  const matchedPassword = await user.comparePassword(password);
  if (!matchedPassword) {
    throw new BadRequestError('Invalid phone or password');
  }

  // Generate tokens
  const token = user.CreateJWT();
  const refreshToken = user.RefreshJWT();

  if (deviceToken) {
    await SaveNotification({ user, deviceToken });
  }

  // Store refreshToken in the database
  await MemberModel.findByIdAndUpdate(
    user._id,
    { refreshToken },
    { new: true }
  );

  // Set refreshToken in a secure HTTP-only cookie
  res.cookie('jwt', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Only secure in production
    sameSite: 'Strict',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  });

  // Send response
  res.status(StatusCodes.OK).json({
    name: user.firstName,
    token,
    userId: user._id,
    role: user?.permission,
  });
};

const GetSingleAdmin = async (req, res) => {
  const { id } = req.params;

  const findAmdin = MemberModel.findOne({ _id: id }).select({
    password: 0,
    refreshToken: 0,
  });

  const data = await findAmdin;

  res.status(StatusCodes.OK).json({ data });
};

const UpdateSingleAdmin = async (req, res) => {
  const { id } = req.params;

  const { phone, email } = req.body;

  let updateObject = {};

  if (phone) {
    updateObject.phone = phone;
  }

  if (email) {
    updateObject.email = email;
  }

  await MemberModel.findOneAndUpdate({ _id: id }, updateObject, {
    new: true,
  });

  res.status(StatusCodes.OK).json({ message: 'Record updated' });
};

const UpdatePassword = async (req, res) => {
  const { id } = req.params;

  const { password, oldPassword } = req.body;

  if (!oldPassword) {
    throw new BadRequestError('Provide Old Password');
  }

  if (!password) {
    throw new BadRequestError('Password is missing');
  }

  const user = await MemberModel.findOne({ _id: id });

  const findPermissions = user?.permission
    ?.find((c) => c.name === 'AUTH')
    ?.permissions?.find((c) => c.name === 'login');

  if (!findPermissions?.name) {
    throw new BadRequestError('User has no AUTH permission to login');
  }

  const matchedpassword = await user.comparePassword(oldPassword);

  if (matchedpassword) {
    const newPassword = await user.saltPassword(password);
    await MemberModel.findOneAndUpdate(
      { _id: id },
      { password: newPassword },
      {
        new: true,
      }
    );

    res.status(StatusCodes.OK).json({ message: 'Password updated' });
  } else {
    throw new BadRequestError('Old Password does not match');
  }
};

const GetLoginUser = async (req, res) => {
  MemberModel.find({
    password: {
      $exists: true,
      $ne: null,
    },
    permission: {
      $elemMatch: {
        name: 'AUTH',
      },
    },
  })
    .then((doc) => {
      res.status(StatusCodes.OK).json({ data: doc });
    })
    .catch((error) => {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: error.message });
    });
};

const RemoveUserAuth = async (req, res) => {
  const { id, permId } = req.params;

  const checkPermission = await Role.findOne({ _id: permId });

  if (!checkPermission?.name) {
    throw new NotFoundError('Permission not found');
  }

  let updateValue = {
    $pull: { permission: { permId } },
  };

  if (checkPermission.name === 'AUTH') {
    updateValue.password = null;
  }

  await MemberModel.updateOne(
    {
      _id: id,
    },
    updateValue
  )
    .then((doc) => {
      res.status(StatusCodes.OK).json({ message: 'Permission removed' });
    })
    .catch((error) => {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: error.message });
    });
};

module.exports = {
  CreateAdmin,
  LoginAdmin,
  GetSingleAdmin,
  UpdateSingleAdmin,
  UpdatePassword,
  GetLoginUser,
  RemoveUserAuth,
};
