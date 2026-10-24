const { z } = require('zod');
const { ROLES, USER_STATUS } = require('../config/constants');
const { emptyToUndefined } = require('./auth.validators');

const listQuery = z.object({
  search: emptyToUndefined(z.string().trim().max(100)),
  role: emptyToUndefined(z.enum(Object.values(ROLES))),
  status: emptyToUndefined(z.enum(USER_STATUS)),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const updateBody = z
  .object({
    role: z.enum(Object.values(ROLES), { errorMap: () => ({ message: 'Select a valid role' }) }).optional(),
    status: z.enum(USER_STATUS, { errorMap: () => ({ message: 'Select a valid status' }) }).optional(),
  })
  .refine((d) => d.role || d.status, { message: 'Provide a role or status to update' });

module.exports = { listQuery, updateBody };
