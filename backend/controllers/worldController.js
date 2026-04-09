const { pool }  = require('../config/db');
const { success, notFound, created, error, paginated } = require('../utils/response');

// ─── GET /api/world/parcels ───────────────────────────────────────────────────
// Returns the full parcel grid with owner/NFT info for the 3D renderer
const getParcels = async (req, res, next) => {
  try {
    const { min_x = -10, max_x = 10, min_z = -10, max_z = 10 } = req.query;
    const [parcels] = await pool.query(
      `SELECT p.*, n.name AS nft_name, n.rarity, n.image_url AS nft_image,
              a.display_name, a.color_primary, a.color_secondary
       FROM world_parcels p
       LEFT JOIN nfts n         ON p.nft_id       = n.id
       LEFT JOIN avatar_configs a ON p.owner_address = a.wallet_address
       WHERE p.parcel_x BETWEEN ? AND ?
         AND p.parcel_z BETWEEN ? AND ?
       ORDER BY p.parcel_x, p.parcel_z`,
      [parseInt(min_x), parseInt(max_x), parseInt(min_z), parseInt(max_z)]
    );
    return success(res, parcels);
  } catch (err) { next(err); }
};

// ─── GET /api/world/parcels/:x/:z ─────────────────────────────────────────────
const getParcel = async (req, res, next) => {
  try {
    const { x, z } = req.params;
    const [[parcel]] = await pool.query(
      `SELECT p.*, n.name AS nft_name, n.rarity, n.price_eth,
              n.image_url AS nft_image, n.description AS nft_desc,
              a.display_name, a.color_primary, a.rpm_url
       FROM world_parcels p
       LEFT JOIN nfts n           ON p.nft_id       = n.id
       LEFT JOIN avatar_configs a ON p.owner_address = a.wallet_address
       WHERE p.parcel_x = ? AND p.parcel_z = ?`,
      [parseInt(x), parseInt(z)]
    );
    if (!parcel) return notFound(res, `Parcel (${x},${z}) not found`);

    // Also get objects on this parcel
    const [objects] = await pool.query(
      'SELECT * FROM world_objects WHERE parcel_id = ?',
      [parcel.id]
    );
    return success(res, { ...parcel, objects });
  } catch (err) { next(err); }
};

// ─── PUT /api/world/parcels/:x/:z/claim ───────────────────────────────────────
const claimParcel = async (req, res, next) => {
  try {
    const { x, z } = req.params;
    const wallet = req.walletAddress;
    const { nft_id } = req.body;

    const [[parcel]] = await pool.query(
      'SELECT * FROM world_parcels WHERE parcel_x = ? AND parcel_z = ?',
      [parseInt(x), parseInt(z)]
    );
    if (!parcel) return notFound(res, `Parcel (${x},${z}) not found`);
    if (parcel.owner_address && parcel.owner_address.toLowerCase() !== wallet?.toLowerCase()) {
      return error(res, 'Parcel already owned', 403);
    }

    // Get NFT name for parcel naming
    let nftName = 'Owned Parcel';
    if (nft_id) {
      const [[nft]] = await pool.query('SELECT name FROM nfts WHERE id = ?', [nft_id]);
      if (nft?.name) nftName = nft.name;
    }

    await pool.query(
      `UPDATE world_parcels
       SET owner_address = ?, nft_id = ?, parcel_name = ?,
           color_hex = COALESCE(color_hex,'#004444')
       WHERE parcel_x = ? AND parcel_z = ?`,
      [wallet, nft_id || parcel.nft_id, nftName, parseInt(x), parseInt(z)]
    );

    const [[updated]] = await pool.query(
      `SELECT p.*, n.name AS nft_name, n.rarity
       FROM world_parcels p
       LEFT JOIN nfts n ON p.nft_id = n.id
       WHERE parcel_x = ? AND parcel_z = ?`,
      [parseInt(x), parseInt(z)]
    );
    return success(res, updated, 'Parcel claimed');
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/world/parcels/:x/:z ─────────────────────────────────────────────
const updateParcel = async (req, res, next) => {
  try {
    const { x, z } = req.params;
    const { parcel_name, description, color_hex, build_data } = req.body;
    const wallet = req.walletAddress;

    const [[parcel]] = await pool.query(
      'SELECT * FROM world_parcels WHERE parcel_x = ? AND parcel_z = ?',
      [parseInt(x), parseInt(z)]
    );
    if (!parcel) return notFound(res, 'Parcel not found');
    if (parcel.owner_address && parcel.owner_address !== wallet) {
      return error(res, 'You do not own this parcel', 403);
    }

    await pool.query(
      `UPDATE world_parcels
       SET parcel_name = COALESCE(?, parcel_name),
           description = COALESCE(?, description),
           color_hex   = COALESCE(?, color_hex),
           build_data  = COALESCE(?, build_data)
       WHERE parcel_x = ? AND parcel_z = ?`,
      [parcel_name, description, color_hex, build_data ? JSON.stringify(build_data) : null,
       parseInt(x), parseInt(z)]
    );
    const [[updated]] = await pool.query(
      'SELECT * FROM world_parcels WHERE parcel_x = ? AND parcel_z = ?',
      [parseInt(x), parseInt(z)]
    );
    return success(res, updated, 'Parcel updated');
  } catch (err) { next(err); }
};

// ─── POST /api/world/objects ───────────────────────────────────────────────────
const placeObject = async (req, res, next) => {
  try {
    const { parcel_x, parcel_z, object_type, object_model,
            pos_x, pos_y, pos_z, rot_y, scale, metadata } = req.body;
    const wallet = req.walletAddress;

    const [[parcel]] = await pool.query(
      'SELECT * FROM world_parcels WHERE parcel_x = ? AND parcel_z = ?',
      [parcel_x, parcel_z]
    );
    if (!parcel) return notFound(res, 'Parcel not found');
    if (parcel.owner_address !== wallet) return error(res, 'You do not own this parcel', 403);

    const [result] = await pool.query(
      `INSERT INTO world_objects
         (parcel_id, owner_address, object_type, object_model, pos_x, pos_y, pos_z, rot_y, scale, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [parcel.id, wallet, object_type, object_model,
       pos_x || 0, pos_y || 0, pos_z || 0, rot_y || 0, scale || 1,
       metadata ? JSON.stringify(metadata) : null]
    );
    const [[obj]] = await pool.query('SELECT * FROM world_objects WHERE id = ?', [result.insertId]);
    return created(res, obj, 'Object placed');
  } catch (err) { next(err); }
};

// ─── GET /api/world/avatar/:address ───────────────────────────────────────────
const getAvatar = async (req, res, next) => {
  try {
    const { address } = req.params;
    let [[avatar]] = await pool.query(
      'SELECT * FROM avatar_configs WHERE wallet_address = ?',
      [address.toLowerCase()]
    );
    if (!avatar) {
      // Auto-create default avatar
      await pool.query(
        'INSERT IGNORE INTO avatar_configs (wallet_address) VALUES (?)',
        [address.toLowerCase()]
      );
      [[avatar]] = await pool.query(
        'SELECT * FROM avatar_configs WHERE wallet_address = ?',
        [address.toLowerCase()]
      );
    }
    return success(res, avatar);
  } catch (err) { next(err); }
};

// ─── PUT /api/world/avatar ─────────────────────────────────────────────────────
const updateAvatar = async (req, res, next) => {
  try {
    const wallet = req.walletAddress;
    const { rpm_url, display_name, color_primary, color_secondary, equipped_nfts } = req.body;

    await pool.query(
      `INSERT INTO avatar_configs (wallet_address, rpm_url, display_name, color_primary, color_secondary, equipped_nfts)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         rpm_url         = COALESCE(VALUES(rpm_url),          rpm_url),
         display_name    = COALESCE(VALUES(display_name),     display_name),
         color_primary   = COALESCE(VALUES(color_primary),    color_primary),
         color_secondary = COALESCE(VALUES(color_secondary),  color_secondary),
         equipped_nfts   = COALESCE(VALUES(equipped_nfts),    equipped_nfts)`,
      [wallet, rpm_url, display_name, color_primary, color_secondary,
       equipped_nfts ? JSON.stringify(equipped_nfts) : null]
    );
    const [[updated]] = await pool.query(
      'SELECT * FROM avatar_configs WHERE wallet_address = ?', [wallet]
    );
    return success(res, updated, 'Avatar updated');
  } catch (err) { next(err); }
};

// ─── PUT /api/world/avatar/position ───────────────────────────────────────────
const updatePosition = async (req, res, next) => {
  try {
    const { x, z } = req.body;
    const wallet    = req.walletAddress;
    await pool.query(
      `INSERT INTO avatar_configs (wallet_address, last_pos_x, last_pos_z)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE last_pos_x = VALUES(last_pos_x), last_pos_z = VALUES(last_pos_z)`,
      [wallet, parseFloat(x) || 0, parseFloat(z) || 0]
    );
    return success(res, { x, z });
  } catch (err) { next(err); }
};

// ─── GET /api/world/online ─────────────────────────────────────────────────────
// Returns recently-active avatars (last 5 minutes) — supplement to Socket.io
const getOnlinePlayers = async (req, res, next) => {
  try {
    const [players] = await pool.query(
      `SELECT wallet_address, display_name, color_primary, color_secondary,
              last_pos_x, last_pos_z, last_seen
       FROM avatar_configs
       WHERE last_seen >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
       LIMIT 50`
    );
    return success(res, players);
  } catch (err) { next(err); }
};

module.exports = { getParcels, getParcel, claimParcel, updateParcel, placeObject,
                   getAvatar, updateAvatar, updatePosition, getOnlinePlayers };
