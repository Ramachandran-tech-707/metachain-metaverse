'use client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

// Lazy import — wagmiConfig is only created when this component first mounts
// (client-side, after page is interactive), never during SSR.
import { wagmiConfig } from '@/lib/wagmiConfig';

// Prevent multiple initializations in dev/hot reload
let hasWagmiInit = false;

export default function Providers({ children }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime:            60_000,   // 1 min
          gcTime:               300_000,  // 5 min
          retry:                1,
          refetchOnWindowFocus: false,
          refetchOnMount:       false,    // prevent double-fetch in StrictMode
        },
      },
    })
  );

  // Memoize to prevent re-creation
  const provider = useMemo(() => {
    if (!hasWagmiInit) {
      hasWagmiInit = true;
    } else {
      console.debug('WagmiProvider already initialized');
    }

    return (
      <WagmiProvider config={wagmiConfig} reconnectOnMount={true}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    );
  }, [children, queryClient]);

  return provider;
}
