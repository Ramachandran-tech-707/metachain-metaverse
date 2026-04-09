'use client';
import { useState } from 'react';
import { useWallet }       from '@/hooks/useWallet';
import { marketplaceApi }  from '@/lib/api';
import WalletModal         from './WalletModal';
import styles              from './BuyModal.module.css';

const CHAIN_NAMES = {
  1: 'Ethereum', 137: 'Polygon', 42161: 'Arbitrum',
  10: 'Optimism', 8453: 'Base', 43114: 'Avalanche', 56: 'BNB Chain',
};

export default function BuyModal({ nft, onClose, onSuccess }) {
  const { isConnected, address, shortAddress, balance } = useWallet();
  const [step,       setStep]       = useState('confirm');
  const [walletOpen, setWalletOpen] = useState(false);
  const [errMsg,     setErrMsg]     = useState('');

  if (!nft) return null;

  const price     = parseFloat(nft.listing_price    || nft.price_eth  || 0);
  const priceUSD  = parseFloat(nft.listing_price_usd || nft.price_usd || 0);
  const listingId = nft.listing_id;
  const chainName = CHAIN_NAMES[nft.chain_id] || `Chain ${nft.chain_id}`;
  const userBal   = balance ? parseFloat(balance.formatted) : 0;
  const hasBalance = userBal >= price;

  const handleBuy = async () => {
    if (!isConnected) { setWalletOpen(true); return; }
    setStep('signing'); setErrMsg('');
    try {
      const res = await marketplaceApi.buyNFT(listingId || nft.id, { tx_hash: null, nft_id: nft.id }, address);
      if (res.success) {
        setStep('success');
        setTimeout(() => { onSuccess?.(nft); onClose(); }, 2400);
      } else throw new Error(res.message || 'Purchase failed');
    } catch (err) {
      setErrMsg(err.message || 'Transaction failed');
      setStep('error');
    }
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <div className={styles.topBar} />

          <div className={styles.header}>
            <h2 className={styles.title}>Complete Purchase</h2>
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>

          {/* NFT preview */}
          <div className={styles.nftRow}>
            <div className={styles.thumb} style={{
              background: nft.image_url?.startsWith('http')
                ? `url(${nft.image_url}) center/cover`
                : 'linear-gradient(135deg,#0d0d2b,#1a0040)',
            }} />
            <div className={styles.nftInfo}>
              <div className={styles.nftName}>{nft.name}</div>
              <div className={styles.nftBadges}>
                <span className={`badge ${nft.rarity === 'Legendary' ? 'badge-cyan' : nft.rarity === 'Epic' ? 'badge-purple' : 'badge-cyan'}`}>
                  {nft.rarity}
                </span>
                <span className={styles.chainTag}>{chainName}</span>
              </div>
              <div className={styles.category}>{nft.category}</div>
            </div>
          </div>

          <div className={styles.sep} />

          {/* Price rows */}
          <div className={styles.prices}>
            <div className={styles.priceRow}>
              <span>Item price</span>
              <span>{price.toFixed(4)} ETH</span>
            </div>
            <div className={styles.priceRow}>
              <span>Est. network fee</span>
              <span>~0.002 ETH</span>
            </div>
            <div className={`${styles.priceRow} ${styles.totalRow}`}>
              <span>Total</span>
              <div>
                <div className={styles.totalETH}>{(price + 0.002).toFixed(4)} ETH</div>
                <div className={styles.totalUSD}>${(priceUSD + 6).toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Balance pill */}
          {isConnected && (
            <div className={`${styles.balPill} ${!hasBalance ? styles.balWarn : styles.balOk}`}>
              <span className={styles.balDot} />
              <span>{shortAddress}</span>
              <span className={styles.balAmt}>
                {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : '—'}
              </span>
              {!hasBalance && <span className={styles.insuf}>Low balance</span>}
            </div>
          )}

          {/* Step flow */}
          <div className={styles.stepRow}>
            {['Review','Sign','Done'].map((label, i) => {
              const stepKeys = ['confirm','signing','success'];
              const curIdx   = stepKeys.indexOf(step);
              return (
                <div key={label} className={styles.stepItem}>
                  <div className={`${styles.stepNum} ${curIdx === i ? styles.sActive : curIdx > i ? styles.sDone : ''}`}>
                    {curIdx > i ? '✓' : i + 1}
                  </div>
                  <span className={styles.stepLabel}>{label}</span>
                  {i < 2 && <div className={`${styles.stepLine} ${curIdx > i ? styles.sLineDone : ''}`} />}
                </div>
              );
            })}
          </div>

          {/* State panels */}
          {step === 'confirm' && (
            <div className={styles.actions}>
              {!isConnected ? (
                <button className="btn btn-primary" style={{width:'100%'}} onClick={() => setWalletOpen(true)}>
                  Connect Wallet to Buy
                </button>
              ) : !hasBalance ? (
                <button className="btn btn-outline" style={{width:'100%'}} disabled>
                  Insufficient Balance
                </button>
              ) : (
                <button className="btn btn-primary" style={{width:'100%'}} onClick={handleBuy}>
                  Buy Now · {price.toFixed(4)} ETH
                </button>
              )}
              <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            </div>
          )}

          {step === 'signing' && (
            <div className={styles.stateBox}>
              <div className={styles.spinner} />
              <div className={styles.stateTitle}>Waiting for confirmation</div>
              <div className={styles.stateDesc}>Approve the transaction in your wallet app</div>
            </div>
          )}

          {step === 'success' && (
            <div className={styles.stateBox}>
              <div className={styles.successIcon}>✓</div>
              <div className={styles.stateTitle}>Purchase complete!</div>
              <div className={styles.stateDesc}><strong>{nft.name}</strong> is now yours</div>
            </div>
          )}

          {step === 'error' && (
            <div className={styles.stateBox}>
              <div className={styles.errorIcon}>✗</div>
              <div className={styles.stateTitle}>Transaction failed</div>
              <div className={styles.stateDesc}>{errMsg}</div>
              <button className="btn btn-outline btn-sm" style={{marginTop:12}} onClick={() => setStep('confirm')}>
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
      <WalletModal isOpen={walletOpen} onClose={() => setWalletOpen(false)} />
    </>
  );
}
