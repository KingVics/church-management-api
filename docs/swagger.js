const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Church API',
      description: "The API to track attendance and manage memeber's data",
      contact: {
        name: '',
        email: '',
      },
      version: '1.0.0',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api/v1',
        description: 'Local server',
      },
      {
        url: process.env.LIVE_SERVER_URL + '/api/v1',
        description: 'Live server',
      },
    ],
  },
  // looks for configuration in specified directories
  apis: ['./route/*.js'],
};
const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;

module.exports = swaggerSpec;
