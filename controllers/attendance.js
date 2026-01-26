const { BadRequestError, NotFoundError } = require('../errors');
const MembersModel = require('../model/members');
const ActivitiesModel = require('../model/activities');
const { StatusCodes } = require('http-status-codes');
const CalculateTotal = require('../middleware/calculateTotal');
const SendEmail = require('../middleware/sendEmail');


const CaptureAttendance = async (req, res) => {
  const { activityId, memberName, memberPhone, memberId } = req.body;

  const type = memberPhone || memberName ? true : false;

  if (!activityId) {
    throw new BadRequestError('missing activityId');
  }

  if (!type) {
    throw new BadRequestError("missing member's info");
  }

  let queryObject = {};

  if (memberName) {
    queryObject.firstName = memberName;
  }

  if (memberPhone) {
    queryObject.phone = memberPhone;
  }

  const findMember = await MembersModel.findOne(queryObject);

  if (findMember === null || (!findMember && !findMember._id)) {
    throw new NotFoundError('Member not yet registered.');
  }

  const activity = await ActivitiesModel.findOne({ _id: activityId });

  if (!activity && !activity._id) {
    throw new NotFoundError(`Activity with ID: ${activityId} not found`);
  }

  const checkAttendance = await findMember?.attendance?.filter(
    (c) => c.serviceId?.toString() === activityId?.toString()
  );

  if (
    checkAttendance?.length > 0 &&
    checkAttendance[0]?.attendance === 'Present'
  ) {
    throw new BadRequestError(
      `${findMember.firstName} already marked present for this activity`
    );
  } else if (checkAttendance?.length <= 0) {
    const attendance = {
      date: activity.date,
      serviceName: activity.serviceName,
      serviceId: activity._id,
      attendance: 'Present',
      createdBy: req.user.name,
    };

    await MembersModel.findOneAndUpdate(
      { _id: findMember._id },
      {
        $push: {
          attendance,
        },
      },
      {
        new: true,
      }
    )
      .then((doc) => {
        return res
          .status(StatusCodes.OK)
          .json({ mesage: `${findMember.firstName} attendance captured` });
      })
      .catch((error) => {
        return res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ mesage: error.message });
      });
  } else {
    await MembersModel.updateOne(
      { _id: findMember._id, 'attendance.serviceId': activity._id },
      {
        $set: {
          'attendance.$.attendance': 'Present',
          'attendance.$.time': new Date().toLocaleTimeString(),
        },
      }
    )
      .then((doc) => {
        if (doc?.acknowledged) {
          res
            .status(StatusCodes.OK)
            .json({ mesage: `${findMember.firstName} attendance captured` });
        }
      })
      .catch((error) => {
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ mesage: error.message });
      });
  }
};

const GenerateTotalAttendance = async (req, res) => {
  const { activityId, type } = req.body;

  if (!activityId) {
    throw new BadRequestError('No activity Id found');
  }

  const activity = await ActivitiesModel.findOne({ _id: activityId });

  if (!activity && !activity._id) {
    throw new NotFoundError(`No activity with ID: ${activityId} found`);
  }

  //! check current time to make sure service has ended
  //! this should be a cron job later

  let queryObject = { serviceId: activity._id };
  if (type) {
    queryObject.attendance = type;
  }

  await MembersModel.find({
    attendance: {
      $elemMatch: queryObject,
    },
  })
    .then(async (doc) => {
      const { exc } = await CalculateTotal({
        data: doc,
        type,
        activityId,
        activityName: activity.name,
      });

      const msg = {
        from: '',
        to: '',
        subject: 'Activity download initiated',
        html: `<p>${req.user.name} just initiated a downdload for ${activity.serviceName}-${activity.date}`,
      };

      SendEmail({ msg });

      res.send(exc);
    })
    .catch((error) => {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ mesage: error.message });
    });
};

const CaptureAutoAttendance = async (req, res) => {
  const { activityId, memberId, time } = req.body;

  var todaysDate = new Date().getHours();

  //! check if church has ended
  if (todaysDate > 13) {
    throw new BadRequestError('Date is in the past or future date');
  }

  if (!memberId) {
    throw new NotFoundError('Missing memberId or activityId.');
  }

  let queryObject = {};

  if (memberId) {
    queryObject._id = memberId;
  }
  const findMember = await MembersModel.findOne(queryObject);

  if (findMember === null || (!findMember && !findMember._id)) {
    throw new NotFoundError('Member not yet registered.');
  }

  const activity = await ActivitiesModel.findOne({ _id: activityId });

  if (!activity && !activity?._id) {
    throw new NotFoundError(`Activity with ID: ${activityId} not found`);
  }

  const checkAttendance = await findMember?.attendance?.filter(
    (c) => c.serviceId?.toString() === activityId?.toString()
  );

  if (
    checkAttendance?.length > 0 &&
    checkAttendance[0]?.attendance === 'Present'
  ) {
    throw new BadRequestError(
      `${findMember.firstName} already marked present for this activity`
    );
  } else if (checkAttendance?.length <= 0) {
    const attendance = {
      date: activity.date,
      serviceName: activity.serviceName,
      serviceId: activity._id,
      attendance: 'Present',
      createdBy: req.user.name,
      time: new Date().toLocaleTimeString(),
    };
    await MembersModel.findOneAndUpdate(
      { _id: findMember._id },
      {
        $push: {
          attendance,
        },
      },
      {
        new: true,
      }
    )
      .then((doc) => {
        return res
          .status(StatusCodes.OK)
          .json({ mesage: `${findMember.firstName} attendance captured` });
      })
      .catch((error) => {
        return res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ mesage: error.message });
      });
  } else {
    await MembersModel.updateOne(
      { _id: findMember._id, 'attendance.serviceId': activity._id },
      {
        $set: {
          'attendance.$.attendance': 'Present',
          'attendance.$.time': time ? time : new Date().toLocaleTimeString(),
          'attendance.$.createdBy': req.user.name,
        },
      }
    )
      .then((doc) => {
        if (doc?.acknowledged) {
          res
            .status(StatusCodes.OK)
            .json({ mesage: `${findMember.firstName} attendance captured` });
        }
      })
      .catch((error) => {
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ mesage: error.message });
      });
  }
};

const GetTotalAttendance = async (req, res) => {
  const { id, type } = req.params;
  const query = req.query;

  if (!id) {
    throw new BadRequestError('No activity Id found');
  }

  const activity = await ActivitiesModel.findOne({ _id: id });

  if (!activity && !activity._id) {
    throw new NotFoundError(`No activity with ID: ${id} found`);
  }

  //! check current time to make sure service has ended
  //! this should be a cron job later

  let queryObject = { serviceId: activity._id };
  if (type || query?.type) {
    queryObject.attendance = type || query?.type;
  }

  const pageOptions = {
    page: parseInt(req.query.page - 1, 10) || 0,
    limit: parseInt(req.query.limit, 10) || 10,
  };

  const result = MembersModel.find({
    attendance: {
      $elemMatch: queryObject,
    },
  });

  if (query?.type) {
    const doc = await result
      .skip(pageOptions.page * pageOptions.limit)
      .limit(pageOptions.limit)
      .sort([['createdAt', -1]])
      .select({ password: 0 });

    const Count = await MembersModel.countDocuments({
      attendance: {
        $elemMatch: queryObject,
      },
    });

    const totalPage = Math.round(Count / pageOptions.limit);

    const pagination =
      Math.round(Count % pageOptions.limit) === 0 ? totalPage : totalPage + 1;

    res.status(StatusCodes.OK).json({
      data: {
        content: doc,
        activity,
        length: doc?.length,
        totalElement: Count,
        totalPage: pagination,
        numberofElement: doc?.length,
        current: pageOptions?.page,
      },
    });
  } else {
    const doc = await result;
    const adult = doc?.filter((c) => c.category === 'Adult');
    const teens = doc?.filter((c) => c.category === 'Teen');

    const AdultMale = adult?.filter((c) => c.gender === 'Male');
    const AdultFeMale = adult?.filter((c) => c.gender === 'Female');

    const TeenMale = teens?.filter((c) => c.gender === 'Male');
    const TeenFeMale = teens?.filter((c) => c.gender === 'Female');
    const total =
      Number(TeenMale?.length) +
      Number(AdultFeMale?.length) +
      Number(AdultMale?.length) +
      Number(TeenFeMale?.length);

    const data = {
      AdultMale: AdultMale?.length,
      AdultFemale: AdultFeMale.length,
      TeenMale: TeenMale.length,
      TeenFemale: TeenFeMale?.length,
      total,
      activity,
    };

    res.status(StatusCodes.OK).json({ data });
  }
};

module.exports = {
  CaptureAttendance,
  GenerateTotalAttendance,
  CaptureAutoAttendance,
  GetTotalAttendance,
};
