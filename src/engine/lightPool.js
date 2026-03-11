import * as THREE from 'three';
import { CFG } from '../game/config.js';

let pooledLights = [];

export function initLightPool(scene) {
    for (let i = 0; i < CFG.POOL_LIGHTS; i++) {
        const l = new THREE.PointLight(0xff5500, 0, 0);
        scene.add(l);
        pooledLights.push({ l, inUse: false, life: 0, ml: 0, phase: 0 });
    }
}

export function grabLight(x, y, z, color, intensity, range, life, phase) {
    let slot = null;
    for (const p of pooledLights) { if (!p.inUse) { slot = p; break; } }
    if (!slot) {
        let minI = Infinity;
        for (const p of pooledLights) { if (p.l.intensity < minI) { minI = p.l.intensity; slot = p; } }
    }
    slot.inUse = true; slot.life = life; slot.ml = life; slot.phase = phase;
    slot.l.color.setHex(color);
    slot.l.intensity = intensity;
    slot.l.distance = range;
    slot.l.position.set(x, y, z);
}

export function updateLights(dt) {
    for (const p of pooledLights) {
        if (!p.inUse) continue;
        p.life -= dt;
        if (p.life <= 0) { p.l.intensity = 0; p.inUse = false; continue; }
        const t = p.life / p.ml;
        if (p.phase === 0) p.l.intensity = p.l.intensity * (t > 0.7 ? 0.88 : 0.78);
        else p.l.intensity *= 0.97;
        if (t < 0.15) p.l.intensity *= 0.8;
    }
}
