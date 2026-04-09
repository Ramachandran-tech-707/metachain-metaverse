'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import WalletModal from '@/components/WalletModal';
import AvatarModal from '@/components/AvatarModal';
import { useWallet } from '@/hooks/useWallet';
import { useMultiplayer } from '@/hooks/useMultiplayer';
import { useAvatar } from '@/hooks/useAvatar';
import { worldApi } from '@/lib/api';
import styles from './page.module.css';
import ParcelModal from '@/components/ParcelModal';
import { useAssetLoader } from '@/hooks/useAssetLoader';

// Three.js scene must be client-only — no SSR
const WorldScene = dynamic(
  () => import('@/components/WorldScene'),
  { ssr: false, loading: () => <div className={styles.sceneLoading}><span className={styles.loadingDot} /> Loading 3D World…</div> }
);

export default function WorldPage() {
  const { address, isConnected, shortAddress, connect } = useWallet();
  const router = useRouter();
  const { avatar, displayName, colorPrimary } = useAvatar();
  const assetLoader = useAssetLoader();
  const {
    connected: wsConnected, players, playersArray, playersArrayUnique, online,
    messages, joinWorld, broadcastMove, sendChat, updateAvatar,
  } = useMultiplayer();

  const [myDisplayNameLocal, setMyDisplayNameLocal] = useState(displayName);
  const [myColorLocal, setMyColorLocal] = useState(colorPrimary);

  const [parcels, setParcels] = useState([]);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [walletOpen, setWalletOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showPlayers, setShowPlayers] = useState(true);
  const [myPos, setMyPos] = useState({ x: 0, z: 0 });
  const [loadingWorld, setLoadingWorld] = useState(true);

  const chatEndRef = useRef(null);
  const hasJoinedRef = useRef(false);

  // Load parcel data
  useEffect(() => {
    worldApi.getParcels({ min_x: -5, max_x: 5, min_z: -5, max_z: 5 })
      .then(r => { setParcels(r?.data || []); setLoadingWorld(false); })
      .catch(() => setLoadingWorld(false));
  }, []);

  // Join multiplayer once connected and avatar loaded
  useEffect(() => {
    if (wsConnected && avatar !== undefined) {
      joinWorld(avatar);
      hasJoinedRef.current = true;
    }
  }, [wsConnected, avatar, joinWorld]);

  const handleAvatarSave = useCallback(async (updatedAvatar) => {
    if (!hasJoinedRef.current || !updatedAvatar) return;
    console.info('[WorldPage] sending world:updateAvatar from onSaved', updatedAvatar);

    // Immediate UI sync for this client
    setMyDisplayNameLocal(updatedAvatar.display_name);
    setMyColorLocal(updatedAvatar.color_primary);

    // Push to socket for other clients
    updateAvatar({
      displayName: updatedAvatar.display_name,
      color: updatedAvatar.color_primary,
    });

    // Refresh parcels + selected parcel owner info too
    try {
      const r = await worldApi.getParcels({ min_x: -5, max_x: 5, min_z: -5, max_z: 5 });
      const newColor = updatedAvatar.color_primary || updatedAvatar.color;
      if (updatedAvatar.wallet_address && newColor) {
        const walletLower = updatedAvatar.wallet_address.toLowerCase();
        const adjusted = (r?.data || []).map(parcel =>
          parcel.owner_address?.toLowerCase() === walletLower
            ? { ...parcel, color_hex: newColor }
            : parcel
        );
        setParcels(adjusted);
        setSelectedParcel(prev => {
          if (!prev) return prev;
          const updated = adjusted.find(p => p.parcel_x === prev.parcel_x && p.parcel_z === prev.parcel_z);
          return updated || prev;
        });
      } else {
        setParcels(r?.data || []);
        setSelectedParcel(prev => {
          if (!prev) return prev;
          const updated = r?.data?.find(p => p.parcel_x === prev.parcel_x && p.parcel_z === prev.parcel_z);
          return updated || prev;
        });
      }
    } catch (err) {
      console.warn('[WorldPage] parcel refresh failed', err);
    }
  }, [updateAvatar]);

  // Keep local displayName/color in sync with store
  useEffect(() => {
    if (displayName) setMyDisplayNameLocal(displayName);
    if (colorPrimary) setMyColorLocal(colorPrimary);
  }, [displayName, colorPrimary]);

  // Ensure owned parcels mirror the current avatar color immediately
  useEffect(() => {
    const userWallet = address?.toLowerCase();
    if (!userWallet || !myColorLocal) return;
    setParcels(prev => prev.map(parcel => {
      if (parcel.owner_address?.toLowerCase() === userWallet) {
        return { ...parcel, color_hex: myColorLocal };
      }
      return parcel;
    }));
  }, [address, myColorLocal]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handlePositionChange = useCallback((x, z, rotY) => {
    setMyPos({ x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10 });
    broadcastMove(x, z, rotY);
  }, [broadcastMove]);

  const handleChatSend = (e) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;
    sendChat(chatInput);
    setChatInput('');
  };

  const myParcelX = Math.round(myPos.x / 10.4);
  const myParcelZ = Math.round(myPos.z / 10.4);

  return (
    <div className={styles.page}>
      {/* ── Top HUD bar ── */}
      <div className={styles.topHUD}>
        <div className={styles.hudLeft}>
          <div className={`${styles.wsStatus} ${wsConnected ? styles.wsOnline : styles.wsOffline}`}>
            <span className={styles.wsStatusDot} />
            {wsConnected ? `Online · ${online} explorer${online !== 1 ? 's' : ''}` : 'Connecting…'}
          </div>
          <div className={styles.coords}>
            <span className={styles.coordLabel}>POS</span>
            X: {myPos.x.toFixed(1)} · Z: {myPos.z.toFixed(1)}
            · Parcel ({myParcelX},{myParcelZ})
          </div>
        </div>
        <div className={styles.hudRight}>
          {isConnected ? (
            <>
              <button className={styles.hudBtn} onClick={() => setAvatarOpen(true)}>
                <div className={styles.avatarDot} style={{ background: myColorLocal, boxShadow: `0 0 8px ${myColorLocal}` }} />
                {myDisplayNameLocal}
              </button>
              <Link href="/marketplace" className={styles.hudBtn}>Marketplace</Link>
              <Link href="/dashboard" className={styles.hudBtn}>Dashboard</Link>
            </>
          ) : (
            <button className={styles.connectHudBtn} onClick={() => setWalletOpen(true)}>
              Connect Wallet to Play
            </button>
          )}
        </div>
      </div>

      {/* ── Main world viewport ── */}
      <div className={styles.worldWrap}>
        {loadingWorld ? (
          <div className={styles.sceneLoading}>
            <div className={styles.loadingOrb} />
            <p className={styles.loadingText}>Initialising MetaChain World…</p>
          </div>
        ) : (
          <WorldScene
            key={`${myColorLocal}-${myDisplayNameLocal}`}
            parcels={parcels}
            players={playersArrayUnique.filter(p => p.wallet !== address?.toLowerCase())}
            myColor={myColorLocal}
            myDisplayName={myDisplayNameLocal}
            currentWallet={address}
            onParcelClick={setSelectedParcel}
            onPositionChange={handlePositionChange}
            assetLoader={assetLoader}
          />
        )}

        {/* ── Controls hint ── */}
        <div className={styles.controlsHint}>
          <span>WASD / ↑↓←→ Move</span>
          <span>Click parcel to inspect</span>
        </div>

        {/* ── Minimap ── */}
        <div className={styles.minimap}>
          <div className={styles.minimapTitle}>MAP</div>
          <div className={styles.minimapGrid}>
            {parcels.slice(0, 49).map(p => (
              <div
                key={`${p.parcel_x},${p.parcel_z}`}
                className={styles.minimapCell}
                style={{ background: p.owner_address ? (p.color_hex || '#1a0040') : '#0a0a14' }}
                title={`(${p.parcel_x},${p.parcel_z}) ${p.parcel_name || ''}`}
              />
            ))}
            {/* Player dot */}
            <div className={styles.minimapPlayer} style={{
              background: colorPrimary,
              boxShadow: `0 0 6px ${colorPrimary}`,
              left: `${50 + (myParcelX / 5) * 50}%`,
              top: `${50 + (myParcelZ / 5) * 50}%`,
            }} />
          </div>
        </div>

        {/* ── Parcel Modal ── */}
        <ParcelModal
          parcel={selectedParcel}
          isOpen={!!selectedParcel}
          onClose={() => setSelectedParcel(null)}
          wallet={address}
          onBuy={(parcel) => {
            setSelectedParcel(null);
            router.push(
              `/marketplace?category=Land&parcel_x=${parcel.parcel_x}&parcel_z=${parcel.parcel_z}`
            );
          }}
        />

        {/* ── Parcel info panel ── */}
        {/* {selectedParcel && (
          <div className={styles.parcelPanel}>
            <button className={styles.parcelClose} onClick={() => setSelectedParcel(null)}>✕</button>
            <div className={styles.parcelCoords}>
              ({selectedParcel.parcel_x}, {selectedParcel.parcel_z})
            </div>
            <h3 className={styles.parcelName}>{selectedParcel.parcel_name || 'Untitled Parcel'}</h3>
            {selectedParcel.owner_address ? (
              <>
                <div className={styles.parcelOwner}>
                  <div className={styles.parcelOwnerDot} style={{ background: selectedParcel.color_primary || '#00f5ff' }} />
                  <span>{selectedParcel.display_name || `${selectedParcel.owner_address.slice(0, 10)}…`}</span>
                </div>
                {selectedParcel.nft_name && (
                  <div className={styles.parcelNFT}>
                    <span className="badge badge-purple">{selectedParcel.rarity}</span>
                    {selectedParcel.nft_name}
                  </div>
                )}
              </>
            ) : (
              <div className={styles.parcelUnowned}>
                <span>Unclaimed · Available</span>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: 8, width: '100%' }}
                  onClick={() => {
                    setSelectedParcel(null);
                    router.push(`/marketplace?category=Land&parcel_x=${selectedParcel.parcel_x}&parcel_z=${selectedParcel.parcel_z}`);
                  }}
                >
                  🏗 Buy Land NFT →
                </button>
              </div>
            )}
            {selectedParcel.description && (
              <p className={styles.parcelDesc}>{selectedParcel.description}</p>
            )}
          </div>
        )} */}

        {/* ── Players list ── */}
        <div className={`${styles.playersList} ${!showPlayers ? styles.collapsed : ''}`}>
          <button className={styles.panelToggle} onClick={() => setShowPlayers(v => !v)}>
            Explorers ({online}) {showPlayers ? '▸' : '◂'}
          </button>
          {showPlayers && (
            <div className={styles.playersInner}>
              {/* Me */}
              <div className={styles.playerItem}>
                <div className={styles.playerDot} style={{ background: myColorLocal, boxShadow: `0 0 6px ${myColorLocal}` }} />
                <span className={styles.playerName}>{myDisplayNameLocal} (you)</span>
              </div>
              {playersArray.map(p => (
                <div key={p.socketId} className={styles.playerItem}>
                  <div className={styles.playerDot} style={{ background: p.color || '#bf00ff', boxShadow: `0 0 4px ${p.color}` }} />
                  <span className={styles.playerName}>{p.displayName}</span>
                </div>
              ))}
              {playersArray.length === 0 && online <= 1 && (
                <div className={styles.playersEmpty}>You're the only explorer</div>
              )}
            </div>
          )}
        </div>

        {/* ── Chat ── */}
        <div className={`${styles.chat} ${!showChat ? styles.collapsed : ''}`}>
          <button className={styles.panelToggle} onClick={() => setShowChat(v => !v)}>
            World Chat {showChat ? '▾' : '▴'}
          </button>
          {showChat && (
            <>
              <div className={styles.chatMessages}>
                {messages.length === 0 && (
                  <div className={styles.chatEmpty}>No messages yet. Say hello!</div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={styles.chatMsg}>
                    <span className={styles.chatName} style={{ color: msg.color || '#00f5ff' }}>
                      {msg.displayName}
                    </span>
                    <span className={styles.chatText}>{msg.text}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form className={styles.chatForm} onSubmit={handleChatSend}>
                <input
                  className={styles.chatInput}
                  placeholder={isConnected ? 'Say something…' : 'Connect wallet to chat'}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  disabled={!isConnected}
                  maxLength={200}
                />
                <button type="submit" className={styles.chatSend} disabled={!isConnected || !chatInput.trim()}>
                  ↵
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <WalletModal isOpen={walletOpen} onClose={() => setWalletOpen(false)} />
      <AvatarModal
        isOpen={avatarOpen}
        onClose={() => setAvatarOpen(false)}
        onSaved={handleAvatarSave}
      />
    </div>
  );
}
