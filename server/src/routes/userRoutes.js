const router = require('express').Router();
const c = require('../controllers/userController');
const validate = require('../middleware/validate');
const validateObjectId = require('../middleware/validateObjectId');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { listQuery, updateBody } = require('../validators/user.validators');

router.use(requireAuth, requirePermission('users:manage'));
router.get('/', validate(listQuery, 'query'), c.list);
router.patch('/:id', validateObjectId(), validate(updateBody), c.update);

module.exports = router;
