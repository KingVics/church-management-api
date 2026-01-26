const { BadRequestError, NotFoundError } = require('../errors');
const TestimonyModel = require('../model/testimony');
const { StatusCodes } = require('http-status-codes');
const { AwsPutObject } = require('../middleware/awsUpload');

//! create
function parseDataUrl(dataUrl) {
  // Example input: "data:audio/webm;codecs=opus;base64,AAAA..."
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const m = dataUrl.match(/^data:([^;]+(?:;[^,]+)*)?,(.*)$/);
  if (!m) return null;

  const mimeString = m[1] || 'application/octet-stream';
  const base64 = m[2];
  return { mimeString, base64 };
}

function getMainMime(mimeString) {
  // returns 'audio/webm' from 'audio/webm;codecs=opus'
  return mimeString.split(';')[0].trim().toLowerCase();
}

function extFromMime(mainMime) {
  const map = {
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'audio/mpeg': 'mp3',
    'audio/x-wav': 'wav',
  };
  return map[mainMime] || 'bin';
}

const CreateTestimony = async (req, res) => {
  const { name, phone, testimony, media, public, audio } = req.body;

  const check = audio?.includes('data:audio')
    ? false
    : !testimony
    ? true
    : false;

  let audioSource;
  if (check === true) {
    throw new BadRequestError('Please enter a testimony text or audio');
  }

  if (media.length > 2) {
    throw new BadRequestError(
      'Only three attachments are allowed for now. Thank you'
    );
  }

  function sanitizeString(str) {
    str = str?.replace(/[^a-z0-9áéíóúñü \.,_-]/gim, '');
    return str.trim();
  }

  let uploadMedia = [];
  if (media?.length > 0 && media.length <= 2) {
    for (var i = 0; i < media.length; i++) {
      const upload = await AwsS3({
        image: media[i].file,
        type: media[i].type,
        folder: '/testimony',
      });
      uploadMedia.push({ type: media[i].type, url: upload?.Location });
    }
  }

  if (audio) {
    const parsed = parseDataUrl(audio);
    if (!parsed) return res.status(400).json({ error: 'Invalid data URL' });

    const { mimeString, base64 } = parsed;
    const mainMime = getMainMime(mimeString);
    const allowed = ['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mpeg'];
    if (!allowed.includes(mainMime)) {
      return res.status(415).json({ error: 'Unsupported media type' });
    }

    const buffer = Buffer.from(base64, 'base64');

    const MAX_BYTES = 5 * 1024 * 1024;
    if (buffer.length > MAX_BYTES)
      return res.status(413).json({ error: 'File too large' });

    const ext = extFromMime(mainMime);
    const key = `audio/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    const upload = await AwsPutObject({
      Bucket: 'rppchurch',
      folder: '',
      Key: key,
      Body: buffer,
      ContentType: mainMime,
    });

    audioSource = upload?.Location;
  }

  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const year = today.getFullYear();

  const data = {
    name: name ? sanitizeString(name) : '',
    phone: phone ? sanitizeString(phone) : '',
    public,
    testimony: sanitizeString(testimony),
    media: uploadMedia,
    date: `${month.toString()?.padStart(2, '0')}/${day
      .toString()
      ?.padStart(2, '0')}/${year}`,
    audioSource,
  };

  await TestimonyModel.create(data);

  res.status(StatusCodes.CREATED).json({
    mesage: `Testimony recorded`,
  });
};

const GetTestimony = async (req, res) => {
  const { name, phone, fromDate, toDate, public } = req.query;

  const pageOptions = {
    page: parseInt(req.query.page - 1, 10) || 0,
    limit: parseInt(req.query.limit, 10) || 10,
  };

  let queryObject = {};

  if (name) {
    queryObject.name = { $regex: name, $options: 'i' };
  }
  if (phone) {
    queryObject.phone = phone;
  }
  if (public) {
    queryObject.public = public;
  }

  if (fromDate || toDate) {
    queryObject.date = { $gte: fromDate, $lte: toDate };
  }

  const testimony = TestimonyModel.find(queryObject)
    .skip(pageOptions.page * pageOptions.limit)
    .limit(pageOptions.limit)
    .sort([['createdAt', -1]]);

  const Count = await TestimonyModel.countDocuments(queryObject);

  const result = await testimony;
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

module.exports = {
  CreateTestimony,
  GetTestimony,
};
