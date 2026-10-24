const router = require('express').Router();
const c = require('../controllers/dashboardController');
const { requireAuth, requirePermission } = require('../middleware/auth');

router.get('/summary', requireAuth, requirePermission('dashboard:view'), c.summary);

module.exports = router;
