'use client';
import { useState, useEffect } from 'react';
import Link        from 'next/link';
import Footer      from '@/components/Footer';
import NFTCard     from '@/components/NFTCard';
import WalletModal from '@/components/WalletModal';
import { useWallet } from '@/hooks/useWallet';
import { nftApi }    from '@/lib/api';
import styles        from './page.module.css';

const CHAIN_NAMES = {
  1:'Ethereum', 137:'Polygon', 42161:'Arbitrum',
  10:'Optimism', 8453:'Base', 43114:'Avalanche', 56:'BNB',
};

export default function MyNFTs() {
  const { isConnected, address, shortAddress } = useWallet();
  const [nfts,        setNfts]       = useState([]);
  const [loading,     setLoading]    = useState(false);
  const [tab,         setTab]        = useState('all');
  const [walletOpen,  setWalletOpen] = useState(false);
  const [total,       setTotal]      = useState(0);

  const load = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const res = await nftApi.getOwned(address);
      const items = res?.data || [];
      setNfts(items);
      setTotal(items.length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [address]);

  const filtered = tab === 'all'
    ? nfts
    : nfts.filter(n => n.category?.toLowerCase() === tab);

  const categories = ['all', ...new Set(nfts.map(n => n.category?.toLowerCase()).filter(Boolean))];

  const stats = {
    total:    nfts.length,
    value:    nfts.reduce((s, n) => s + parseFloat(n.price_usd || 0), 0),
    chains:   new Set(nfts.map(n => n.chain_id)).size,
    purchased: nfts.filter(n => n.purchase_tx).length,
  };

  if (!isConnected) {
    return (
      <>
        <main className={styles.main}>
          <div className="container">
            <div className={styles.prompt}>
              <div className={styles.promptIcon}>◈</div>
              <h2 className={styles.promptTitle}>Connect Your Wallet</h2>
              <p className={styles.promptDesc}>Connect to view your NFT collection.</p>
              <button className="btn btn-primary" onClick={() => setWalletOpen(true)}>
                Connect Wallet
              </button>
            </div>
          </div>
        </main>
        <Footer />
        <WalletModal isOpen={walletOpen} onClose={() => setWalletOpen(false)} />
      </>
    );
  }

  return (
    <>
      <main className={styles.main}>
        <div className="container">

          {/* Header */}
          <div className={styles.header}>
            <div>
              <p className="section-label">My Collection</p>
              <h1 className={styles.title}>
                My <span className="gradient-text">NFTs</span>
              </h1>
              <div className={styles.address}>
                <span className={styles.addrDot} />
                {shortAddress}
              </div>
            </div>
            <Link href="/marketplace" className="btn btn-outline btn-sm">
              Browse Marketplace →
            </Link>
          </div>

          {/* Stats bar */}
          {!loading && nfts.length > 0 && (
            <div className={styles.statsBar}>
              {[
                { val: stats.total,                                         lbl: 'NFTs Owned'     },
                { val: `$${stats.value.toLocaleString()}`,                  lbl: 'Est. Value'     },
                { val: stats.chains,                                        lbl: 'Chains'         },
                { val: stats.purchased,                                     lbl: 'Purchased'      },
              ].map(({ val, lbl }) => (
                <div key={lbl} className={styles.stat}>
                  <div className={styles.statVal}>{val}</div>
                  <div className={styles.statLbl}>{lbl}</div>
                </div>
              ))}
            </div>
          )}

          {/* Category tabs */}
          {nfts.length > 0 && (
            <div className={styles.tabs}>
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`${styles.tab} ${tab === cat ? styles.tabActive : ''}`}
                  onClick={() => setTab(cat)}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  <span className={styles.tabCount}>
                    {cat === 'all' ? nfts.length : nfts.filter(n => n.category?.toLowerCase() === cat).length}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className={styles.grid}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={styles.skeleton} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && nfts.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>◈</div>
              <h3 className={styles.emptyTitle}>No NFTs yet</h3>
              <p className={styles.emptyDesc}>
                Your collection is empty. Browse the marketplace to find your first NFT.
              </p>
              <Link href="/marketplace" className="btn btn-primary" style={{ marginTop: 8 }}>
                Browse Marketplace
              </Link>
            </div>
          )}

          {/* NFT Grid */}
          {!loading && filtered.length > 0 && (
            <>
              <div className={styles.grid}>
                {filtered.map(nft => (
                  <div key={nft.id} className={styles.cardWrap}>
                    <NFTCard nft={nft} onBought={load} />
                  </div>
                ))}
              </div>

              {/* Chain breakdown */}
              <div className={styles.chainBreakdown}>
                <div className={styles.chainBreakTitle}>By Chain</div>
                <div className={styles.chainList}>
                  {Object.entries(
                    nfts.reduce((acc, n) => {
                      const name = CHAIN_NAMES[n.chain_id] || `Chain ${n.chain_id}`;
                      acc[name] = (acc[name] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([name, count]) => (
                    <div key={name} className={styles.chainItem}>
                      <span className={styles.chainDot} />
                      <span className={styles.chainName}>{name}</span>
                      <span className={styles.chainCount}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
