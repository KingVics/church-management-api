const { BadRequestError, NotFoundError } = require('../errors');
const { StatusCodes } = require('http-status-codes');
const NoteModel = require('../model/note');
var ObjectId = require('mongoose').Types.ObjectId;

const SaveNote = async (req, res) => {
  const { memberId, comment } = req.body;

  const findNote = await NoteModel.findOne({ memberId });

  if (findNote && findNote?._id) {
    const note = await NoteModel.findOneAndUpdate(
      { memberId },
      {
        $push: {
          notes: [
            {
              createdBy: { name: req.user.name, userId: req.user.userId },
              comment,
              date: new Date(),
            },
          ],
        },
      },
      {
        new: true,
      }
    );

    return res
      .status(StatusCodes.OK)
      .json({ message: `Note saved`, data: note });
  }

  const data = {
    notes: [
      {
        createdBy: { name: req.user.name, userId: req.user.userId },
        comment,
        date: new Date(),
      },
    ],
    memberId: memberId,
  };
  const note = await NoteModel.create(data);

  res.status(StatusCodes.OK).json({ message: `Note saved`, data: note });
};

const GetNote = async (req, res) => {
  const { id } = req.params;

  const note = await NoteModel.findOne({ memberId: id }).sort([
    ['notes.date', 1],
  ]);

  res.status(StatusCodes.OK).json({ data: note });
};

const DeleteNote = async (req, res) => {
  const { memberId, noteId } = req.params;

  const Id = new ObjectId(memberId);
  const noteID = new ObjectId(noteId);
  const notes = await NoteModel.aggregate([
    {
      $match: {
        memberId: Id,
      },
    },
    {
      $unwind: {
        path: '$notes',
      },
    },
    {
      $replaceRoot: {
        newRoot: '$notes',
      },
    },
    {
      $match: {
        _id: noteID,
      },
    },
  ]);

  if (notes?.length > 0) {
    const findUser = notes.find(
      (c) => c.createdBy.userId.toString() === req.user.userId.toString()
    );

    if (!findUser && !findUser?._id) {
      throw new BadRequestError('Can only delete note you created');
    }
  }

  await NoteModel.findOneAndUpdate(
    { memberId },
    { $pull: { notes: { _id: noteId } } },
    { safe: true, multi: true }
  );

  res.status(StatusCodes.OK).json({ message: 'Note removed' });
};

const UpdateNote = async (req, res) => {
  const { memberId } = req.params;
  const { comment, noteId } = req.body;

  const Id = new ObjectId(memberId);
  const noteID = new ObjectId(noteId);

  const notes = await NoteModel.aggregate([
    {
      $match: {
        memberId: Id,
      },
    },
    {
      $unwind: {
        path: '$notes',
      },
    },
    {
      $replaceRoot: {
        newRoot: '$notes',
      },
    },
    {
      $match: {
        _id: noteID,
      },
    },
  ]);

  if (notes?.length > 0) {
    const findUser = notes.find(
      (c) => c.createdBy.userId.toString() === req.user.userId.toString()
    );

    if (!findUser && !findUser?._id) {
      throw new BadRequestError('Can only update note you created');
    }
  }

  await NoteModel.updateOne(
    {
      'notes._id': noteID,
    },
    {
      $set: {
        'notes.$.comment': comment,
      },
    },
    { new: true }
  );
  res.status(StatusCodes.OK).json({ message: 'Note updated' });
};

module.exports = {
  SaveNote,
  GetNote,
  DeleteNote,
  UpdateNote,
};
