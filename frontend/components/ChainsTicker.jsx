'use client';
import { useApi } from '@/hooks/useApi';
import { chainApi } from '@/lib/api';
import styles from './ChainsTicker.module.css';

const FALLBACK = [
  { name:'Ethereum', symbol:'ETH',  price:'$2,968', up:true  },
  { name:'Polygon',  symbol:'MATIC',price:'$0.82',  up:false },
  { name:'Arbitrum', symbol:'ARB',  price:'$1.24',  up:true  },
  { name:'Optimism', symbol:'OP',   price:'$2.01',  up:true  },
  { name:'Base',     symbol:'BASE', price:'$—',     up:null  },
  { name:'Avalanche',symbol:'AVAX', price:'$36.4',  up:false },
  { name:'BNB',      symbol:'BNB',  price:'$580',   up:true  },
];

export default function ChainsTicker() {
  const { data } = useApi(() => chainApi.getAll('mainnet'), [], true);

  const chains = data?.mainnets?.length
    ? data.mainnets.map(c => ({
        name:   c.name,
        symbol: c.symbol,
        price:  c.stats?.native_price_usd
                  ? `$${parseFloat(c.stats.native_price_usd).toLocaleString()}`
                  : '—',
        up: null,
      }))
    : FALLBACK;

  const doubled = [...chains, ...chains, ...chains];

  return (
    <div className={styles.ticker}>
      <div className={styles.track}>
        {doubled.map((c, i) => (
          <span key={i} className={styles.item}>
            <span className={styles.sym}>{c.symbol}</span>
            <span className={`${styles.val} ${c.up === true ? styles.up : c.up === false ? styles.down : styles.neutral}`}>
              {c.up === true && '▲ '}{c.up === false && '▼ '}{c.price}
            </span>
            <span className={styles.sep}>·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
