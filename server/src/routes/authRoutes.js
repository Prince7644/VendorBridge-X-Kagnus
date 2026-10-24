const router = require('express').Router();
const c = require('../controllers/authController');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const v = require('../validators/auth.validators');

router.get('/csrf', c.csrf);
router.post('/register', authLimiter, validate(v.register), c.register);
router.post('/login', authLimiter, validate(v.login), c.login);
router.post('/logout', c.logout);
router.get('/me', requireAuth, c.me);
router.post('/forgot-password', authLimiter, validate(v.forgotPassword), c.forgotPassword);
router.post('/reset-password', authLimiter, validate(v.resetPassword), c.resetPassword);

module.exports = router;
