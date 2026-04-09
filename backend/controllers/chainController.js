const { pool }   = require('../config/db');
const { success, notFound } = require('../utils/response');
const { CHAINS, getChainById, getMainnets, getTestnets } = require('../utils/chains');

// ─── GET /api/chains ─────────────────────────────────────────────────────────
const getAllChains = async (req, res, next) => {
  try {
    const { type } = req.query; // 'mainnet' | 'testnet' | undefined

    let chains;
    if (type === 'mainnet')  chains = getMainnets();
    else if (type === 'testnet') chains = getTestnets();
    else chains = CHAINS;

    // Enrich with cached stats from DB where available
    const [stats] = await pool.query('SELECT * FROM chain_stats');
    const statsMap = Object.fromEntries(stats.map(s => [s.chain_id, s]));

    const enriched = chains.map(c => ({
      ...c,
      stats: statsMap[c.id] || null,
    }));

    return success(res, {
      mainnets: enriched.filter(c => !c.isTestnet),
      testnets: enriched.filter(c =>  c.isTestnet),
      all:      enriched,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/chains/:id ─────────────────────────────────────────────────────
const getChain = async (req, res, next) => {
  try {
    const chain = getChainById(req.params.id);
    if (!chain) return notFound(res, `Chain ID ${req.params.id} not supported`);

    const [[stats]] = await pool.query(
      'SELECT * FROM chain_stats WHERE chain_id = ?', [chain.id]
    );
    return success(res, { ...chain, stats: stats || null });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/chains/:id/stats ────────────────────────────────────────────────
// Called by a backend cron / oracle updater
const updateChainStats = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { block_number, gas_price_gwei, tps, native_price_usd } = req.body;

    await pool.query(
      `INSERT INTO chain_stats (chain_id, block_number, gas_price_gwei, tps, native_price_usd)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         block_number     = VALUES(block_number),
         gas_price_gwei   = VALUES(gas_price_gwei),
         tps              = VALUES(tps),
         native_price_usd = VALUES(native_price_usd),
         updated_at       = NOW()`,
      [id, block_number, gas_price_gwei, tps, native_price_usd]
    );

    const [[updated]] = await pool.query('SELECT * FROM chain_stats WHERE chain_id = ?', [id]);
    return success(res, updated, 'Chain stats updated');
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllChains, getChain, updateChainStats };
