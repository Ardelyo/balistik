import * as THREE from 'three';
import { CFG } from './config.js';

const pPos = new Float32Array(CFG.MAX_PART * 3);
const pCol = new Float32Array(CFG.MAX_PART * 3);
const pSz = new Float32Array(CFG.MAX_PART);
const pool = [];

for (let i = 0; i < CFG.MAX_PART; i++) {
    pool.push({ a: false, life: 0, ml: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 1, g: 1, b: 1, sz: 1, type: 0 });
}

let partGeo;

export function initParticles(scene) {
    partGeo = new THREE.BufferGeometry();
    partGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    partGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
    partGeo.setAttribute('size', new THREE.BufferAttribute(pSz, 1));

    const mat = new THREE.PointsMaterial({
        size: 1,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
    });

    const points = new THREE.Points(partGeo, mat);
    points.frustumCulled = false;
    scene.add(points);
    return partGeo;
}

export function spawn(x, y, z, vx, vy, vz, r, g, b, sz, life, type) {
    for (const p of pool) {
        if (!p.a) {
            p.a = true; p.life = life; p.ml = life; p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz; p.r = r; p.g = g; p.b = b; p.sz = sz; p.type = type; return;
        }
    }
}

export function updateParticles(dt) {
    let pi = 0;
    for (const p of pool) {
        if (!p.a) continue;
        p.life -= dt;
        if (p.life <= 0) { p.a = false; continue; }
        const t = Math.max(0, p.life / p.ml);
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.type === 0) { p.vy -= CFG.GRAVITY * 0.22 * dt; p.vx *= 0.978; p.vz *= 0.978; }
        else if (p.type === 1) { p.vy += 1.2 * dt; p.vx *= 0.982; p.vz *= 0.982; }
        else if (p.type === 2) { p.vy -= CFG.GRAVITY * 0.65 * dt; }
        else if (p.type === 3) { p.vy -= CFG.GRAVITY * 0.12 * dt; p.vx *= 0.97; p.vz *= 0.97; }
        else if (p.type === 4) { p.vy -= CFG.GRAVITY * 0.04 * dt; p.vx *= 0.96; p.vz *= 0.96; }
        pPos[pi * 3] = p.x; pPos[pi * 3 + 1] = p.y; pPos[pi * 3 + 2] = p.z;
        let r = p.r, g = p.g, b = p.b, s = p.sz;
        if (p.type === 0) { r = 1; g = t > 0.55 ? 0.85 : t * 1.3; b = t > 0.65 ? 0.4 * t : 0; s = p.sz * (0.3 + t * 0.7); }
        else if (p.type === 1) { const v = 0.1 + (1 - t) * 0.22; r = v; g = v; b = v; s = p.sz * (1 + (1 - t) * 4.5); }
        else if (p.type === 2) { r = 1; g = 0.7 * t; b = 0.05 * t; s = p.sz * t * 0.85; }
        else if (p.type === 3) { r = 0.62 * t; g = 0.5 * t; b = 0.3 * t; s = p.sz * (1 + (1 - t) * 2.2); }
        else if (p.type === 4) { r = 1; g = 0.88; b = 0.55; s = p.sz * t; }
        pCol[pi * 3] = r; pCol[pi * 3 + 1] = g; pCol[pi * 3 + 2] = b; pSz[pi] = s;
        pi++;
    }
    for (let i = pi; i < CFG.MAX_PART; i++) { pPos[i * 3 + 1] = -99999; pSz[i] = 0; }
    if (partGeo) {
        partGeo.attributes.position.needsUpdate = true;
        partGeo.attributes.color.needsUpdate = true;
        partGeo.attributes.size.needsUpdate = true;
    }
}
