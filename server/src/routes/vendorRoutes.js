const router = require('express').Router();
const c = require('../controllers/vendorController');
const validate = require('../middleware/validate');
const validateObjectId = require('../middleware/validateObjectId');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { listQuery, vendorBody } = require('../validators/vendor.validators');

router.use(requireAuth);

router.get('/', requirePermission('vendor:read'), validate(listQuery, 'query'), c.list);
router.get('/:id', requirePermission('vendor:read'), validateObjectId(), c.getOne);
router.post('/', requirePermission('vendor:create'), validate(vendorBody), c.create);
// Body validation happens in the controller because the schema depends on the
// caller's permissions (full edit for staff, status-only for approvers).
router.put('/:id', requirePermission('vendor:update', 'vendor:approve'), validateObjectId(), c.update);
router.delete('/:id', requirePermission('vendor:archive'), validateObjectId(), c.archive);

module.exports = router;
