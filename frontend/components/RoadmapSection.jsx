import styles from './RoadmapSection.module.css';

const ITEMS = [
  { q:'Q1 2025', label:'Completed', title:'Genesis Launch',      desc:'Core blockchain infrastructure, wallet integration, NFT marketplace.', done:true },
  { q:'Q2 2025', label:'Completed', title:'World Builder Alpha', desc:'VR world editor, land ownership contracts, cross-chain bridge.',        done:true },
  { q:'Q3 2025', label:'Live',      title:'DeFi Economy',        desc:'NFT staking, yield farming on virtual assets, MCHAIN token launch.',    done:false },
  { q:'Q4 2025', label:'Upcoming',  title:'DAO Governance',      desc:'Full on-chain governance, community treasury, ecosystem grants.',       done:false },
  { q:'Q1 2026', label:'Upcoming',  title:'Mobile & VR',         desc:'Native iOS/Android apps, Oculus and Apple Vision Pro integration.',     done:false },
];

export default function RoadmapSection() {
  return (
    <section className="section">
      <div className="container">
        <div style={{ textAlign:'center', marginBottom: 56 }}>
          <p className="section-label">Development</p>
          <h2 className="section-title">Roadmap</h2>
        </div>
        <div className={styles.timeline}>
          {ITEMS.map((item, i) => (
            <div key={i} className={`${styles.item} ${item.done ? styles.done : ''}`}>
              <div className={styles.left}>
                <span className={styles.q}>{item.q}</span>
                <span className={`${styles.lbl} ${item.label === 'Live' ? styles.live : item.label === 'Completed' ? styles.completed : ''}`}>
                  {item.label}
                </span>
              </div>
              <div className={styles.line}>
                <div className={styles.dot} />
                {i < ITEMS.length - 1 && <div className={styles.connector} />}
              </div>
              <div className={styles.right}>
                <h3 className={styles.title}>{item.title}</h3>
                <p className={styles.desc}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
