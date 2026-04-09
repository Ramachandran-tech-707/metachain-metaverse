'use client';
import { useState, useEffect } from 'react';
import styles from './ParcelModal.module.css';

export default function ParcelModal({ parcel, isOpen, onClose, wallet, onBuy }) {
  const [isPurchasing, setIsPurchasing] = useState(false);

  if (!isOpen || !parcel) return null;

  const isOwner = parcel.owner_address?.toLowerCase() === wallet?.toLowerCase();
  const parcelId = `${parcel.parcel_x}-${parcel.parcel_z}`;

  const handleBuy = async () => {
    if (!parcel || isOwner) return;
    setIsPurchasing(true);
    try {
      await onBuy?.(parcel);
    } catch (err) {
      console.error('Purchase error:', err);
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <h2>Parcel #{parcelId}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Parcel Info Grid */}
          <div className={styles.infoGrid}>
            {/* Position */}
            <div className={styles.infoItem}>
              <span className={styles.label}>Location</span>
              <span className={styles.value}>
                ({parcel.parcel_x}, {parcel.parcel_z})
              </span>
            </div>

            {/* Owner */}
            <div className={styles.infoItem}>
              <span className={styles.label}>Owner</span>
              <span className={styles.value}>
                {isOwner ? 'You' : (
                  parcel.owner_address 
                    ? `${parcel.owner_address.slice(0, 6)}...${parcel.owner_address.slice(-4)}`
                    : 'Available'
                )}
              </span>
            </div>

            {/* Status */}
            <div className={styles.infoItem}>
              <span className={styles.label}>Status</span>
              <span className={`${styles.value} ${styles[isOwner ? 'owned' : (parcel.owner_address ? 'sold' : 'available')]}`}>
                {isOwner ? '🔒 Owned' : (parcel.owner_address ? '❌ Sold' : '✅ Available')}
              </span>
            </div>

            {/* Size */}
            <div className={styles.infoItem}>
              <span className={styles.label}>Size</span>
              <span className={styles.value}>10x10m</span>
            </div>

            {/* Price */}
            {parcel.price && (
              <div className={styles.infoItem}>
                <span className={styles.label}>Price</span>
                <span className={styles.value}>{parcel.price} ETH</span>
              </div>
            )}

            {/* Color */}
            <div className={styles.infoItem}>
              <span className={styles.label}>Color</span>
              <div className={styles.colorPreview}>
                <div 
                  className={styles.colorBox}
                  style={{ backgroundColor: parcel.color_hex || parcel.color_primary || '#001080' }}
                />
              </div>
            </div>
          </div>

          {/* Metadata */}
          {parcel.metadata && (
            <div className={styles.metadata}>
              <h3>Details</h3>
              <pre>{JSON.stringify(parcel.metadata, null, 2)}</pre>
            </div>
          )}

          {/* Description */}
          {parcel.description && (
            <div className={styles.description}>
              <p>{parcel.description}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={styles.footer}>
          {isOwner ? (
            <div className={styles.ownerActions}>
              <button className={styles.btn + ' ' + styles.btnSecondary} onClick={onClose}>
                Close
              </button>
              <button className={styles.btn + ' ' + styles.btnPrimary}>
                Manage Parcel
              </button>
            </div>
          ) : (
            <div className={styles.buyerActions}>
              <button className={styles.btn + ' ' + styles.btnSecondary} onClick={onClose}>
                Cancel
              </button>
              <button
                className={styles.btn + ' ' + styles.btnPrimary}
                onClick={handleBuy}
                disabled={isPurchasing || parcel.owner_address || !wallet}
              >
                {isPurchasing ? 'Processing...' : (
                  parcel.owner_address ? 'Sold Out' : 'Buy Now'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
