import * as THREE from 'three';
import { CFG, gnd } from '../game/config.js';

export function buildTerrain(scene) {
    const geo = new THREE.PlaneGeometry(CFG.TERRAIN_SZ, CFG.TERRAIN_SZ, CFG.TERRAIN_SEG, CFG.TERRAIN_SEG);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, gnd(p.getX(i), p.getZ(i)));
    geo.computeVertexNormals();

    const terrainMat = new THREE.ShaderMaterial({
        uniforms: { sunDir: { value: new THREE.Vector3(0, 1, 0) }, camPos: { value: new THREE.Vector3() } },
        vertexShader: `
            varying vec3 vN,vW;varying float vH;
            void main(){vec4 wp=modelMatrix*vec4(position,1.0);vW=wp.xyz;vN=normalize(normalMatrix*normal);vH=position.y;gl_Position=projectionMatrix*viewMatrix*wp;}`,
        fragmentShader: `
            uniform vec3 sunDir,camPos;varying vec3 vN,vW;varying float vH;
            void main(){
                vec3 sb=vec3(0.70,0.52,0.27),sh=vec3(0.86,0.70,0.40),rc=vec3(0.50,0.38,0.27);
                float sl=1.0-vN.y;
                vec3 base=mix(sb,sh,clamp(vH/18.0,0.0,1.0));
                base=mix(base,rc,smoothstep(0.22,0.62,sl));
                float rip=sin(vW.x*0.85+vW.z*0.48)*0.014+sin(vW.x*2.1-vW.z*1.6)*0.006;
                base+=rip*0.06;
                float sH=clamp(sunDir.y,-0.2,1.0);
                float dayT=smoothstep(-0.04,0.3,sH),nightT=1.0-smoothstep(-0.07,0.07,sH),setT=smoothstep(-0.07,0.12,sH)*(1.0-smoothstep(0.12,0.48,sH));
                vec3 sCol=mix(vec3(1.0,0.42,0.08),vec3(1.0,0.92,0.76),dayT);
                vec3 aCol=mix(vec3(0.05,0.07,0.15),vec3(0.22,0.19,0.14),dayT);
                aCol=mix(vec3(0.025,0.03,0.08),aCol,1.0-nightT);
                float NL=max(dot(vN,normalize(sunDir)),0.0);
                float diff=NL*mix(0.18,2.2,dayT*(1.0-nightT*0.88));
                vec3 color=base*(aCol+sCol*diff);
                float dist=length(camPos-vW);
                float fg=smoothstep(550.0,2000.0,dist);
                vec3 fc=mix(vec3(0.68,0.58,0.42),vec3(0.08,0.10,0.20),nightT);
                color=mix(color,fc,fg*0.65);
                gl_FragColor=vec4(color,1.0);
            }`
    });

    const m = new THREE.Mesh(geo, terrainMat);
    m.receiveShadow = true;
    scene.add(m);
    return { mesh: m, material: terrainMat };
}

export function buildEnv(scene) {
    const dMat = new THREE.MeshLambertMaterial({ color: 0xb07836 });
    const rMat = new THREE.MeshLambertMaterial({ color: 0x665030 });
    for (let i = 0; i < 70; i++) {
        const a = Math.random() * Math.PI * 2, r = 60 + Math.random() * 900;
        const x = Math.cos(a) * r, z = Math.sin(a) * r, h = 3 + Math.random() * 10;
        const g = new THREE.SphereGeometry(1, 7, 5); g.scale(13 + Math.random() * 28, h, 16 + Math.random() * 36);
        const m = new THREE.Mesh(g, dMat); m.position.set(x, gnd(x, z) + h * 0.45, z); m.receiveShadow = true; scene.add(m);
    }
    for (let i = 0; i < 50; i++) {
        const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 700;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        const g = new THREE.DodecahedronGeometry(0.6 + Math.random() * 4, 0);
        const m = new THREE.Mesh(g, rMat); m.position.set(x, gnd(x, z) + 0.25, z); m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); m.castShadow = true; scene.add(m);
    }
}
