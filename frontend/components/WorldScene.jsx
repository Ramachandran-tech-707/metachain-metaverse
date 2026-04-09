'use client';
import { useEffect, useRef } from 'react';
import styles from './WorldScene.module.css';

// ─── Performance constants ───────────────────────────────────────────────────
const PARCEL_SIZE = 10;
const PARCEL_GAP = 2.5;
const CELL = PARCEL_SIZE + PARCEL_GAP;
const MOVE_SPEED = 22;   // fast, responsive
const TURN_SPEED = 2.8;
const CAM_DIST = 18;
const CAM_HEIGHT = 13;
const CAM_LERP = 0.14; // smooth camera lag

export default function WorldScene({
  parcels = [],
  players = [],
  myColor = '#00f5ff',
  myDisplayName = 'You',
  currentWallet = '',
  onParcelClick,
  onPositionChange,
  assetLoader,
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const clockRef = useRef(null);
  const keysRef = useRef({});
  const playerMeshRef = useRef(null);
  const parcelMeshMap = useRef(new Map());
  const otherPlayerMap = useRef(new Map());
  const posRef = useRef({ x: 0, z: 0, rotY: 0 });
  const composerRef = useRef(null);
  const animRef = useRef([]); // lightweight animatables list

  const myColorRef = useRef(myColor);
  const walletRef = useRef(currentWallet);
  useEffect(() => { myColorRef.current = myColor; }, [myColor]);
  useEffect(() => { walletRef.current = currentWallet; }, [currentWallet]);

  // ── colour helpers ──────────────────────────────────────────────────────
  const safeHex = (h, fb = '#00bcd4') => {
    if (!h || typeof h !== 'string') return fb;
    const c = h.trim().replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(c)) return fb;
    const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
    if (0.299 * r + 0.587 * g + 0.114 * b < 28) return '#' + [r + 80, g + 80, b + 150].map(v => Math.min(255, v).toString(16).padStart(2, '0')).join('');
    return `#${c}`;
  };
  const hi = (s, fb = 0x00bcd4) => { try { return parseInt(safeHex(s).replace('#', ''), 16); } catch { return fb; } };

  // ════════════════════════════════════════════════════════════════════════
  // SKY — layered night sky matching reference image 2
  // ════════════════════════════════════════════════════════════════════════
  function buildSky(T, scene) {
    // Deep gradient sphere: near-black zenith → deep navy → muted teal at horizon
    const geo = new T.SphereGeometry(900, 32, 18);
    const pos = geo.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    const zenith = new T.Color(0x010209);
    const upper = new T.Color(0x040d1e);
    const midSky = new T.Color(0x061828);
    const horizon = new T.Color(0x091f35);
    for (let i = 0; i < pos.count; i++) {
      const t = Math.max(0, Math.min(1, (pos.getY(i) + 900) / 1800));
      let col;
      if (t > 0.65) col = new T.Color().lerpColors(upper, zenith, (t - 0.65) / 0.35);
      else if (t > 0.3) col = new T.Color().lerpColors(midSky, upper, (t - 0.3) / 0.35);
      else col = new T.Color().lerpColors(horizon, midSky, t / 0.3);
      cols[i * 3] = col.r; cols[i * 3 + 1] = col.g; cols[i * 3 + 2] = col.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(cols, 3));
    scene.add(new T.Mesh(geo, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, depthWrite: false })));

    // Moon — soft white sphere
    const moon = new T.Mesh(new T.SphereGeometry(8, 16, 16), new T.MeshBasicMaterial({ color: 0xddeeff }));
    moon.position.set(300, 280, -700); scene.add(moon);
    const moonGlow = new T.Mesh(new T.SphereGeometry(14, 16, 16), new T.MeshBasicMaterial({ color: 0x8899bb, transparent: true, opacity: 0.15, depthWrite: false }));
    moonGlow.position.copy(moon.position); scene.add(moonGlow);

    // Horizon atmospheric glow (city light pollution)
    const hazeGeo = new T.CylinderGeometry(880, 880, 120, 48, 1, true);
    const hazeMat = new T.MeshBasicMaterial({ color: 0x0a2040, transparent: true, opacity: 0.28, side: T.BackSide, depthWrite: false, blending: T.AdditiveBlending });
    const haze = new T.Mesh(hazeGeo, hazeMat); haze.position.y = -80; scene.add(haze);

    // Stars — Points (single draw call)
    const N = 5000, sPos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI * 0.5, r = 820;
      sPos[i * 3] = r * Math.sin(ph) * Math.cos(th); sPos[i * 3 + 1] = r * Math.cos(ph) + 100; sPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const sGeo = new T.BufferGeometry(); sGeo.setAttribute('position', new T.BufferAttribute(sPos, 3));
    const stars = new T.Points(sGeo, new T.PointsMaterial({ color: 0xffffff, size: 0.85, sizeAttenuation: true, transparent: true, opacity: 0.8 }));
    scene.add(stars);
    animRef.current.push({ type: 'stars', obj: stars });
  }

  // ════════════════════════════════════════════════════════════════════════
  // TERRAIN — vertex-coloured ground with road network (like ref image 2/5)
  // ════════════════════════════════════════════════════════════════════════
  function buildTerrain(T, scene) {
    // === BASE GROUND with vertex colour variation ===
    const gSize = 1600, gSeg = 80;
    const gGeo = new T.PlaneGeometry(gSize, gSize, gSeg, gSeg);
    const gPos = gGeo.attributes.position;
    const gCols = new Float32Array(gPos.count * 3);
    const dark = new T.Color(0x050810), med = new T.Color(0x070c14), light = new T.Color(0x0a1020);
    for (let i = 0; i < gPos.count; i++) {
      const x = gPos.getX(i), z = gPos.getZ(i);
      // Procedural variation using sine
      const n = (Math.sin(x * 0.04) * Math.cos(z * 0.04) + Math.sin(x * 0.09 + z * 0.07)) * 0.5 + 0.5;
      const col = new T.Color().lerpColors(dark, n < 0.5 ? med : light, n);
      gCols[i * 3] = col.r; gCols[i * 3 + 1] = col.g; gCols[i * 3 + 2] = col.b;
    }
    gGeo.setAttribute('color', new T.BufferAttribute(gCols, 3));
    const ground = new T.Mesh(gGeo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.08 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

    // === ROAD NETWORK — matching reference image 2 style ===
    buildRoadNetwork(T, scene);
  }

  function buildRoadNetwork(T, scene) {
    const asphalt = new T.MeshStandardMaterial({ color: 0x050810, roughness: 0.9, metalness: 0.05 });

    // Wide main boulevard (X axis)
    const mainX = new T.Mesh(new T.PlaneGeometry(800, 12), asphalt.clone()); mainX.rotation.x = -Math.PI / 2; mainX.position.set(0, 0.03, 0); mainX.receiveShadow = true; scene.add(mainX);
    // Wide main boulevard (Z axis)
    const mainZ = new T.Mesh(new T.PlaneGeometry(12, 800), asphalt.clone()); mainZ.rotation.x = -Math.PI / 2; mainZ.position.set(0, 0.03, 0); mainZ.receiveShadow = true; scene.add(mainZ);

    // Secondary streets between parcel blocks
    for (let lane = -6; lane <= 6; lane++) {
      if (lane === 0) continue;
      const sx = new T.Mesh(new T.PlaneGeometry(800, 6.5), asphalt.clone()); sx.rotation.x = -Math.PI / 2; sx.position.set(0, 0.02, lane * CELL * 2); scene.add(sx);
      const sz = new T.Mesh(new T.PlaneGeometry(6.5, 800), asphalt.clone()); sz.rotation.x = -Math.PI / 2; sz.position.set(lane * CELL * 2, 0.02, 0); scene.add(sz);
    }

    // === ROAD MARKINGS ===
    // Cyan lane lines — main roads
    const cM = new T.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 3.2 });
    [-5.2, 5.2].forEach(off => {
      const lx = new T.Mesh(new T.PlaneGeometry(800, 0.12), cM.clone()); lx.rotation.x = -Math.PI / 2; lx.position.set(0, 0.06, off); scene.add(lx);
      const lz = new T.Mesh(new T.PlaneGeometry(0.12, 800), cM.clone()); lz.rotation.x = -Math.PI / 2; lz.position.set(off, 0.06, 0); scene.add(lz);
    });
    // Track/rail lines (reference image 2 style) — subtle parallel lines
    const trackM = new T.MeshStandardMaterial({ color: 0x1a2a3a, roughness: 0.6, metalness: 0.8 });
    [-1.8, 0, 1.8].forEach(off => {
      const tr = new T.Mesh(new T.PlaneGeometry(800, 0.18), trackM.clone()); tr.rotation.x = -Math.PI / 2; tr.position.set(0, 0.045, off); scene.add(tr);
      const tz = new T.Mesh(new T.PlaneGeometry(0.18, 800), trackM.clone()); tz.rotation.x = -Math.PI / 2; tz.position.set(off, 0.045, 0); scene.add(tz);
    });
    // Orange centre dashes
    const dashM = new T.MeshStandardMaterial({ color: 0xff5500, emissive: 0xff5500, emissiveIntensity: 1.5 });
    for (let i = -20; i <= 20; i++) {
      const d = new T.Mesh(new T.PlaneGeometry(0.1, 2.5), dashM.clone()); d.rotation.x = -Math.PI / 2; d.position.set(0, 0.07, i * 6); scene.add(d);
      const d2 = new T.Mesh(new T.PlaneGeometry(2.5, 0.1), dashM.clone()); d2.rotation.x = -Math.PI / 2; d2.position.set(i * 6, 0.07, 0); scene.add(d2);
    }

    // === RAISED SIDEWALKS ===
    const swM = new T.MeshStandardMaterial({ color: 0x0b1018, roughness: 0.85, metalness: 0.1 });
    for (let i = -8; i <= 8; i++) {
      const sw1 = new T.Mesh(new T.BoxGeometry(CELL - 0.4, 0.14, 2.0), swM.clone()); sw1.position.set(i * CELL, 0.07, 6.8); scene.add(sw1);
      const sw2 = new T.Mesh(new T.BoxGeometry(CELL - 0.4, 0.14, 2.0), swM.clone()); sw2.position.set(i * CELL, 0.07, -6.8); scene.add(sw2);
      const sw3 = new T.Mesh(new T.BoxGeometry(2.0, 0.14, CELL - 0.4), swM.clone()); sw3.position.set(6.8, 0.07, i * CELL); scene.add(sw3);
      const sw4 = new T.Mesh(new T.BoxGeometry(2.0, 0.14, CELL - 0.4), swM.clone()); sw4.position.set(-6.8, 0.07, i * CELL); scene.add(sw4);
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // CITY — high-quality buildings like reference image 2
  // Uses INSTANCED geometry for performance (single draw call per type)
  // ════════════════════════════════════════════════════════════════════════
  function buildCity(T, scene) {
    const neons = [0x00e5ff, 0xbf00ff, 0xff1a6b, 0x00ff88, 0xff5500, 0xffcc00, 0x0088ff, 0xee00ff, 0xff0044, 0x00ffcc];
    const rng = (s, lo, hi) => lo + ((Math.abs(Math.sin(s * 127.1 + 31.41) * 43758.5453)) % 1) * (hi - lo);

    // === INSTANCED building bodies — one draw call per ring ===
    [
      { count: 40, radius: 200, hMin: 18, hMax: 55, wMin: 8, wMax: 20 },
      { count: 28, radius: 320, hMin: 30, hMax: 80, wMin: 12, wMax: 28 },
      { count: 18, radius: 460, hMin: 50, hMax: 120, wMin: 16, wMax: 35 },
    ].forEach(({ count, radius, hMin, hMax, wMin, wMax }) => {
      const dummy = new T.Object3D();
      // We'll still add individually but reuse one material per ring for batching
      const bodyMat = new T.MeshStandardMaterial({ color: 0x1a2238, roughness: 0.35, metalness: 0.6 });
      const glassMat = new T.MeshStandardMaterial({ color: 0x060b16, roughness: 0.08, metalness: 0.95, transparent: true, opacity: 0.65 });

      for (let i = 0; i < count; i++) {
        const s = i * 23 + radius;
        const ang = (i / count) * Math.PI * 2 + rng(s, 0, 0.18);
        const r = radius + rng(s + 1, -30, 30);
        const h = rng(s + 2, hMin, hMax);
        const w = rng(s + 3, wMin, wMax);
        const d = w * rng(s + 4, 0.5, 1.3);
        const neon = neons[i % neons.length];
        const cx = Math.cos(ang) * r, cz = Math.sin(ang) * r;

        buildDetailedBuilding(T, scene, cx, cz, w, h, d, neon, s, rng, bodyMat, glassMat);
      }
    });

    // === FOREGROUND buildings flanking the main boulevard ===
    // These are closer and more detailed (matches ref image 2 feel)
    [-1, 1].forEach(side => {
      for (let slot = -6; slot <= 6; slot++) {
        const s = slot * 7 + side * 100 + 42;
        const bx = (side * (CELL * 1.1 + rng(s, 0, 8)));
        const bz = slot * CELL * 2;
        const h = rng(s + 1, 12, 35), w = rng(s + 2, 8, 18), d = rng(s + 3, 8, 14);
        const neon = neons[(Math.abs(slot) + Math.abs(side) * 3) % neons.length];
        buildDetailedBuilding(T, scene, bx, bz, w, h, d, neon, s, rng,
          new T.MeshStandardMaterial({ color: 0x07090f, roughness: 0.7, metalness: 0.55 }),
          new T.MeshStandardMaterial({ color: 0x060b16, roughness: 0.08, metalness: 0.95, transparent: true, opacity: 0.65 })
        );
      }
    });

    // === STREET LAMPS — InstancedMesh for performance ===
    buildInstancedLamps(T, scene);
  }

  function buildDetailedBuilding(T, scene, cx, cz, w, h, d, neon, seed, rng, bodyMat, glassMat) {
    // Main body
    const body = new T.Mesh(new T.BoxGeometry(w, h, d), bodyMat);
    body.position.set(cx, h / 2, cz); body.castShadow = true; scene.add(body);

    // Glass facade overlay
    const glass = new T.Mesh(new T.BoxGeometry(w * 0.97, h * 0.95, d * 0.97), glassMat);
    glass.position.set(cx, h / 2, cz); scene.add(glass);

    // Window bands — only on visible sides, randomised lit floors
    const floorH = rng(seed + 5, 3.0, 4.5);
    const floors = Math.floor(h / floorH);
    const wBandMat = new T.MeshStandardMaterial({ color: neon, emissive: neon, emissiveIntensity: 1.0, transparent: true, opacity: 0.5 });
    const wDimMat = new T.MeshStandardMaterial({ color: 0x0a1a2a, emissive: 0x0a1a2a, emissiveIntensity: 0.3, transparent: true, opacity: 0.4 });

    for (let fl = 0; fl < floors; fl++) {
      const y = fl * floorH + floorH * 0.75;
      if (y > h - 1) break;
      const lit = rng(seed + fl * 11, 0, 1) > 0.3;
      const bMat = lit ? wBandMat.clone() : wDimMat.clone();
      if (lit) bMat.emissiveIntensity = 0.7 + rng(seed + fl, 0, 0.6);
      const wb = new T.Mesh(new T.BoxGeometry(w + 0.04, 0.15, d + 0.04), bMat);
      wb.position.set(cx, y, cz); scene.add(wb);
    }

    // Neon vertical edge strips (ref image 2 style)
    const edgeMat = new T.MeshStandardMaterial({ color: neon, emissive: neon, emissiveIntensity: 1.4, transparent: true, opacity: 0.55 });
    const hw = w / 2, hd = d / 2;
    if (rng(seed + 30, 0, 1) > 0.4) { // not every building has edge strips
      [[hw, hd], [-hw, hd], [hw, -hd], [-hw, -hd]].forEach(([ex, ez]) => {
        const e = new T.Mesh(new T.BoxGeometry(0.1, h, 0.1), edgeMat.clone());
        e.position.set(cx + ex, h / 2, cz + ez); scene.add(e);
      });
    }

    // Large vertical neon sign panel on some buildings (ref image 2)
    if (rng(seed + 40, 0, 1) > 0.65) {
      const signH = h * rng(seed + 41, 0.3, 0.7);
      const signMat = new T.MeshStandardMaterial({ color: neon, emissive: neon, emissiveIntensity: 2.5, transparent: true, opacity: 0.7 });
      const sign = new T.Mesh(new T.BoxGeometry(0.15, signH, w * 0.18), signMat);
      sign.position.set(cx + hw + 0.08, h / 2 - signH * 0.1, cz); scene.add(sign);
    }

    // Setbacks on tall buildings
    if (h > 50) {
      const tH = h * 0.28, tW = w * 0.65, tD = d * 0.65;
      const tier = new T.Mesh(new T.BoxGeometry(tW, tH, tD), bodyMat.clone());
      tier.position.set(cx, h * 0.72 + tH / 2, cz); tier.castShadow = true; scene.add(tier);
      // Tier window bands
      const tMat = new T.MeshStandardMaterial({ color: neon, emissive: neon, emissiveIntensity: 1.1, transparent: true, opacity: 0.5 });
      for (let fl = 0; fl < Math.floor(tH / floorH); fl++) {
        const y = h * 0.72 + fl * floorH + floorH * 0.7;
        if (rng(seed + fl * 5 + 50, 0, 1) > 0.25) {
          const tb = new T.Mesh(new T.BoxGeometry(tW + 0.04, 0.14, tD + 0.04), tMat.clone());
          tb.position.set(cx, y, cz); scene.add(tb);
        }
      }
    }

    // Rooftop: antenna OR helipad
    if (rng(seed + 20, 0, 1) > 0.45) {
      const antH = h * rng(seed + 21, 0.08, 0.2);
      const ant = new T.Mesh(new T.CylinderGeometry(0.05, 0.12, antH, 6),
        new T.MeshStandardMaterial({ color: 0x1a2535, metalness: 0.9, roughness: 0.15 }));
      ant.position.set(cx, h + antH / 2, cz); scene.add(ant);
      const beacon = new T.Mesh(new T.SphereGeometry(0.45, 8, 8),
        new T.MeshStandardMaterial({ color: neon, emissive: neon, emissiveIntensity: 6 }));
      beacon.position.set(cx, h + antH + 0.5, cz); scene.add(beacon);
      animRef.current.push({ type: 'beacon', obj: beacon, phase: Math.random() * Math.PI * 2, speed: 0.003 + Math.random() * 0.004 });
    } else {
      const heliMat = new T.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffcc00, emissiveIntensity: 1.8 });
      const heliRing = new T.Mesh(new T.TorusGeometry(w * 0.28, 0.16, 8, 32), heliMat);
      heliRing.rotation.x = -Math.PI / 2; heliRing.position.set(cx, h + 0.2, cz); scene.add(heliRing);
    }

    // ONE shared point light per building (not per-floor) — key performance fix
    if (rng(seed + 60, 0, 1) > 0.5) { // only 50% of buildings get a point light
      const pl = new T.PointLight(neon, 0.55, 55);
      pl.position.set(cx, h * 0.6, cz); scene.add(pl);
    }
  }

  function buildInstancedLamps(T, scene) {
    // Use InstancedMesh — all lamp posts in ONE draw call
    const lampPositions = [];
    for (let i = -10; i <= 10; i++) {
      if (i === 0) continue;
      [7.0, -7.0].forEach(side => {
        lampPositions.push([i * CELL, side, 0]);
        lampPositions.push([side, 0, i * CELL]);
      });
    }
    const N = lampPositions.length;
    const postGeo = new T.CylinderGeometry(0.08, 0.12, 5.5, 6);
    const postMat = new T.MeshStandardMaterial({ color: 0x1a2535, metalness: 0.88, roughness: 0.2 });
    const postInst = new T.InstancedMesh(postGeo, postMat, N);
    const dummy = new T.Object3D();
    lampPositions.forEach(([lx, , lz], i) => {
      dummy.position.set(lx, 2.75, lz); dummy.updateMatrix(); postInst.setMatrixAt(i, dummy.matrix);
    });
    postInst.instanceMatrix.needsUpdate = true;
    scene.add(postInst);

    // Bulb instances
    const bulbGeo = new T.SphereGeometry(0.28, 8, 8);
    const bulbMat = new T.MeshStandardMaterial({ color: 0xffeebb, emissive: 0xffeebb, emissiveIntensity: 2.5 });
    const bulbInst = new T.InstancedMesh(bulbGeo, bulbMat, N);
    lampPositions.forEach(([lx, , lz], i) => {
      dummy.position.set(lx, 5.6, lz); dummy.updateMatrix(); bulbInst.setMatrixAt(i, dummy.matrix);
    });
    bulbInst.instanceMatrix.needsUpdate = true;
    scene.add(bulbInst);

    // Only a few actual point lights (expensive) — every 6th lamp
    lampPositions.forEach(([lx, , lz], i) => {
      if (i % 6 === 0) {
        const pl = new T.PointLight(0xffddaa, 1.0, 24); pl.position.set(lx, 5.2, lz); scene.add(pl);
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // PARCELS
  // ════════════════════════════════════════════════════════════════════════
  function buildParcels(scene, T, data, al, wallet, myCol) {
    parcelMeshMap.current.forEach(g => scene.remove(g));
    parcelMeshMap.current.clear();
    const list = data.length > 0 ? data : genDemoGrid();
    list.forEach(parcel => {
      const owned = !!parcel.owner_address;
      const mine = owned && parcel.owner_address?.toLowerCase() === wallet?.toLowerCase();
      const px = parcel.parcel_x * CELL, pz = parcel.parcel_z * CELL;
      const g = new T.Group(); g.position.set(px, 0, pz);
      g.userData = { parcel, owned, mine, phase: Math.random() * Math.PI * 2 };

      // Platform tile
      const tileCol = owned ? (mine ? 0x0c1b38 : 0x0e0c26) : 0x060910;
      const tile = new T.Mesh(new T.BoxGeometry(PARCEL_SIZE, 0.22, PARCEL_SIZE),
        new T.MeshStandardMaterial({ color: tileCol, roughness: 0.7, metalness: 0.3 }));
      tile.position.y = 0.11; tile.receiveShadow = true; g.add(tile);

      // Border strips
      const bCol = owned ? hi(mine ? myCol : parcel.color_primary, 0x00bcd4) : 0x0d3d5c;
      const bEI = owned ? 1.6 : 0.45;
      const bM = new T.MeshStandardMaterial({ color: bCol, emissive: bCol, emissiveIntensity: bEI });
      const S = PARCEL_SIZE, bh = 0.26, bt = 0.07;
      [[S, bh, bt, 0, bh / 2, -S / 2], [S, bh, bt, 0, bh / 2, S / 2], [bt, bh, S, -S / 2, bh / 2, 0], [bt, bh, S, S / 2, bh / 2, 0]]
        .forEach(([w, h, d, x, y, z]) => {
          const brd = new T.Mesh(new T.BoxGeometry(w, h, d), bM.clone());
          brd.position.set(x, y, z); g.add(brd);
        });

      // Corner markers — small, not overbearing
      const cH = owned ? 1.2 : 0.35, half = PARCEL_SIZE / 2 - 0.14;
      [[-half, -half], [-half, half], [half, -half], [half, half]].forEach(([cx, cz]) => {
        const cm = new T.Mesh(new T.BoxGeometry(0.2, cH, 0.2),
          new T.MeshStandardMaterial({ color: bCol, emissive: bCol, emissiveIntensity: bEI * 1.4 }));
        cm.position.set(cx, cH / 2, cz); g.add(cm);
      });

      if (owned) {
        const seed = Math.abs(parcel.parcel_x * 7 + parcel.parcel_z * 13);
        const key = ['tower', 'gallery', 'shop', 'mansion'][seed % 4];
        let placed = false;
        if (al?.isModelAvailable(key)) {
          const clone = al.cloneModel(key);
          if (clone) {
            clone.rotation.y = (seed % 4) * (Math.PI / 2);
            // clone.traverse(c=>{if(c.isMesh){c.castShadow=c.receiveShadow=true;}});
            clone.traverse(c => {
              if (c.isMesh) {
                c.castShadow = true;
                c.receiveShadow = true;

                if (c.material) {
                  c.material.envMapIntensity = 1.5;
                  c.material.needsUpdate = true;
                }
              }
            });
            g.add(clone);
            placed = true;
          }
        }

        if (!placed) {
          const accent = hi(mine ? myCol : parcel.color_primary, 0x00bcd4);
          const floors = 3 + (seed % 4);
          const bldM = new T.MeshStandardMaterial({ color: 0x060810, roughness: 0.38, metalness: 0.72 });
          const glsM = new T.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.6, transparent: true, opacity: 0.62 });
          let y = 0.22;
          for (let fl = 0; fl < floors; fl++) {
            const sc = 1 - fl * 0.09, fh = 3.0 - fl * 0.12, fw = PARCEL_SIZE * 0.36 * sc;
            const box = new T.Mesh(new T.BoxGeometry(fw, fh, fw), bldM.clone()); box.position.y = y + fh / 2; box.castShadow = true; g.add(box);
            // Glass facade
            const gf = new T.Mesh(new T.BoxGeometry(fw * 0.97, fh * 0.94, fw * 0.97),
              new T.MeshStandardMaterial({ color: 0x05080f, roughness: 0.1, metalness: 0.96, transparent: true, opacity: 0.6 }));
            gf.position.y = y + fh / 2; g.add(gf);
            const gs = new T.Mesh(new T.BoxGeometry(fw + 0.06, 0.16, fw + 0.06), glsM.clone()); gs.position.y = y + fh - 0.07; g.add(gs);
            y += fh;
          }
          const ant = new T.Mesh(new T.CylinderGeometry(0.05, 0.1, 2.4, 6),
            new T.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 4 }));
          ant.position.y = y + 1.2; g.add(ant);
          const rb = new T.Mesh(new T.SphereGeometry(0.22, 8, 8),
            new T.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 7 }));
          rb.position.y = y + 2.5; g.add(rb);
          animRef.current.push({ type: 'beacon', obj: rb, phase: g.userData.phase, speed: 0.002 });
        }
        // Ownership ring
        const rC = hi(mine ? myCol : parcel.color_primary, 0x00bcd4);
        const ring = new T.Mesh(new T.TorusGeometry(PARCEL_SIZE * 0.44, 0.07, 12, 80),
          new T.MeshStandardMaterial({ color: rC, emissive: rC, emissiveIntensity: 2.0, transparent: true, opacity: 0.7 }));
        ring.rotation.x = -Math.PI / 2; ring.position.y = 0.25; g.add(ring);
      } else {
        const seed = Math.abs(parcel.parcel_x * 17 + parcel.parcel_z * 31);
        const propMap = [null, null, null, 'tree', 'tree', 'lamp', 'bench', 'fountain', null, 'tree', null, null];
        const propKey = propMap[seed % propMap.length];
        if (propKey && al?.isModelAvailable(propKey)) {
          const clone = al.cloneModel(propKey);
          if (clone) { clone.position.set((seed % 3) - 1, 0.22, (seed % 5) - 2); clone.rotation.y = (seed % 360) * (Math.PI / 180); clone.traverse(c => { if (c.isMesh) { c.castShadow = c.receiveShadow = true; } }); g.add(clone); }
        } else {
          const ph = new T.Mesh(new T.ConeGeometry(0.3, 1.6, 4),
            new T.MeshStandardMaterial({ color: 0x001520, emissive: 0x004c6e, emissiveIntensity: 0.8, wireframe: true }));
          ph.position.y = 1.0; g.add(ph);
        }
      }
      parcelMeshMap.current.set(`${parcel.parcel_x},${parcel.parcel_z}`, g);
      scene.add(g);
    });
  }

  function genDemoGrid() {
    const o = [];
    for (let x = -5; x <= 5; x++) for (let z = -5; z <= 5; z++)
      o.push({ parcel_x: x, parcel_z: z, owner_address: null, color_primary: '#00bcd4', parcel_name: `(${x},${z})` });
    return o;
  }

  // ════════════════════════════════════════════════════════════════════════
  // PLAYER AVATAR
  // ════════════════════════════════════════════════════════════════════════
  function buildPlayer(T, color, al) {
    const g = new T.Group(), col = hi(color, 0x00bcd4);
    if (al?.isModelAvailable('avatar')) {
      try { const c = al.cloneModel('avatar'); if (c) { c.traverse(ch => { if (ch.isMesh) { ch.castShadow = ch.receiveShadow = true; } }); g.add(c); return g; } } catch (_) { }
    }
    const bM = new T.MeshStandardMaterial({ color: col, roughness: 0.4, metalness: 0.6, emissive: col, emissiveIntensity: 0.35 });
    const b = new T.Mesh(T.CapsuleGeometry ? new T.CapsuleGeometry(0.42, 1.1, 4, 10) : new T.CylinderGeometry(0.42, 0.42, 1.5, 10), bM);
    b.position.y = 1.0; b.castShadow = true; g.add(b);
    const a = new T.Mesh(new T.ConeGeometry(0.18, 0.45, 6), new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8 }));
    a.rotation.x = Math.PI / 2; a.position.set(0, 1.2, -0.6); g.add(a);
    g.add(new T.Mesh(new T.SphereGeometry(0.52, 12, 12), new T.MeshStandardMaterial({ color: col, transparent: true, opacity: 0.18, emissive: col, emissiveIntensity: 0.5 })));
    return g;
  }

  // ════════════════════════════════════════════════════════════════════════
  // MAIN INIT
  // ════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!mountRef.current) return;
    let alive = true, animId, renderer;
    const container = mountRef.current;
    animRef.current = [];

    (async () => {
      const T = await import('three'); if (!alive) return;
      const { EffectComposer } = await import('three/examples/jsm/postprocessing/EffectComposer.js');
      const { RenderPass } = await import('three/examples/jsm/postprocessing/RenderPass.js');
      const { UnrealBloomPass } = await import('three/examples/jsm/postprocessing/UnrealBloomPass.js');
      if (!alive) return;

      // ── Renderer ──────────────────────────────────────────────────────
      renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // cap at 1.5x for perf
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFSoftShadowMap;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.4;
      if (T.SRGBColorSpace) renderer.outputColorSpace = T.SRGBColorSpace;
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // ── Scene ─────────────────────────────────────────────────────────
      const scene = new T.Scene(); sceneRef.current = scene;
      scene.fog = new T.FogExp2(0x0a1628, 0.002); // exponential fog — looks better at distance

      buildSky(T, scene);
      buildTerrain(T, scene);
      buildCity(T, scene);

      // ── LIGHTING — full HDR-quality setup ────────────────────────────
      // Cool ambient
      scene.add(new T.AmbientLight(0x1a2a44, 1.8));
      
      // Hemisphere — sky blue top, warm ground bounce
      scene.add(new T.HemisphereLight(0x66aaff, 0x222233, 1.2));

      const bounce = new T.PointLight(0x88ccff, 1.5, 200);
      bounce.position.set(0, 20, 0);
      scene.add(bounce);

      // Moon/sun directional with shadows
      const moonLight = new T.DirectionalLight(0xc8d8ff, 1.4);
      moonLight.position.set(300, 280, -700);
      moonLight.castShadow = true;
      moonLight.shadow.mapSize.set(2048, 2048); // reduced for performance
      moonLight.shadow.camera.near = 1; moonLight.shadow.camera.far = 500;
      moonLight.shadow.camera.left = moonLight.shadow.camera.bottom = -150;
      moonLight.shadow.camera.right = moonLight.shadow.camera.top = 150;
      moonLight.shadow.bias = -0.0002;
      moonLight.intensity = 2.2;
      scene.add(moonLight);
      // City glow — warm fill from below
      const cityGlow = new T.PointLight(0x2244aa, 2.0, 600); cityGlow.position.set(0, 100, 0); scene.add(cityGlow);
      // Player-area cyan accent
      const cyanPt = new T.PointLight(0x00e5ff, 2.8, 65); cyanPt.position.set(0, 6, 0); scene.add(cyanPt);

      // ── Camera ────────────────────────────────────────────────────────
      const camera = new T.PerspectiveCamera(62, container.clientWidth / container.clientHeight, 0.1, 1200);
      camera.position.set(0, CAM_HEIGHT, CAM_DIST); camera.lookAt(0, 0, 0);
      cameraRef.current = camera;

      // ── Post-processing — minimal, only neon emissives bloom ─────────
      const comp = new EffectComposer(renderer);
      comp.addPass(new RenderPass(scene, camera));
      comp.addPass(new UnrealBloomPass(new T.Vector2(container.clientWidth, container.clientHeight), 0.16, 0.5, 0.9));
      composerRef.current = comp;

      // ── Parcels + Player ──────────────────────────────────────────────
      buildParcels(scene, T, parcels, assetLoader, walletRef.current, myColorRef.current);
      const pm = buildPlayer(T, myColorRef.current, assetLoader);
      scene.add(pm); playerMeshRef.current = pm;
      clockRef.current = new T.Clock();

      // ── Raycaster ─────────────────────────────────────────────────────
      const ray = new T.Raycaster(), mouse = new T.Vector2();
      renderer.domElement.addEventListener('click', e => {
        const r = container.getBoundingClientRect();
        mouse.x = ((e.clientX - r.left) / container.clientWidth) * 2 - 1;
        mouse.y = -((e.clientY - r.top) / container.clientHeight) * 2 + 1;
        ray.setFromCamera(mouse, camera);
        const hits = ray.intersectObjects(Array.from(parcelMeshMap.current.values()), true);
        if (!hits.length) return;
        let o = hits[0].object; while (o && !o.userData?.parcel) o = o.parent;
        if (o?.userData?.parcel) onParcelClick?.(o.userData.parcel);
      });

      window.addEventListener('resize', () => {
        const w = container.clientWidth, h = container.clientHeight;
        camera.aspect = w / h; camera.updateProjectionMatrix();
        renderer.setSize(w, h); composerRef.current?.setSize(w, h);
      });

      // ── ANIMATION LOOP — optimised ────────────────────────────────────
      let lastBC = 0;
      const loop = () => {
        if (!alive) return;
        animId = requestAnimationFrame(loop);
        const dt = Math.min(clockRef.current.getDelta(), 0.05); // clamp delta (prevents huge jumps on tab focus)
        const now = Date.now();
        const K = keysRef.current, P = posRef.current;
        let mv = false;

        // Input — fast and snappy
        if (K['ArrowLeft'] || K['a'] || K['A']) { P.rotY += TURN_SPEED * dt; mv = true; }
        if (K['ArrowRight'] || K['d'] || K['D']) { P.rotY -= TURN_SPEED * dt; mv = true; }
        if (K['ArrowUp'] || K['w'] || K['W']) { P.x -= Math.sin(P.rotY) * MOVE_SPEED * dt; P.z -= Math.cos(P.rotY) * MOVE_SPEED * dt; mv = true; }
        if (K['ArrowDown'] || K['s'] || K['S']) { P.x += Math.sin(P.rotY) * MOVE_SPEED * dt; P.z += Math.cos(P.rotY) * MOVE_SPEED * dt; mv = true; }
        // Shift = sprint (2x speed)
        if (K['Shift'] && mv) {
          P.x -= Math.sin(P.rotY) * MOVE_SPEED * dt; P.z -= Math.cos(P.rotY) * MOVE_SPEED * dt;
        }
        P.x = Math.max(-200, Math.min(200, P.x)); P.z = Math.max(-200, Math.min(200, P.z));

        if (playerMeshRef.current) { playerMeshRef.current.position.set(P.x, 0, P.z); playerMeshRef.current.rotation.y = P.rotY; }

        // Smooth camera lerp
        const tx = P.x + Math.sin(P.rotY) * CAM_DIST, tz = P.z + Math.cos(P.rotY) * CAM_DIST;
        camera.position.x += (tx - camera.position.x) * CAM_LERP;
        camera.position.z += (tz - camera.position.z) * CAM_LERP;
        camera.position.y += (CAM_HEIGHT - camera.position.y) * 0.08;
        camera.lookAt(P.x, 1.0, P.z);

        if (mv && now - lastBC > 100) { lastBC = now; onPositionChange?.(P.x, P.z, P.rotY); }

        // Parcel ring pulse
        parcelMeshMap.current.forEach(g => {
          if (!g.userData?.owned) return;
          g.traverse(c => {
            if (c.geometry?.parameters?.tube !== undefined)
              c.material.emissiveIntensity = 1.4 + 0.7 * Math.sin(now * 0.002 + g.userData.phase);
          });
        });

        // Animatables — stars twinkle + beacon blink
        animRef.current.forEach(a => {
          if (a.type === 'stars' && a.obj?.material) a.obj.material.opacity = 0.7 + 0.1 * Math.sin(now * 0.0006);
          if (a.type === 'beacon' && a.obj?.material) {
            const blink = ((Math.sin(now * (a.speed || 0.003) + a.phase) * .5 + .5) ** 3);
            a.obj.material.emissiveIntensity = 3 + 5 * blink;
          }
        });

        composerRef.current ? composerRef.current.render() : renderer.render(scene, camera);
      };
      loop();
    })().catch(e => console.error('[WorldScene]', e));

    return () => {
      alive = false; if (animId) cancelAnimationFrame(animId);
      if (renderer) { renderer.dispose(); if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement); }
      sceneRef.current = null; rendererRef.current = null; composerRef.current = null; animRef.current = [];
    };
  }, []);

  // ── Reactive updates ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!sceneRef.current) return;
    import('three').then(T => {
      buildParcels(sceneRef.current, T, parcels, assetLoader, currentWallet, myColor);
      if (playerMeshRef.current && assetLoader?.isModelAvailable('avatar')) {
        const old = playerMeshRef.current;
        const neo = buildPlayer(T, myColor, assetLoader);
        neo.position.copy(old.position); neo.rotation.copy(old.rotation);
        sceneRef.current.remove(old); sceneRef.current.add(neo); playerMeshRef.current = neo;
      }
    });
  }, [parcels, assetLoader?.assets, assetLoader?.loading, currentWallet, myColor, myDisplayName]);

  useEffect(() => {
    if (!playerMeshRef.current) return;
    import('three').then(T => {
      const col = hi(myColor, 0x00bcd4);
      playerMeshRef.current.traverse(c => {
        if (!c.isMesh || !c.material) return;
        if (c.material.color && c.material.emissive) { c.material.color.setHex(col); c.material.emissive.setHex(col); c.material.needsUpdate = true; }
      });
    });
  }, [myColor]);

  useEffect(() => {
    if (!sceneRef.current) return;
    import('three').then(T => {
      otherPlayerMap.current.forEach((m, id) => { if (!players.find(p => p.socketId === id)) { sceneRef.current.remove(m); otherPlayerMap.current.delete(id); } });
      players.forEach(p => {
        let m = otherPlayerMap.current.get(p.socketId);
        if (!m || m.userData.color !== p.color) { if (m) sceneRef.current.remove(m); m = buildPlayer(T, p.color || '#bf00ff', assetLoader); m.userData = { color: p.color }; sceneRef.current.add(m); otherPlayerMap.current.set(p.socketId, m); }
        m.position.set(p.x || 0, 0, p.z || 0); m.rotation.y = p.rotY || 0;
      });
    });
  }, [players]);

  useEffect(() => {
    const dn = e => { keysRef.current[e.key] = true; }; const up = e => { keysRef.current[e.key] = false; };
    window.addEventListener('keydown', dn); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
  }, []);

  return <div ref={mountRef} className={styles.canvas} tabIndex={0} />;
}