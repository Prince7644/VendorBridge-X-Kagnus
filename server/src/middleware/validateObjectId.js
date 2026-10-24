const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

const validateObjectId = (param = 'id') => (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params[param]) || String(req.params[param]).length !== 24) {
    return next(new AppError(400, 'INVALID_ID', 'The supplied record ID is not valid.'));
  }
  return next();
};

module.exports = validateObjectId;
