const cron = require('node-cron');
const CallLogsModel = require('../model/callLogs');
const moment = require('moment');
const MembersModel = require('../model/members');
const ActivitiesModel = require('../model/activities');
const Permission = require('../model/config');
const CalculateTotal = require('../middleware/calculateTotal');
const SendEmail = require('../middleware/sendEmail');
const fs = require('fs');
var path = require('path');
const { default: mongoose } = require('mongoose');

const generateWeeklyCallReport = async () => {
  console.log('called');
  const startOfWeek = moment()
    .subtract(1, 'weeks')
    .day(0)
    .startOf('day')
    .toDate();
  const endOfWeek = moment().subtract(1, 'weeks').day(6).endOf('day').toDate();

  console.log(startOfWeek, endOfWeek);

  const callLogs = await CallLogsModel.aggregate([
    {
      $match: {},
    },
    {
      $group: {
        _id: '$adminId',
        totalCalls: { $sum: 1 },
        completedCalls: {
          $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] },
        },
        failedCalls: {
          $sum: { $cond: [{ $eq: ['$status', 'Failed'] }, 1, 0] },
        },
        pendingCalls: {
          $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] },
        }, // New Pending Calls
      },
    },
    {
      $lookup: {
        from: 'members', // Assuming 'members' is the collection for admins
        localField: '_id',
        foreignField: '_id',
        as: 'admin',
      },
    },
    { $unwind: '$admin' },
    {
      $project: {
        _id: 0,
        adminName: { $concat: ['$admin.firstName', ' ', '$admin.lastName'] },
        totalCalls: 1,
        completedCalls: 1,
        failedCalls: 1,
        pendingCalls: 1, // Include pending calls in final output
      },
    },
  ]);

  console.log(callLogs);

  if (!callLogs.length) {
    return;
  }

  // Generate email content with improved styling
  let emailBody = `
    <h2 style="color: #333; font-family: Arial, sans-serif;">📞 Weekly Call Report (Sunday - Saturday)</h2>
    <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
      <tr style="background-color: #f4f4f4; color: #333; text-align: left;">
        <th style="padding: 10px; border: 1px solid #ddd;">Admin</th>
        <th style="padding: 10px; border: 1px solid #ddd;">Total Calls</th>
        <th style="padding: 10px; border: 1px solid #ddd;">Completed</th>
        <th style="padding: 10px; border: 1px solid #ddd;">Failed</th>
        <th style="padding: 10px; border: 1px solid #ddd;">Pending</th> <!-- New Column -->
      </tr>`;

  callLogs.forEach((log, index) => {
    const rowColor = index % 2 === 0 ? '#ffffff' : '#f9f9f9'; // Alternating row colors
    emailBody += `
      <tr style="background-color: ${rowColor};">
        <td style="padding: 10px; border: 1px solid #ddd;">${log.adminName}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${log.totalCalls}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: green;">${log.completedCalls}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: red;">${log.failedCalls}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: center; color: orange;">${log.pendingCalls}</td> <!-- Pending Calls in Yellow -->
      </tr>`;
  });

  emailBody += `</table>`;

  //''
  const msg = {
    to: [],
    from: '',
    subject: '📊 Weekly Call Report',
    html: emailBody,
  };
  try {
    await SendEmail({ msg });
    console.log('Weekly report sent successfully.');
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
  }
  console.log('Weekly report sent successfully.');
};

// const AutoGenerateLog = async (overrideLogs = false) => {
//   const type = 'Absent';

//   // Get the latest activity
//   const activity = await ActivitiesModel.findOne().sort({ createdAt: -1 });

//   //activity date is in this format MM/DD/YYYY
//   //SO find every activity in the member records of attendance that falls within the MM/YYYY

//   if (!activity || !activity._id) {
//     throw new NotFoundError(`No activity found`);
//   }

//   let queryObject = { serviceId: activity._id, attendance: type };

//   // Check if call logs already exist for this activity
//   const existingLogs = await CallLogsModel.find({ activityId: activity._id });
//   if (existingLogs.length > 0) {
//     if (overrideLogs === true) {
//       await CallLogsModel.deleteMany({ activityId: activity._id });
//     } else {
//       return existingLogs;
//     }
//   }

//   // Get SYSTEM permission
//   const perm = await Permission.findOne({ name: 'SYSTEM' });

//   if (!perm) {
//     throw new NotFoundError('SYSTEM permission not found');
//   }

//   // Find admins with SYSTEM permission and call_report access
//   const admins = await MembersModel.find({
//     permission: {
//       $elemMatch: {
//         permId: new mongoose.Types.ObjectId(perm._id),
//         permissions: {
//           $elemMatch: { name: 'call_report' },
//         },
//       },
//     },
//   });

//   if (!admins.length) {
//     throw new NotFoundError('No admins found with call_report permissions');
//   }

//   // Find absent members who have phone records
//   const absentMembers = await MembersModel.find({
//     attendance: { $elemMatch: queryObject },
//     phone: { $exists: true, $ne: null }, // Ensures only members with phone numbers are included
//   });

//   if (!absentMembers.length) {
//     return;
//   }

//   // Distribute absent members to admins
//   let callLogs = [];
//   absentMembers.forEach((member, index) => {
//     const assignedAdmin = admins[index % admins.length]; // Distribute evenly

//     callLogs.push({
//       adminId: assignedAdmin._id,
//       memberId: member._id,
//       activityId: activity._id,
//       status: 'Pending', // Can be updated when call is made
//       assignedDate: new Date(),
//       phone: member.phone,
//       adminName: assignedAdmin.firstName + ' ' + assignedAdmin.lastName,
//       memberName: member.firstName + ' ' + member.lastName,
//       absentDate: activity.date,
//       gender: member.gender
//     });
//   });

//   // Save new logs
//   await CallLogsModel.insertMany(callLogs);

//   console.log('New call logs created successfully');
//   return callLogs;
// };

const AutoGenerateLog = async (overrideLogs = false) => {
  const type = 'Absent';

  // Get the latest activity
  const activity = await ActivitiesModel.findOne().sort({ createdAt: -1 });

  if (!activity || !activity._id) {
    throw new NotFoundError(`No activity found`);
  }

  // Extract MM/YYYY from activity.date
  const activityDate = new Date(activity.date);
  const activityMonth = activityDate.getMonth() + 1;
  const activityYear = activityDate.getFullYear();

  // Check if call logs already exist for this activity
  // const existingLogs = await CallLogsModel.find({});
  // if (existingLogs.length > 0) {
  await CallLogsModel.deleteMany({});

  // if (overrideLogs === true) {
  //   await CallLogsModel.deleteMany({ activityId: activity._id });
  // } else {
  //   return existingLogs;
  // }
  // }

  // Get SYSTEM permission
  const perm = await Permission.findOne({ name: 'SYSTEM' });

  if (!perm) {
    throw new NotFoundError('SYSTEM permission not found');
  }

  // Find admins with SYSTEM permission and call_report access
  const admins = await MembersModel.find({
    permission: {
      $elemMatch: {
        permId: new mongoose.Types.ObjectId(perm._id),
        permissions: {
          $elemMatch: { name: 'call_report' },
        },
      },
    },
  });

  if (!admins.length) {
    throw new NotFoundError('No admins found with call_report permissions');
  }

  // Query all members who have at least one 'Absent' record (without filtering month/year yet)
  const allAbsentMembers = await MembersModel.find({
    attendance: { $elemMatch: { attendance: type, serviceId: activity._id } }, // Ensure there's at least one absence
    phone: { $exists: true, $ne: null }, // Only include members with phone numbers
  });

  // Filter members and count absences in MM/YYYY with activity details
  const absentMembers = allAbsentMembers
    .map((member) => {
      // Filter attendance records for the same MM/YYYY
      const absencesInMonth = member.attendance.filter((att) => {
        const attDate = new Date(att.date);
        return (
          att.attendance === type &&
          attDate.getMonth() + 1 === activityMonth &&
          attDate.getFullYear() === activityYear
        );
      });

      return absencesInMonth.length > 0
        ? {
            ...member.toObject(),
            absenceCount: absencesInMonth.length, // Count how many times absent in the month
            absentActivities: absencesInMonth.map((att) => ({
              date: att.date,
              serviceName: att.serviceName,
            })), // Store activity details
          }
        : null;
    })
    .filter(Boolean); // Remove members with no absences in the given MM/YYYY

  if (!absentMembers.length) {
    return;
  }

  // Distribute absent members to admins
  let callLogs = [];
  absentMembers.forEach((member, index) => {
    const assignedAdmin = admins[index % admins.length]; // Distribute evenly

    callLogs.push({
      adminId: assignedAdmin._id,
      memberId: member._id,
      activityId: activity._id,
      status: 'Pending', // Can be updated when call is made
      assignedDate: new Date(),
      phone: member.phone,
      adminName: assignedAdmin.firstName + ' ' + assignedAdmin.lastName,
      memberName: member.firstName + ' ' + member.lastName,
      absentDate: activity.date,
      absenceCount: member.absenceCount, // Add the count of absences in the month
      absentActivities: member.absentActivities, // Add the list of absent activities
      gender: member.gender,
      membershipType: member.membershipType,
    });
  });

  // Save new logs
  await CallLogsModel.insertMany(callLogs);

  console.log(callLogs, 'New call logs created successfully');
  return callLogs;
};

const AutoUpdateMember = async ({ todayDay }) => {
  const activityDate = new Date().toISOString()?.slice(0, 10);
  const month = new Date().getMonth() + 1;
  const day = new Date().getDate();
  const year = new Date().getFullYear();

  const searchDate = `${month.toString()?.padStart(2, '0')}/${day
    .toString()
    ?.padStart(2, '0')}/${year}`;

  const activity = await ActivitiesModel.findOne({ date: searchDate });
  if (!activity?._id) return;
  //! if no activity found, stop the job? return or send a mail
  if (activity?._id) {
    let queryObject = { serviceId: activity._id };

    await MembersModel.find({
      attendance: {
        $elemMatch: queryObject,
      },
    })
      .then(async (doc) => {
        const fileName = `${'report'}-${activityDate}`;
        const firstTimer = await doc.filter(
          (c) => c.membershipType === 'New Member',
        );
        const male = firstTimer.filter((c) => c.gender === 'Male');
        const female = firstTimer.filter((c) => c.gender === 'Female');
        const { exc } = await CalculateTotal({
          data: doc,
          activityId: activity._id,
          activityName: activity.serviceName,
          sendReport: true,
          fileName,
        });

        const pathToAttachment = path.join(
          __dirname,
          '..',
          'report',
          `${fileName}.xlsx`,
        );
        attachment = fs.readFileSync(pathToAttachment).toString('base64');
        var dir = './report';
        console.log('report');
        const msg = {
          from: {
            email: '',
          },
          personalizations: [
            // '
            {
              to: [],
              dynamic_template_data: {
                date: activityDate,
                service_name: activity.serviceName,
                male: male.length || 0,
                female: female.length || 0,
                total: firstTimer.length || 0,
              },
            },
          ],
          templateId: 'd-cfd316f4138a47e9b7d7bc4f6448d355',
          attachments: [
            {
              content: attachment,
              filename: `${fileName}.xlsx`,
              type: 'application/xlsx',
              disposition: 'attachment',
            },
          ],
        };

        await SendEmail({ msg }).then((res) => {
          console.log('here');
          if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
          }
        });
      })
      .catch((error) => {
        console.log('error in sending repoer', error.message);
      });
  }
};
// Schedule jobs
const scheduleCheckAgentTransaction = () => {
  cron.schedule(
    '0 12 * * 3,5',
    async () => {
      try {
        await generateWeeklyCallReport();
      } catch (error) {
        console.error('Error in generateWeeklyCallReport:', error);
      }
    },
    { scheduled: true },
  );
  cron.schedule(
    '* * * * Sunday',
    async () => {
      try {
        await AutoGenerateLog();
      } catch (error) {
        console.error('Error in AutoGenerateLog:', error);
      }
    },
    { scheduled: true },
  );
  cron.schedule('* * * * Sunday', AutoUpdateMember, {
    scheduled: true,
  });
};

module.exports = { scheduleCheckAgentTransaction };
