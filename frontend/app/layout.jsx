import './globals.css';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';

// ⚡ CRITICAL: Dynamic import with ssr:false prevents WalletConnect from
// running its heavy initialisation (IndexedDB, crypto, WebSockets) during
// SSR or before the page is interactive. The page renders and becomes
// responsive immediately; wagmi loads silently afterwards.
const Providers = dynamic(
  () => import('@/providers/WagmiProvider'),
  { ssr: false, loading: () => null }
);

export const metadata = {
  title: 'MetaChain — Blockchain Metaverse Platform',
  description: 'The next-generation decentralised virtual world powered by blockchain.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
      </head>
      <body suppressHydrationWarning>
        <div className="grid-bg" />
        <div className="noise-overlay" />
        <Providers>
          <Navbar />
          <div className="page-wrapper">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
