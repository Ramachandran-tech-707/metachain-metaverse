const { unauthorized, badRequest } = require('../utils/response');

/**
 * Validates that the request contains a well-formed Ethereum address
 * in the x-wallet-address header (used for wallet-gated routes)
 */
const requireWallet = (req, res, next) => {
  const address = req.headers['x-wallet-address'];
  if (!address) {
    return unauthorized(res, 'Wallet address header (x-wallet-address) is required');
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return badRequest(res, 'Invalid Ethereum wallet address format');
  }
  req.walletAddress = address.toLowerCase();
  next();
};

/**
 * Optional wallet — attaches if present but doesn't block
 */
const optionalWallet = (req, res, next) => {
  const address = req.headers['x-wallet-address'];
  if (address && /^0x[a-fA-F0-9]{40}$/.test(address)) {
    req.walletAddress = address.toLowerCase();
  }
  next();
};

module.exports = { requireWallet, optionalWallet };
