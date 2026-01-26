const API_KEY = process.env.YOUTUBE_API_KEY;
const axios = require('axios');

const SCOPES = [
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.force-ssl',
];

const fs = require('fs');
const {
  oAuth2Client,
  getYouTubeClientWithRetry,
  CHANNEL_ID,
} = require('../middleware/googleAuth');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const uploadThumbnailWithRetry = async (
  youtube,
  oAuth2Client,
  broadcastId,
  thumbnailPath,
  retries = 3
) => {
  let attempt = 0;
  while (attempt < retries) {
    try {
      await youtube.thumbnails.set({
        auth: oAuth2Client,
        videoId: broadcastId,
        media: {
          mimeType: 'image/jpeg',
          body: fs.createReadStream(thumbnailPath),
        },
      });
      console.log('Thumbnail uploaded successfully!');
      return;
    } catch (error) {
      attempt++;
      console.error(
        `Thumbnail upload attempt ${attempt} failed:`,
        error.message
      );
      if (attempt < retries) {
        console.log(`Retrying in 2 seconds...`);
        await sleep(2000);
      } else {
        throw new Error('All attempts to upload thumbnail failed');
      }
    }
  }
};

const startStreamOnTime = (
  scheduledStartTime,
  youtube,
  oAuth2Client,
  broadcastId
) => {
  const startTime = new Date(scheduledStartTime);
  const currentTime = new Date();
  const timeDiff = startTime - currentTime;

  if (timeDiff <= 0) {
    console.log('Scheduled time is already passed, starting immediately!');
    startStream(youtube, oAuth2Client, broadcastId);
  } else {
    console.log(`Scheduling stream start in ${timeDiff / 1000} seconds...`);
    setTimeout(() => {
      startStream(youtube, oAuth2Client, broadcastId);
    }, timeDiff);
  }
};

const startStream = async (youtube, oAuth2Client, broadcastId) => {
  try {
    const youtube = await getYouTubeClientWithRetry();
    const startResponse = await youtube.liveBroadcasts.transition({
      auth: oAuth2Client,
      part: 'id,status',
      id: broadcastId,
      requestBody: {
        status: {
          lifeCycleStatus: 'live',
        },
      },
    });
    console.log('Stream started:', startResponse.data);
  } catch (error) {
    console.error('Error starting stream:', error.message);
  }
};

const CreateStream = async (req, res) => {
  const {
    title,
    description,
    scheduledStartTime,
    visibility = 'public',
  } = req.body;

  try {
    const youtube = await getYouTubeClientWithRetry();
    const broadcastResponse = await youtube.liveBroadcasts.insert({
      auth: oAuth2Client,
      part: 'snippet,contentDetails,status',
      requestBody: {
        snippet: {
          title: title || 'My Live Stream',
          description: description || 'Streaming via API',
          scheduledStartTime,
        },
        status: {
          privacyStatus: visibility.toLowerCase(),
        },
        contentDetails: {
          monitorStream: {
            enableMonitorStream: true,
          },
        },
      },
    });

    const streamResponse = await youtube.liveStreams.insert({
      auth: oAuth2Client,
      part: 'snippet,cdn,contentDetails,status',
      requestBody: {
        snippet: {
          title: title || 'My Live Stream',
        },
        cdn: {
          frameRate: '30fps',
          ingestionType: 'rtmp',
          resolution: '720p',
        },
      },
    });

    await youtube.liveBroadcasts.bind({
      auth: oAuth2Client,
      part: 'id,contentDetails',
      id: broadcastResponse.data.id,
      requestBody: {
        streamId: streamResponse.data.id,
      },
    });

    if (req.file) {
      const thumbnailPath = req.file.path;
      await uploadThumbnailWithRetry(
        youtube,
        oAuth2Client,
        broadcastResponse.data.id,
        thumbnailPath
      );
    }

    startStreamOnTime(
      scheduledStartTime,
      youtube,
      oAuth2Client,
      broadcastResponse.data.id
    );

    res.json({
      broadcastId: broadcastResponse.data.id,
      streamId: streamResponse.data.id,
      ingestionAddress: streamResponse.data.cdn.ingestionInfo.ingestionAddress,
      streamKey: streamResponse.data.cdn.ingestionInfo.streamName,
    });
  } catch (error) {
    console.error('Error creating stream:', error.message);
    res.status(500).json({ error: error.message });
  }
};

const GetStreamUrl = async (req, res) => {
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&eventType=live&type=video&key=${API_KEY}`;
    const response = await axios.get(url);
    if (response.data.items.length > 0) {
      const liveVideoId = response.data.items[0].id.videoId;
      const title = response.data.items[0].snippet.title;
      const publishedAt = response.data.items[0].snippet.publishedAt;
      const description = response.data.items[0].snippet.description;
      const url = `https://www.youtube.com/watch?v=${liveVideoId}`;
      res.json({
        data: {
          title,
          publishedAt,
          description,
          url,
        },
      });
    } else {
      res.json({ videoId: null, message: 'No live stream found' });
    }
  } catch (error) {
    console.error('Error fetching live video:', error);
    res.status(500).send('Error fetching live video');
  }
};

const GetAuth = async (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  res.json(authUrl);
};

// const CreateStream = async (req, res) => {
//   const youtube = google.youtube('v3');
//   const {
//     title,
//     description,
//     scheduledStartTime,
//     access_token,
//     visibility = 'public',
//   } = req.body;
//   // oAuth2Client.setCredentials({ access_token });

//   oAuth2Client.setCredentials({
//     refresh_token: process.env.YT_REFRESH_TOKEN,
//   });
//   console.log('OAuth2Client credentials set successfully');

//   console.log(req.body);
//   console.log(req.file);
//   try {
//     // Create a live broadcast
//     const broadcastResponse = await youtube.liveBroadcasts.insert({
//       auth: oAuth2Client,
//       part: 'snippet,contentDetails,status',
//       requestBody: {
//         snippet: {
//           title: title || 'My Live Stream',
//           description: description || 'Streaming via API',
//           scheduledStartTime,
//         },
//         status: {
//           privacyStatus: visibility?.toLowerCase() || 'public',
//         },
//         contentDetails: {
//           monitorStream: {
//             enableMonitorStream: true,
//           },
//         },
//       },
//     });

//     // Create a live stream
//     const streamResponse = await youtube.liveStreams.insert({
//       auth: oAuth2Client,
//       part: 'snippet,cdn,contentDetails,status',
//       requestBody: {
//         snippet: {
//           title: title || 'My Live Stream',
//         },
//         cdn: {
//           frameRate: '30fps',
//           ingestionType: 'rtmp',
//           resolution: '720p',
//         },
//       },
//     });

//     // Bind the live stream to the broadcast
//     await youtube.liveBroadcasts.bind({
//       auth: oAuth2Client,
//       part: 'id,contentDetails',
//       id: broadcastResponse.data.id,
//       requestBody: {
//         streamId: streamResponse.data.id,
//       },
//     });

//     if (req.file) {
//       const thumbnailPath = req.file.path;

//       await youtube.thumbnails.set({
//         auth: oAuth2Client,
//         videoId: broadcastResponse.data.id,
//         media: {
//           mimeType: req.file.mimetype,
//           body: fs.createReadStream(thumbnailPath),
//         },
//       });
//     }

//     res.json({
//       broadcastId: broadcastResponse.data.id,
//       streamId: streamResponse.data.id,
//       ingestionAddress: streamResponse.data.cdn.ingestionInfo.ingestionAddress,
//       streamKey: streamResponse.data.cdn.ingestionInfo.streamName,
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

async function FetchPastLiveStreams(req, res) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), now.getDay() - 7); // e.g. 2025-04-01


  const publishedAfter = startOfMonth.toISOString();
  const publishedBefore = now.toISOString();

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&eventType=completed&type=video&publishedAfter=${publishedAfter}&publishedBefore=${publishedBefore}&maxResults=10&key=${API_KEY}`;

  try {
    const response = await axios.get(url);
    const data = await response.data;

    if (data.items && data.items.length > 0) {
      const options = data.items.map((item, index) => {
        const videoId = item.id.videoId;
        const title = item.snippet.title;
        const publishedAt = item.snippet.publishedAt;
        const url = `https://www.youtube.com/watch?v=${videoId}`;

        return {
          title,
          publishedAt,
          url,
        };
      });

      res.status(200).json({
        message: `Found ${data.items.length} past live stream(s)`,
        data: options,
      });
    } else {
      res.status(200).json({
        message: 'No past live streams found in the last 30 days.',
      });
    }
  } catch (error) {
    res.status(500).json({
      message: error.messag || 'Error fetching past live streams',
      error: error.messag,
    });
  }
}

const GetScheduledStreams = async (req, res) => {
  try {
    const youtube = await getYouTubeClientWithRetry();
    const response = await youtube.liveBroadcasts.list({
      auth: oAuth2Client,
      part: 'id,snippet,contentDetails,status',
      broadcastStatus: 'upcoming',
      maxResults: 3,
    });

    const broadcasts = response.data.items;


    if (broadcasts.length > 0) {
      const upcoming = broadcasts.map((b) => ({
        videoId: b.id,
        title: b.snippet.title,
        description: b.snippet.description,
        scheduledStartTime: b.snippet.scheduledStartTime,
        url: `https://www.youtube.com/watch?v=${b.id}`,
      }));

      const lastScheduled = upcoming
        .filter((s) => s.scheduledStartTime)
        .sort(
          (a, b) =>
            new Date(b.scheduledStartTime) - new Date(a.scheduledStartTime)
        )[0];

      res.json({ data: lastScheduled });
    } else {
      res.json({ upcoming: [], message: 'No scheduled streams found' });
    }
  } catch (error) {
    console.error('Error fetching scheduled streams:', error.message);
    res.status(500).send('Error fetching scheduled streams');
  }
};

module.exports = {
  GetStreamUrl,
  GetAuth,
  CreateStream,
  FetchPastLiveStreams,
  GetScheduledStreams,
};
