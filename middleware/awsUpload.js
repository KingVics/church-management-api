const AWS = require('aws-sdk');
const { BadRequestError } = require('../errors');

AWS.config.update({
  region: process.env.S3_REGION,
  secretAccessKey: process.env.S3_SECRET_KEY,
  accessKeyId: process.env.S3_ACCESS_ID,
});

const s3 = new AWS.S3();

const AwsS3 = async ({ image, file, folder, type: types }) => {
  if (image || file?.fieldname) {
    if (!file?.fieldname) {
      const s3 = new AWS.S3();

      let base64Img = image?.includes('data:')
        ? `${image}`
        : `data:image/jpg;base64,${image}`;

      const base64Data =
        types && types?.includes('audio') // Decode Base64 string to binary buffer
          ? new Buffer.from(base64Img, 'base64')
          : new Buffer.from(
              base64Img.replace(/^data:image\/\w+;base64,/, ''),
              'base64'
            );

      const type = base64Img.split(';')[0].split('/')[1];

      const params = {
        Bucket: 'rppchurch' + folder,
        Key: Date.now()?.toString(),
        ContentEncoding: 'base64',
        ContentType: types ? types : `image/${type}`,
        Body: base64Data,
      };

      try {
        return await s3.upload(params).promise();
      } catch (err) {
        throw new BadRequestError(`S3 upload error: ${err.message}`);
      }
    } else {
      console.log('else');
    }
  }
};

const AwsDeleteObject = async ({ Key, Bucket }) => {
  try {
    const params = {
      Bucket,
      Key,
    };
    return await s3.deleteObject(params).promise();
  } catch (err) {
    throw new BadRequestError(`S3 upload error: ${err.message}`);
  }
};

const AwsFindObject = async ({ Key, Bucket, folder }) => {
  try {
    const params = {
      Bucket: Bucket + folder,
      Key: Key,
    };
    await s3.getObject(params).promise();

    return `https://${Bucket}.s3${'.eu-north-1'}.amazonaws.com${
      folder ? `${folder}/` : '/'
    }${params.Key}`;
  } catch (err) {
    throw new BadRequestError(`S3 upload error: ${err.message}`);
  }
};

const AwsPutObject = async ({ Key, Bucket, folder, Body, ContentType }) => {
  try {
    const params = {
      Bucket: Bucket + folder,
      Key: Key,
      Body: Body,
      ContentEncoding: 'base64',
      ContentType: ContentType || `image/jpg`,
    };
    return await s3.upload(params).promise();
  } catch (err) {
    throw new BadRequestError(`S3 upload error: ${err.message}`);
  }
};

module.exports = {
  AwsPutObject,
  AwsS3,
  AwsDeleteObject,
  AwsFindObject,
};
