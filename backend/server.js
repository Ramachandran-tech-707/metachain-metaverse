require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');

const { testConnection }                = require('./config/db');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const logger                            = require('./utils/logger');

// ── Routes ────────────────────────────────────────────────────────────────────
const nftRoutes         = require('./routes/nftRoutes');
const walletRoutes      = require('./routes/walletRoutes');
const chainRoutes       = require('./routes/chainRoutes');
const dashboardRoutes   = require('./routes/dashboardRoutes');
const marketplaceRoutes = require('./routes/marketplaceRoutes');
const worldRoutes       = require('./routes/worldRoutes');

const app    = express();
const server = http.createServer(app);   // ← shared HTTP server for Express + Socket.io
const PORT   = process.env.PORT || 4000;

// ── CORS origin helper ─────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
].filter(Boolean);

const originFn = (origin, cb) => {
  if (!origin) return cb(null, true);
  const ok = allowedOrigins.some(o => typeof o === 'string' ? o === origin : o.test(origin));
  ok ? cb(null, true) : cb(new Error(`CORS blocked: ${origin}`));
};

// ── Socket.io setup ────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: originFn, methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});

// Track online players: Map<socketId, { wallet, x, z, rotY, displayName, color }>
const onlinePlayers = new Map();

io.on('connection', (socket) => {
  logger.info(`[WS] connected: ${socket.id}`);

  // Player joins the world
  socket.on('world:join', (data) => {
    const player = {
      socketId:    socket.id,
      wallet:      (data.wallet   || 'anonymous').toLowerCase(),
      displayName: data.displayName || 'Explorer',
      color:       data.color       || '#00f5ff',
      x:           data.x           || 0,
      z:           data.z           || 0,
      rotY:        data.rotY        || 0,
    };
    onlinePlayers.set(socket.id, player);

    // Send current players list to the joining player
    socket.emit('world:players', Array.from(onlinePlayers.values()));

    // Broadcast new player to everyone else
    socket.broadcast.emit('world:playerJoined', player);
    logger.info(`[WS] ${player.displayName} (${player.wallet}) joined world`);
  });

  // Player moves
  socket.on('world:move', (data) => {
    const player = onlinePlayers.get(socket.id);
    if (!player) return;
    player.x    = data.x    ?? player.x;
    player.z    = data.z    ?? player.z;
    player.rotY = data.rotY ?? player.rotY;
    onlinePlayers.set(socket.id, player);
    // Broadcast to all except sender
    socket.broadcast.emit('world:playerMoved', { socketId: socket.id, x: player.x, z: player.z, rotY: player.rotY });
  });

  // Player updates avatar
  socket.on('world:updateAvatar', (data) => {
    const player = onlinePlayers.get(socket.id);
    if (!player) return;

    const updatedAt = data.updatedAt || Date.now();
    if (player.updatedAt && updatedAt < player.updatedAt) {
      logger.warn(`[WS] stale worlds:updateAvatar ignored`, { socketId: socket.id, wallet: player.wallet, updatedAt, playerUpdatedAt: player.updatedAt });
      return;
    }

    logger.info('[WS] updateAvatar request', { socketId: socket.id, data });
    player.displayName = data.displayName ?? player.displayName;
    player.color       = data.color       ?? player.color;
    player.updatedAt   = updatedAt;
    onlinePlayers.set(socket.id, player);

    // Broadcast updated player data to all clients
    io.emit('world:playerUpdated', {
      socketId:    socket.id,
      wallet:      player.wallet,
      displayName: player.displayName,
      color:       player.color,
      updatedAt:   player.updatedAt,
    });
    logger.info(`[WS] ${player.displayName} updated avatar`);
  });

  // World chat message
  socket.on('world:chat', (data) => {
    const player = onlinePlayers.get(socket.id);
    if (!player) return;
    const msg = {
      wallet:      player.wallet,
      displayName: player.displayName,
      color:       player.color,
      text:        String(data.text || '').slice(0, 200),
      ts:          Date.now(),
    };
    io.emit('world:chatMessage', msg);   // broadcast to ALL including sender
  });

  // Parcel interaction (hover/click broadcast)
  socket.on('world:parcelAction', (data) => {
    const player = onlinePlayers.get(socket.id);
    if (!player) return;
    socket.broadcast.emit('world:parcelAction', { ...data, wallet: player.wallet });
  });

  // Disconnect
  socket.on('disconnect', () => {
    const player = onlinePlayers.get(socket.id);
    onlinePlayers.delete(socket.id);
    if (player) {
      io.emit('world:playerLeft', { socketId: socket.id, wallet: player.wallet });
      logger.info(`[WS] ${player.displayName} left world`);
    }
  });
});

// Expose online count via REST
app.get('/api/world/online-count', (_, res) => {
  res.json({ success: true, data: { count: onlinePlayers.size } });
});

// ── Express middleware ─────────────────────────────────────────────────────────
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: originFn, methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization','x-wallet-address'], credentials: true }));

const limiter = rateLimit({ windowMs: 900000, max: 200, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many requests' } });
app.use('/api', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: m => logger.info(m.trim()) } }));

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'MetaChain API', ws: 'Socket.io active', online: onlinePlayers.size }));

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use('/api/nfts',        nftRoutes);
app.use('/api/wallet',      walletRoutes);
app.use('/api/chains',      chainRoutes);
app.use('/api/dashboard',   dashboardRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/world',       worldRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────────────────────────
async function start() {
  await testConnection();
  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`MetaChain API + Socket.io on http://localhost:${PORT}`);
    logger.info(`Environment : ${process.env.NODE_ENV}`);
    logger.info(`WebSocket   : ws://localhost:${PORT}`);
  });
}

start();
