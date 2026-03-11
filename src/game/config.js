export const CFG = {
    MAX_PART: 9000,
    MAX_MISS: 80,
    TERRAIN_SZ: 2500,
    TERRAIN_SEG: 80,
    DAY_DUR: 500,
    GRAVITY: 13.5,
    PIXEL_RATIO: Math.min(window.devicePixelRatio || 1, 1.5),
    SHADOW_SZ: 1024,
    POOL_LIGHTS: 7,
    MAP_SZ: 240,
    MAP_WORLD: 2500,
    WIND: { x: 4.5, z: -2.1, variance: 0.8, jetStreamAlt: 600, jetStreamScale: 3.5 }, 
    DRAG_COEFF: 0.0012, 
    INACCURACY: 0.025, 
    ATMOS_SCALE_HEIGHT: 550, 
    SEA_LEVEL_DENSITY: 1.0,
    REENTRY_VEL: 180, 
};

export function noise(x, z) {
    return Math.sin(x * 0.007) * Math.cos(z * 0.0058) * 13
        + Math.sin(x * 0.018 + 1.3) * Math.cos(z * 0.016) * 5.5
        + Math.sin(x * 0.044) * Math.cos(z * 0.038) * 2.0
        + Math.sin(x * 0.0008) * Math.cos(z * 0.001) * 30;
}

export function gnd(x, z) {
    const flat = 1 - Math.exp(-(x * x + z * z) / (88 * 88));
    return noise(x, z) * flat;
}

export function lerp(a, b, t) { return a + (b - a) * t; }
