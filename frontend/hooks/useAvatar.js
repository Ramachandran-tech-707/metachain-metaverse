'use client';
import { useState, useEffect, useCallback } from 'react';
import { useWallet } from './useWallet';
import { worldApi }  from '@/lib/api';

export function useAvatar() {
  const { address, isConnected } = useWallet();
  const [avatar,  setAvatar]  = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) { setAvatar(null); return; }
    setLoading(true);
    worldApi.getAvatar(address)
      .then(r => setAvatar(r?.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [address]);

  const updateAvatar = useCallback(async (data) => {
    if (!address) return;
    try {
      const res = await worldApi.updateAvatar(data, address);
      console.info('[useAvatar] updateAvatar ->', res?.data);
      setAvatar(res?.data);
      return res?.data;
    } catch (err) {
      console.error('Avatar update failed:', err);
    }
  }, [address]);

  const displayName = avatar?.display_name
    || (address ? `Explorer_${address.slice(-4)}` : 'Explorer');

  const colorPrimary   = avatar?.color_primary   || '#00f5ff';
  const colorSecondary = avatar?.color_secondary || '#bf00ff';

  return { avatar, loading, updateAvatar, displayName, colorPrimary, colorSecondary };
}
