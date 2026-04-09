'use client';

import { createConfig, http } from 'wagmi';
import {
  mainnet,
  polygon,
  arbitrum,
  optimism,
  base,
  avalanche,
  bsc,
  polygonZkEvm,
  linea,
  sepolia,
  holesky,
  polygonAmoy,
  arbitrumSepolia,
  optimismSepolia,
  baseSepolia,
  avalancheFuji,
  bscTestnet,
  lineaSepolia,
} from 'wagmi/chains';

// Use official connectors (BEST PRACTICE)
import { metaMask, walletConnect } from '@wagmi/connectors';

const PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo';

const ALCHEMY_KEY =
  process.env.NEXT_PUBLIC_ALCHEMY_KEY || '';

// ─────────────────────────────────────────────
// CHAINS
// ─────────────────────────────────────────────
export const SUPPORTED_CHAINS = [
  mainnet,
  polygon,
  arbitrum,
  optimism,
  base,
  avalanche,
  bsc,
  polygonZkEvm,
  linea,

  sepolia,
  holesky,
  polygonAmoy,
  arbitrumSepolia,
  optimismSepolia,
  baseSepolia,
  avalancheFuji,
  bscTestnet,
  lineaSepolia,
];

export const MAINNET_CHAINS = SUPPORTED_CHAINS.filter(c => !c.testnet);
export const TESTNET_CHAINS = SUPPORTED_CHAINS.filter(c => c.testnet);

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
export const wagmiConfig = createConfig({
  autoConnect: true,
  chains: SUPPORTED_CHAINS,

  connectors: [
    // MetaMask (NO HANG ISSUE)
    metaMask(),

    // WalletConnect (QR modal)
    walletConnect({
      projectId: PROJECT_ID,
      showQrModal: true,
      metadata: {
        name: process.env.NEXT_PUBLIC_APP_NAME || 'MetaChain',
        description:
          process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
          'Blockchain Metaverse',
        url:
          process.env.NEXT_PUBLIC_APP_URL ||
          'http://localhost:3000',
        icons: [
          process.env.NEXT_PUBLIC_APP_ICON || '/icon.png',
        ],
      },
      // Disable remote config to avoid TLS issues in dev
      options: {
        disableProviderPing: true,
        relayUrl: 'wss://relay.walletconnect.com',
      },
    }),
  ],

  // ─────────────────────────────────────────────
  // TRANSPORTS
  // ─────────────────────────────────────────────
  transports: {
    // Mainnets
    [mainnet.id]: http(
      ALCHEMY_KEY
        ? `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
        : 'https://cloudflare-eth.com'
    ),
    [polygon.id]: http(
      ALCHEMY_KEY
        ? `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
        : 'https://rpc.ankr.com/polygon'
    ),
    [arbitrum.id]: http('https://arb1.arbitrum.io/rpc'),
    [optimism.id]: http('https://mainnet.optimism.io'),
    [base.id]: http('https://mainnet.base.org'),
    [avalanche.id]: http(
      'https://api.avax.network/ext/bc/C/rpc'
    ),
    [bsc.id]: http('https://bsc-dataseed.binance.org'),
    [polygonZkEvm.id]: http('https://zkevm-rpc.com'),
    [linea.id]: http('https://rpc.linea.build'),

    // Testnets
    [sepolia.id]: http(
      ALCHEMY_KEY
        ? `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`
        : 'https://rpc.sepolia.org'
    ),
    [holesky.id]: http(
      'https://ethereum-holesky.publicnode.com'
    ),
    [polygonAmoy.id]: http(
      'https://rpc-amoy.polygon.technology'
    ),
    [arbitrumSepolia.id]: http(
      'https://sepolia-rollup.arbitrum.io/rpc'
    ),
    [optimismSepolia.id]: http(
      'https://sepolia.optimism.io'
    ),
    [baseSepolia.id]: http('https://sepolia.base.org'),
    [avalancheFuji.id]: http(
      'https://api.avax-test.network/ext/bc/C/rpc'
    ),
    [bscTestnet.id]: http(
      'https://data-seed-prebsc-1-s1.binance.org:8545'
    ),
    [lineaSepolia.id]: http(
      'https://rpc.sepolia.linea.build'
    ),
  },

  // IMPORTANT (Next.js fix)
  ssr: false,
});