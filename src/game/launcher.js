import * as THREE from 'three';
import { gnd } from './config.js';
import { computeVel, createMissile } from './missileSystem.js';
import { spawn } from './particleSystem.js';

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

    [-1.85, 1.85].forEach(sx => {
        const fdr = new THREE.Mesh(new THREE.BoxGeometry(11, 0.25, 0.5), dMat); fdr.position.set(0, 0.62, sx * 1.8); grp.add(fdr);
    });

    const wGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.45, 14); wGeo.rotateX(Math.PI / 2);
    const hubGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.48, 8); hubGeo.rotateX(Math.PI / 2);
    const hubMat = new THREE.MeshPhongMaterial({ color: 0x111111, specular: 0x333333, shininess: 80 });
    [-3.5, -0.2, 3.1].forEach(ax => {
        [-1.95, 1.95].forEach(sz => {
            const w = new THREE.Mesh(wGeo, mMat); w.position.set(ax, 0.62, sz); grp.add(w);
            const h = new THREE.Mesh(hubGeo, hubMat); h.position.set(ax, 0.62, sz); grp.add(h);
        });
    });

    const arm = new THREE.Group(); arm.position.set(2.5, 1.6, 0);
    const armB = new THREE.Mesh(new THREE.BoxGeometry(0.7, 4.8, 0.7), dMat); armB.position.y = 2.4; arm.add(armB);
    arm.rotation.z = -Math.PI * 0.22; grp.add(arm);

    const hingeGeo = new THREE.CylinderGeometry(0.35, 0.35, 3.6, 10); hingeGeo.rotateX(Math.PI / 2);
    const hinge = new THREE.Mesh(hingeGeo, mMat); hinge.position.set(2.5, 1.65, 0); grp.add(hinge);

    const pod = new THREE.Group();
    const podBox = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.5, 2.6), dMat); pod.add(podBox);
    const fp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 2.6), mMat); fp.position.x = -2.65; pod.add(fp);

    const tubeGeo = new THREE.CylinderGeometry(0.18, 0.18, 5.0, 10); tubeGeo.rotateX(Math.PI / 2);
    const innerGeo = new THREE.CylinderGeometry(0.14, 0.14, 5.05, 8); innerGeo.rotateX(Math.PI / 2);
    const innerMat = new THREE.MeshPhongMaterial({ color: 0x050505, emissive: 0x100800, emissiveIntensity: 0.5 });

    const tubeLaunchPos = [];
    const armPivot = new THREE.Vector3(wx + 2.5, wy + 1.6, wz);
    const armAngle = -Math.PI * 0.22; const armLen = 4.8;
    const podCenter = new THREE.Vector3(
        armPivot.x + Math.cos(armAngle + Math.PI / 2) * armLen * 0.85 - 0.5,
        armPivot.y + Math.sin(armAngle + Math.PI / 2) * armLen * 0.85 + 2.0,
        wz
    );

    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
            const tx = -1.5 + col * 1.0, ty = -0.45 + row * 0.52;
            const t = new THREE.Mesh(tubeGeo, tMat); t.position.set(tx, ty, 0); pod.add(t);
            const ti = new THREE.Mesh(innerGeo, innerMat); ti.position.set(tx, ty, 0); pod.add(ti);
            tubeLaunchPos.push(new THREE.Vector3(podCenter.x + tx, podCenter.y + ty, wz));
        }
    }
    pod.position.copy(armB.position).add(new THREE.Vector3(-0.5, 2.1, 0));
    arm.add(pod);

    grp.position.set(wx, wy, wz);
    grp.castShadow = true;
    scene.add(grp);

    return { group: grp, worldPos: new THREE.Vector3(wx, wy, wz), tubePositions: tubeLaunchPos };
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

export function fireSalvo(scene, camera, missiles, launcher, targetWorld, count, onFired) {
    if (!targetWorld) return;
    const targets = scatterTargets(targetWorld, count);
    const tubes = launcher.tubePositions;
    for (let i = 0; i < count; i++) {
        const delay = i * 0.14 + Math.random() * 0.04;
        const tubeIdx = i % tubes.length;
        const tp = tubes[tubeIdx];
        const launchPos = tp.clone();
        const tgt = targets[i];
        setTimeout(() => {
            const vel = computeVel(launchPos, tgt);
            missiles.push(createMissile(scene, camera, launchPos, vel));
            onFired();
            for (let j = 0; j < 18; j++) {
                const d = { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: (Math.random() - 0.5) * 2 };
                spawn(launchPos.x, launchPos.y, launchPos.z, d.x * 10 + vel.x * 0.06, Math.abs(d.y) * 7 + 3, d.z * 10 + vel.z * 0.06, 1, 0.55, 0.05, 0.8 + Math.random() * 1.8, 0.3 + Math.random() * 0.5, 0);
            }
            for (let j = 0; j < 8; j++) {
                spawn(launchPos.x, launchPos.y, launchPos.z, (Math.random() - 0.5) * 8, 2 + Math.random() * 5, (Math.random() - 0.5) * 8, 0.3, 0.3, 0.3, 2 + Math.random() * 3, 1.2 + Math.random() * 2, 1);
            }
        }, delay * 1000);
    }
}
