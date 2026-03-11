import * as THREE from 'three';

let ctx = null;
let mainGain = null;
const buffers = {};

async function loadBuffer(url) {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return await ctx.decodeAudioData(arrayBuffer);
    } catch (e) {
        console.warn(`Failed to load sound: ${url}`, e);
        return null;
    }
}

export async function initAudio() {
    if (ctx) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        
        ctx = new AudioContext();
        mainGain = ctx.createGain();
        mainGain.gain.value = 0.85; // Slightly higher main gain
        mainGain.connect(ctx.destination);
        
        // Load provided sound files
        buffers.launch = await loadBuffer('/49053354-launching-missile-313226.mp3');
        buffers.explosion = await loadBuffer('/u_cps9x2omzt-missile-boom-481180.mp3');
        buffers.fire = await loadBuffer('/freesound_community-missile-firing-fl-106655.mp3');
    } catch (e) {
        console.warn("Audio Context initialization failed:", e);
    }
}

function getPanner(x, y, z, isLaunch = false) {
    if (!ctx) return null;
    const panner = ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'exponential';
    
    // Launch sounds need more "presence" over distance
    panner.refDistance = isLaunch ? 40 : 20; 
    panner.maxDistance = 5000;
    panner.rolloffFactor = isLaunch ? 1.0 : 1.2;
    
    if (panner.positionX && panner.positionX.value !== undefined) {
        panner.positionX.value = x;
        panner.positionY.value = y;
        panner.positionZ.value = z;
    } else if (panner.setPosition) {
        panner.setPosition(x, y, z);
    }
    return panner;
}

export function updateListener(camera) {
    if (!ctx || !ctx.listener || !camera) return;
    const l = ctx.listener;
    const p = camera.position;
    
    if (l.positionX && l.positionX.value !== undefined) {
        l.positionX.value = p.x;
        l.positionY.value = p.y;
        l.positionZ.value = p.z;
    } else if (l.setPosition) {
        l.setPosition(p.x, p.y, p.z);
    }

    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

    if (l.forwardX && l.forwardX.value !== undefined) {
        l.forwardX.value = fwd.x;
        l.forwardY.value = fwd.y;
        l.forwardZ.value = fwd.z;
        l.upX.value = up.x;
        l.upY.value = up.y;
        l.upZ.value = up.z;
    } else if (l.setOrientation) {
        l.setOrientation(fwd.x, fwd.y, fwd.z, up.x, up.y, up.z);
    }
}

export function playExplosion(x, y, z, scale = 1.0) {
    if (!ctx || ctx.state === 'suspended') return;
    const panner = getPanner(x, y, z);
    if (!panner) return;
    panner.connect(mainGain);

    if (buffers.explosion) {
        const source = ctx.createBufferSource();
        source.buffer = buffers.explosion;
        const g = ctx.createGain();
        g.gain.value = 0.8 * scale;
        source.connect(g);
        g.connect(panner);
        source.start(0);
    }

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120 * scale, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.4 * scale);
    g.gain.setValueAtTime(0.5, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6 * scale);
    osc.connect(g);
    g.connect(panner);
    osc.start();
    osc.stop(ctx.currentTime + 0.6 * scale);
}

export function playLaunch(x, y, z) {
    if (!ctx || ctx.state === 'suspended') return;
    const panner = getPanner(x, y, z, true);
    if (!panner) return;
    panner.connect(mainGain);

    if (buffers.launch) {
        const source = ctx.createBufferSource();
        source.buffer = buffers.launch;
        const g = ctx.createGain();
        // Doubled gain for the launch sample to make it loud
        g.gain.value = 1.2; 
        source.connect(g);
        g.connect(panner);
        source.start(0);
    }

    // High-frequency "hiss" layer for power
    const bufSize = ctx.sampleRate * 0.5;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    const noise = ctx.createBufferSource();
    const noiseGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1200;
    noise.buffer = buf;
    noiseGain.gain.setValueAtTime(0.4, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(panner);
    noise.start();
}

export function playSeparation(x, y, z) {
    if (!ctx || ctx.state === 'suspended') return;
    const panner = getPanner(x, y, z);
    if (!panner) return;
    panner.connect(mainGain);
    
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    g.gain.setValueAtTime(0.1, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.connect(g);
    g.connect(panner);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
}

export function playUIClick() {
    if (!ctx || ctx.state === 'suspended') return;
    try {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        g.gain.setValueAtTime(0.05, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        osc.connect(g);
        g.connect(mainGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
    } catch (e) {}
}
