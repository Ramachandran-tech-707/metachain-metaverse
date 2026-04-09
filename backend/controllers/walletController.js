const { pool }   = require('../config/db');
const { success, notFound, created, paginated } = require('../utils/response');
const logger     = require('../utils/logger');

// ─── GET /api/wallet/:address ─────────────────────────────────────────────────
const getWallet = async (req, res, next) => {
  try {
    const address = req.params.address.toLowerCase();

    // Get or auto-create user record
    let [[user]] = await pool.query('SELECT * FROM users WHERE address = ?', [address]);
    if (!user) {
      await pool.query(
        'INSERT IGNORE INTO users (address) VALUES (?)', [address]
      );
      [[user]] = await pool.query('SELECT * FROM users WHERE address = ?', [address]);
    }

    // Token balances
    const [tokens] = await pool.query(
      `SELECT * FROM token_balances
       WHERE wallet_address = ?
       ORDER BY balance_usd DESC`,
      [address]
    );

    // NFT count per chain
    const [nftStats] = await pool.query(
      `SELECT chain_id, COUNT(*) AS count, SUM(price_usd) AS total_value
       FROM nfts WHERE owner_address = ?
       GROUP BY chain_id`,
      [address]
    );

    // Total portfolio value
    const totalTokenUSD = tokens.reduce((s, t) => s + parseFloat(t.balance_usd || 0), 0);
    const totalNFTUSD   = nftStats.reduce((s, n) => s + parseFloat(n.total_value || 0), 0);

    return success(res, {
      user,
      tokens,
      nftStats,
      summary: {
        totalTokenUSD:     totalTokenUSD.toFixed(2),
        totalNFTUSD:       totalNFTUSD.toFixed(2),
        totalPortfolioUSD: (totalTokenUSD + totalNFTUSD).toFixed(2),
        nftCount:          nftStats.reduce((s, n) => s + parseInt(n.count), 0),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/wallet/:address/tokens ─────────────────────────────────────────
const getTokenBalances = async (req, res, next) => {
  try {
    const address  = req.params.address.toLowerCase();
    const chain_id = req.query.chain_id;

    let query  = 'SELECT * FROM token_balances WHERE wallet_address = ?';
    const params = [address];
    if (chain_id) { query += ' AND chain_id = ?'; params.push(parseInt(chain_id)); }
    query += ' ORDER BY balance_usd DESC';

    const [tokens] = await pool.query(query, params);
    return success(res, tokens);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/wallet/:address/transactions ────────────────────────────────────
const getWalletTransactions = async (req, res, next) => {
  try {
    const address = req.params.address.toLowerCase();
    const { page = 1, limit = 20, chain_id, type: txType } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where  = ['(from_address = ? OR to_address = ?)'];
    const params = [address, address];
    if (chain_id) { where.push('chain_id = ?'); params.push(parseInt(chain_id)); }
    if (txType)   { where.push('tx_type = ?');  params.push(txType); }

    const whereStr = where.join(' AND ');
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM transactions WHERE ${whereStr}`, params
    );

    const [rows] = await pool.query(
      `SELECT t.*, n.name AS nft_name, n.image_url AS nft_image
       FROM transactions t
       LEFT JOIN nfts n ON t.nft_id = n.id
       WHERE ${whereStr}
       ORDER BY t.tx_timestamp DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    return paginated(res, rows, total, page, limit);
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/wallet/:address/profile ─────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const address  = req.params.address.toLowerCase();
    const { ens_name, avatar_url, bio } = req.body;

    await pool.query(
      `INSERT INTO users (address, ens_name, avatar_url, bio)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         ens_name   = COALESCE(VALUES(ens_name),   ens_name),
         avatar_url = COALESCE(VALUES(avatar_url), avatar_url),
         bio        = COALESCE(VALUES(bio),        bio)`,
      [address, ens_name, avatar_url, bio]
    );

    const [[user]] = await pool.query('SELECT * FROM users WHERE address = ?', [address]);
    return success(res, user, 'Profile updated');
  } catch (err) {
    next(err);
  }
};

module.exports = { getWallet, getTokenBalances, getWalletTransactions, updateProfile };
