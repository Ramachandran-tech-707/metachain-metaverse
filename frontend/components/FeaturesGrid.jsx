import styles from './FeaturesGrid.module.css';

const FEATURES = [
  { icon:'⬡', title:'Decentralised Ownership',  color:'var(--cyan)',   desc:'Every asset is ERC-721/1155 on-chain. True ownership with full provenance history across 12 networks.' },
  { icon:'◈', title:'Cross-Chain Bridge',         color:'var(--purple)', desc:'Move assets between Ethereum, Polygon, Arbitrum, Optimism and more with atomic zero-slippage swaps.' },
  { icon:'◎', title:'DeFi Integration',           color:'var(--pink)',   desc:'Stake virtual land, earn yield on NFT rentals, and participate in governance via the MCHAIN token.' },
  { icon:'◇', title:'ZK Privacy',                 color:'var(--gold)',   desc:'Optional ZK-proof transactions keep your strategies private while maintaining on-chain verifiability.' },
  { icon:'⬟', title:'DAO Governance',             color:'var(--green)',  desc:'Token holders vote on world upgrades, economic policy, and protocol changes through on-chain proposals.' },
  { icon:'◈', title:'Layer-2 Speed',              color:'var(--cyan)',   desc:'Sub-second finality with 50,000+ TPS on MetaChain\'s rollup — gas fees under $0.001.' },
];

export default function FeaturesGrid() {
  return (
    <section className={`section ${styles.section}`} id="explore">
      <div className="container">
        <div className={styles.header}>
          <p className="section-label">Core Technology</p>
          <h2 className="section-title">
            Built for the <span className="gradient-text">Decentralised</span> Future
          </h2>
          <p className={styles.desc}>
            MetaChain combines the most advanced blockchain primitives with an immersive virtual world engine.
          </p>
        </div>
        <div className={styles.grid}>
          {FEATURES.map(f => (
            <div key={f.title} className={styles.card}>
              <div className={styles.icon} style={{ color: f.color, borderColor: f.color }}>
                {f.icon}
              </div>
              <h3 className={styles.title}>{f.title}</h3>
              <p className={styles.body}>{f.desc}</p>
              <div className={styles.glow} style={{ background: f.color }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
