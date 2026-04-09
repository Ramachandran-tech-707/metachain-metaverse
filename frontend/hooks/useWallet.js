'use client';

import {
  useAccount,
  useBalance,
  useChainId,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from 'wagmi';

import {
  SUPPORTED_CHAINS,
  MAINNET_CHAINS,
  TESTNET_CHAINS,
} from '@/lib/wagmiConfig';

export function useWallet() {
  const { address, isConnected, isConnecting, status } = useAccount();
  const chainId = useChainId();

  // IMPORTANT: get connectors from hook (NOT config)
  const { connect, connectors } = useConnect();

  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const { data: balance } = useBalance({
    address,
    query: { enabled: !!address },
  });

  const activeChain = SUPPORTED_CHAINS.find(
    (c) => c.id === chainId
  );

  // Correct connector detection
  const metaMaskConnector = connectors.find(
    (c) => c.name?.toLowerCase().includes('metamask')
  ) || connectors.find((c) => c.id === 'injected');

  const walletConnectConnector = connectors.find(
    (c) => c.id === 'walletConnect'
  );

  // MetaMask connect (NO HANG)
  const connectMetaMask = async () => {
    try {
      if (!window.ethereum) {
        window.open('https://metamask.io/download/', '_blank');
        return;
      }

      if (!metaMaskConnector) {
        console.error('MetaMask connector not found');
        return;
      }

      await connect({
        connector: metaMaskConnector,
      });

    } catch (err) {
      console.error('MetaMask error:', err);
    }
  };

  // WalletConnect connect
  const connectWalletConnect = async () => {
    try {
      await connect({
        connector: walletConnectConnector,
      });
    } catch (err) {
      console.error('WalletConnect error:', err);
    }
  };

  const isMetaMaskAvailable =
    typeof window !== 'undefined' &&
    !!window.ethereum?.isMetaMask;

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  return {
    address,
    shortAddress,
    isConnected,
    isConnecting,
    status,
    chainId,
    activeChain,
    balance,
    isSwitching,
    isMetaMaskAvailable,

    allChains: SUPPORTED_CHAINS,
    mainnetChains: MAINNET_CHAINS,
    testnetChains: TESTNET_CHAINS,

    connectMetaMask,
    connectWalletConnect,

    // optional generic connect
    connect: connectWalletConnect,

    disconnect,
    switchChain: (id) => switchChain({ chainId: id }),
  };
}