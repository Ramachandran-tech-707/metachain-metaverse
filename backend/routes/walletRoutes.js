const router = require('express').Router();
const {
  getWallet, getTokenBalances,
  getWalletTransactions, updateProfile,
} = require('../controllers/walletController');
const { requireWallet } = require('../middleware/auth');

router.get('/:address',                  getWallet);
router.get('/:address/tokens',           getTokenBalances);
router.get('/:address/transactions',     getWalletTransactions);
router.put('/:address/profile',          requireWallet, updateProfile);

module.exports = router;
