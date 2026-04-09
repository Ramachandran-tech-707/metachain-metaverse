'use client';
import { useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import styles from './WalletModal.module.css';

export default function WalletModal({ isOpen, onClose }) {
  const {
    connectMetaMask,
    connectWalletConnect,
    isConnecting,
    isMetaMaskAvailable,
  } = useWallet();

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMetaMask = () => {
    if (!isMetaMaskAvailable) {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }
    connectMetaMask();
    onClose();
  };

  const handleWalletConnect = () => {
    connectWalletConnect();
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>⬡</div>
            <div>
              <h2 className={styles.title}>Connect Wallet</h2>
              <p className={styles.subtitle}>Choose your preferred wallet</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={styles.divider} />

        {/* Wallet Options */}
        <div className={styles.options}>

          {/* MetaMask */}
          <button
            className={`${styles.option} ${styles.metamask}`}
            onClick={handleMetaMask}
            disabled={isConnecting}
          >
            <div className={styles.optionIcon}>
              {/* MetaMask fox SVG */}
              <svg viewBox="0 0 318 318" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M274.1 35.5L174.6 109.4L193 65.8L274.1 35.5Z" fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M44.4 35.5L143.1 110.1L125.5 65.8L44.4 35.5Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M238.3 206.8L211.8 247.4L268.5 263L284.8 207.7L238.3 206.8Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M33.9 207.7L50.1 263L106.8 247.4L80.3 206.8L33.9 207.7Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M103.6 138.2L87.8 162.1L144.1 164.6L142.1 104.1L103.6 138.2Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M214.9 138.2L175.9 103.4L174.6 164.6L230.8 162.1L214.9 138.2Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M106.8 247.4L140.6 230.9L111.4 208.1L106.8 247.4Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M177.9 230.9L211.8 247.4L207.1 208.1L177.9 230.9Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className={styles.optionInfo}>
              <span className={styles.optionName}>MetaMask</span>
              <span className={styles.optionDesc}>
                {isMetaMaskAvailable ? 'Browser extension detected' : 'Install MetaMask extension'}
              </span>
            </div>
            <div className={styles.optionRight}>
              {isMetaMaskAvailable ? (
                <span className={styles.optionBadge} style={{ color: 'var(--green)', borderColor: 'var(--green)', background: 'rgba(0,255,136,0.08)' }}>
                  Detected
                </span>
              ) : (
                <span className={styles.optionBadge}>
                  Install
                </span>
              )}
              <svg className={styles.optionArrow} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </button>

          {/* WalletConnect */}
          <button
            className={`${styles.option} ${styles.walletconnect}`}
            onClick={handleWalletConnect}
            disabled={isConnecting}
          >
            <div className={styles.optionIcon}>
              {/* WalletConnect icon */}
              <svg viewBox="0 0 300 185" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M61.4 44.2C110.5 -4.9 188.8 -4.9 237.9 44.2L243.9 50.2C246.4 52.7 246.4 56.7 243.9 59.2L223.5 79.6C222.3 80.8 220.3 80.8 219.1 79.6L210.9 71.4C177.3 37.8 122.1 37.8 88.5 71.4L79.7 80.2C78.5 81.4 76.5 81.4 75.3 80.2L54.9 59.8C52.4 57.3 52.4 53.3 54.9 50.8L61.4 44.2ZM279.4 85.7L297.7 104C300.2 106.5 300.2 110.5 297.7 113L213.5 197.2C211 199.7 207 199.7 204.5 197.2L146.3 139C145.7 138.4 144.7 138.4 144.1 139L85.9 197.2C83.4 199.7 79.4 199.7 76.9 197.2L2.3 113C-0.2 110.5 -0.2 106.5 2.3 104L20.6 85.7C23.1 83.2 27.1 83.2 29.6 85.7L87.9 144C88.5 144.6 89.5 144.6 90.1 144L148.3 85.7C150.8 83.2 154.8 83.2 157.3 85.7L215.6 144C216.2 144.6 217.2 144.6 217.8 144L270.4 85.7C272.9 83.2 276.9 83.2 279.4 85.7Z" fill="#3B99FC"/>
              </svg>
            </div>
            <div className={styles.optionInfo}>
              <span className={styles.optionName}>WalletConnect</span>
              <span className={styles.optionDesc}>Scan QR · 400+ wallets supported</span>
            </div>
            <div className={styles.optionRight}>
              <span className={styles.optionBadge} style={{ color: '#3B99FC', borderColor: '#3B99FC', background: 'rgba(59,153,252,0.08)' }}>
                Popular
              </span>
              <svg className={styles.optionArrow} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </button>
        </div>

      </div>
    </div>
  );
}
