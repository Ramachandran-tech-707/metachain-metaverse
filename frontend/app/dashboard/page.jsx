'use client';
import { useState, useEffect } from 'react';
import Footer   from '@/components/Footer';
import WalletModal from '@/components/WalletModal';
import { useWallet } from '@/hooks/useWallet';
import { dashboardApi, walletApi } from '@/lib/api';
import styles   from './page.module.css';

const TX_TYPE_BADGE = {
  Buy: 'badge-green', Sell: 'badge-pink', Stake: 'badge-purple',
  Mint: 'badge-cyan', Transfer: 'badge-cyan', Bridge: 'badge-purple', Swap: 'badge-cyan',
};

export default function Dashboard() {
  const { isConnected, address, shortAddress, activeChain, balance, connect } = useWallet();
  const [tab,       setTab]       = useState('overview');
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [chainStats,setChainStats]= useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!isConnected || !address) return;
    setLoading(true);
    setError(null);
    Promise.all([
      dashboardApi.get(address, address),
      dashboardApi.globalStats(),
    ])
      .then(([dash, global]) => {
        setData(dash?.data);
        setChainStats(global?.data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [address, isConnected]);

  if (!isConnected) {
    return (
      <>
        <main className={styles.main}>
          <div className="container">
            <div className={styles.connectPrompt}>
              <div className={styles.promptIcon}>◎</div>
              <h2 className={styles.promptTitle}>Connect Your Wallet</h2>
              <p className={styles.promptDesc}>Connect your wallet to view your personalised blockchain dashboard.</p>
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

          {/* Header */}
          <div className={styles.header}>
            <div>
              <p className="section-label">Blockchain Dashboard</p>
              <h1 className={styles.title}>My <span className="gradient-text">Portfolio</span></h1>
            </div>
            <div className={styles.headerRight}>
              <div className={styles.addrBadge}>
                <span className={styles.addrDot} />
                <span>{shortAddress}</span>
              </div>
              {activeChain && (
                <div className={styles.chainBadge}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 6px var(--green)', display:'inline-block' }} />
                  {activeChain.name}
                </div>
              )}
            </div>
          </div>

          {loading && (
            <div className={styles.skeletonGrid}>
              {Array.from({length:4}).map((_,i) => <div key={i} className={styles.skeleton} />)}
            </div>
          )}

          {error && <div className={styles.error}>⚠ {error}</div>}

          {!loading && data && (
            <>
              {/* KPI Cards */}
              <div className={styles.kpiGrid}>
                {[
                  { title:'Total Portfolio',  val:`$${parseFloat(data.kpis?.totalPortfolioUSD || 0).toLocaleString()}`, sub:`${balance ? parseFloat(balance.formatted).toFixed(4)+' '+balance.symbol : '—'} native`, color:'var(--cyan)'   },
                  { title:'NFTs Owned',       val:data.kpis?.nftCount || 0,                        sub:`${data.assetBreakdown?.length || 0} categories`,     color:'var(--purple)' },
                  { title:'Total Earned',     val:`$${parseFloat(data.kpis?.totalEarnedUSD || 0).toLocaleString()}`, sub:'All time sales',                    color:'var(--green)'  },
                  { title:'MCHAIN Staked',    val:`${parseFloat(data.kpis?.stakedETH || 0).toFixed(4)} ETH`, sub:'14.2% APY',                              color:'var(--gold)'   },
                ].map(({ title, val, sub, color }) => (
                  <div key={title} className={styles.kpiCard} style={{ '--acc': color }}>
                    <div className={styles.kpiGlow} />
                    <div className={styles.kpiTitle}>{title}</div>
                    <div className={styles.kpiVal}>{val}</div>
                    <div className={styles.kpiSub}>{sub}</div>
                  </div>
                ))}
              </div>

              {/* Chain stats bar */}
              {chainStats && (
                <div className={styles.chainBar}>
                  {[
                    { lbl:'Volume 24h',    val:`$${(+chainStats.volume24hUSD/1e6).toFixed(1)}M` },
                    { lbl:'Active Users',  val:`${(+chainStats.totalUsers/1e6).toFixed(1)}M`     },
                    { lbl:'Listed NFTs',   val:`${(+chainStats.listedNFTs/1000).toFixed(1)}K`    },
                    { lbl:'Network',       val:activeChain?.name || 'Ethereum'                   },
                  ].map(({ lbl, val }) => (
                    <div key={lbl} className={styles.chainStat}>
                      <div className={styles.chainLbl}>{lbl}</div>
                      <div className={styles.chainVal}>{val}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tabs */}
              <div className={styles.tabs}>
                {['overview','portfolio','transactions','analytics'].map(t => (
                  <button key={t} className={`${styles.tab} ${tab===t ? styles.tabActive:''}`} onClick={() => setTab(t)}>
                    {t.charAt(0).toUpperCase()+t.slice(1)}
                  </button>
                ))}
              </div>

              {/* Portfolio table */}
              {(tab==='overview' || tab==='portfolio') && data.portfolio?.length > 0 && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>NFT Holdings</h2>
                  <div className={styles.table}>
                    <div className={`${styles.row} ${styles.head}`}>
                      <span>Asset</span><span>Type</span><span>Floor Price</span><span>Est. Value</span><span>Action</span>
                    </div>
                    {data.portfolio.map(nft => (
                      <div key={nft.id} className={styles.row}>
                        <span className={styles.assetName}>{nft.name}</span>
                        <span><span className={`badge badge-cyan`}>{nft.category}</span></span>
                        <span className={styles.mono}>{nft.price_eth ? `${parseFloat(nft.price_eth).toFixed(3)} ETH` : '—'}</span>
                        <span className={styles.mono}>{nft.price_usd ? `$${parseFloat(nft.price_usd).toLocaleString()}` : '—'}</span>
                        <span><button className="btn btn-ghost btn-sm">List</button></span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transactions */}
              {(tab==='overview' || tab==='transactions') && data.recentTransactions?.length > 0 && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Recent Transactions</h2>
                  <div className={styles.table}>
                    <div className={`${styles.row} ${styles.head} ${styles.txRow}`}>
                      <span>Hash</span><span>Type</span><span>Asset</span><span>Amount</span><span>Status</span><span>Time</span>
                    </div>
                    {data.recentTransactions.map(tx => (
                      <div key={tx.id} className={`${styles.row} ${styles.txRow}`}>
                        <span className={`${styles.mono} ${styles.hash}`} title={tx.tx_hash}>
                          {tx.tx_hash.slice(0,10)}…
                        </span>
                        <span><span className={`badge ${TX_TYPE_BADGE[tx.tx_type] || 'badge-cyan'}`}>{tx.tx_type}</span></span>
                        <span className={styles.assetName}>{tx.nft_name || '—'}</span>
                        <span className={styles.mono}>{tx.amount_eth ? `${parseFloat(tx.amount_eth).toFixed(3)} ETH` : '—'}</span>
                        <span>
                          <span className={`${styles.status} ${tx.status==='Confirmed'?styles.statusGreen:tx.status==='Pending'?styles.statusYellow:styles.statusRed}`}>
                            <span className={styles.dot} />{tx.status}
                          </span>
                        </span>
                        <span className={styles.timeText}>
                          {tx.tx_timestamp ? new Date(tx.tx_timestamp).toLocaleDateString() : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Analytics */}
              {(tab==='overview' || tab==='analytics') && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Asset Breakdown</h2>
                  <div className={styles.analyticsGrid}>
                    <div className={styles.chartCard}>
                      <div className={styles.chartTitle}>Portfolio by Category</div>
                      <div className={styles.breakdown}>
                        {(data.assetBreakdown?.length ? data.assetBreakdown : [
                          { category:'Avatars',  count:4, value:25865 },
                          { category:'Land',     count:2, value:14698 },
                          { category:'Weapons',  count:3, value:7565  },
                        ]).map((item, i, arr) => {
                          const total = arr.reduce((s, x) => s + (+x.count), 0);
                          const pct   = total ? Math.round((+item.count / total) * 100) : 0;
                          const colors= ['var(--cyan)','var(--purple)','var(--pink)','var(--gold)','var(--green)'];
                          return (
                            <div key={item.category} className={styles.bItem}>
                              <div className={styles.bLabel}>
                                <span className={styles.bDot} style={{ background: colors[i % colors.length] }} />
                                {item.category}
                              </div>
                              <div className={styles.bBar}>
                                <div className={styles.bFill} style={{ width:`${pct}%`, background: colors[i % colors.length] }} />
                              </div>
                              <span className={styles.bPct} style={{ color: colors[i % colors.length] }}>{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className={styles.chartCard}>
                      <div className={styles.chartTitle}>Transaction Activity</div>
                      <div className={styles.txBreakdown}>
                        {(data.txBreakdown || []).map(t => (
                          <div key={t.tx_type} className={styles.txBItem}>
                            <span className={`badge ${TX_TYPE_BADGE[t.tx_type] || 'badge-cyan'}`}>{t.tx_type}</span>
                            <span className={styles.txBCount}>{t.count} txs</span>
                            <span className={styles.txBVol}>{t.volume ? `$${parseFloat(t.volume).toLocaleString()}` : '—'}</span>
                          </div>
                        ))}
                        {!data.txBreakdown?.length && (
                          <div className={styles.noData}>No transaction data yet</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
