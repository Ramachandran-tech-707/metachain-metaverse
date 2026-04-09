'use client';
import { useState, useEffect } from 'react';
import Footer      from '@/components/Footer';
import WalletModal from '@/components/WalletModal';
import { useWallet } from '@/hooks/useWallet';
import { walletApi, chainApi } from '@/lib/api';
import styles from './page.module.css';

export default function WalletPage() {
  const {
    isConnected, address, shortAddress,
    activeChain, allChains, mainnetChains, testnetChains,
    balance, chainId, switchChain, isSwitching, connect, disconnect,
  } = useWallet();

  const [tab,      setTab]      = useState('tokens');
  const [walData,  setWalData]  = useState(null);
  const [nfts,     setNfts]     = useState([]);
  const [txs,      setTxs]      = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [chainFilter, setChainFilter] = useState('');
  const [showTestnets, setShowTestnets] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!isConnected || !address) return;
    setLoading(true);
    Promise.all([
      walletApi.get(address),
      walletApi.getTokens(address, chainFilter || undefined),
      walletApi.getTxs(address, { limit: 10, ...(chainFilter && { chain_id: chainFilter }) }),
    ])
      .then(([wal, _toks, _txs]) => {
        setWalData(wal?.data);
        setTxs(_txs?.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [address, isConnected, chainFilter]);

  useEffect(() => {
    if (!isConnected || !address) return;
    walletApi.getTxs(address, { limit: 20, ...(chainFilter && { chain_id: chainFilter }) })
      .then(r => setTxs(r?.data || [])).catch(() => {});
  }, [tab, address, chainFilter]);

  const displayChains = showTestnets ? testnetChains : mainnetChains;
  const tokens = walData?.tokens || [];
  const totalUSD = parseFloat(walData?.summary?.totalPortfolioUSD || 0);

  if (!isConnected) {
    return (
      <>
        <main className={styles.main}>
          <div className="container">
            <div className={styles.prompt}>
              <div className={styles.promptIcon}>⬡</div>
              <h2 className={styles.promptTitle}>Connect Your Wallet</h2>
              <p className={styles.promptDesc}>Connect to view your token balances, NFTs, and transaction history.</p>
              <button className="btn btn-primary" onClick={() => setModalOpen(true)}>Connect Wallet</button>
            </div>
          </div>
        </main>
        <Footer />
        <WalletModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  return (
    <>
      <main className={styles.main}>
        <div className="container">
          <div className={styles.header}>
            <p className="section-label">My Wallet</p>
            <h1 className={styles.title}>Digital <span className="gradient-text">Vault</span></h1>
          </div>

          {/* Wallet card */}
          <div className={styles.walCard}>
            <div className={styles.walGlow} />
            <div className={styles.walTop}>
              <div className={styles.walLeft}>
                <div className={styles.walIcon}>⬡</div>
                <div>
                  <div className={styles.walLabel}>Total Portfolio</div>
                  <div className={styles.walTotal}>
                    {loading ? '…' : `$${totalUSD.toLocaleString()}`}
                  </div>
                </div>
              </div>
              <div className={styles.walRight}>
                <div className={styles.walAddrLabel}>Wallet Address</div>
                <div className={styles.walAddr}>{address}</div>
                <div className={styles.walNative}>
                  {balance && `${parseFloat(balance.formatted).toFixed(6)} ${balance.symbol}`}
                  {activeChain && ` · ${activeChain.name}`}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className={styles.walActions}>
              {['Send','Receive','Swap','Bridge','Stake'].map(a => (
                <button key={a} className={styles.walAction}>
                  <span className={styles.walActionIcon}>
                    {a==='Send'?'↑':a==='Receive'?'↓':a==='Swap'?'⇄':a==='Bridge'?'⬡':'◎'}
                  </span>
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Network Switcher Panel */}
          <div className={styles.netPanel}>
            <div className={styles.netPanelHeader}>
              <div className={styles.netPanelTitle}>
                <span className={styles.netPanelDot} />
                Network Selection
              </div>
              <div className={styles.netTypeToggle}>
                <button className={!showTestnets ? styles.netTypeActive : ''} onClick={() => setShowTestnets(false)}>
                  Mainnets ({mainnetChains.length})
                </button>
                <button className={showTestnets ? styles.netTypeActive : ''} onClick={() => setShowTestnets(true)}>
                  Testnets ({testnetChains.length})
                </button>
              </div>
            </div>
            <div className={styles.netGrid}>
              {displayChains.map(chain => (
                <button
                  key={chain.id}
                  className={`${styles.netChain} ${activeChain?.id === chain.id ? styles.netChainActive : ''}`}
                  onClick={() => switchChain(chain.id)}
                  disabled={isSwitching}
                >
                  <span
                    className={styles.netChainDot}
                    style={{ background: activeChain?.id === chain.id ? 'var(--green)' : 'var(--text-dim)' }}
                  />
                  <div className={styles.netChainInfo}>
                    <span className={styles.netChainName}>{chain.name}</span>
                    <span className={styles.netChainSym}>{chain.nativeCurrency?.symbol}</span>
                  </div>
                  {activeChain?.id === chain.id && <span className={styles.netChainCheck}>✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Chain filter for tokens/txs */}
          <div className={styles.chainFilterRow}>
            <span className={styles.chainFilterLabel}>Filter by chain:</span>
            <button className={`${styles.chainF} ${!chainFilter ? styles.chainFActive : ''}`} onClick={() => setChainFilter('')}>
              All Chains
            </button>
            {mainnetChains.slice(0, 8).map(c => (
              <button
                key={c.id}
                className={`${styles.chainF} ${chainFilter === String(c.id) ? styles.chainFActive : ''}`}
                onClick={() => setChainFilter(String(c.id))}
              >
                {c.nativeCurrency?.symbol || c.name}
              </button>
            ))}
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            {['tokens','nfts','transactions'].map(t => (
              <button key={t} className={`${styles.tab} ${tab===t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase()+t.slice(1)}
                {t === 'tokens' && tokens.length > 0 && <span className={styles.tabCount}>{tokens.length}</span>}
                {t === 'transactions' && txs.length > 0 && <span className={styles.tabCount}>{txs.length}</span>}
              </button>
            ))}
          </div>

          {/* Tokens */}
          {tab === 'tokens' && (
            <div className={styles.tokenList}>
              {loading && Array.from({length:5}).map((_,i) => (
                <div key={i} className={styles.tokenSkeleton} />
              ))}
              {!loading && tokens.length === 0 && (
                <div className={styles.empty}>No tokens found on this network.</div>
              )}
              {!loading && tokens.map(t => (
                <div key={`${t.chain_id}-${t.token_symbol}`} className={styles.tokenRow}>
                  <div className={styles.tokenIcon} style={{ borderColor: t.logo_color || 'var(--cyan)', color: t.logo_color || 'var(--cyan)' }}>
                    {t.token_symbol?.charAt(0)}
                  </div>
                  <div className={styles.tokenInfo}>
                    <div className={styles.tokenName}>{t.token_name}</div>
                    <div className={styles.tokenMeta}>
                      {t.token_symbol}
                      <span className={styles.tokenChain}>
                        · {allChains.find(c => c.id === t.chain_id)?.name || `Chain ${t.chain_id}`}
                      </span>
                    </div>
                  </div>
                  <div className={styles.tokenBal}>
                    <div className={styles.tokenBalAmt}>{parseFloat(t.balance).toLocaleString()}</div>
                    <div className={styles.tokenBalUSD}>${parseFloat(t.balance_usd).toLocaleString()}</div>
                  </div>
                  <div className={`${styles.tokenChange} ${+t.price_change_24h > 0 ? styles.up : +t.price_change_24h < 0 ? styles.down : ''}`}>
                    {+t.price_change_24h > 0 && '▲ '}{+t.price_change_24h < 0 && '▼ '}
                    {Math.abs(+t.price_change_24h || 0).toFixed(1)}%
                  </div>
                  <div className={styles.tokenBar}>
                    <div className={styles.tokenFill} style={{ width:`${Math.min(100,(+t.balance_usd / Math.max(totalUSD,1))*100)}%`, background: t.logo_color || 'var(--cyan)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* NFTs */}
          {tab === 'nfts' && (
            <div className={styles.nftGrid}>
              {walData?.nftStats?.length === 0 && (
                <div className={styles.empty} style={{ gridColumn:'1/-1' }}>No NFTs found in your wallet.</div>
              )}
              <div className={styles.nftStats}>
                {(walData?.nftStats || []).map(s => (
                  <div key={s.chain_id} className={styles.nftStatCard}>
                    <div className={styles.nftStatChain}>
                      {allChains.find(c => c.id === s.chain_id)?.name || `Chain ${s.chain_id}`}
                    </div>
                    <div className={styles.nftStatCount}>{s.count} NFTs</div>
                    <div className={styles.nftStatVal}>${parseFloat(s.total_value || 0).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transactions */}
          {tab === 'transactions' && (
            <div className={styles.txList}>
              {loading && <div className={styles.empty}>Loading transactions…</div>}
              {!loading && txs.length === 0 && <div className={styles.empty}>No transactions found.</div>}
              {!loading && txs.map(tx => (
                <div key={tx.id} className={styles.txRow}>
                  <div className={`${styles.txTypeDot} ${tx.tx_type === 'Buy' ? styles.txBuy : tx.tx_type === 'Sell' ? styles.txSell : ''}`} />
                  <div className={styles.txInfo}>
                    <div className={styles.txType}>{tx.tx_type}</div>
                    <div className={styles.txHash}>{tx.tx_hash.slice(0,18)}…</div>
                  </div>
                  <div className={styles.txAmt}>
                    {tx.amount_eth ? `${parseFloat(tx.amount_eth).toFixed(4)} ETH` : '—'}
                    {tx.amount_usd && <span className={styles.txUSD}>${parseFloat(tx.amount_usd).toLocaleString()}</span>}
                  </div>
                  <div className={`${styles.txStatus} ${tx.status === 'Confirmed' ? styles.txConfirmed : tx.status === 'Pending' ? styles.txPending : styles.txFailed}`}>
                    {tx.status}
                  </div>
                  <div className={styles.txTime}>
                    {tx.tx_timestamp ? new Date(tx.tx_timestamp).toLocaleDateString() : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Disconnect */}
          <div className={styles.disconnectWrap}>
            <button className={styles.disconnectBtn} onClick={disconnect}>
              Disconnect Wallet
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
