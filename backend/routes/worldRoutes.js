const router  = require('express').Router();
const {
  getParcels, getParcel, claimParcel, updateParcel, placeObject,
  getAvatar, updateAvatar, updatePosition, getOnlinePlayers,
} = require('../controllers/worldController');
const { requireWallet, optionalWallet } = require('../middleware/auth');

router.get('/parcels',             getParcels);
router.get('/parcels/:x/:z',       getParcel);
router.put('/parcels/:x/:z/claim', requireWallet, claimParcel);
router.put('/parcels/:x/:z',       requireWallet, updateParcel);
router.post('/objects',            requireWallet, placeObject);
router.get('/avatar/:address',     getAvatar);
router.put('/avatar',              requireWallet, updateAvatar);
router.put('/avatar/position',     requireWallet, updatePosition);
router.get('/online',              getOnlinePlayers);

module.exports = router;
