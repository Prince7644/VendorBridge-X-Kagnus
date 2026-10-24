const config = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const { createApp } = require('./app');

async function main() {
  try {
    await connectDB();
    console.log('[db] connected to MongoDB');
  } catch (err) {
    console.error(`[db] could not connect to MongoDB: ${err.message}`);
    console.error('[db] check MONGODB_URI in your .env file and that the database is reachable.');
    process.exit(1);
  }

  const server = createApp().listen(config.port, () => {
    console.log(`[server] VendorBridge API listening on http://localhost:${config.port} (${config.nodeEnv})`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
