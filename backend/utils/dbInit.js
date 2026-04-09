/**
 * Run: node utils/dbInit.js
 * FIXED: All const declarations are hoisted ABOVE init() call
 */
require('dotenv').config();
const { pool } = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA — all tables
// ─────────────────────────────────────────────────────────────────────────────
const SCHEMA = `
CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'metachain_db'}\`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`${process.env.DB_NAME || 'metachain_db'}\`;

CREATE TABLE IF NOT EXISTS users (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  address       VARCHAR(42)  NOT NULL UNIQUE,
  ens_name      VARCHAR(255),
  avatar_url    TEXT,
  bio           TEXT,
  total_volume  DECIMAL(36,18) DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_address (address)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS nfts (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  token_id        VARCHAR(78)  NOT NULL,
  contract_address VARCHAR(42) NOT NULL,
  chain_id        INT          NOT NULL DEFAULT 1,
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  image_url       TEXT,
  animation_url   TEXT,
  external_url    TEXT,
  owner_address   VARCHAR(42),
  creator_address VARCHAR(42),
  rarity          ENUM('Common','Rare','Epic','Legendary') DEFAULT 'Common',
  category        VARCHAR(64),
  price_eth       DECIMAL(36,18),
  price_usd       DECIMAL(18,2),
  is_listed       TINYINT(1)   DEFAULT 0,
  likes_count     INT UNSIGNED DEFAULT 0,
  views_count     INT UNSIGNED DEFAULT 0,
  metadata        JSON,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_nft (token_id, contract_address, chain_id),
  INDEX idx_owner   (owner_address),
  INDEX idx_listed  (is_listed),
  INDEX idx_chain   (chain_id),
  INDEX idx_rarity  (rarity),
  INDEX idx_category (category)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transactions (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tx_hash         VARCHAR(66)  NOT NULL UNIQUE,
  chain_id        INT          NOT NULL DEFAULT 1,
  from_address    VARCHAR(42)  NOT NULL,
  to_address      VARCHAR(42),
  nft_id          BIGINT UNSIGNED,
  tx_type         ENUM('Buy','Sell','Transfer','Mint','Stake','Unstake','Bridge','Swap') NOT NULL,
  amount_eth      DECIMAL(36,18),
  amount_usd      DECIMAL(18,2),
  gas_used        BIGINT UNSIGNED,
  gas_price_gwei  DECIMAL(20,9),
  status          ENUM('Pending','Confirmed','Failed') DEFAULT 'Pending',
  block_number    BIGINT UNSIGNED,
  tx_timestamp    TIMESTAMP,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_from   (from_address),
  INDEX idx_hash   (tx_hash),
  INDEX idx_chain  (chain_id),
  INDEX idx_status (status),
  FOREIGN KEY (nft_id) REFERENCES nfts(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS token_balances (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  wallet_address  VARCHAR(42)  NOT NULL,
  chain_id        INT          NOT NULL DEFAULT 1,
  token_address   VARCHAR(42),
  token_symbol    VARCHAR(20)  NOT NULL,
  token_name      VARCHAR(255) NOT NULL,
  balance         DECIMAL(36,18) DEFAULT 0,
  balance_usd     DECIMAL(18,2)  DEFAULT 0,
  logo_color      VARCHAR(20),
  price_change_24h DECIMAL(10,4),
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_balance (wallet_address, chain_id, token_symbol),
  INDEX idx_wallet (wallet_address)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS listings (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nft_id          BIGINT UNSIGNED NOT NULL,
  seller_address  VARCHAR(42)  NOT NULL,
  price_eth       DECIMAL(36,18) NOT NULL,
  price_usd       DECIMAL(18,2),
  currency        VARCHAR(20)  DEFAULT 'ETH',
  expires_at      TIMESTAMP    NULL,
  status          ENUM('Active','Sold','Cancelled','Expired') DEFAULT 'Active',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nft    (nft_id),
  INDEX idx_seller (seller_address),
  INDEX idx_status (status),
  FOREIGN KEY (nft_id) REFERENCES nfts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS chain_stats (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  chain_id        INT          NOT NULL UNIQUE,
  block_number    BIGINT UNSIGNED,
  gas_price_gwei  DECIMAL(20,4),
  tps             DECIMAL(10,2),
  native_price_usd DECIMAL(18,4),
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_chain (chain_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS world_parcels (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parcel_x      INT NOT NULL,
  parcel_z      INT NOT NULL,
  nft_id        BIGINT UNSIGNED,
  owner_address VARCHAR(42),
  parcel_name   VARCHAR(255),
  description   TEXT,
  color_hex     VARCHAR(7) DEFAULT '#1a0040',
  build_data    JSON,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_parcel (parcel_x, parcel_z),
  INDEX idx_owner (owner_address),
  FOREIGN KEY (nft_id) REFERENCES nfts(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS world_objects (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parcel_id     BIGINT UNSIGNED NOT NULL,
  owner_address VARCHAR(42) NOT NULL,
  object_type   ENUM('building','tree','sign','portal','art','structure') DEFAULT 'building',
  object_model  VARCHAR(255),
  pos_x         DECIMAL(10,4) DEFAULT 0,
  pos_y         DECIMAL(10,4) DEFAULT 0,
  pos_z         DECIMAL(10,4) DEFAULT 0,
  rot_y         DECIMAL(10,4) DEFAULT 0,
  scale         DECIMAL(10,4) DEFAULT 1,
  metadata      JSON,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_parcel (parcel_id),
  FOREIGN KEY (parcel_id) REFERENCES world_parcels(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS avatar_configs (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  wallet_address  VARCHAR(42) NOT NULL UNIQUE,
  rpm_url         TEXT,
  display_name    VARCHAR(64),
  color_primary   VARCHAR(7) DEFAULT '#00f5ff',
  color_secondary VARCHAR(7) DEFAULT '#bf00ff',
  equipped_nfts   JSON,
  last_pos_x      DECIMAL(10,4) DEFAULT 0,
  last_pos_z      DECIMAL(10,4) DEFAULT 0,
  last_seen       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_wallet (wallet_address)
) ENGINE=InnoDB;
`;

// ─────────────────────────────────────────────────────────────────────────────
// SEED — all demo data
// ─────────────────────────────────────────────────────────────────────────────
const SEED = `
USE \`${process.env.DB_NAME || 'metachain_db'}\`;

INSERT IGNORE INTO nfts
  (token_id,contract_address,chain_id,name,description,image_url,owner_address,creator_address,rarity,category,price_eth,price_usd,is_listed,likes_count,views_count)
VALUES
  ('1','0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13d',1,'Void Walker #001','A legendary void entity',
   'https://api.dicebear.com/9.x/bottts/svg?seed=VoidWalker001&backgroundColor=0d0d2b',
   '0x4F3a819b2c7D9E3f8a1B2C3D4E5F6A7B8C9D0E1F','0xArtist1111111111111111111111111111111111','Legendary','Avatar',4.20,12480,1,2400,18000),
  ('2','0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13d',1,'Neon District #77','Prime metaverse land parcel',
   'https://picsum.photos/seed/NeonDistrict77/400/300',
   '0x4F3a819b2c7D9E3f8a1B2C3D4E5F6A7B8C9D0E1F','0xArtist2222222222222222222222222222222222','Epic','Land',1.85,5500,1,987,7200),
  ('3','0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13d',1,'Quantum Ship X9','Hyper-drive enabled spacecraft',
   'https://api.dicebear.com/9.x/bottts/svg?seed=QuantumShipX9&backgroundColor=001a1a',
   '0x5A4b929c8e0F4a0g9b2C3D4E5F6A7B8C9D0E2G2G','0xArtist3333333333333333333333333333333333','Rare','Vehicle',0.92,2730,1,543,4100),
  ('4','0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13d',1,'Genesis Blade #12','Ancient forged quantum sword',
   'https://api.dicebear.com/9.x/shapes/svg?seed=GenesisBlade12&backgroundColor=1a0000',
   '0x5A4b929c8e0F4a0g9b2C3D4E5F6A7B8C9D0E2G2G','0xArtist4444444444444444444444444444444444','Epic','Weapon',2.55,7565,1,1200,9800),
  ('5','0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13d',137,'Nebula Crown','Rare metaverse wearable',
   'https://api.dicebear.com/9.x/shapes/svg?seed=NebulaCrown&backgroundColor=0d001a',
   '0x4F3a819b2c7D9E3f8a1B2C3D4E5F6A7B8C9D0E1F','0xArtist5555555555555555555555555555555555','Rare','Wearable',0.48,1424,1,321,2800),
  ('6','0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13d',137,'Cyber Realm #42','Virtual city district',
   'https://picsum.photos/seed/CyberRealm42/400/300',
   '0x6B5c030d9f1G5b1h0c3D4E5F6A7B8C9D0E3H3H','0xArtist6666666666666666666666666666666666','Epic','Land',3.10,9198,1,876,6500),
  ('7','0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13d',42161,'Phantom Mech Z4','Advanced robotic avatar',
   'https://api.dicebear.com/9.x/bottts/svg?seed=PhantomMechZ4&backgroundColor=1a1a00',
   '0x4F3a819b2c7D9E3f8a1B2C3D4E5F6A7B8C9D0E1F','0xArtist7777777777777777777777777777777777','Rare','Avatar',1.22,3620,1,445,3200),
  ('8','0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13d',42161,'Soul Fragment #09','Ethereal art piece',
   'https://api.dicebear.com/9.x/identicon/svg?seed=SoulFragment09&backgroundColor=001a1a',
   '0x7C6d141e0g2H6c2i1d4E5F6A7B8C9D0E4I4I','0xArtist8888888888888888888888888888888888','Common','Art',0.75,2225,1,199,1800),
  ('9','0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13d',10,'Shadow Relic #33','Ancient shadow entity relic',
   'https://api.dicebear.com/9.x/bottts/svg?seed=ShadowRelic33&backgroundColor=0a0010',
   '0xArtist9999999999999999999999999999999999','0xArtist9999999999999999999999999999999999','Epic','Art',1.60,4748,1,730,5400),
  ('10','0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13d',1,'Cyber Fox #88','Hyper-evolved cyber fox avatar',
   'https://api.dicebear.com/9.x/bottts/svg?seed=CyberFox88&backgroundColor=001a0d',
   '0xArtistAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA','0xArtistAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA','Legendary','Avatar',6.50,19278,1,3100,22000),
  ('11','0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13d',137,'Storm Blade #05','Lightning-infused plasma sword',
   'https://api.dicebear.com/9.x/shapes/svg?seed=StormBlade05&backgroundColor=000d1a',
   '0xArtistBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB','0xArtistBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB','Rare','Weapon',0.88,2610,1,410,3100),
  ('12','0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13d',42161,'Pixel Land #99','8-bit retro metaverse district',
   'https://picsum.photos/seed/PixelLand99/400/300',
   '0xArtistCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC','0xArtistCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC','Epic','Land',2.10,6230,1,940,7800),
  ('13','0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13d',8453,'Aurora Helm','Borealis-powered helm wearable',
   'https://api.dicebear.com/9.x/shapes/svg?seed=AuroraHelm&backgroundColor=001a2e',
   '0xArtistDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD','0xArtistDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD','Rare','Wearable',0.55,1630,1,288,2100),
  ('14','0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13d',1,'Iron Titan #04','Battle-hardened titan mech',
   'https://api.dicebear.com/9.x/bottts/svg?seed=IronTitan04&backgroundColor=1a1000',
   '0xArtistEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE','0xArtistEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE','Legendary','Vehicle',5.80,17196,1,2680,19500),
  ('15','0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13d',137,'Zen Garden #21','Peaceful metaverse garden',
   'https://picsum.photos/seed/ZenGarden21/400/300',
   '0xArtistFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF','0xArtistFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF','Common','Land',0.32,949,1,155,1200),
  ('16','0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13d',10,'Neon Kitsune','Nine-tailed neon fox avatar',
   'https://api.dicebear.com/9.x/bottts/svg?seed=NeonKitsune&backgroundColor=1a0010',
   '0xArtist0000000000000000000000000000000000','0xArtist0000000000000000000000000000000000','Epic','Avatar',2.90,8601,1,1450,11200);

-- Fix any old fake image URLs
UPDATE nfts SET image_url='https://api.dicebear.com/9.x/bottts/svg?seed=VoidWalker001&backgroundColor=0d0d2b'   WHERE token_id='1'  AND image_url LIKE '%api.metachain.io%';
UPDATE nfts SET image_url='https://picsum.photos/seed/NeonDistrict77/400/300'                                    WHERE token_id='2'  AND image_url LIKE '%api.metachain.io%';
UPDATE nfts SET image_url='https://api.dicebear.com/9.x/bottts/svg?seed=QuantumShipX9&backgroundColor=001a1a'   WHERE token_id='3'  AND image_url LIKE '%api.metachain.io%';
UPDATE nfts SET image_url='https://api.dicebear.com/9.x/shapes/svg?seed=GenesisBlade12&backgroundColor=1a0000'  WHERE token_id='4'  AND image_url LIKE '%api.metachain.io%';
UPDATE nfts SET image_url='https://api.dicebear.com/9.x/shapes/svg?seed=NebulaCrown&backgroundColor=0d001a'     WHERE token_id='5'  AND image_url LIKE '%api.metachain.io%';
UPDATE nfts SET image_url='https://picsum.photos/seed/CyberRealm42/400/300'                                      WHERE token_id='6'  AND image_url LIKE '%api.metachain.io%';
UPDATE nfts SET image_url='https://api.dicebear.com/9.x/bottts/svg?seed=PhantomMechZ4&backgroundColor=1a1a00'   WHERE token_id='7'  AND image_url LIKE '%api.metachain.io%';
UPDATE nfts SET image_url='https://api.dicebear.com/9.x/identicon/svg?seed=SoulFragment09&backgroundColor=001a1a' WHERE token_id='8' AND image_url LIKE '%api.metachain.io%';

-- Auto-create Active listings for every is_listed NFT that has none yet
INSERT IGNORE INTO listings (nft_id, seller_address, price_eth, price_usd, currency, status)
SELECT id, owner_address, price_eth, price_usd, 'ETH', 'Active'
FROM   nfts
WHERE  is_listed = 1
  AND  id NOT IN (SELECT nft_id FROM listings WHERE status = 'Active');

-- Token balances
INSERT IGNORE INTO token_balances (wallet_address,chain_id,token_symbol,token_name,balance,balance_usd,logo_color,price_change_24h) VALUES
  ('0x4F3a819b2c7D9E3f8a1B2C3D4E5F6A7B8C9D0E1F',1,  'ETH',   'Ethereum',   3.284, 9740,'#627EEA', 4.2),
  ('0x4F3a819b2c7D9E3f8a1B2C3D4E5F6A7B8C9D0E1F',1,  'MCHAIN','MetaChain',  12500, 4280,'#00F5FF', 8.1),
  ('0x4F3a819b2c7D9E3f8a1B2C3D4E5F6A7B8C9D0E1F',137,'MATIC', 'Polygon',    5220,  4280,'#8247E5',-2.3),
  ('0x4F3a819b2c7D9E3f8a1B2C3D4E5F6A7B8C9D0E1F',1,  'USDC',  'USD Coin',   2000,  2000,'#2775CA', 0),
  ('0x4F3a819b2c7D9E3f8a1B2C3D4E5F6A7B8C9D0E1F',1,  'WBTC',  'Wrapped BTC',0.012, 806, '#FFD700', 5.4);

-- Transactions
INSERT IGNORE INTO transactions (tx_hash,chain_id,from_address,to_address,tx_type,amount_eth,amount_usd,status,block_number,tx_timestamp) VALUES
  ('0x3F2a91Bc4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F90',1,'0x4F3a819b2c7D9E3f8a1B2C3D4E5F6A7B8C9D0E1F','0xMarket111',  'Buy',     4.20,12480,'Confirmed',19847100,'2025-01-15 10:30:00'),
  ('0xA87c04De5E6F7A8B9C0D1E2F3A4B5C6D7E8F9001',1,'0x4F3a819b2c7D9E3f8a1B2C3D4E5F6A7B8C9D0E1F','0xMarket111',  'Sell',    1.85,5500,'Confirmed',19847080, '2025-01-15 09:15:00'),
  ('0x5B1d78Fa6F7A8B9C0D1E2F3A4B5C6D7E8F900123',1,'0x4F3a819b2c7D9E3f8a1B2C3D4E5F6A7B8C9D0E1F','0xReceiver22','Transfer',NULL,NULL,'Confirmed',19847050,'2025-01-15 08:00:00'),
  ('0x9C4e23Gb7A8B9C0D1E2F3A4B5C6D7E8F90012345',1,'0x4F3a819b2c7D9E3f8a1B2C3D4E5F6A7B8C9D0E1F','0xStake3333', 'Stake',   NULL,NULL,'Pending',  19847200,'2025-01-15 11:00:00'),
  ('0x1D7f56Hc8B9C0D1E2F3A4B5C6D7E8F9001234567',1,'0x4F3a819b2c7D9E3f8a1B2C3D4E5F6A7B8C9D0E1F','0xNFTContract','Mint',   0.08,237,'Confirmed',19847000,'2025-01-15 07:00:00'),
  ('0x6E2g89Id9C0D1E2F3A4B5C6D7E8F900123456789',1,'0x4F3a819b2c7D9E3f8a1B2C3D4E5F6A7B8C9D0E1F','0xMarket111', 'Buy',     0.48,1424,'Failed',   19846900,'2025-01-15 05:00:00');

-- Chain stats
INSERT IGNORE INTO chain_stats (chain_id,block_number,gas_price_gwei,tps,native_price_usd) VALUES
  (1,19847320,18.5,15.2,2968.40),(137,55234120,35.2,180.5,0.82),
  (42161,198234120,0.12,4200.0,2968.40),(10,115234120,0.001,2100.0,2968.40),
  (8453,12234120,0.002,1500.0,2968.40);

-- World parcels (9x9 grid = -4 to +4)
INSERT IGNORE INTO world_parcels (parcel_x,parcel_z,owner_address,parcel_name,color_hex) VALUES
(-4,-4,'0x4F3a819b2c7D9E3f8a1B2C3D4E5F6A7B8C9D0E1F','Void Plaza','#1a0040'),
(-3,-4,'0x4F3a819b2c7D9E3f8a1B2C3D4E5F6A7B8C9D0E1F','Neon District','#003366'),
(-2,-4,NULL,'Untitled Parcel','#0a0a0a'),(-1,-4,NULL,'Untitled Parcel','#0a0a0a'),
(0,-4,NULL,'Genesis Square','#0a0a0a'),(1,-4,NULL,'Untitled Parcel','#0a0a0a'),
(2,-4,NULL,'Untitled Parcel','#0a0a0a'),
(3,-4,'0x5A4b929c8e0F4a0g9b2C3D4E5F6A7B8C9D0E2G2G','Quantum Hub','#001a33'),
(4,-4,NULL,'Untitled Parcel','#0a0a0a'),
(-4,-3,'0x4F3a819b2c7D9E3f8a1B2C3D4E5F6A7B8C9D0E1F','Cyber Realm','#0d001a'),
(-3,-3,NULL,'Untitled Parcel','#0a0a0a'),(-2,-3,NULL,'Untitled Parcel','#0a0a0a'),
(-1,-3,NULL,'Market District','#0a0a0a'),(0,-3,NULL,'Untitled Parcel','#0a0a0a'),
(1,-3,NULL,'Untitled Parcel','#0a0a0a'),
(2,-3,'0x6B5c030d9f1G5b1h0c3D4E5F6A7B8C9D0E3H3H','Tech Quarter','#001a1a'),
(3,-3,NULL,'Untitled Parcel','#0a0a0a'),(4,-3,NULL,'Untitled Parcel','#0a0a0a'),
(-4,-2,NULL,'Untitled Parcel','#0a0a0a'),(-3,-2,NULL,'Untitled Parcel','#0a0a0a'),
(-2,-2,'0x4F3a819b2c7D9E3f8a1B2C3D4E5F6A7B8C9D0E1F','Art Gallery','#1a0000'),
(-1,-2,NULL,'Untitled Parcel','#0a0a0a'),(0,-2,NULL,'Central Park','#003300'),
(1,-2,NULL,'Untitled Parcel','#0a0a0a'),(2,-2,NULL,'Untitled Parcel','#0a0a0a'),
(3,-2,NULL,'Untitled Parcel','#0a0a0a'),(4,-2,NULL,'Untitled Parcel','#0a0a0a'),
(-4,-1,NULL,'Untitled Parcel','#0a0a0a'),(-3,-1,NULL,'Untitled Parcel','#0a0a0a'),
(-2,-1,NULL,'Untitled Parcel','#0a0a0a'),(-1,-1,NULL,'Plaza West','#0a0a0a'),
(0,-1,NULL,'Main Plaza','#1a1a00'),(1,-1,NULL,'Plaza East','#0a0a0a'),
(2,-1,NULL,'Untitled Parcel','#0a0a0a'),(3,-1,NULL,'Untitled Parcel','#0a0a0a'),
(4,-1,NULL,'Untitled Parcel','#0a0a0a'),
(-4,0,NULL,'Untitled Parcel','#0a0a0a'),(-3,0,NULL,'Untitled Parcel','#0a0a0a'),
(-2,0,NULL,'Untitled Parcel','#0a0a0a'),(-1,0,NULL,'Untitled Parcel','#0a0a0a'),
(0,0,NULL,'Origin','#002200'),(1,0,NULL,'Untitled Parcel','#0a0a0a'),
(2,0,NULL,'Untitled Parcel','#0a0a0a'),(3,0,NULL,'Untitled Parcel','#0a0a0a'),
(4,0,NULL,'Untitled Parcel','#0a0a0a'),
(-4,1,NULL,'Untitled Parcel','#0a0a0a'),(-3,1,NULL,'Untitled Parcel','#0a0a0a'),
(-2,1,NULL,'Untitled Parcel','#0a0a0a'),(-1,1,NULL,'Untitled Parcel','#0a0a0a'),
(0,1,NULL,'South Market','#0a0a0a'),(1,1,NULL,'Untitled Parcel','#0a0a0a'),
(2,1,NULL,'Untitled Parcel','#0a0a0a'),(3,1,NULL,'Untitled Parcel','#0a0a0a'),
(4,1,NULL,'Untitled Parcel','#0a0a0a'),
(-4,2,NULL,'Untitled Parcel','#0a0a0a'),(-3,2,NULL,'Untitled Parcel','#0a0a0a'),
(-2,2,NULL,'Untitled Parcel','#0a0a0a'),(-1,2,NULL,'Untitled Parcel','#0a0a0a'),
(0,2,NULL,'Untitled Parcel','#0a0a0a'),(1,2,NULL,'Untitled Parcel','#0a0a0a'),
(2,2,'0xArtistAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA','Cyber Fox Den','#001a0d'),
(3,2,NULL,'Untitled Parcel','#0a0a0a'),(4,2,NULL,'Untitled Parcel','#0a0a0a'),
(-4,3,NULL,'Untitled Parcel','#0a0a0a'),(-3,3,NULL,'Untitled Parcel','#0a0a0a'),
(-2,3,NULL,'Untitled Parcel','#0a0a0a'),(-1,3,NULL,'Untitled Parcel','#0a0a0a'),
(0,3,NULL,'Untitled Parcel','#0a0a0a'),(1,3,NULL,'Untitled Parcel','#0a0a0a'),
(2,3,NULL,'Untitled Parcel','#0a0a0a'),(3,3,NULL,'Untitled Parcel','#0a0a0a'),
(4,3,NULL,'Untitled Parcel','#0a0a0a'),
(-4,4,NULL,'Untitled Parcel','#0a0a0a'),(-3,4,NULL,'Untitled Parcel','#0a0a0a'),
(-2,4,NULL,'Untitled Parcel','#0a0a0a'),(-1,4,NULL,'Untitled Parcel','#0a0a0a'),
(0,4,NULL,'South Gate','#0a0a0a'),(1,4,NULL,'Untitled Parcel','#0a0a0a'),
(2,4,NULL,'Untitled Parcel','#0a0a0a'),(3,4,NULL,'Untitled Parcel','#0a0a0a'),
(4,4,NULL,'Untitled Parcel','#0a0a0a');
`;

// ─────────────────────────────────────────────────────────────────────────────
// INIT — runs all statements in order
// ─────────────────────────────────────────────────────────────────────────────
async function init() {
  const conn = await pool.getConnection();
  try {
    console.log('🚀 Initialising MetaChain database...');

    const run = async (sql, label) => {
      const stmts = sql.split(';').map(s => s.trim()).filter(Boolean);
      let ok = 0;
      for (const stmt of stmts) {
        try { await conn.query(stmt); ok++; }
        catch (e) {
          // Ignore duplicate-key / already-exists errors
          if (![1050,1061,1062,1068].includes(e.errno)) {
            console.warn(`  ⚠  [${label}] ${e.message.slice(0,80)}`);
          }
        }
      }
      console.log(`  ✅  ${label}: ${ok}/${stmts.length} statements OK`);
    };

    await run(SCHEMA, 'Schema');
    await run(SEED,   'Seed');
    console.log('✅  Database ready!');
  } finally {
    conn.release();
    process.exit(0);
  }
}

init();
