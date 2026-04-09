'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

// Maps short key → actual Next.js public path
const MODEL_MANIFEST = {
  avatar:   '/models/avatar/default_avatar.glb',
  alien:    '/models/avatar/alien.glb',
  cyborg:   '/models/avatar/cyborg.glb',
  robot:    '/models/avatar/robot.glb',
  tower:    '/models/buildings/tower.glb',
  gallery:  '/models/buildings/gallery.glb',
  shop:     '/models/buildings/shop.glb',
  mansion:  '/models/buildings/mansion.glb',
  tree:     '/models/props/tree.glb',
  lamp:     '/models/props/lamp.glb',
  bench:    '/models/props/bench.glb',
  fountain: '/models/props/fountain.glb',
  monument: '/models/nfts/monument.glb',
  sculpture:'/models/nfts/sculpture.glb',
  statue:   '/models/nfts/statue.glb',
};

// World-unit height each category normalises to
const TARGET_SIZES = {
  avatar:1.8, alien:1.8, cyborg:1.8, robot:1.8,
  tower:7.0, gallery:6.0, shop:5.0, mansion:7.5,
  tree:4.0, lamp:3.5, bench:1.2, fountain:2.5,
  monument:4.0, sculpture:3.0, statue:3.5,
};

function normaliseModel(scene, target = 5, THREE) {
  const box  = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) scene.scale.setScalar(target / maxDim);
  scene.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(scene);
  scene.position.y -= box2.min.y;   // floor to y=0
  scene.updateMatrixWorld(true);
}

export function useAssetLoader() {
  const [assets, setAssets]   = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const THREE = await import('three');
      // Store on window so WorldScene can use it in normaliseModel
      window.__THREE__ = THREE;

      const { GLTFLoader }  = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js');

      const draco = new DRACOLoader();
      draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

      const loader = new GLTFLoader();
      loader.setDRACOLoader(draco);

      await Promise.all(
        Object.keys(MODEL_MANIFEST).map(key =>
          new Promise(resolve => {
            loader.load(
              MODEL_MANIFEST[key],
              gltf => {
                if (cancelled) return resolve();
                const sc = gltf.scene;
                normaliseModel(sc, TARGET_SIZES[key] ?? 5, THREE);
                sc.traverse(child => {
                  if (!child.isMesh) return;
                  child.castShadow = child.receiveShadow = true;
                  const mats = Array.isArray(child.material) ? child.material : [child.material];
                  mats.forEach(m => {
                    // Prevent pitch-black materials
                    if (m.color) {
                      const { r, g, b } = m.color;
                      if (0.299*r*255 + 0.587*g*255 + 0.114*b*255 < 10) m.color.setHex(0x2a3040);
                    }
                    m.needsUpdate = true;
                  });
                });
                setAssets(prev => ({ ...prev, [key]: { scene: sc, loaded: true } }));
                console.log(`[AssetLoader] ✅ ${key}`);
                resolve();
              },
              undefined,
              err => {
                if (!cancelled) console.warn(`[AssetLoader] ⚠ ${key}:`, err?.message ?? err);
                resolve();
              }
            );
          })
        )
      );

      if (!cancelled) setLoading(false);
    })().catch(e => { console.error('[AssetLoader]', e); setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const isModelAvailable = useCallback(
    key => !!(assets[key]?.loaded && assets[key]?.scene),
    [assets]
  );

  const cloneModel = useCallback(key => {
    const e = assets[key];
    if (!e?.loaded || !e.scene) return null;
    try { return e.scene.clone(true); } catch { return null; }
  }, [assets]);

  return { assets, loading, isModelAvailable, cloneModel };
}