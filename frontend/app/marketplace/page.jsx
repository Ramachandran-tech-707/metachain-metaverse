'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Footer        from '@/components/Footer';
import NFTCard       from '@/components/NFTCard';
import { marketplaceApi, worldApi, chainApi } from '@/lib/api';
import { useWallet } from '@/hooks/useWallet';
import styles        from './page.module.css';

const SORT_OPTIONS = [
  { val: 'created_at:DESC', label: 'Recently Listed'    },
  { val: 'price_eth:ASC',   label: 'Price: Low → High'  },
  { val: 'price_eth:DESC',  label: 'Price: High → Low'  },
  { val: 'likes_count:DESC',label: 'Most Liked'          },
];
const RARITIES = ['','Legendary','Epic','Rare','Common'];

export default function Marketplace() {
  const { chainId, isConnected, address } = useWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const parcelX = Number(searchParams.get('parcel_x'));
  const parcelZ = Number(searchParams.get('parcel_z'));

  const [worldParcel, setWorldParcel] = useState(null);
  const [nfts,       setNfts]       = useState([]);
  const [categories, setCategories] = useState([]);
  const [chains,     setChains]     = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [loadingMore,setLoadingMore] = useState(false);
  const [error,      setError]      = useState(null);

  // Filters
  const [cat,     setCat]     = useState('');
  const [rarity,  setRarity]  = useState('');
  const [chainF,  setChainF]  = useState('');
  const [search,  setSearch]  = useState('');
  const [sort,    setSort]    = useState('created_at:DESC');
  const [page,    setPage]    = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total,   setTotal]   = useState(0);

  useEffect(() => {
    if (Number.isFinite(parcelX) && Number.isFinite(parcelZ)) {
      setWorldParcel({ parcel_x: parcelX, parcel_z: parcelZ });
    } else {
      setWorldParcel(null);
    }
  }, [parcelX, parcelZ]);

  // Load chains for filter
  useEffect(() => {
    chainApi.getAll().then(r => setChains(r?.data?.mainnets || [])).catch(() => {});
    marketplaceApi.getStats().then(r => setStats(r?.data)).catch(() => {});
  }, []);

  const load = useCallback(async (reset = false) => {
    if (reset) { setLoading(true); setPage(1); }
    else setLoadingMore(true);

    const [sortField, sortOrder] = sort.split(':');
    const currentPage = reset ? 1 : page;

    try {
      const res = await marketplaceApi.getListings({
        page: currentPage, limit: 12,
        ...(cat    && { category: cat }),
        ...(rarity && { rarity }),
        ...(chainF && { chain_id: chainF }),
        ...(search && { search }),
        sort: sortField, order: sortOrder,
      });
      const newNFTs = res?.data || [];
      setTotal(res?.pagination?.total || 0);
      setHasMore(currentPage < (res?.pagination?.totalPages || 1));
      if (res?.categories?.length) setCategories(res.categories);
      setNfts(reset ? newNFTs : prev => [...prev, ...newNFTs]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [cat, rarity, chainF, search, sort, page]);

  // Re-fetch when filters change
  useEffect(() => { load(true); }, [cat, rarity, chainF, search, sort]);

  const loadMore = () => { setPage(p => p + 1); };
  useEffect(() => { if (page > 1) load(false); }, [page]);

  return (
    <>
      <main className={styles.main}>

        {/* Header */}
        <div className={styles.pageHeader}>
          <div className="container">
            <div className={styles.headerInner}>
              <div>
                <p className="section-label">Metaverse Marketplace</p>
                <h1 className={styles.pageTitle}>
                  Discover &amp; Trade<br />
                  <span className="gradient-text">Digital Assets</span>
                </h1>
                <p className={styles.pageDesc}>Browse {total.toLocaleString()}+ unique NFTs across all chains.</p>
              </div>
              {stats && (
                <div className={styles.headerStats}>
                  {[
                    { val: `$${(+stats.volume24hUSD/1e6).toFixed(1)}M`, lbl:'Volume 24h'    },
                    { val: (+stats.activeListings).toLocaleString(),      lbl:'Active Listings'},
                    { val: (+stats.uniqueOwners).toLocaleString(),        lbl:'Unique Owners'  },
                    { val: `${stats.floorPriceETH} ETH`,                 lbl:'Floor Price'    },
                  ].map(({ val, lbl }) => (
                    <div key={lbl} className={styles.stat}>
                      <div className="stat-number" style={{ fontSize:'22px' }}>{val}</div>
                      <div className={styles.statLbl}>{lbl}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Filters */}
        <div className={styles.filterBar}>
          <div className="container">
            <div className={styles.filterInner}>

              {/* Category tabs */}
              <div className={styles.cats}>
                <button
                  className={`${styles.catBtn} ${!cat ? styles.catActive : ''}`}
                  onClick={() => setCat('')}
                >All</button>
                {categories.map(c => (
                  <button
                    key={c.category}
                    className={`${styles.catBtn} ${cat === c.category ? styles.catActive : ''}`}
                    onClick={() => setCat(c.category)}
                  >
                    {c.category} <span className={styles.catCount}>{c.count}</span>
                  </button>
                ))}
              </div>

              <div className={styles.filterRight}>
                {/* Chain filter */}
                <select className={styles.select} value={chainF} onChange={e => setChainF(e.target.value)}>
                  <option value="">All Chains</option>
                  {chains.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                {/* Rarity */}
                <select className={styles.select} value={rarity} onChange={e => setRarity(e.target.value)}>
                  <option value="">All Rarities</option>
                  {RARITIES.filter(Boolean).map(r => <option key={r} value={r}>{r}</option>)}
                </select>

                {/* Sort */}
                <select className={styles.select} value={sort} onChange={e => setSort(e.target.value)}>
                  {SORT_OPTIONS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
                </select>

                {/* Search */}
                <div className={styles.search}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    type="text" placeholder="Search assets…" className={styles.searchInput}
                    value={search} onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="container">
          {loading && (
            <div className={styles.grid}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className={styles.skeleton} />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className={styles.error}>⚠ {error}</div>
          )}

          {!loading && !error && nfts.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>◈</div>
              <div className={styles.emptyMsg}>No assets found matching your filters.</div>
              <button className="btn btn-outline btn-sm" onClick={() => { setCat(''); setRarity(''); setChainF(''); setSearch(''); }}>
                Clear Filters
              </button>
            </div>
          )}

          {!loading && nfts.length > 0 && (
            <div className={styles.grid}>
              {nfts.map(nft => (
                <NFTCard
                  key={`${nft.id}-${nft.chain_id}`}
                  nft={nft}
                  onBought={async (bought) => {
                    // Immediately remove purchased NFT from the listing grid
                    setNfts(prev => prev.filter(n => n.id !== bought.id));
                    setTotal(t => Math.max(0, t - 1));

                    // If a world parcel was selected, claim it now (with wallet header)
                    if (isConnected && address && worldParcel?.parcel_x != null && worldParcel?.parcel_z != null) {
                      try {
                        await worldApi.claimParcel(worldParcel.parcel_x, worldParcel.parcel_z, {
                          nft_id: bought.id
                        }, address);
                        // automatically navigate back to world to view claim state
                        router.push('/world');
                      } catch (err) {
                        console.error('Could not claim world parcel', err);
                      }
                    }
                  }}
                />
              ))}
            </div>
          )}

          {hasMore && !loading && (
            <div className={styles.loadMore}>
              <button
                className="btn btn-outline"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading…' : `Load More · ${total - nfts.length} remaining`}
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
