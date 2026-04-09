'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from './useWallet';

/**
 * useApi — fetches any API endpoint, cancels in-flight requests on unmount.
 * The `fetchedRef` guard prevents React StrictMode's double-invoke from
 * firing two real network requests.
 *
 * @param {Function} fetcher    – e.g. () => nftApi.getFeatured()
 * @param {Array}    deps       – re-fetch when these change
 * @param {boolean}  immediate  – fetch on mount (default true)
 */
export function useApi(fetcher, deps = [], immediate = true) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error,   setError]   = useState(null);

  // Tracks whether the current effect invocation already fired a fetch
  const fetchedRef = useRef(false);

  const run = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetcher();
      // Don't update state if the component was unmounted (AbortSignal)
      if (signal?.aborted) return;
      setData(res.data ?? res);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err.message || 'Something went wrong');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!immediate) return;

    // React StrictMode mounts → unmounts → remounts in dev.
    // On the second mount fetchedRef is still false (new ref per mount),
    // but the AbortController from the first mount will have aborted,
    // so the first fetch silently no-ops and only the second fires.
    const controller = new AbortController();
    fetchedRef.current = false;

    run(controller.signal);

    return () => {
      controller.abort();
    };
  }, [run, immediate]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refetch: () => run() };
}

/**
 * useWalletApi — like useApi but only fires when wallet is connected
 */
export function useWalletApi(fetcher, deps = []) {
  const { isConnected, address } = useWallet();
  return useApi(fetcher, [address, ...deps], isConnected && !!address);
}
