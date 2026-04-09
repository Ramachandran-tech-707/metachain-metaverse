const router = require('express').Router();
const {
  getAllNFTs, getNFTById, likeNFT,
  getCategories, getFeaturedNFTs, getNFTsByWallet,
} = require('../controllers/nftController');

router.get('/',                    getAllNFTs);
router.get('/featured',            getFeaturedNFTs);
router.get('/categories',          getCategories);
router.get('/wallet/:address',     getNFTsByWallet);
router.get('/:id',                 getNFTById);
router.post('/:id/like',           likeNFT);

module.exports = router;
const { getOwnedNFTs } = require('../controllers/nftController');
router.get('/owned/:address', getOwnedNFTs);
