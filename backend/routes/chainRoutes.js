const router = require('express').Router();
const { getAllChains, getChain, updateChainStats } = require('../controllers/chainController');

router.get('/',        getAllChains);
router.get('/:id',     getChain);
router.put('/:id/stats', updateChainStats);  // internal/cron use

module.exports = router;
