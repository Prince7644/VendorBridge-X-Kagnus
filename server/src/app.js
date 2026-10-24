const fs = require('fs');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const config = require('./config/env');
const { verifyCsrf } = require('./middleware/csrf');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Must be called after the Mongoose connection is open (the session store
// reuses it). Server-side sessions live in MongoDB, so they survive restarts.
function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (config.isProd) app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:'],
          scriptSrc: ["'self'"],
        },
      },
    })
  );
  app.use(cors({ origin: config.clientUrl, credentials: true }));
  app.use(express.json({ limit: '300kb' }));

  app.use(
    session({
      name: 'vb.sid',
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      store: MongoStore.create({
        client: mongoose.connection.getClient(),
        collectionName: 'sessions',
        ttl: config.sessionTtlHours * 3600,
        touchAfter: 60,
        autoRemove: config.sessionAutoRemove,
        autoRemoveInterval: 10,
      }),
      cookie: {
        httpOnly: true,
        secure: config.isProd,
        sameSite: 'lax',
        maxAge: config.sessionTtlHours * 3600 * 1000,
      },
    })
  );

  app.get('/api/health', (req, res) => {
    const dbUp = mongoose.connection.readyState === 1;
    res.status(dbUp ? 200 : 503).json({ success: dbUp, data: { status: dbUp ? 'ok' : 'degraded', database: dbUp ? 'connected' : 'disconnected' } });
  });

  app.use('/api', verifyCsrf);
  app.use('/api/auth', require('./routes/authRoutes'));
  app.use('/api/dashboard', require('./routes/dashboardRoutes'));
  app.use('/api/vendors', require('./routes/vendorRoutes'));
  app.use('/api/users', require('./routes/userRoutes'));
  app.use('/api', notFound);

  // In production the built React app is served by this same server.
  const dist = path.resolve(__dirname, '../../client/dist');
  if (config.isProd && fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
