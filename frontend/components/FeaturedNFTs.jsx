'use client';
import Link from 'next/link';
import { useApi } from '@/hooks/useApi';
import { nftApi }  from '@/lib/api';
import NFTCard     from './NFTCard';
import styles      from './FeaturedNFTs.module.css';

export default function FeaturedNFTs() {
  const { data: nfts, loading, error } = useApi(() => nftApi.getFeatured());

  return (
    <section className={`section ${styles.section}`}>
      <div className="container">
        <div className={styles.header}>
          <div>
            <p className="section-label">Marketplace</p>
            <h2 className="section-title">
              Featured <span className="gradient-text">NFT Assets</span>
            </h2>
          </div>
          <Link href="/marketplace" className="btn btn-outline btn-sm">
            View All Assets →
          </Link>
        </div>

        {loading && (
          <div className={styles.grid}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        )}

        {error && (
          <div className={styles.error}>
            <span>⚠</span> Could not load NFTs — {error}
          </div>
        )}

        {!loading && !error && nfts?.length > 0 && (
          <div className={styles.grid}>
            {nfts.slice(0, 4).map(nft => (
              <NFTCard key={nft.id} nft={nft} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
