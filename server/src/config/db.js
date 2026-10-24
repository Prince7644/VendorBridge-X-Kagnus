const mongoose = require('mongoose');
const config = require('./env');
require('../models');

mongoose.set('strictQuery', true);

async function connectDB(uri = config.mongoUri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  // Make sure unique indexes exist before the app accepts traffic.
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
