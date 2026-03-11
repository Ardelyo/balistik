import * as THREE from 'three';

function makeTex(fn, size = 256) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    fn(c.getContext('2d'), size);
    return new THREE.CanvasTexture(c);
}

export const TEX_CORE = makeTex((ctx, s) => {
    const h = s / 2, G = ctx.createRadialGradient(h, h, 0, h, h, h);
    G.addColorStop(0, 'rgba(255,255,255,1)');
    G.addColorStop(0.05, 'rgba(255,240,180,1)');
    G.addColorStop(0.18, 'rgba(255,140,20,0.9)');
    G.addColorStop(0.45, 'rgba(220,60,0,0.45)');
    G.addColorStop(0.8, 'rgba(100,15,0,0.12)');
    G.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = G; ctx.fillRect(0, 0, s, s);
});

export const TEX_HALO = makeTex((ctx, s) => {
    const h = s / 2, G = ctx.createRadialGradient(h, h, 0, h, h, h);
    G.addColorStop(0, 'rgba(255,160,40,0.5)');
    G.addColorStop(0.35, 'rgba(255,90,5,0.25)');
    G.addColorStop(0.7, 'rgba(180,30,0,0.08)');
    G.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = G; ctx.fillRect(0, 0, s, s);
}, 128);

export const TEX_STREAK = makeTex((ctx, s) => {
    const SH = ctx.createLinearGradient(0, s / 2, s, s / 2);
    SH.addColorStop(0, 'rgba(255,180,60,0)');
    SH.addColorStop(0.38, 'rgba(255,190,70,0.35)');
    SH.addColorStop(0.5, 'rgba(255,240,160,0.85)');
    SH.addColorStop(0.62, 'rgba(255,190,70,0.35)');
    SH.addColorStop(1, 'rgba(255,180,60,0)');
    ctx.fillStyle = SH; ctx.fillRect(0, s * 0.42, s, s * 0.16);
    [[80, 70, 8, 0.18], [160, 150, 5, 0.14], [200, 100, 4, 0.12]].forEach(([dx, dy, r, a]) => {
        const g = ctx.createRadialGradient(dx, dy, 0, dx, dy, r);
        g.addColorStop(0, `rgba(200,220,255,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(dx, dy, r, 0, Math.PI * 2); ctx.fill();
    });
}, 256);
