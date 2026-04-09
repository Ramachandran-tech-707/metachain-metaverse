import styles from './CTABanner.module.css';

export default function CTABanner() {
  return (
    <section className={styles.wrap}>
      <div className="container">
        <div className={styles.inner}>
          <div className={styles.glowL} /><div className={styles.glowR} />
          <h2 className={styles.title}>
            Ready to Enter the<br />
            <span className="shimmer-text">MetaChain Universe?</span>
          </h2>
          <p className={styles.desc}>
            Join 2.8 million explorers already building and earning in the world's most advanced blockchain metaverse.
          </p>
          <div className={styles.actions}>
            <a href="/marketplace" className="btn btn-primary">Launch App</a>
            <a href="#explore"     className="btn btn-ghost">Explore Features</a>
          </div>
        </div>
      </div>
    </section>
  );
}
