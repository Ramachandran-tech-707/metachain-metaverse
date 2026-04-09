# Frontend README

## Overview

The frontend is a Next.js 14 application that powers the MetaChain user experience, including the landing page, NFT marketplace, dashboard, wallet flows, and browser-based 3D metaverse world.

## Key Features

- Landing page with product highlights and roadmap sections
- Wallet connection with MetaMask and WalletConnect
- NFT marketplace browsing, filtering, and purchase flow
- 3D world scene rendered client-side
- Avatar management and parcel interaction
- Real-time multiplayer updates using Socket.IO
- Portfolio and analytics-style dashboard pages

## Stack

- Next.js 14
- React 18
- Three.js
- Wagmi
- Viem
- Socket.IO client
- TanStack Query

## Important Directories

```text
frontend/
├── app/           # App Router pages
├── components/    # UI components and modals
├── hooks/         # Wallet, avatar, multiplayer, and asset hooks
├── lib/           # API client and wagmi config
├── providers/     # Client providers
└── public/        # 3D models and public assets
```

## Environment Variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_WS_URL=http://localhost:4000
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=demo
NEXT_PUBLIC_ALCHEMY_KEY=
NEXT_PUBLIC_APP_NAME=MetaChain
NEXT_PUBLIC_APP_DESCRIPTION=Blockchain Metaverse Platform
NEXT_PUBLIC_APP_URL=http://localhost:9094
NEXT_PUBLIC_APP_ICON=/icon.png
```

## Run Locally

```bash
cd frontend
npm install
npm run dev
```

Development server:

- `http://localhost:9094`

## Main Pages

- `app/page.jsx`: landing page
- `app/world/page.jsx`: 3D world and multiplayer UI
- `app/marketplace/page.jsx`: marketplace listings and filters
- `app/dashboard/page.jsx`: wallet dashboard
- `app/wallet/page.jsx`: wallet page
- `app/my-nfts/page.jsx`: owned NFT view

## API Integration

The frontend uses `lib/api.js` as a central API client for:

- NFT data
- wallet data
- dashboard data
- marketplace actions
- chain metadata
- world parcels, avatars, and online players

## Wallet Support

Wallet handling is implemented through `wagmi` with:

- MetaMask connector
- WalletConnect connector
- multi-chain support for mainnets and testnets

## 3D Assets

The metaverse scene uses `.glb` models from:

- `public/models/avatar/`
- `public/models/buildings/`
- `public/models/nfts/`
- `public/models/props/`

## Screenshots For GitHub

Store frontend screenshots in `../docs/screenshots/` and reference them from the root README. Suggested files:

- `docs/screenshots/home.png`
- `docs/screenshots/world.png`
- `docs/screenshots/marketplace.png`
- `docs/screenshots/dashboard.png`
