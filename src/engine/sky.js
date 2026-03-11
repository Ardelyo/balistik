import * as THREE from 'three';
import { CFG } from '../game/config.js';

export function buildSky(scene, skyMat) {
    const geo = new THREE.SphereGeometry(4800, 24, 14);
    const sky = new THREE.Mesh(geo, skyMat);
    scene.add(sky);
    return sky;
}

export function createSkyMaterial() {
    return new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: { 
            sunDir: { value: new THREE.Vector3(0, 1, 0) },
            altFactor: { value: 0.0 }, // 0.0 at ground, 1.0 at high altitude
            flashExp: { value: 0.0 },   // Explosion flash intensity
            time: { value: 0.0 }
        },
        vertexShader: `varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `
            uniform vec3 sunDir;
            uniform float altFactor;
            uniform float flashExp;
            uniform float time;
            varying vec3 vD;

            float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
            float noise(vec2 p) {
                vec2 i = floor(p), f = fract(p);
                f = f*f*(3.0-2.0*f);
                return mix(mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), f.x),
                           mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
            }
            float fbm(vec2 p) {
                float v = 0.0, a = 0.5;
                for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
                return v;
            }

            void main(){
                vec3 d=normalize(vD);float h=clamp(d.y,0.0,1.0);
                float sH=sunDir.y;
                float dayT=smoothstep(-0.06,0.38,sH);
                float nightT=1.0-smoothstep(-0.08,0.09,sH);
                float setT=smoothstep(-0.08,0.14,sH)*(1.0-smoothstep(0.14,0.55,sH));
                
                vec3 dayZ=vec3(0.1,0.3,0.85),dayH=vec3(0.6,0.8,1.0);
                vec3 setZ=vec3(0.04,0.05,0.15),setH=vec3(1.0,0.4,0.1);
                vec3 ngtZ=vec3(0.001,0.002,0.005),ngtH=vec3(0.005,0.006,0.015);
                
                // Altitude effect: Sky darkens as we go higher
                dayZ = mix(dayZ, vec3(0.01, 0.02, 0.08), altFactor);
                dayH = mix(dayH, vec3(0.05, 0.1, 0.3), altFactor);
                ngtZ = mix(ngtZ, vec3(0.0), altFactor * 0.5);

                vec3 zen=mix(dayZ,setZ,setT); zen=mix(ngtZ,zen,1.0-nightT);
                vec3 hor=mix(dayH,setH,setT); hor=mix(ngtH,hor,1.0-nightT);
                vec3 sky=mix(hor,zen,pow(h,0.45));
                
                // Clouds
                vec2 uv = vD.xz / (vD.y + 0.0001);
                float cloudScale = 0.0005;
                float c = fbm(uv * 1200.0 * cloudScale + time * 0.05);
                float cloudMask = smoothstep(0.4, 0.7, c) * smoothstep(0.0, 0.2, h);
                vec3 cloudCol = mix(vec3(1.0), vec3(0.2, 0.2, 0.25), nightT);
                cloudCol = mix(cloudCol, setH, setT * 0.8);
                sky = mix(sky, cloudCol, cloudMask * (1.0 - altFactor * 0.9));

                // Stars (Cleaner, non-grainy)
                if (nightT > 0.1) {
                    vec3 sp = d * 1200.0;
                    float s = hash(floor(sp.xz * 0.5) + floor(sp.y * 0.5));
                    if (s > 0.998) {
                        float twinkle = sin(time * 2.0 + s * 100.0) * 0.5 + 0.5;
                        sky += vec3(0.9, 0.95, 1.0) * pow(s, 10.0) * nightT * twinkle * (1.0 - h * 0.5);
                    }
                }
                
                // Sun
                vec3 sn=normalize(sunDir); float sd=dot(d,sn);
                float disc=smoothstep(0.9993,0.9998,sd)*(1.0-nightT*0.85);
                vec3 sCol=mix(vec3(1.0,0.45,0.08),vec3(1.0,1.0,0.92),dayT);
                sky+=sCol*disc*9.0;
                
                // Atmospheric glow / Explosion flash
                sky += vec3(1.0, 0.6, 0.3) * flashExp * 0.8;

                gl_FragColor=vec4(sky,1.0);
            }`
    });
}

