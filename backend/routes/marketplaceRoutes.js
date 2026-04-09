const router = require('express').Router();
const {
  getListings, createListing,
  cancelListing, getMarketplaceStats, buyNFT,
} = require('../controllers/marketplaceController');
const { requireWallet } = require('../middleware/auth');

router.get('/',                    getListings);
router.get('/stats',               getMarketplaceStats);
router.post('/list',               requireWallet, createListing);
router.delete('/list/:id',         requireWallet, cancelListing);
router.post('/buy/:listingId',     requireWallet, buyNFT);

module.exports = router;
