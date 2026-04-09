'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useWallet } from '@/hooks/useWallet';
import WalletModal   from './WalletModal';
import styles from './Navbar.module.css';

const NAV_LINKS = [
  { label: 'Explore',     href: '/'            },
  { label: 'World',       href: '/world'        },
  { label: 'Marketplace', href: '/marketplace' },
  { label: 'My NFTs',     href: '/my-nfts'     },
  { label: 'Dashboard',   href: '/dashboard'   },
  { label: 'Wallet',      href: '/wallet'      },
];

// Map chain IDs to short symbols shown in badge
const CHAIN_SYMBOLS = {
  1:        'ETH',   137:    'MATIC', 42161: 'ARB',
  10:       'OP',    8453:   'BASE',  43114: 'AVAX',
  56:       'BNB',   250:    'FTM',   100:   'GNO',
  1101:     'zkEVM', 324:    'zkSync',59144: 'LINEA',
  11155111: 'SEP',   17000:  'HOL',   80002: 'AMOY',
  421614:   'ARB-S', 11155420:'OP-S', 84532: 'BASE-S',
  43113:    'FUJI',  97:     'BSC-T', 300:   'zkS-T',
  59141:    'LIN-S',
};

export default function Navbar() {
  const { address, shortAddress, isConnected, isConnecting,
          activeChain, balance, allChains, mainnetChains,
          testnetChains, connect, disconnect, switchChain, isSwitching } = useWallet();

  const [scrolled,    setScrolled]    = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [netDropOpen, setNetDropOpen] = useState(false);
  const [showTestnets,setShowTestnets]= useState(false);
  const [walDropOpen, setWalDropOpen] = useState(false);
  const [modalOpen,   setModalOpen]   = useState(false);   // ← wallet picker modal
  const netRef = useRef(null);
  const walRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (netRef.current && !netRef.current.contains(e.target)) setNetDropOpen(false);
      if (walRef.current && !walRef.current.contains(e.target)) setWalDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayChains = showTestnets ? testnetChains : mainnetChains;

  return (
    <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>

        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg viewBox="0 0 32 32" fill="none">
              <polygon points="16,2 28,8 28,22 16,28 4,22 4,8" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <polygon points="16,8 22,11 22,19 16,22 10,19 10,11" fill="currentColor" opacity="0.3"/>
              <polygon points="16,8 22,11 22,19 16,22 10,19 10,11" stroke="currentColor" strokeWidth="1" fill="none"/>
              <line x1="16" y1="2"  x2="16" y2="8"  stroke="currentColor" strokeWidth="1.5"/>
              <line x1="28" y1="8"  x2="22" y2="11" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="28" y1="22" x2="22" y2="19" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="16" y1="28" x2="16" y2="22" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="4"  y1="22" x2="10" y2="19" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="4"  y1="8"  x2="10" y2="11" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </div>
          <span className={styles.logoText}>META<span>CHAIN</span></span>
        </Link>

        {/* Desktop Nav Links */}
        <ul className={styles.links}>
          {NAV_LINKS.map(({ label, href }) => (
            <li key={label}>
              <Link href={href} className={styles.link}>
                <span>{label}</span>
                <span className={styles.linkBar} />
              </Link>
            </li>
          ))}
        </ul>

        {/* Right Actions */}
        <div className={styles.actions}>

          {/* ── Network Switcher ── */}
          <div className={styles.netWrap} ref={netRef}>
            <button
              className={`${styles.netBtn} ${isSwitching ? styles.netSwitching : ''}`}
              onClick={() => setNetDropOpen(o => !o)}
            >
              <span
                className={styles.netDot}
                style={{ background: activeChain ? '#00ff88' : '#ff4444' }}
              />
              <span className={styles.netLabel}>
                {isSwitching
                  ? 'Switching…'
                  : activeChain
                  ? (CHAIN_SYMBOLS[activeChain.id] || activeChain.name)
                  : 'No Network'}
              </span>
              <svg className={`${styles.chevron} ${netDropOpen ? styles.open : ''}`}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            {netDropOpen && (
              <div className={styles.netDrop}>
                <div className={styles.netDropHeader}>
                  <span>Select Network</span>
                  <div className={styles.netTypeToggle}>
                    <button
                      className={!showTestnets ? styles.netTypeActive : ''}
                      onClick={() => setShowTestnets(false)}
                    >
                      Mainnets
                    </button>
                    <button
                      className={showTestnets ? styles.netTypeActive : ''}
                      onClick={() => setShowTestnets(true)}
                    >
                      Testnets
                    </button>
                  </div>
                </div>
                <div className={styles.netList}>
                  {displayChains.map(chain => (
                    <button
                      key={chain.id}
                      className={`${styles.netItem} ${activeChain?.id === chain.id ? styles.netItemActive : ''}`}
                      onClick={() => { switchChain(chain.id); setNetDropOpen(false); }}
                      disabled={isSwitching}
                    >
                      <span className={styles.netItemDot}
                        style={{
                          background: activeChain?.id === chain.id ? '#00ff88' : 'var(--border-cyan)',
                          boxShadow: activeChain?.id === chain.id ? '0 0 6px #00ff88' : 'none',
                        }}
                      />
                      <span className={styles.netItemName}>{chain.name}</span>
                      <span className={styles.netItemSym}>
                        {chain.nativeCurrency?.symbol}
                      </span>
                      {activeChain?.id === chain.id && (
                        <span className={styles.netItemCheck}>✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Wallet Button ── */}
          {!isConnected ? (
            <button
              className={styles.connectBtn}
              onClick={() => setModalOpen(true)}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <><span className={styles.spinner} /> Connecting…</>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="14" rx="2"/>
                    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                    <path d="M12 12v4M10 14h4"/>
                  </svg>
                  Connect Wallet
                </>
              )}
            </button>
          ) : (
            <div className={styles.walWrap} ref={walRef}>
              <button
                className={styles.walBtn}
                onClick={() => setWalDropOpen(o => !o)}
              >
                <span className={styles.walDot} />
                <span className={styles.walAddr}>{shortAddress}</span>
                {balance && (
                  <span className={styles.walBal}>
                    {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
                  </span>
                )}
                <svg className={`${styles.chevron} ${walDropOpen ? styles.open : ''}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>

              {walDropOpen && (
                <div className={styles.walDrop}>
                  <div className={styles.walDropHeader}>
                    <div className={styles.walDropAddr}>{address}</div>
                    {balance && (
                      <div className={styles.walDropBal}>
                        {parseFloat(balance.formatted).toFixed(6)} {balance.symbol}
                      </div>
                    )}
                  </div>
                  <div className={styles.walDropLinks}>
                    <Link href="/dashboard" className={styles.walDropLink} onClick={() => setWalDropOpen(false)}>
                      Dashboard
                    </Link>
                    <Link href="/wallet" className={styles.walDropLink} onClick={() => setWalDropOpen(false)}>
                      My Wallet
                    </Link>
                    <Link href="/marketplace" className={styles.walDropLink} onClick={() => setWalDropOpen(false)}>
                      My NFTs
                    </Link>
                  </div>
                  <button className={styles.disconnectBtn} onClick={() => { disconnect(); setWalDropOpen(false); }}>
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Burger */}
        <button
          className={`${styles.burger} ${menuOpen ? styles.burgerOpen : ''}`}
          onClick={() => setMenuOpen(m => !m)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile menu */}
      <div className={`${styles.mobileMenu} ${menuOpen ? styles.mobileOpen : ''}`}>
        {NAV_LINKS.map(({ label, href }) => (
          <Link key={label} href={href} className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
            {label}
          </Link>
        ))}
        <div className={styles.mobileDivider} />
        {!isConnected ? (
          <button className={styles.mobileConnect} onClick={() => { setMenuOpen(false); setModalOpen(true); }}>
            Connect Wallet
          </button>
        ) : (
          <>
            <div className={styles.mobileAddr}>{shortAddress}</div>
            <button className={styles.mobileDisconnect} onClick={() => { disconnect(); setMenuOpen(false); }}>
              Disconnect
            </button>
          </>
        )}
      </div>

      {/* Wallet picker modal */}
      <WalletModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </nav>
  );
}
