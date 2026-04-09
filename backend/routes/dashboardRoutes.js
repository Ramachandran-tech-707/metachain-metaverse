const router = require('express').Router();
const { getDashboard, getGlobalStats } = require('../controllers/dashboardController');
const { requireWallet } = require('../middleware/auth');

router.get('/stats',         getGlobalStats);
router.get('/:address',      requireWallet, getDashboard);

module.exports = router;
