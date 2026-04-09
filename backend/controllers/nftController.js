const { pool }    = require('../config/db');
const { success, paginated, notFound, badRequest, error } = require('../utils/response');
const logger      = require('../utils/logger');

// ─── GET /api/nfts  ───────────────────────────────────────────────────────────
const getAllNFTs = async (req, res, next) => {
  try {
    const {
      page     = 1,
      limit    = 12,
      category,
      rarity,
      chain_id,
      is_listed,
      search,
      sort     = 'created_at',
      order    = 'DESC',
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const allowed = ['price_eth', 'price_usd', 'created_at', 'likes_count', 'views_count'];
    const sortCol = allowed.includes(sort) ? sort : 'created_at';
    const sortDir = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let where = ['1=1'];
    const params = [];

    if (category) { where.push('n.category = ?');  params.push(category); }
    if (rarity)   { where.push('n.rarity = ?');    params.push(rarity);   }
    if (chain_id) { where.push('n.chain_id = ?');  params.push(parseInt(chain_id)); }
    if (is_listed !== undefined) {
      where.push('n.is_listed = ?');
      params.push(is_listed === 'true' ? 1 : 0);
    }
    if (search) {
      where.push('(n.name LIKE ? OR n.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereStr = where.join(' AND ');

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM nfts n WHERE ${whereStr}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT n.*, u.ens_name AS creator_ens
       FROM nfts n
       LEFT JOIN users u ON n.creator_address = u.address
       WHERE ${whereStr}
       ORDER BY n.${sortCol} ${sortDir}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    return paginated(res, rows, total, page, limit);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/nfts/:id ───────────────────────────────────────────────────────
const getNFTById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [[nft]] = await pool.query(
      `SELECT n.*, u.ens_name AS creator_ens, u.avatar_url AS creator_avatar
       FROM nfts n
       LEFT JOIN users u ON n.creator_address = u.address
       WHERE n.id = ?`,
      [id]
    );
    if (!nft) return notFound(res, 'NFT not found');

    // Increment view count
    await pool.query('UPDATE nfts SET views_count = views_count + 1 WHERE id = ?', [id]);

    return success(res, nft);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/nfts/:id/like ─────────────────────────────────────────────────
const likeNFT = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [[nft]] = await pool.query('SELECT id FROM nfts WHERE id = ?', [id]);
    if (!nft) return notFound(res, 'NFT not found');

    await pool.query('UPDATE nfts SET likes_count = likes_count + 1 WHERE id = ?', [id]);
    const [[updated]] = await pool.query('SELECT likes_count FROM nfts WHERE id = ?', [id]);
    return success(res, { likes_count: updated.likes_count }, 'Liked');
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/nfts/categories ────────────────────────────────────────────────
const getCategories = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT category, COUNT(*) AS count
       FROM nfts WHERE category IS NOT NULL
       GROUP BY category ORDER BY count DESC`
    );
    return success(res, rows);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/nfts/featured ──────────────────────────────────────────────────
const getFeaturedNFTs = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM nfts
       WHERE is_listed = 1
       ORDER BY likes_count DESC, views_count DESC
       LIMIT 8`
    );
    return success(res, rows);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/nfts/wallet/:address ───────────────────────────────────────────
const getNFTsByWallet = async (req, res, next) => {
  try {
    const { address }          = req.params;
    const { chain_id, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where  = ['owner_address = ?'];
    const params = [address.toLowerCase()];
    if (chain_id) { where.push('chain_id = ?'); params.push(parseInt(chain_id)); }

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM nfts WHERE ${where.join(' AND ')}`, params
    );
    const [rows] = await pool.query(
      `SELECT * FROM nfts WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    return paginated(res, rows, total, page, limit);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllNFTs, getNFTById, likeNFT, getCategories, getFeaturedNFTs, getNFTsByWallet };

// ─── GET /api/nfts/owned/:address ─────────────────────────────────────────────
// Returns all NFTs currently owned by a wallet (purchased + original)
const getOwnedNFTs = async (req, res, next) => {
  try {
    const address = req.params.address.toLowerCase();
    const { page = 1, limit = 20, chain_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where  = ['LOWER(n.owner_address) = ?'];
    const params = [address];
    if (chain_id) { where.push('n.chain_id = ?'); params.push(parseInt(chain_id)); }

    const whereStr = where.join(' AND ');

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM nfts n WHERE ${whereStr}`, params
    );

    const [rows] = await pool.query(
      `SELECT n.*,
              t.tx_hash    AS purchase_tx,
              t.amount_eth AS purchase_price,
              t.tx_timestamp AS purchased_at
       FROM nfts n
       LEFT JOIN transactions t ON (t.nft_id = n.id AND t.to_address = ? AND t.tx_type = 'Buy' AND t.status = 'Confirmed')
       WHERE ${whereStr}
       ORDER BY n.updated_at DESC
       LIMIT ? OFFSET ?`,
      [address, ...params, parseInt(limit), offset]
    );

    return paginated(res, rows, total, page, limit);
  } catch (err) { next(err); }
};

module.exports = Object.assign(module.exports, { getOwnedNFTs });
