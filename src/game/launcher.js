import * as THREE from 'three';
import { gnd } from './config.js';
import { computeVel, createMissile } from './missileSystem.js';
import { spawn } from './particleSystem.js';
import { playLaunch } from '../engine/audio.js';

export function buildLauncher(scene, wx, wy, wz) {
    const grp = new THREE.Group();
    const lMat = new THREE.MeshPhongMaterial({ color: 0x3a4028, specular: 0x111111, shininess: 20 });
    const dMat = new THREE.MeshPhongMaterial({ color: 0x28301c, specular: 0x111111, shininess: 10 });
    const mMat = new THREE.MeshPhongMaterial({ color: 0x222218, specular: 0x111111, shininess: 10 });
    const tMat = new THREE.MeshPhongMaterial({ color: 0x181810, emissive: 0x0a0800, emissiveIntensity: 0.4 });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(11, 1.2, 3.4), lMat); chassis.position.y = 1.0; grp.add(chassis);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(3, 2.2, 3.4), dMat); cab.position.set(-4, 2.1, 0); grp.add(cab);
    const ws = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 2.8), new THREE.MeshPhongMaterial({ color: 0x334455, transparent: true, opacity: 0.55 }));
    ws.position.set(-2.45, 2.2, 0); grp.add(ws);

    // Rotating Turret Base
    const turretBase = new THREE.Group();
    turretBase.position.set(2.5, 1.6, 0);
    grp.add(turretBase);

    // Launch Arm (Elevation)
    const arm = new THREE.Group();
    const armB = new THREE.Mesh(new THREE.BoxGeometry(0.7, 4.8, 0.7), dMat); armB.position.y = 2.4; arm.add(armB);
    turretBase.add(arm);

    const pod = new THREE.Group();
    const podBox = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.5, 2.6), dMat); pod.add(podBox);
    const tubeGeo = new THREE.CylinderGeometry(0.18, 0.18, 5.0, 10); tubeGeo.rotateX(Math.PI / 2);
    const innerGeo = new THREE.CylinderGeometry(0.14, 0.14, 5.05, 8); innerGeo.rotateX(Math.PI / 2);
    const innerMat = new THREE.MeshPhongMaterial({ color: 0x050505, emissive: 0x100800, emissiveIntensity: 0.5 });

    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
            const tx = -1.5 + col * 1.0, ty = -0.45 + row * 0.52;
            const t = new THREE.Mesh(tubeGeo, tMat); t.position.set(tx, ty, 0); pod.add(t);
            const ti = new THREE.Mesh(innerGeo, innerMat); ti.position.set(tx, ty, 0); pod.add(ti);
        }
    }
    pod.position.copy(armB.position).add(new THREE.Vector3(-0.5, 2.1, 0));
    arm.add(pod);

    // Wheels (Visual only for now)
    const wGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.45, 14); wGeo.rotateX(Math.PI / 2);
    [-3.5, -0.2, 3.1].forEach(ax => {
        [-1.95, 1.95].forEach(sz => {
            const w = new THREE.Mesh(wGeo, mMat); w.position.set(ax, 0.62, sz); grp.add(w);
        });
    });

    grp.position.set(wx, wy, wz);
    scene.add(grp);

    return { 
        group: grp, turretBase, arm, pod, 
        worldPos: new THREE.Vector3(wx, wy, wz),
        currentYaw: 0, currentPitch: -Math.PI * 0.22,
        targetYaw: 0, targetPitch: -Math.PI * 0.22,
        isAligned: true
    };
}

export function updateLauncher(l, dt) {
    // Smooth Turret/Arm rotation
    const lerpSpeed = 2.5;
    l.currentYaw += (l.targetYaw - l.currentYaw) * dt * lerpSpeed;
    l.currentPitch += (l.targetPitch - l.currentPitch) * dt * lerpSpeed;
    
    l.turretBase.rotation.y = l.currentYaw;
    l.arm.rotation.z = l.currentPitch;
    
    l.isAligned = Math.abs(l.targetYaw - l.currentYaw) < 0.02 && Math.abs(l.targetPitch - l.currentPitch) < 0.02;
}

export function fireSalvo(scene, camera, missiles, launcher, targetWorld, count, onFired) {
    if (!targetWorld) return;
    
    // First, compute the required solution to orient the pod
    const dummyPos = new THREE.Vector3(launcher.worldPos.x + 2.5, launcher.worldPos.y + 5, launcher.worldPos.z);
    const initialVel = computeVel(dummyPos, targetWorld);
    
    // Set target azimuth and elevation
    launcher.targetYaw = Math.atan2(-initialVel.z, initialVel.x);
    // Rough estimation for elevation angle
    const speedH = Math.hypot(initialVel.x, initialVel.z);
    launcher.targetPitch = -Math.atan2(initialVel.y, speedH) - Math.PI * 0.1;

    const targets = scatterTargets(targetWorld, count);
    
    // Delay firing until aligned
    const checkAlignment = setInterval(() => {
        if (launcher.isAligned) {
            clearInterval(checkAlignment);
            executeLaunch();
        }
    }, 100);

    function executeLaunch() {
        for (let i = 0; i < count; i++) {
            const delay = i * 0.18 + Math.random() * 0.05;
            setTimeout(() => {
                // Recalculate tube world positions at moment of launch
                const tubes = [];
                launcher.pod.children.forEach(c => {
                    if (c.geometry.type === 'CylinderGeometry') {
                        const wp = new THREE.Vector3(); c.getWorldPosition(wp);
                        tubes.push(wp);
                    }
                });
                
                const tubeIdx = i % tubes.length;
                const launchPos = tubes[tubeIdx];
                const tgt = targets[i];
                const vel = computeVel(launchPos, tgt);
                
                missiles.push(createMissile(scene, camera, launchPos, vel));
                onFired();
                playLaunch(launchPos.x, launchPos.y, launchPos.z);
                for (let j = 0; j < 18; j++) {
                    const d = { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: (Math.random() - 0.5) * 2 };
                    spawn(launchPos.x, launchPos.y, launchPos.z, d.x * 10 + vel.x * 0.06, Math.abs(d.y) * 7 + 3, d.z * 10 + vel.z * 0.06, 1, 0.55, 0.05, 0.8 + Math.random() * 1.8, 0.3 + Math.random() * 0.5, 0);
                }
            }, delay * 1000);
        }
    }
}

export function scatterTargets(center, count) {
    const radius = 8 + count * 1.2;
    const targets = [];
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
        const r = Math.sqrt(Math.random()) * radius;
        const tx = center.x + Math.cos(angle) * r + (Math.random() - 0.5) * 6;
        const tz = center.z + Math.sin(angle) * r + (Math.random() - 0.5) * 6;
        targets.push(new THREE.Vector3(tx, gnd(tx, tz) + 0.2, tz));
    }
    return targets;
}

