import * as THREE from 'three';
import { CFG, gnd } from './config.js';
import { spawn } from './particleSystem.js';
import { grabLight } from '../engine/lightPool.js';
import { TEX_CORE, TEX_HALO, TEX_STREAK } from './textures.js';
import { playSeparation } from '../engine/audio.js';

const sharedMats = {};
function getMats() {
    if (sharedMats.body) return sharedMats;
    sharedMats.body = new THREE.MeshPhongMaterial({ color: 0xaaaaaa, specular: 0x444444, shininess: 80 });
    sharedMats.nose = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, specular: 0x111111, shininess: 40 });
    sharedMats.eng = new THREE.MeshPhongMaterial({ color: 0x383838, specular: 0x222222, shininess: 30 });
    sharedMats.fin = new THREE.MeshPhongMaterial({ color: 0x777777, specular: 0x333333, shininess: 50, side: THREE.DoubleSide });
    sharedMats.nozz = new THREE.MeshPhongMaterial({ color: 0x111111, emissive: 0x441200, emissiveIntensity: 1 });
    return sharedMats;
}

let missileGeos = null;
function getGeos() {
    if (missileGeos) return missileGeos;
    const nose = new THREE.ConeGeometry(0.13, 0.7, 8); nose.translate(0, 0.35, 0);
    const band = new THREE.CylinderGeometry(0.135, 0.135, 0.18, 8);
    const body = new THREE.CylinderGeometry(0.133, 0.145, 1.5, 10);
    const eng = new THREE.CylinderGeometry(0.15, 0.165, 0.55, 8);
    const pts = []; for (let i = 0; i <= 9; i++) { const t = i / 9; pts.push(new THREE.Vector2(0.055 + t * t * 0.11, -t * 0.3)); }
    const nozz = new THREE.LatheGeometry(pts, 8);
    const sh = new THREE.Shape();
    sh.moveTo(0.13, 0); sh.lineTo(0.44, 0); sh.lineTo(0.2, 0.42); sh.lineTo(0.13, 0.42); sh.closePath();
    const fin = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false });
    fin.rotateX(-Math.PI / 2); fin.translate(0, -0.42, -0.015);
    missileGeos = { nose, band, body, eng, nozz, fin };
    return missileGeos;
}

function objAt(geo, mat, x, y, z) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; }

function buildRV() {
    const G = getGeos(), M = getMats(), grp = new THREE.Group();
    grp.add(objAt(G.nose, M.nose, 0, 0.35, 0));
    grp.add(objAt(G.band, M.eng, 0, 0, 0));
    return grp;
}

function buildBooster() {
    const G = getGeos(), M = getMats(), grp = new THREE.Group();
    grp.add(objAt(G.body, M.body, 0, 0.45, 0));
    grp.add(objAt(G.eng, M.eng, 0, -0.39, 0));
    grp.add(objAt(G.nozz, M.nozz, 0, -0.68, 0));
    for (let i = 0; i < 4; i++) { const fw = new THREE.Group(); fw.rotation.y = (i / 4) * Math.PI * 2; const f = new THREE.Mesh(G.fin, M.fin); f.position.y = -0.52; fw.add(f); grp.add(fw); }
    return grp;
}

export function createMissile(scene, camera, launchPos, vel) {
    const rv = buildRV();
    const booster = buildBooster();
    const grp = new THREE.Group();
    grp.add(rv); grp.add(booster);
    rv.position.y = 1.29; // Position on top of booster
    grp.position.copy(launchPos);
    scene.add(grp);

    // Thermal RV Glow (Emissive material for re-entry)
    const glowMat = new THREE.MeshPhongMaterial({ 
        color: 0x000000, 
        emissive: 0xff4400, 
        emissiveIntensity: 0, 
        transparent: true, 
        opacity: 0.8 
    });
    const rvGlow = new THREE.Mesh(getGeos().nose, glowMat);
    rvGlow.scale.setScalar(1.05);
    rvGlow.position.y = 0.35;
    rv.add(rvGlow);

    // Apply launch inaccuracy
    const dev = CFG.INACCURACY;
    const randomizedVel = vel.clone().multiplyScalar(1 + (Math.random() - 0.5) * dev);
    randomizedVel.x += (Math.random() - 0.5) * dev * 20;
    randomizedVel.z += (Math.random() - 0.5) * dev * 20;

    const mkSp = (tex, sz, op) => { const m = new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: op }); const s = new THREE.Sprite(m); s.scale.setScalar(sz); return s; };
    const fCore = mkSp(TEX_CORE, 4, 0.95);
    const fHalo = mkSp(TEX_HALO, 14, 0.55);
    const fStreak = mkSp(TEX_STREAK, 18, 0.25);
    fStreak.scale.set(20, 1.4, 1);
    scene.add(fCore); scene.add(fHalo); scene.add(fStreak);

    return {
        mesh: grp, rv, booster, rvGlow, vel: randomizedVel, alive: true, age: 0,
        fCore, fHalo, fStreak,
        trailT: 0, burnTime: 6 + Math.random() * 5,
        separated: false,
        launchY: launchPos.y,
    };
}

const _up = new THREE.Vector3(0, 1, 0);
const _tmpV = new THREE.Vector3();
const _engDir = new THREE.Vector3();
const _toMis = new THREE.Vector3();
const _wind = new THREE.Vector3();
const debris = []; // Track falling boosters

function getAtmosDensity(y) {
    return Math.exp(-Math.max(0, y) / CFG.ATMOS_SCALE_HEIGHT);
}

export function updateMissiles(missiles, dt, scene, camera, dayness, explodeFn) {
    const time = performance.now() * 0.001;
    
    // Process falling boosters (debris)
    for (let i = debris.length - 1; i >= 0; i--) {
        const d = debris[i];
        const dens = getAtmosDensity(d.mesh.position.y);
        
        // Altitude-layered wind for debris
        const alt = d.mesh.position.y;
        const jetFac = Math.max(1.0, alt / CFG.WIND.jetStreamAlt) * CFG.WIND.jetStreamScale;
        const currentWind = _wind.set(
            (CFG.WIND.x + Math.sin(time * 0.2) * CFG.WIND.variance) * jetFac,
            0,
            (CFG.WIND.z + Math.cos(time * 0.25) * CFG.WIND.variance) * jetFac
        );

        d.vel.y -= CFG.GRAVITY * dt;
        _tmpV.copy(d.vel).sub(currentWind);
        const drag = _tmpV.lengthSq() * CFG.DRAG_COEFF * 4.0 * dens * dt;
        d.vel.add(_tmpV.normalize().multiplyScalar(-drag));
        d.mesh.position.addScaledVector(d.vel, dt);
        d.mesh.rotation.x += d.rot.x * dt; d.mesh.rotation.y += d.rot.y * dt; d.mesh.rotation.z += d.rot.z * dt;
        
        const gy = gnd(d.mesh.position.x, d.mesh.position.z);
        if (d.mesh.position.y <= gy + 0.5) {
            explodeFn(d.mesh.position.x, gy + 0.5, d.mesh.position.z, 0.4);
            scene.remove(d.mesh); debris.splice(i, 1);
        }
    }

    for (const m of missiles) {
        if (!m.alive) continue;
        m.age += dt;

        const burning = m.age < m.burnTime;
        const dens = getAtmosDensity(m.mesh.position.y);
        
        // Altitude-layered wind for missiles
        const alt = m.mesh.position.y;
        const jetFac = 1.0 + Math.max(0, (alt - 200) / CFG.WIND.jetStreamAlt) * CFG.WIND.jetStreamScale;
        const currentWind = _tmpV.set(
            (CFG.WIND.x + Math.sin(time * 0.2) * CFG.WIND.variance) * jetFac,
            0,
            (CFG.WIND.z + Math.cos(time * 0.25) * CFG.WIND.variance) * jetFac
        );

        // SEPARATION
        if (!burning && !m.separated) {
            m.separated = true;
            const wp = new THREE.Vector3(); m.rv.getWorldPosition(wp);
            const wq = new THREE.Quaternion(); m.rv.getWorldQuaternion(wq);
            scene.add(m.rv);
            m.rv.position.copy(wp);
            m.rv.quaternion.copy(wq);
            
            const bp = new THREE.Vector3(); m.booster.getWorldPosition(bp);
            const bq = new THREE.Quaternion(); m.booster.getWorldQuaternion(bq);
            scene.add(m.booster);
            m.booster.position.copy(bp);
            m.booster.quaternion.copy(bq);
            
            debris.push({
                mesh: m.booster,
                vel: m.vel.clone().multiplyScalar(0.95),
                rot: new THREE.Vector3(Math.random() * 2, Math.random() * 2, Math.random() * 2)
            });
            
            scene.remove(m.mesh);
            m.mesh = m.rv;
            
            playSeparation(wp.x, wp.y, wp.z);
            
            for (let i = 0; i < 15; i++) {
                spawn(wp.x, wp.y, wp.z, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, 1, 1, 1, 0.5, 0.2, 0);
            }
        }

        m.vel.y -= CFG.GRAVITY * dt;

        // DRAG & WIND (Altitude-dependent)
        _tmpV.copy(m.vel).sub(currentWind);
        const dragCoeff = m.separated ? CFG.DRAG_COEFF * 0.5 : CFG.DRAG_COEFF;
        const dragMag = _tmpV.lengthSq() * dragCoeff * dens * dt;
        m.vel.add(_tmpV.normalize().multiplyScalar(-dragMag));

        m.mesh.position.addScaledVector(m.vel, dt);

        _tmpV.copy(m.vel).normalize();
        if (_tmpV.lengthSq() > 0.0001) m.mesh.quaternion.setFromUnitVectors(_up, _tmpV);

        const { fCore, fHalo, fStreak, rvGlow } = m;
        const wp = m.mesh.position;
        const speed = m.vel.length();

        // Thermal Effects during Re-entry
        if (m.separated && speed > CFG.REENTRY_VEL && dens > 0.05) {
            const thermalFac = Math.pow((speed - CFG.REENTRY_VEL) * 0.01 * dens, 1.5);
            rvGlow.material.emissiveIntensity = Math.min(thermalFac * 3, 5);
            rvGlow.material.opacity = Math.min(thermalFac, 0.9);
            
            if (Math.random() < 0.3) {
                spawn(wp.x + (Math.random()-0.5), wp.y + (Math.random()-0.5), wp.z + (Math.random()-0.5), 
                      -m.vel.x * 0.1, -m.vel.y * 0.1, -m.vel.z * 0.1, 
                      1, 0.4, 0.0, 0.5 + Math.random(), 0.1 + Math.random() * 0.2, 0);
            }
        } else if (rvGlow) {
            rvGlow.material.emissiveIntensity *= 0.95;
            rvGlow.material.opacity *= 0.95;
        }

        _engDir.set(0, -1, 0).applyQuaternion(m.mesh.quaternion);
        _toMis.copy(camera.position).sub(wp).normalize();
        const angleFac = Math.max(0, _engDir.dot(_toMis));
        const nightBoost = 1 + (1 - dayness) * 2.2;
        const flarePow = angleFac * nightBoost * (burning ? 1 : 0);
        const pulsate = 0.88 + Math.sin(m.age * 30) * 0.12;

        const ep = _tmpV.copy(_engDir).multiplyScalar(0.75).add(wp);
        fCore.position.copy(ep); fHalo.position.copy(ep); fStreak.position.copy(ep);

        if (burning) {
            const coreS = 2.5 + flarePow * 7;
            fCore.scale.setScalar(coreS * pulsate);
            fHalo.scale.setScalar((10 + flarePow * 28) * pulsate);
            fStreak.scale.set((12 + flarePow * 55) * pulsate, (1.2 + flarePow * 0.8) * pulsate, 1);
            fCore.material.opacity = (0.75 + flarePow * 0.25) * pulsate;
            fHalo.material.opacity = (0.2 + flarePow * 0.45) * pulsate;
            fStreak.material.opacity = (0.05 + flarePow * 0.45) * pulsate;
            
            m.trailT += dt;
            if (m.trailT > 0.02) {
                m.trailT = 0;
                const ex = _engDir.clone().multiplyScalar(1.4);
                const ep2 = wp.clone().add(ex);
                for (let i = 0; i < 7; i++) {
                    spawn(ep2.x + (Math.random() - 0.5) * 0.24, ep2.y + (Math.random() - 0.5) * 0.24, ep2.z + (Math.random() - 0.5) * 0.24,
                        ex.x * (16 + Math.random() * 12) + (Math.random() - 0.5) * 3, ex.y * (16 + Math.random() * 12) + (Math.random() - 0.5) * 3, ex.z * (16 + Math.random() * 12) + (Math.random() - 0.5) * 3,
                        1, 0.55, 0, 0.6 + Math.random() * 1.1, 0.22 + Math.random() * 0.32, 0);
                }
            }
        } else {
            fCore.material.opacity *= 0.92; fHalo.material.opacity *= 0.92; fStreak.material.opacity *= 0.92;
            fCore.scale.multiplyScalar(0.95); fHalo.scale.multiplyScalar(0.95);
        }

        const gy = gnd(wp.x, wp.z);
        if (wp.y <= gy + 0.5) {
            explodeFn(wp.x, gy + 0.5, wp.z, 1.0 + Math.random() * 0.5);
            scene.remove(m.mesh); scene.remove(m.fCore); scene.remove(m.fHalo); scene.remove(m.fStreak);
            m.alive = false;
        }
    }
    for (let i = missiles.length - 1; i >= 0; i--) if (!missiles[i].alive) missiles.splice(i, 1);
}

export function computeVel(from, to) {
    const dx = to.x - from.x, dz = to.z - from.z;
    const R = Math.hypot(dx, dz) + 0.01, dh = to.y - from.y;
    const hDir = new THREE.Vector3(dx / R, 0, dz / R);
    const g = CFG.GRAVITY;
    
    // Approximate average density for the trajectory to help computeVel compensate a bit
    // High-altitude trajectories experience less integrated drag
    for (const theta of [Math.PI * 0.38, Math.PI * 0.30, Math.PI * 0.24, Math.PI * 0.18]) {
        const cosT = Math.cos(theta), sinT = Math.sin(theta), tanT = sinT / cosT;
        const denom = 2 * cosT * cosT * (R * tanT - dh);
        if (denom > 0) { 
            let v = Math.sqrt(g * R * R / denom); 
            // Compensation for high-altitude flight efficiency (empirical)
            const apogee = dh + (R * tanT) / 2;
            const avgDens = getAtmosDensity(apogee * 0.6);
            v *= (1 - (1 - avgDens) * 0.15); // Adjust velocity for thinner air

            if (v < 700) { 
                const vel = hDir.clone().multiplyScalar(v * cosT); 
                vel.y = v * sinT; 
                return vel; 
            } 
        }
    }
    const vel = hDir.clone().multiplyScalar(90 * 0.6); vel.y = 90 * 0.85; return vel;
}

