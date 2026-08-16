import * as THREE from 'three';

/**
 * Cinematic camera rig. The camera has mass: it eases toward a target
 * that is nudged by pointer parallax and driven along a path by scroll.
 * The viewer feels like they are gently steering a film, not flying a DCC tool.
 */
export default class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.pointer = new THREE.Vector2(0, 0);
    this._pointerEased = new THREE.Vector2(0, 0);
    this.scroll = 0;        // 0..1 through the page
    this._scrollEased = 0;

    // keyframed camera stations along the scroll timeline
    this.stations = [
      { pos: new THREE.Vector3(0, 0.2, 8.4),  look: new THREE.Vector3(0, 0, 0) },     // hero
      { pos: new THREE.Vector3(2.4, 0.6, 7.0), look: new THREE.Vector3(0.4, 0, 0) },   // manifesto
      { pos: new THREE.Vector3(0, -0.4, 9.2),  look: new THREE.Vector3(0, -0.2, 0) },  // work
      { pos: new THREE.Vector3(-2.0, 0.8, 7.6),look: new THREE.Vector3(-0.3, 0.1, 0) },// capabilities
      { pos: new THREE.Vector3(0.6, 0.2, 8.0), look: new THREE.Vector3(0, 0, 0) },     // studio
      { pos: new THREE.Vector3(0, 0, 6.2),     look: new THREE.Vector3(0, 0, 0) },     // contact
    ];
    this._pos = this.stations[0].pos.clone();
    this._look = this.stations[0].look.clone();
    this._target = new THREE.Vector3();
    this._lookTarget = new THREE.Vector3();
  }

  setPointer(x, y) { this.pointer.set(x, y); }
  setScroll(p) { this.scroll = THREE.MathUtils.clamp(p, 0, 1); }

  _sample(arr, t, key) {
    const n = this.stations.length - 1;
    const f = t * n;
    const i = Math.min(Math.floor(f), n - 1);
    const k = f - i;
    return this._target.copy(this.stations[i][key])
      .lerp(this.stations[i + 1][key], this._smooth(k));
  }
  _smooth(x) { return x * x * (3 - 2 * x); }

  update(dt) {
    // ease scroll + pointer for weight
    this._scrollEased += (this.scroll - this._scrollEased) * Math.min(1, dt * 3.2);
    this._pointerEased.x += (this.pointer.x - this._pointerEased.x) * Math.min(1, dt * 4);
    this._pointerEased.y += (this.pointer.y - this._pointerEased.y) * Math.min(1, dt * 4);

    const posT = this._sample(this.stations, this._scrollEased, 'pos').clone();
    const lookT = this._sample(this.stations, this._scrollEased, 'look').clone();

    // pointer parallax — subtle, orbital
    posT.x += this._pointerEased.x * 1.1;
    posT.y += this._pointerEased.y * 0.7;

    this._pos.lerp(posT, Math.min(1, dt * 2.2));
    this._look.lerp(lookT, Math.min(1, dt * 2.6));

    this.camera.position.copy(this._pos);
    this._lookTarget.copy(this._look);
    this.camera.lookAt(this._lookTarget);
  }
}
