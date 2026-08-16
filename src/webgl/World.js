import * as THREE from 'three';
import ParticleSculpture from './ParticleSculpture.js';
import CameraRig from './CameraRig.js';
import { detectQuality } from './Quality.js';

/**
 * The realtime stage. Owns the renderer, the sculpture and the camera rig,
 * and exposes a small surface the DOM layer drives (scroll, pointer, morph).
 */
export default class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.quality = detectQuality();
    this.clock = new THREE.Clock();
    this._raf = null;
    this._running = false;
    this._pointerActive = false;
    this._pointerNDC = new THREE.Vector2(0, 0);
    this._raycaster = new THREE.Raycaster();
    this._plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this._hit = new THREE.Vector3();

    this._initRenderer();
    this._initScene();
    window.addEventListener('resize', this._onResize);
  }

  get supported() { return this._supported; }

  _initRenderer() {
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: false,
        alpha: true,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false,
      });
      this._supported = true;
    } catch (e) {
      this._supported = false;
      return;
    }
    this.renderer.setPixelRatio(this.quality.pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
  }

  _initScene() {
    if (!this._supported) return;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x06070a, 0.038);

    this.camera = new THREE.PerspectiveCamera(
      42, window.innerWidth / window.innerHeight, 0.1, 100
    );
    this.rig = new CameraRig(this.camera);

    this.sculpture = new ParticleSculpture(this.quality.count, this.quality);
    this.scene.add(this.sculpture.points);

    // a slow autonomous drift so the object always feels alive
    this._group = new THREE.Group();
    this._group.add(this.sculpture.points);
    this.scene.add(this._group);
  }

  /* ---------- public controls ---------- */

  setScroll(progress, velocity) {
    if (!this._supported) return;
    this._scrollP = progress;
    this.rig.setScroll(progress);
    this.sculpture.setScrollVelocity(velocity || 0);
  }

  setPointer(clientX, clientY) {
    if (!this._supported) return;
    this._pointerActive = true;
    const nx = (clientX / window.innerWidth) * 2 - 1;
    const ny = -((clientY / window.innerHeight) * 2 - 1);
    this._pointerNDC.set(nx, ny);
    this.rig.setPointer(nx, ny);
  }

  clearPointer() { this._pointerActive = false; }

  morphTo(name, duration) {
    if (this._supported) this.sculpture.morphTo(name, duration);
  }

  /* ---------- loop ---------- */

  start() {
    if (!this._supported || this._running) return;
    this._running = true;
    this.clock.start();
    this._tick();
  }

  pause() { this._running = false; if (this._raf) cancelAnimationFrame(this._raf); }
  resume() { if (this._supported && !this._running) { this._running = true; this._tick(); } }

  _tick = () => {
    if (!this._running) return;
    this._raf = requestAnimationFrame(this._tick);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;

    // resolve pointer onto the sculpture's z-plane for 3D interaction
    if (this._pointerActive) {
      this._raycaster.setFromCamera(this._pointerNDC, this.camera);
      this._raycaster.ray.intersectPlane(this._plane, this._hit);
      this.sculpture.setPointer(true, this._hit);
    } else {
      this.sculpture.setPointer(false, null);
    }

    // in the hero the sculpture sits to the right (headline holds the left);
    // it glides back to centre as the visitor scrolls into the page
    const p = this._scrollP || 0;
    const heroT = 1 - this._smooth01(Math.min(p / 0.12, 1));
    const offX = heroT * (window.innerWidth < 860 ? 0.0 : 3.6);
    const offY = heroT * 0.5;
    this._group.position.x += (offX - this._group.position.x) * 0.08;
    this._group.position.y += (offY - this._group.position.y) * 0.08;

    this._group.rotation.y = t * 0.02;
    this._group.rotation.x = Math.sin(t * 0.1) * 0.05;

    this.rig.update(dt);
    this.sculpture.update(t);
    this.renderer.render(this.scene, this.camera);
  };

  _smooth01(x) { return x * x * (3 - 2 * x); }

  _onResize = () => {
    if (!this._supported) return;
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    // re-evaluate DPR (e.g. moving between displays)
    this.sculpture.material.uniforms.uPixelRatio.value = this.quality.pixelRatio;
  };
}
