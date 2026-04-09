const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
export const API_URL = BASE;
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || API_URL.replace('/api', '');

async function apiFetch(path, options = {}, walletAddress = null) {
  const headers = {
    'Content-Type': 'application/json',
    ...(walletAddress && { 'x-wallet-address': walletAddress }),
    ...options.headers,
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `API error ${res.status}`);
  }
  return res.json();
}

// ── NFTs ──────────────────────────────────────────────────────────────────────
export const nftApi = {
  getAll:       (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/nfts?${qs}`);
  },
  getFeatured:  ()            => apiFetch('/nfts/featured'),
  getCategories:()            => apiFetch('/nfts/categories'),
  getById:      (id)          => apiFetch(`/nfts/${id}`),
  getByWallet:  (addr, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/nfts/wallet/${addr}?${qs}`);
  },
  getOwned:     (addr, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/nfts/owned/${addr}?${qs}`);
  },
  like:         (id)          => apiFetch(`/nfts/${id}/like`, { method: 'POST' }),
};

// ── Wallet ────────────────────────────────────────────────────────────────────
export const walletApi = {
  get:          (addr)        => apiFetch(`/wallet/${addr}`),
  getTokens:    (addr, chainId) => {
    const qs = chainId ? `?chain_id=${chainId}` : '';
    return apiFetch(`/wallet/${addr}/tokens${qs}`);
  },
  getTxs:       (addr, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/wallet/${addr}/transactions?${qs}`);
  },
  updateProfile:(addr, data, walletAddr) =>
    apiFetch(`/wallet/${addr}/profile`, { method: 'PUT', body: JSON.stringify(data) }, walletAddr),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  get:          (addr, walletAddr) =>
    apiFetch(`/dashboard/${addr}`, {}, walletAddr),
  globalStats:  ()            => apiFetch('/dashboard/stats'),
};

// ── Marketplace ───────────────────────────────────────────────────────────────
export const marketplaceApi = {
  getListings:  (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/marketplace?${qs}`);
  },
  getStats:     ()            => apiFetch('/marketplace/stats'),
  buyNFT:       (listingId, data, walletAddr) =>
    apiFetch(`/marketplace/buy/${listingId}`, { method: 'POST', body: JSON.stringify(data) }, walletAddr),
  createListing:(data, walletAddr) =>
    apiFetch('/marketplace/list', { method: 'POST', body: JSON.stringify(data) }, walletAddr),
  cancelListing:(id, walletAddr) =>
    apiFetch(`/marketplace/list/${id}`, { method: 'DELETE' }, walletAddr),
};

// ── Chains ────────────────────────────────────────────────────────────────────
export const chainApi = {
  getAll:       (type)        => {
    const qs = type ? `?type=${type}` : '';
    return apiFetch(`/chains${qs}`);
  },
  getById:      (id)          => apiFetch(`/chains/${id}`),
};

// ── World / Metaverse ─────────────────────────────────────────────────────────
export const worldApi = {
  getParcels:      (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/world/parcels?${qs}`);
  },
  getParcel:       (x, z)          => apiFetch(`/world/parcels/${x}/${z}`),
  updateParcel:    (x, z, data, w) => apiFetch(`/world/parcels/${x}/${z}`, { method: 'PUT', body: JSON.stringify(data) }, w),
  placeObject:     (data, w)       => apiFetch('/world/objects', { method: 'POST', body: JSON.stringify(data) }, w),
  getAvatar:       (addr)          => apiFetch(`/world/avatar/${addr}`),
  updateAvatar:    (data, w)       => apiFetch('/world/avatar', { method: 'PUT', body: JSON.stringify(data) }, w),
  updatePosition:  (data, w)       => apiFetch('/world/avatar/position', { method: 'PUT', body: JSON.stringify(data) }, w),
  claimParcel:     (x, z, data, w) => apiFetch(`/world/parcels/${x}/${z}/claim`, { method: 'PUT', body: JSON.stringify(data) }, w),
  getOnline:       ()              => apiFetch('/world/online'),
  getOnlineCount:  ()              => apiFetch('/world/online-count'),
};
