import * as THREE from 'three';
import { CFG, gnd, lerp } from '../game/config.js';

const MAP_SZ = CFG.MAP_SZ;
const HALF_WORLD = CFG.MAP_WORLD / 2;

export function buildMapBg() {
    const c = document.createElement('canvas'); c.width = c.height = MAP_SZ;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(MAP_SZ, MAP_SZ);
    const step = MAP_SZ;
    for (let py = 0; py < step; py++) {
        for (let px = 0; px < step; px++) {
            const wx = (px / step - 0.5) * CFG.MAP_WORLD;
            const wz = (py / step - 0.5) * CFG.MAP_WORLD;
            const h = gnd(wx, wz);
            const hn = Math.max(0, Math.min(1, (h + 35) / 65));
            let r, g, b;
            if (hn < 0.3) { const t = hn / 0.3; r = lerp(28, 95, t); g = lerp(22, 72, t); b = lerp(14, 42, t); }
            else if (hn < 0.65) { const t = (hn - 0.3) / 0.35; r = lerp(95, 178, t); g = lerp(72, 140, t); b = lerp(42, 72, t); }
            else { const t = (hn - 0.65) / 0.35; r = lerp(178, 135, t); g = lerp(140, 108, t); b = lerp(72, 80, t); }
            const cont = Math.abs(Math.sin(h * 0.75)) < 0.055 ? 0.72 : 1.0;
            const i = (py * MAP_SZ + px) * 4;
            img.data[i] = r * cont; img.data[i + 1] = g * cont; img.data[i + 2] = b * cont; img.data[i + 3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    ctx.strokeStyle = 'rgba(255,160,40,0.07)'; ctx.lineWidth = 0.5;
    for (let i = 0; i <= 10; i++) {
        const v = (i / 10) * MAP_SZ;
        ctx.beginPath(); ctx.moveTo(v, 0); ctx.lineTo(v, MAP_SZ); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, v); ctx.lineTo(MAP_SZ, v); ctx.stroke();
    }
    return c;
}

let sweepAngle = 0;

function w2m(wx, wz) { return { mx: (wx / HALF_WORLD * 0.5 + 0.5) * MAP_SZ, my: (wz / HALF_WORLD * 0.5 + 0.5) * MAP_SZ }; }

export function drawMap(ctx, bg, explosions, missiles, launcher, camera, targetWorld, yaw) {
    sweepAngle = (sweepAngle + 0.02) % (Math.PI * 2);
    ctx.drawImage(bg, 0, 0);

    // Grid / Radar Circles
    ctx.strokeStyle = 'rgba(255,160,40,0.1)';
    ctx.lineWidth = 0.5;
    [1000, 2000, 3000].forEach(range => {
        const r = (range / CFG.MAP_WORLD) * MAP_SZ;
        ctx.beginPath(); ctx.arc(MAP_SZ / 2, MAP_SZ / 2, r, 0, Math.PI * 2); ctx.stroke();
    });

    // Radar Sweep
    const grd = ctx.createConicGradient(sweepAngle, MAP_SZ / 2, MAP_SZ / 2);
    grd.addColorStop(0, 'rgba(255,160,40,0.2)');
    grd.addColorStop(0.1, 'rgba(255,160,40,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(MAP_SZ / 2, MAP_SZ / 2, MAP_SZ * 0.8, 0, Math.PI * 2); ctx.fill();

    for (let i = explosions.length - 1; i >= 0; i--) {
        const e = explosions[i];
        e.life -= 0.016;
        if (e.life <= 0) { explosions.splice(i, 1); continue; }
        const t = e.life / 2.5;
        const { mx, my } = w2m(e.wx, e.wz);
        const g = ctx.createRadialGradient(mx, my, 0, mx, my, 10 * (1 - t) + 2);
        g.addColorStop(0, `rgba(255,120,30,${Math.min(1, t * 3) * 0.9})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath();
        ctx.arc(mx, my, 10 * (1 - t) + 4, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = 'rgba(255,160,40,0.75)';
    for (const m of missiles) {
        if (!m.alive) continue;
        const { mx, my } = w2m(m.mesh.position.x, m.mesh.position.z);
        ctx.beginPath(); ctx.arc(mx, my, 1.8, 0, Math.PI * 2); ctx.fill();
    }

    if (targetWorld) {
        const { mx, my } = w2m(targetWorld.x, targetWorld.z);
        ctx.strokeStyle = '#ff3311'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(mx, my, 6, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([2, 2]);
        ctx.beginPath(); ctx.moveTo(mx - 12, my); ctx.lineTo(mx + 12, my); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mx, my - 12); ctx.lineTo(mx, my + 12); ctx.stroke();
        ctx.setLineDash([]);
    }

    if (launcher) {
        const { mx, my } = w2m(launcher.worldPos.x, launcher.worldPos.z);
        ctx.save();
        ctx.translate(mx, my);
        // Assuming launcher is static or we want to show its general orientation
        // For now, let's just make the LNC label more readable and add a small orientation notch
        ctx.strokeStyle = '#ffaa28'; ctx.lineWidth = 1.5;
        ctx.strokeRect(-4, -4, 8, 8);
        ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(0, -4); ctx.stroke();
        ctx.fillStyle = '#ffaa28'; ctx.font = 'bold 7px monospace';
        ctx.fillText('PLN', 6, 3);
        ctx.restore();
    }

    const { mx: px, my: py } = w2m(camera.position.x, camera.position.z);
    ctx.save();
    ctx.translate(px, py);
    // Correcting the yaw for the map. 
    // In Three.js, Y is up, X/Z is the plane. Map is X/Y.
    // Z in world = Y on map.
    ctx.rotate(-yaw); 
    ctx.strokeStyle = '#50ff78'; ctx.lineWidth = 1.8;
    ctx.beginPath(); 
    ctx.moveTo(0, -8); // Tip
    ctx.lineTo(5, 5);  // Bottom right
    ctx.lineTo(0, 2);  // Notch
    ctx.lineTo(-5, 5); // Bottom left
    ctx.closePath(); 
    ctx.stroke();
    ctx.restore();
}
