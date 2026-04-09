'use client';
import { useState } from 'react';
import dynamic      from 'next/dynamic';
import { nftApi }   from '@/lib/api';
import styles       from './NFTCard.module.css';

// Load BuyModal lazily — only when user clicks Buy
const BuyModal = dynamic(() => import('./BuyModal'), { ssr: false });

const RARITY_COLORS = {
  Legendary: 'var(--gold)',
  Epic:      'var(--purple)',
  Rare:      'var(--cyan)',
  Common:    'var(--text-secondary)',
};
const GRADIENT_MAP = {
  Avatar:   'linear-gradient(135deg,#0d0d2b,#1a0040,#003366)',
  Land:     'linear-gradient(135deg,#0a001a,#1a0033,#000d1a)',
  Vehicle:  'linear-gradient(135deg,#001a1a,#003333,#001a33)',
  Weapon:   'linear-gradient(135deg,#1a0000,#330013,#1a001a)',
  Wearable: 'linear-gradient(135deg,#0d001a,#1a0040,#001a33)',
  Art:      'linear-gradient(135deg,#001a1a,#1a001a,#1a1a00)',
};

export default function NFTCard({ nft, onBought }) {
  const [likes,    setLikes]    = useState(nft.likes_count || 0);
  const [liked,    setLiked]    = useState(false);
  const [imgError, setImgError] = useState(false);
  const [buyOpen,  setBuyOpen]  = useState(false);

  const handleLike = async (e) => {
    e.stopPropagation();
    if (liked) return;
    try { await nftApi.like(nft.id); setLikes(l => l + 1); setLiked(true); } catch {}
  };

  const price    = nft.listing_price    || nft.price_eth;
  const priceUSD = nft.listing_price_usd || nft.price_usd;
  const creator  = (nft.creator_ens || nft.creator_address || 'Unknown').slice(0, 14) + '…';
  const bgGrad   = GRADIENT_MAP[nft.category] || GRADIENT_MAP.Art;
  const showImg  = !imgError && nft.image_url?.startsWith('http');
  const isSvg    = nft.image_url?.includes('dicebear');
  const isOwned  = Boolean(nft.purchase_tx || nft.owned || nft.isOwned);


  return (
    <>
      <div className={styles.card}>
        <div className={styles.imgWrap}>
          <div className={styles.img} style={{ background: bgGrad }}>
            {showImg && (
              <img
                src={nft.image_url} alt={nft.name}
                className={styles.imgTag}
                style={isSvg ? { objectFit:'contain', padding:'12px', background:'transparent' } : undefined}
                onError={() => setImgError(true)}
              />
            )}
            <div className={styles.imgOverlay} />
            <div className={styles.catBadge}>{nft.category}</div>
            <div className={styles.rarityBadge} style={{ color: RARITY_COLORS[nft.rarity], borderColor: RARITY_COLORS[nft.rarity] }}>
              ◆ {nft.rarity}
            </div>
            {isOwned && (
              <div className={styles.ownedBadge}>Owned</div>
            )}
            <div className={styles.imgActions}>
              <button className={`${styles.likeBtn} ${liked ? styles.liked : ''}`} onClick={handleLike}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                {likes > 999 ? `${(likes/1000).toFixed(1)}K` : likes}
              </button>
              <button className={styles.viewBtn}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                {nft.views_count > 999 ? `${(nft.views_count/1000).toFixed(1)}K` : nft.views_count || 0}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.meta}>
            <span className={styles.tokenId}>#{String(nft.token_id || nft.id).padStart(4,'0')}</span>
            <span className={styles.chainBadge}>
              <span className={styles.chainDot} />
              {nft.chain_id === 1 ? 'ETH' : nft.chain_id === 137 ? 'MATIC' : nft.chain_id === 42161 ? 'ARB' : nft.chain_id === 10 ? 'OP' : nft.chain_id === 8453 ? 'BASE' : `#${nft.chain_id}`}
            </span>
          </div>
          <h3 className={styles.name}>{nft.name}</h3>
          <p className={styles.creator}>by <span>{creator}</span></p>
          <div className={styles.divider} />
          <div className={styles.footer}>
            <div>
              <div className={styles.priceLabel}>Current Price</div>
              <div className={styles.price}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--purple)">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                </svg>
                {price ? `${parseFloat(price).toFixed(3)} ETH` : '—'}
              </div>
              {priceUSD && <div className={styles.priceUSD}>${parseFloat(priceUSD).toLocaleString()}</div>}
            </div>
            <button
              className={`${styles.buyBtn} ${isOwned ? styles.buyBtnDisabled : ''}`}
              onClick={() => { if (!isOwned) setBuyOpen(true); }}
              disabled={isOwned}
            >
              {isOwned ? 'Owned' : 'Buy Now'}
            </button>
          </div>
        </div>
      </div>

      {buyOpen && (
        <BuyModal
          nft={nft}
          onClose={() => setBuyOpen(false)}
          onSuccess={(bought) => { setBuyOpen(false); onBought?.(bought); }}
        />
      )}
    </>
  );
}
