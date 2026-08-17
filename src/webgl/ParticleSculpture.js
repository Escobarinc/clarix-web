import * as THREE from 'three';
import gsap from 'gsap';
import { vertexShader, fragmentShader } from './shaders.js';
import { FORMATIONS } from './formations.js';

/**
 * The central digital object. A GPU point sculpture that lerps between
 * precomputed formations (its state space) while a curl field keeps it alive.
 */
export default class ParticleSculpture {
  constructor(count, quality) {
    this.count = count;
    this.quality = quality;
    this._cache = new Map();
    this.current = 'vortex';

    this.geometry = new THREE.BufferGeometry();

    const posA = this._formation('vortex');
    const posB = this._formation('vortex');
    const scale = new Float32Array(count);
    const seed = new Float32Array(count);
    const colorMix = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      scale[i] = 0.4 + Math.pow(Math.random(), 2) * 1.4;
      seed[i] = Math.random();
      colorMix[i] = Math.random();
    }

    this.geometry.setAttribute('aPositionA', new THREE.BufferAttribute(posA, 3));
    this.geometry.setAttribute('aPositionB', new THREE.BufferAttribute(posB, 3));
    this.geometry.setAttribute('aScale', new THREE.BufferAttribute(scale, 1));
    this.geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.geometry.setAttribute('aColorMix', new THREE.BufferAttribute(colorMix, 1));
    // position attribute required by three for frustum bounds
    this.geometry.setAttribute('position', new THREE.BufferAttribute(posA.slice(), 3));
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 9);

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: quality.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: {
        uTime:        { value: 0 },
        uBlend:       { value: 0 },
        uSize:        { value: quality.size },
        uNoiseAmp:    { value: 0.16 },
        uNoiseScale:  { value: 0.36 },
        uPointer:     { value: 0 },
        uPointerPos:  { value: new THREE.Vector3(999, 999, 999) },
        uScrollVel:   { value: 0 },
        uDispersion:  { value: 0 },
        uPixelRatio:  { value: quality.pixelRatio },
        uOpacity:     { value: quality.additive ? 0.46 : 0.85 },
        uFadeNear:    { value: 6.0 },
        uFadeFar:     { value: 20.0 },
        uColorBase:   { value: new THREE.Color('#8ec5ff') }, // light blue
        uColorCool:   { value: new THREE.Color('#0c2551') }, // deep blue
        uColorAccent: { value: new THREE.Color('#3d8bff') }, // luminous mid blue
      },
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }

  _formation(name) {
    if (!this._cache.has(name)) {
      const fn = FORMATIONS[name] || FORMATIONS.knot;
      this._cache.set(name, fn(this.count));
    }
    return this._cache.get(name);
  }

  /** Transition the sculpture to a new formation with a dispersion burst. */
  morphTo(name, duration = 2.0) {
    if (name === this.current || !FORMATIONS[name]) return;
    const u = this.material.uniforms;
    const attrA = this.geometry.attributes.aPositionA;
    const attrB = this.geometry.attributes.aPositionB;

    // freeze the currently-resolved blend into A so transitions can chain smoothly
    const b = u.uBlend.value;
    const A = attrA.array, B = attrB.array;
    for (let i = 0; i < A.length; i++) A[i] = A[i] + (B[i] - A[i]) * b;
    attrA.needsUpdate = true;

    // set B = target
    B.set(this._formation(name));
    attrB.needsUpdate = true;
    u.uBlend.value = 0;
    this.current = name;

    gsap.killTweensOf(u.uBlend);
    gsap.killTweensOf(u.uDispersion);
    gsap.to(u.uBlend, { value: 1, duration, ease: 'power2.inOut' });
    gsap.fromTo(u.uDispersion,
      { value: 0.9 },
      { value: 0, duration: duration * 1.1, ease: 'power2.out' });
  }

  setScrollVelocity(v) {
    // smooth into the uniform so bursts feel weighty
    const u = this.material.uniforms.uScrollVel;
    u.value += (Math.min(Math.abs(v), 1.2) - u.value) * 0.1;
  }

  setPointer(active, pos) {
    const u = this.material.uniforms;
    u.uPointer.value += ((active ? 1 : 0) - u.uPointer.value) * 0.08;
    if (pos) u.uPointerPos.value.lerp(pos, 0.12);
  }

  update(time) {
    this.material.uniforms.uTime.value = time;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
