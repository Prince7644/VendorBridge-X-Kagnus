const { promisify } = require('util');

const regenerateSession = (req) => promisify(req.session.regenerate.bind(req.session))();
const destroySession = (req) => promisify(req.session.destroy.bind(req.session))();
const saveSession = (req) => promisify(req.session.save.bind(req.session))();

module.exports = { regenerateSession, destroySession, saveSession };
