'use client';
import { useState, useEffect } from 'react';
import { useAvatar }  from '@/hooks/useAvatar';
import styles from './AvatarModal.module.css';

const PRESET_COLORS = [
  '#00f5ff','#bf00ff','#ff0080','#ffd700',
  '#00ff88','#ff6600','#0066ff','#ff3366',
];

export default function AvatarModal({ isOpen, onClose, onSaved }) {
  const { avatar, updateAvatar, displayName: currentName } = useAvatar();
  const [name,    setName]    = useState('');
  const [primary, setPrimary] = useState('#00f5ff');
  const [rpmUrl,  setRpmUrl]  = useState('');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  useEffect(() => {
    if (avatar) {
      setName(avatar.display_name    || '');
      setPrimary(avatar.color_primary || '#00f5ff');
      setRpmUrl(avatar.rpm_url        || '');
    }
  }, [avatar]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    const updated = await updateAvatar({ display_name: name.trim(), color_primary: primary, rpm_url: rpmUrl.trim() });
    setSaving(false);
    setSaved(true);
    if (updated && onSaved) {
      onSaved(updated);
    }
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {/* Avatar preview sphere */}
            <div className={styles.preview} style={{ background: `radial-gradient(circle at 35% 35%, ${primary} 0%, #020408 70%)`, boxShadow: `0 0 20px ${primary}40` }}>
              <span className={styles.previewLabel}>{name?.charAt(0)?.toUpperCase() || '?'}</span>
            </div>
            <div>
              <h2 className={styles.title}>Avatar Settings</h2>
              <p className={styles.sub}>Customise your metaverse presence</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          {/* Display Name */}
          <div className={styles.field}>
            <label className={styles.label}>Display Name</label>
            <input
              className={styles.input}
              type="text"
              maxLength={32}
              placeholder="Enter your name…"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* Color picker */}
          <div className={styles.field}>
            <label className={styles.label}>Avatar Color</label>
            <div className={styles.colorRow}>
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  className={`${styles.colorSwatch} ${primary === c ? styles.colorActive : ''}`}
                  style={{ background: c, boxShadow: primary === c ? `0 0 12px ${c}` : 'none' }}
                  onClick={() => setPrimary(c)}
                />
              ))}
              <input
                type="color"
                className={styles.colorCustom}
                value={primary}
                onChange={e => setPrimary(e.target.value)}
                title="Custom color"
              />
            </div>
          </div>

          {/* Ready Player Me */}
          <div className={styles.field}>
            <label className={styles.label}>
              Ready Player Me Avatar URL
              <span className={styles.optional}>optional</span>
            </label>
            <input
              className={styles.input}
              type="url"
              placeholder="https://models.readyplayer.me/your-avatar.glb"
              value={rpmUrl}
              onChange={e => setRpmUrl(e.target.value)}
            />
            <p className={styles.rpmNote}>
              Avatar creation service temporarily unavailable. You can manually enter a GLB URL from any 3D avatar service.
            </p>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            className={`${styles.saveBtn} ${saved ? styles.savedBtn : ''}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save Avatar'}
          </button>
        </div>
      </div>
    </div>
  );
}
