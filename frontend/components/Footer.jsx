import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.topLine} />
      <div className="container">
        <div className={styles.grid}>
          {/* Brand */}
          <div className={styles.brand}>
            <div className={styles.logo}>META<span>CHAIN</span></div>
            <p className={styles.tagline}>
              The decentralized metaverse platform for the next generation of digital ownership and virtual experiences.
            </p>
            <div className={styles.socials}>
              {['Twitter', 'Discord', 'GitHub', 'Medium'].map(s => (
                <a key={s} href="#" className={styles.social}>{s[0]}</a>
              ))}
            </div>
          </div>

          {/* Links */}
          {[
            { title: 'Platform',    links: ['Marketplace', 'Dashboard', 'Staking', 'Governance', 'Wallet']   },
            { title: 'Developers',  links: ['Docs', 'SDK', 'API Reference', 'Smart Contracts', 'GitHub']      },
            { title: 'Community',   links: ['Discord', 'Twitter', 'Blog', 'Newsletter', 'Events']             },
          ].map(col => (
            <div key={col.title} className={styles.col}>
              <h4 className={styles.colTitle}>{col.title}</h4>
              <ul className={styles.colLinks}>
                {col.links.map(l => (
                  <li key={l}><a href="#" className={styles.colLink}>{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className={styles.bottom}>
          <div className={styles.bottomLeft}>
            <span className={styles.copyright}>© 2025 MetaChain Protocol. All rights reserved.</span>
            <div className={styles.chainInfo}>
              <span className={styles.chainDot} />
              <span>Deployed on Ethereum Mainnet · Block #19,847,320</span>
            </div>
          </div>
          <div className={styles.bottomLinks}>
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Security'].map(l => (
              <a key={l} href="#" className={styles.bottomLink}>{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
