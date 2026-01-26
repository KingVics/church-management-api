const { BadRequestError } = require('../errors');
const CallLog = require('../model/callLogs');

const GetCallLog = async (req, res) => {
  try {
    const userId = req.user.userId;

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Get last Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Get Saturday
    endOfWeek.setHours(23, 59, 59, 999);

    let queryObject = {
      adminId: userId,
      assignedDate: { $gte: startOfWeek, $lte: endOfWeek },
    };

    const weeklyCalls = await CallLog.find(queryObject);
    res.status(200).json({ data: weeklyCalls });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const UpdateCallStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!['Completed', 'Failed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const callLog = await CallLog.findById(id);
    if (!callLog) {
      return res.status(404).json({ message: 'Call log not found' });
    }

    if (!callLog.updateStatus) {
      throw new BadRequestError('Please initiate call before updating status');
    }

    callLog.status = status;
    callLog.callTimestamp = new Date();
    callLog.updateStatus = false;
    if (notes) callLog.notes = notes;

    await callLog.save();

    res.status(200).json({ message: 'Call log updated successfully', callLog });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const UpdateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const userId = req.user.userId;

    if (!id) {
      return res.status(400).json({ message: 'Call Id missing' });
    }

    const allLog = await CallLog.find({
      adminId: userId,
    });

    const findUpdate = allLog?.find((c) => c.updateStatus);

    if (findUpdate?.id) {
      throw new BadRequestError(
        `You already started the call process for ${findUpdate.memberName}, please update status or redial before proceeding.`
      );
    }
    const callLog = await CallLog.findOne({
      _id: id,
      adminId: userId,
    });

    if (!callLog) {
      return res.status(404).json({ message: 'Call log not found' });
    }

    callLog.updateStatus = true;

    await callLog.save();

    res.status(200).json({ message: 'Call log updated successfully', callLog });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const RedialUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const userId = req.user.userId;

    if (!id) {
      return res.status(400).json({ message: 'Call Id missing' });
    }

    const callLog = await CallLog.findOne({
      _id: id,
      adminId: userId,
    });

    if (!callLog) {
      return res.status(404).json({ message: 'Call log not found' });
    }

    if (!callLog.updateStatus) {
      throw new BadRequestError('Please dial call before redialing');
    }

    callLog.updateStatus = true;

    await callLog.save();

    res.status(200).json({ message: 'Call log updated successfully', callLog });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
module.exports = {
  GetCallLog,
  UpdateCallStatus,
  UpdateUserStatus,
  RedialUserStatus,
};
