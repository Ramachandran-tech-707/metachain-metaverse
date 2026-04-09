# Backend README

## Overview

The backend is an Express.js API and Socket.IO server for the MetaChain application. It manages NFT data, marketplace actions, wallet-driven queries, dashboard statistics, parcel ownership, avatar updates, and real-time multiplayer events.

## Key Features

- REST API for NFTs, wallet data, chains, dashboard, marketplace, and world modules
- Socket.IO server for multiplayer world presence and chat
- MySQL persistence with seeded demo data
- Wallet-aware protected routes
- Rate limiting, logging, CORS, and security middleware

## Stack

- Node.js
- Express.js
- Socket.IO
- MySQL2
- Winston
- Morgan
- Helmet
- CORS

## Important Directories

```text
backend/
├── config/       # Database configuration
├── controllers/  # Route handlers
├── middleware/   # Auth and error handling
├── routes/       # API route modules
├── utils/        # Logger, DB init, helpers
└── server.js     # App and Socket.IO entry point
```

## Environment Variables

Create `backend/.env`:

```env
PORT=4000
FRONTEND_URL=http://localhost:9094

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=metachain_db
```

## Run Locally

```bash
cd backend
npm install
npm run db:init
npm run dev
```

Backend server:

- `http://localhost:4000`

Health check:

- `GET /health`

## API Routes

- `GET /api/nfts`
- `GET /api/wallet/:address`
- `GET /api/chains`
- `GET /api/dashboard/:address`
- `GET /api/dashboard/stats`
- `GET /api/marketplace`
- `GET /api/marketplace/stats`
- `POST /api/marketplace/list`
- `POST /api/marketplace/buy/:listingId`
- `GET /api/world/parcels`
- `GET /api/world/parcels/:x/:z`
- `PUT /api/world/parcels/:x/:z/claim`
- `PUT /api/world/avatar`
- `PUT /api/world/avatar/position`
- `GET /api/world/online`
- `GET /api/world/online-count`

## WebSocket Events

The server uses Socket.IO for:

- `world:join`
- `world:move`
- `world:updateAvatar`
- `world:chat`
- `world:parcelAction`

## Database Initialization

`utils/dbInit.js` creates and seeds:

- users
- nfts
- transactions
- token balances
- listings
- chain stats
- world parcels
- world objects

This makes local development easier because the app has sample data immediately after setup.
