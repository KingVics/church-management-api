require('dotenv').config();
require('express-async-errors');
const connectDb = require('./Db/connect');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const auth = require('./middleware/authentication');
const Whitelist = require('./middleware/whitelist');
const authRoute = require('./route/auth');
const departmentRoute = require('./route/department');
const membersRoute = require('./route/members');
const refreshRoute = require('./route/refreshToken');
const openRoute = require('./route/openRoute');
const activitiesRoute = require('./route/activities');
const attendanceRoute = require('./route/attendance');
const roles = require('./route/roles');
const noteRoute = require('./route/note');
const archiveRoute = require('./route/archive');
const streamRoute = require('./route/stream');
const testimonyRoute = require('./route/testimony');
const notificationRoute = require('./route/notification');
const { scheduleCheckAgentTransaction } = require('./jobs/cronJobs.js');
const swaggerUI = require('swagger-ui-express');
const callLogRoute = require('./route/callLog');
const app = express();

//Error handler
const notFoundMiddleware = require('./middleware/notFound');
const errorHandlerMiddleware = require('./middleware/error-handler');
const swaggerSpec = require('./docs/swagger');

app.use('/doc', swaggerUI.serve, swaggerUI.setup(swaggerSpec));

const corsOptions = {
  origin: (origin, callback) => {
    if (Whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200,
};

app.use(function (req, res, next) {
  res.header('Content-Type', 'application/json');
  res.header('Access-Control-Allow-Credentials', true);
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
});

const corsConfig = {
  origin: true,
  credentials: true,
};
const helmet = require('helmet');
const xss = require('xss-clean');
const { AutoUpdateMember } = require('./controllers/members');
const { AutoGenerateAttendance } = require('./controllers/attendance');
app.use(cors(corsConfig));
app.options('*', cors(corsConfig));
app.use(express.json({ limit: '200mb' }));
app.use(
  express.urlencoded({ limit: '200mb', extended: true, parameterLimit: 500000 })
);
app.use(cookieParser());
app.use(
  helmet({
    frameguard: {
      // configure
      action: 'deny',
    },
    contentSecurityPolicy: {
      // enable and configure
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'trusted-cdn.com'],
      },
    },
    dnsPrefetchControl: false, // disable
  })
);

app.use(xss());
//Routes

app.use('/api/v1/refresh', refreshRoute);
app.use('/api/v1/department', auth, departmentRoute);
app.use('/api/v1/member', auth, membersRoute);
app.use('/api/v1/activities', auth, activitiesRoute);
app.use('/api/v1/attendance', auth, attendanceRoute);
app.use('/api/v1/open', openRoute);
app.use('/api/v1/auth', authRoute);
app.use('/api/v1/role', auth, roles);
app.use('/api/v1/note', auth, noteRoute);
app.use('/api/v1/archive', auth, archiveRoute);
app.use('/api/v1/stream', auth, streamRoute);
app.use('/api/v1/testimony', testimonyRoute);
app.use('/api/v1/calls', auth, callLogRoute);
app.use('/api/v1/notification', notificationRoute);

//Middleware
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const port = process.env.PORT || 5000;



const start = async () => {
  try {
    app.listen(port, async () => {
      await connectDb(process.env.MONGO_URI);
      scheduleCheckAgentTransaction();
      console.log('App is listening on' + ' ' + port);
    });
    // swaggerDocs(app, port);
  } catch (error) {
    console.log(error);
  }
};

start();
