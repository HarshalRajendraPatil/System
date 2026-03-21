const http = require('node:http');
const app = require('./app');
const { connectDatabase } = require('./config/db');
const { env } = require('./config/env');
const { initSocketServer } = require('./realtime/socketServer');

const startServer = async () => {
  try {
    await connectDatabase(env.mongodbUri);

    const httpServer = http.createServer(app);
    await initSocketServer(httpServer);

    httpServer.listen(env.port, () => {
      // eslint-disable-next-line no-console
      console.log(`Server running on port ${env.port}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Unable to start server:', error.message);
    process.exit(1);
  }
};

startServer();
