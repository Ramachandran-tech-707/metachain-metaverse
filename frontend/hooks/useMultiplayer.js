'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useWallet } from './useWallet';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || API_URL.replace('/api', '');

export function useMultiplayer() {
  const { address, isConnected } = useWallet();
  const socketRef  = useRef(null);
  const [players,  setPlayers]  = useState(new Map()); // socketId → player data
  const [messages, setMessages] = useState([]);         // chat history
  const [online,   setOnline]   = useState(0);
  const [connected, setConnected] = useState(false);

  // ── Connect to Socket.io ───────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.info('[WS] connected', socket.id, 'via', WS_URL);
      setConnected(true);
    });

    socket.on('connect_error', (err) => {
      console.error('[WS] connect_error', err.message || err);
      setConnected(false);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[WS] disconnected', reason);
      setConnected(false);
    });

    // Full players list on join
    socket.on('world:players', (list) => {
      const map = new Map(list.map(p => [p.socketId, p]));
      setPlayers(map);
      setOnline(map.size);
    });

    // New player joined
    socket.on('world:playerJoined', (player) => {
      setPlayers(prev => {
        const next = new Map(prev);
        next.set(player.socketId, player);
        setOnline(next.size);
        return next;
      });
    });

    // Player moved — only update position fields
    socket.on('world:playerMoved', ({ socketId, x, z, rotY }) => {
      setPlayers(prev => {
        const player = prev.get(socketId);
        if (!player) return prev;
        const next = new Map(prev);
        next.set(socketId, { ...player, x, z, rotY });
        return next;
      });
    });

    // Player updated avatar
    socket.on('world:playerUpdated', ({ socketId, wallet, displayName, color, updatedAt }) => {
      console.info('[WS] world:playerUpdated', { socketId, wallet, displayName, color, updatedAt });
      setPlayers(prev => {
        const next = new Map(prev);

        // Update by socket entry
        const player = next.get(socketId);
        if (player) {
          if (!player.updatedAt || (updatedAt && updatedAt >= player.updatedAt)) {
            next.set(socketId, { ...player, displayName, color, updatedAt });
          }
        }

        // When wallet is provided, update all players with that wallet (safety for duplicates)
        if (wallet && updatedAt) {
          for (const [id, p] of next.entries()) {
            if (p.wallet?.toLowerCase() === wallet.toLowerCase()) {
              if (!p.updatedAt || updatedAt >= p.updatedAt) {
                next.set(id, { ...p, displayName, color, updatedAt });
              }
            }
          }
        }

        return next;
      });
    });

    // Player left
    socket.on('world:playerLeft', ({ socketId }) => {
      setPlayers(prev => {
        const next = new Map(prev);
        next.delete(socketId);
        setOnline(next.size);
        return next;
      });
    });

    // Chat messages — keep last 50
    socket.on('world:chatMessage', (msg) => {
      setMessages(prev => [...prev.slice(-49), msg]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // ── Join world once socket + wallet ready ──────────────────────────────────
  const joinWorld = useCallback((avatarData) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('world:join', {
      wallet:      address  || 'anonymous',
      displayName: avatarData?.display_name || `Explorer_${(address || '????').slice(-4)}`,
      color:       avatarData?.color_primary || '#00f5ff',
      x:           avatarData?.last_pos_x   || 0,
      z:           avatarData?.last_pos_z   || 0,
    });
  }, [address]);

  // ── Broadcast position (called every ~100ms from the 3D loop) ─────────────
  const broadcastMove = useCallback((x, z, rotY) => {
    socketRef.current?.volatile.emit('world:move', { x, z, rotY });
  }, []);

  // ── Send chat ─────────────────────────────────────────────────────────────
  const sendChat = useCallback((text) => {
    if (!text?.trim()) return;
    socketRef.current?.emit('world:chat', { text: text.trim() });
  }, []);

  // ── Update avatar ────────────────────────────────────────────────────────
  const updateAvatar = useCallback((avatarData) => {
    const payload = {
      displayName: avatarData?.displayName ?? avatarData?.display_name,
      color:       avatarData?.color ?? avatarData?.color_primary,
      updatedAt:   Date.now(),
    };
    console.info('[WS] emitting world:updateAvatar payload', payload);
    socketRef.current?.emit('world:updateAvatar', payload);
  }, []);

  const playersArray = Array.from(players.values());
  const playersArrayUnique = Array.from(
    playersArray.reduce((acc, player) => {
      const key = (player.wallet || player.socketId || '').toLowerCase();
      if (key) {
        if (!acc.has(key) || acc.get(key).socketId === player.socketId) {
          acc.set(key, player);
        }
      }
      return acc;
    }, new Map()).values()
  );

  return {
    connected,
    players,
    playersArray,
    playersArrayUnique,
    online,
    messages,
    joinWorld,
    broadcastMove,
    sendChat,
    updateAvatar,
    socket: socketRef.current,
  };
}
