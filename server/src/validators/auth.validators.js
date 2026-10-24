const { z } = require('zod');
const { PUBLIC_REGISTRATION_ROLES, ROLES } = require('../config/constants');

const emptyToUndefined = (schema) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), schema.optional());

const email = z.string({ required_error: 'Email is required' }).trim().toLowerCase().email('Enter a valid email address').max(254);

const password = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be 72 characters or fewer')
  .regex(/[A-Za-z]/, 'Password must include a letter')
  .regex(/\d/, 'Password must include a number');

const name = (label) =>
  z.string({ required_error: `${label} is required` }).trim().min(1, `${label} is required`).max(50, `${label} is too long`);

const register = z
  .object({
    firstName: name('First name'),
    lastName: name('Last name'),
    email,
    phone: z.string({ required_error: 'Phone number is required' }).trim().regex(/^\+?[0-9()\s-]{7,20}$/, 'Enter a valid phone number'),
    country: z.string({ required_error: 'Country is required' }).trim().min(2, 'Country is required').max(60),
    additionalInformation: emptyToUndefined(z.string().trim().max(1000, 'Keep additional information under 1000 characters')),
    avatar: emptyToUndefined(
      z
        .string()
        .max(200000, 'Profile image is too large')
        .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, 'Profile image must be a PNG, JPEG or WebP')
    ),
    // Only non-privileged roles are accepted. Admin / Manager are rejected here.
    role: z
      .enum(PUBLIC_REGISTRATION_ROLES, {
        errorMap: () => ({ message: `Role must be ${ROLES.VENDOR} or ${ROLES.OFFICER}` }),
      })
      .default(ROLES.VENDOR),
    password,
    confirmPassword: z.string({ required_error: 'Please confirm your password' }),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

const login = z.object({
  email,
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required').max(200),
});

const forgotPassword = z.object({ email });

const resetPassword = z
  .object({
    token: z.string().regex(/^[a-f0-9]{64}$/, 'This reset link is invalid'),
    password,
    confirmPassword: z.string({ required_error: 'Please confirm your password' }),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

module.exports = { register, login, forgotPassword, resetPassword, emptyToUndefined };
