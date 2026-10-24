// Validates req[source] with a zod schema; parsed (and stripped) data is placed
// on req.valid[source] so controllers never touch raw input.
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source] || {});
  if (!result.success) return next(result.error);
  req.valid = req.valid || {};
  req.valid[source] = result.data;
  return next();
};

module.exports = validate;
