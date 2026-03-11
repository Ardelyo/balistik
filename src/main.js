import * as THREE from 'three';
import { CFG, gnd } from './game/config.js';
import { initParticles, updateParticles, spawn } from './game/particleSystem.js';
import { initLightPool, updateLights, grabLight } from './engine/lightPool.js';
import { buildSky, createSkyMaterial } from './engine/sky.js';
import { buildTerrain, buildEnv } from './engine/terrain.js';
import { buildLauncher, updateLauncher, fireSalvo } from './game/launcher.js';
import { updateMissiles } from './game/missileSystem.js';
import { buildMapBg, drawMap } from './ui/tacticalMap.js';
import { initAudio, updateListener, playExplosion, playUIClick } from './engine/audio.js';

let renderer, scene, camera, clock;
let skyMat, sunLight, ambLight, terrainMat;
let skyMesh, launcherObj;
let timeOfDay = 0.28;
let yaw = Math.PI + 0.3, pitch = 0.10;
let isLocked = false, fov = 65, dayness = 0.7;
let targetWorld = null, missileCount = 6, totalFired = 0;
const missiles = [], mapExplosions = [];
const keys = {};

let mc, mapCtx, mapBg;

function doFlash(v) {
    const f = document.getElementById('flash');
    if (!f) return;
    f.style.transition = 'opacity 0.04s'; f.style.opacity = v;
    setTimeout(() => { f.style.transition = 'opacity 0.4s'; f.style.opacity = 0; }, 60);
}

function explode(x, y, z, scale = 1.0) {
    const S = scale;
    for (let i = 0; i < 100; i++) { const a = (i / 100) * Math.PI * 2; spawn(x + Math.cos(a) * 0.3, y, z + Math.sin(a) * 0.3, Math.cos(a) * 100 * S, 1.5 + Math.random() * 2, Math.sin(a) * 100 * S, 1, 0.88, 0.55, (2.5 + Math.random() * 3.5) * S, 0.35, 4); }
    for (let i = 0; i < 280 * S; i++) { const d = { x: Math.random() - 0.5, y: Math.random(), z: Math.random() - 0.5 }; const sp = 45 + Math.random() * 85 * S; spawn(x, y, z, d.x * sp, d.y * sp * 0.9, d.z * sp, 1, 0.85, 0.7, (0.8 + Math.random() * 1.8) * S, 0.2 + Math.random() * 0.35, 2); }
    for (let i = 0; i < 500 * S; i++) { const d = { x: Math.random() - 0.5, y: Math.random(), z: Math.random() - 0.5 }; const sp = 7 + Math.random() * 20 * S; spawn(x + (Math.random() - 0.5) * 3, y + (Math.random() - 0.5) * 3, z + (Math.random() - 0.5) * 3, d.x * sp, d.y * sp * 1.6 + 2, d.z * sp, 1, 0.45 + Math.random() * 0.4, 0, (2 + Math.random() * 8) * S, 0.5 + Math.random() * 2.2, 0); }
    grabLight(x, y + 1, z, 0xffffff, 55 * S, 380 * S, 0.12, 0);
    grabLight(x, y + 3 * S, z, 0xff5500, 25 * S, 280 * S, 2.5 + S, 1);
    doFlash(Math.min(0.85, 0.3 * S));
    mapExplosions.push({ wx: x, wz: z, life: 2.5 });
    
    if (skyMat) skyMat.uniforms.flashExp.value = Math.max(skyMat.uniforms.flashExp.value, 0.5 * S);
    playExplosion(x, y, z, S);
}

function upTime(dt) {
    timeOfDay = (timeOfDay + dt / CFG.DAY_DUR) % 1.0;
    const angle = (timeOfDay - 0.25) * Math.PI * 2;
    const _sunDir = new THREE.Vector3(Math.cos(angle) * 0.55, Math.sin(angle), 0.38).normalize();
    if (skyMat) {
        skyMat.uniforms.sunDir.value.copy(_sunDir);
        skyMat.uniforms.time.value += dt;
        skyMat.uniforms.flashExp.value *= 0.88;
        let maxAlt = 0;
        for (const m of missiles) if (m.alive) maxAlt = Math.max(maxAlt, m.mesh.position.y);
        skyMat.uniforms.altFactor.value = Math.min(1.0, maxAlt / 1200.0);
    }
    terrainMat.uniforms.sunDir.value.copy(_sunDir);
    terrainMat.uniforms.camPos.value.copy(camera.position);
    sunLight.position.copy(_sunDir).multiplyScalar(1000);
    dayness = Math.max(0, _sunDir.y);
    sunLight.intensity = dayness * 2.8 + 0.05;
    ambLight.intensity = 0.03 + (dayness < 0.3 ? dayness / 0.3 : 1) * 0.3;
    renderer.toneMappingExposure = 0.32 + dayness * 0.88;
    const h = Math.floor(timeOfDay * 24);
    const lbls = ['MIDNIGHT', 'PREDAWN', 'DAWN', 'MORNING', 'NOON', 'AFTERNOON', 'DUSK', 'NIGHT'];
    const tLbl = document.getElementById('timeLbl');
    if (tLbl) tLbl.textContent = `${String(h).padStart(2, '0')}:00 · ${lbls[Math.min(Math.floor(timeOfDay * 8), 7)]}`;
}

function boot() {
    initAudio();
    document.getElementById('boot').style.display = 'none';
    
    mc = document.getElementById('map-canvas');
    if (mc) {
        mapCtx = mc.getContext('2d');
        mapBg = buildMapBg();
        mc.addEventListener('click', e => {
            playUIClick();
            const rect = mc.getBoundingClientRect();
            const mx = (e.clientX - rect.left) * (CFG.MAP_SZ / rect.width);
            const my = (e.clientY - rect.top) * (CFG.MAP_SZ / rect.height);
            const wx = (mx / CFG.MAP_SZ - 0.5) * CFG.MAP_WORLD;
            const wz = (my / CFG.MAP_SZ - 0.5) * CFG.MAP_WORLD;
            targetWorld = new THREE.Vector3(wx, gnd(wx, wz) + 0.2, wz);
        });
    }

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(CFG.PIXEL_RATIO);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 6000);
    camera.position.set(0, 5, -55);
    clock = new THREE.Clock();

    sunLight = new THREE.DirectionalLight(0xfff4dd, 2.5);
    sunLight.castShadow = true;
    scene.add(sunLight);
    ambLight = new THREE.AmbientLight(0x223355, 0.22);
    scene.add(ambLight);

    skyMat = createSkyMaterial();
    skyMesh = buildSky(scene, skyMat);
    const terr = buildTerrain(scene);
    terrainMat = terr.material;
    buildEnv(scene);
    launcherObj = buildLauncher(scene, 0, gnd(0, 28), 28);
    initParticles(scene);
    initLightPool(scene);

    document.addEventListener('mousemove', e => { if (isLocked) { yaw -= e.movementX * 0.0018; pitch -= e.movementY * 0.0018; pitch = Math.max(-1.4, Math.min(1.4, pitch)); } });
    document.addEventListener('pointerlockchange', () => isLocked = !!document.pointerLockElement);
    renderer.domElement.addEventListener('click', () => { if (!isLocked) renderer.domElement.requestPointerLock(); });
    document.addEventListener('keydown', e => { 
        keys[e.code] = true; 
        if (e.code === 'KeyT' && isLocked) timeOfDay = (timeOfDay + 1/24) % 1.0; 

        if (e.code === 'KeyP') {
            playUIClick();
            CFG.PERFORMANCE_MODE = !CFG.PERFORMANCE_MODE;
            renderer.shadowMap.enabled = !CFG.PERFORMANCE_MODE;
            scene.traverse(node => {
                if (node.isMesh) {
                    node.castShadow = !CFG.PERFORMANCE_MODE;
                    node.receiveShadow = !CFG.PERFORMANCE_MODE;
                }
            });
            renderer.setPixelRatio(CFG.PERFORMANCE_MODE ? 1.0 : CFG.PIXEL_RATIO);
        }
    });
    document.addEventListener('keyup', e => keys[e.code] = false);
    document.addEventListener('wheel', e => { fov = Math.max(18, Math.min(90, fov + e.deltaY * 0.05)); camera.fov = fov; camera.updateProjectionMatrix(); });

    document.getElementById('btn-minus').onclick = () => { playUIClick(); missileCount = Math.max(1, missileCount - 1); document.getElementById('count-display').textContent = String(missileCount).padStart(2, '0'); };
    document.getElementById('btn-plus').onclick = () => { playUIClick(); missileCount = Math.min(80, missileCount + 1); document.getElementById('count-display').textContent = String(missileCount).padStart(2, '0'); };
    document.getElementById('btn-fire').onclick = () => { playUIClick(); fireSalvo(scene, camera, missiles, launcherObj, targetWorld, missileCount, () => totalFired++); };

    const mapPanel = document.getElementById('map-panel');
    const btnToggle = document.getElementById('btn-toggle-map');
    const toggleMap = () => {
        playUIClick();
        mapPanel.classList.toggle('collapsed');
        btnToggle.textContent = mapPanel.classList.contains('collapsed') ? '□' : '_';
    };
    btnToggle.onclick = (e) => { e.stopPropagation(); toggleMap(); };
    document.getElementById('map-header').onclick = toggleMap;

    loop();
}

function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);

    if (launcherObj) updateLauncher(launcherObj, dt);
    updateListener(camera);

    if (isLocked) {
        const sp = (keys['ShiftLeft'] || keys['ShiftRight']) ? 20 : 8;
        const fwd = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, yaw, 0));
        const rgt = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, yaw, 0));
        if (keys['KeyW']) camera.position.addScaledVector(fwd, sp * dt);
        if (keys['KeyS']) camera.position.addScaledVector(fwd, -sp * dt);
        if (keys['KeyA']) camera.position.addScaledVector(rgt, -sp * dt);
        if (keys['KeyD']) camera.position.addScaledVector(rgt, sp * dt);
        camera.position.y += (gnd(camera.position.x, camera.position.z) + 2.8 - camera.position.y) * 0.15;
    }
    upTime(dt);
    updateMissiles(missiles, dt, scene, camera, dayness, explode);
    updateParticles(dt);
    updateLights(dt);
    if (mapCtx && mapBg) drawMap(mapCtx, mapBg, mapExplosions, missiles, launcherObj, camera, targetWorld, yaw);
    document.getElementById('flightLbl').textContent = missiles.length;
    document.getElementById('firedLbl').textContent = totalFired;
    camera.rotation.order = 'YXZ'; camera.rotation.y = yaw; camera.rotation.x = pitch;
    skyMesh.position.copy(camera.position);
    renderer.render(scene, camera);
}

document.getElementById('boot-btn').onclick = boot;
window.addEventListener('resize', () => {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});
