'use client';
import { useState } from 'react';
import Link          from 'next/link';
import { useWallet }    from '@/hooks/useWallet';
import { useApi }       from '@/hooks/useApi';
import { dashboardApi } from '@/lib/api';
import WalletModal      from './WalletModal';
import styles from './HeroSection.module.css';

// Static particle positions — rendered as CSS-animated divs.
// No requestAnimationFrame, no canvas, zero JS animation loop.
const PARTICLES = Array.from({ length: 40 }, (_, i) => ({
  id:    i,
  left:  `${(i * 37 + 11) % 97}%`,
  top:   `${(i * 53 + 7)  % 95}%`,
  size:  `${1.2 + (i % 4) * 0.6}px`,
  delay: `${(i * 0.37)    % 6}s`,
  dur:   `${5 + (i % 5)   * 2}s`,
  cyan:  i % 3 !== 0,
}));

export default function HeroSection() {
  const { isConnected }   = useWallet();
  const { data: stats }   = useApi(() => dashboardApi.globalStats());
  const [modalOpen, setModalOpen] = useState(false);

  const KPI_ITEMS = [
    { val: stats?.volume24hUSD  ? `$${(+stats.volume24hUSD  / 1e6).toFixed(1)}M` : '$42M',  label: 'Volume 24h'  },
    { val: stats?.totalUsers    ? `${(+stats.totalUsers    / 1e6).toFixed(1)}M`  : '2.8M',  label: 'Active Users' },
    { val: stats?.listedNFTs    ? `${(+stats.listedNFTs    / 1000).toFixed(1)}K` : '18.4K', label: 'NFTs Listed'  },
    { val: '99.9%', label: 'Uptime' },
  ];

  return (
    <section className={styles.hero}>

      {/* Pure-CSS particle field — replaces the canvas entirely */}
      <div className={styles.particles} aria-hidden>
        {PARTICLES.map(p => (
          <span
            key={p.id}
            className={`${styles.particle} ${p.cyan ? styles.particleCyan : styles.particlePurple}`}
            style={{
              left:              p.left,
              top:               p.top,
              width:             p.size,
              height:            p.size,
              animationDelay:    p.delay,
              animationDuration: p.dur,
            }}
          />
        ))}
      </div>

      {/* Ambient glow blobs */}
      <div className={styles.glowCyan}   aria-hidden />
      <div className={styles.glowPurple} aria-hidden />

      {/* Rotating orb — pure CSS */}
      <div className={styles.orb} aria-hidden>
        <div className={styles.ring1} />
        <div className={styles.ring2} />
        <div className={styles.ring3} />
        <div className={styles.core}  />
      </div>

      <div className="container">
        <div className={styles.content}>

          <div className={styles.eyebrow}>
            <span className={styles.dot} />
            Powered by Ethereum · Polygon · Arbitrum
            <span className={styles.dot} />
          </div>

          <h1 className={styles.heading}>
            <span className={styles.h1}>Enter The</span>
            <span className={`${styles.h2} glitch`} data-text="METACHAIN">METACHAIN</span>
            <span className={styles.h3}>Universe</span>
          </h1>

          <p className={styles.sub}>
            Own digital assets, trade NFTs, govern virtual worlds and earn in the most
            advanced blockchain‑powered metaverse — live across 12 chains.
          </p>

          <div className={styles.cta}>
            <Link href="/marketplace" className="btn btn-primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
              Enter Metaverse
            </Link>
            {!isConnected ? (
              <button className="btn btn-outline" onClick={() => setModalOpen(true)}>
                Connect Wallet
              </button>
            ) : (
              <Link href="/dashboard" className="btn btn-outline">View Dashboard</Link>
            )}
          </div>

          {/* Live KPIs */}
          <div className={styles.kpiRow}>
            {KPI_ITEMS.map(({ val, label }) => (
              <div key={label} className={styles.kpi}>
                <div className="stat-number">{val}</div>
                <div className={styles.kpiLabel}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.scrollHint} aria-hidden>
        <div className={styles.scrollLine} />
        <span>SCROLL</span>
      </div>

      <WalletModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </section>
  );
}
