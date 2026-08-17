/* ------------------------------------------------------------
   Formations — the state space of the sculpture.
   Each returns a Float32Array(count*3) of target positions.
   The distinctive default silhouette is a knotted filament tube,
   not a particle sphere.
   ------------------------------------------------------------ */

const TAU = Math.PI * 2;
function rand(seed) { const x = Math.sin(seed * 999.13) * 43758.5453; return x - Math.floor(x); }

// (2,3) torus knot swept into a thick, fibrous tube — the "origin" sculpture
export function knot(count) {
  const a = new Float32Array(count * 3);
  const p = 2, q = 3, R = 2.4, tube = 0.62;
  for (let i = 0; i < count; i++) {
    const u = (i / count) * TAU * 1;
    const s = Math.sin(u), c = Math.cos(u);
    // knot centerline
    const r = R + Math.cos(q * u) * 0.9;
    const cx = r * Math.cos(p * u);
    const cy = r * Math.sin(p * u);
    const cz = Math.sin(q * u) * 1.3;
    // random point in tube cross-section (fibrous falloff toward core)
    const ta = rand(i * 1.3) * TAU;
    const tr = Math.pow(rand(i * 2.7), 0.6) * tube;
    a[i*3]   = cx + Math.cos(ta) * tr;
    a[i*3+1] = cy + Math.sin(ta) * tr + c * 0.2;
    a[i*3+2] = cz + Math.sin(ta) * tr * 0.8 + s * 0.2;
  }
  return a;
}

// tilted swirling vortex with a central void — the signature hero silhouette
export function vortex(count) {
  const a = new Float32Array(count * 3);
  const inner = 1.4, outer = 4.2;
  const cx = Math.cos(0.6), sx = Math.sin(0.6);     // tilt around X
  const cz = Math.cos(-0.5), sz = Math.sin(-0.5);   // tilt around Z
  for (let i = 0; i < count; i++) {
    // density concentrated near the inner edge → a luminous ring around the eye
    const rr = inner + Math.pow(rand(i * 1.7), 1.7) * (outer - inner);
    const arm = rand(i * 4.4);
    const ang = arm * TAU + rr * 1.35;               // tighter swirl arms
    let x = Math.cos(ang) * rr;
    let y = Math.sin(ang) * rr;
    let z = (rand(i * 8.1) - 0.5) * 0.8 * (1 - rr / (outer * 1.5)); // thin disc
    // a few wispy tendrils trailing outward
    const w = Math.pow(rand(i * 3.3), 4) * 1.4;
    x += Math.cos(ang) * w; y += Math.sin(ang) * w;
    // diagonal tilt so the swirl reads top-right → bottom-left
    const y2 = y * cx - z * sx, z2 = y * sx + z * cx;
    const x3 = x * cz - y2 * sz, y3 = x * sz + y2 * cz;
    a[i*3] = x3; a[i*3+1] = y3; a[i*3+2] = z2;
  }
  return a;
}

// dense, full sphere — a solid-reading orb (surface + a little volume)
export function orb(count) {
  const a = new Float32Array(count * 3);
  const R = 2.6;
  for (let i = 0; i < count; i++) {
    // bias strongly to the surface, keep a little interior for fullness
    const shell = 0.72 + 0.28 * Math.pow(rand(i * 9.1), 1.6);
    const rr = R * shell;
    const u = rand(i * 2.2), v = rand(i * 6.6);
    const th = Math.acos(2 * u - 1), ph = v * TAU;
    a[i*3]   = rr * Math.sin(th) * Math.cos(ph);
    a[i*3+1] = rr * Math.cos(th);
    a[i*3+2] = rr * Math.sin(th) * Math.sin(ph);
  }
  return a;
}

// ── recognizable wireframe shapes ───────────────────────────────

// wireframe globe — latitude rings + meridian arcs
export function globe(count) {
  const a = new Float32Array(count * 3);
  const R = 3.0, parallels = 7, meridians = 14;
  for (let i = 0; i < count; i++) {
    const j = (rand(i * 9.4) - 0.5) * 0.05; // slight thickness
    if (rand(i * 1.1) < 0.5) {
      const li = Math.floor(rand(i * 2.3) * parallels);
      const lat = (-1 + 2 * (li + 0.5) / parallels) * (Math.PI / 2) * 0.92;
      const ang = rand(i * 3.7) * TAU;
      const r = R * Math.cos(lat);
      a[i*3] = r*Math.cos(ang)+j; a[i*3+1] = R*Math.sin(lat)+j; a[i*3+2] = r*Math.sin(ang)+j;
    } else {
      const mi = Math.floor(rand(i * 4.9) * meridians);
      const lon = (mi / meridians) * TAU;
      const lat = (-1 + 2 * rand(i * 6.1)) * (Math.PI / 2);
      const r = R * Math.cos(lat);
      a[i*3] = r*Math.cos(lon)+j; a[i*3+1] = R*Math.sin(lat)+j; a[i*3+2] = r*Math.sin(lon)+j;
    }
  }
  return a;
}

// hexagonal prism outline — the Clarix logo silhouette
export function hexagon(count) {
  const a = new Float32Array(count * 3);
  const R = 2.9, h = 1.5;
  const vx = [], vy = [];
  for (let k = 0; k < 6; k++) { const ang = k / 6 * TAU + Math.PI / 6; vx.push(Math.cos(ang) * R); vy.push(Math.sin(ang) * R); }
  for (let i = 0; i < count; i++) {
    const kind = rand(i * 4.3);
    if (kind > 0.82) { // vertical edges at vertices
      const e = Math.floor(rand(i * 2.9) * 6);
      a[i*3] = vx[e]; a[i*3+1] = vy[e]; a[i*3+2] = (rand(i * 5.1) - 0.5) * h;
    } else {
      const e = Math.floor(rand(i * 2.9) * 6), t = rand(i * 1.7);
      const n = (e + 1) % 6;
      a[i*3] = vx[e] + (vx[n] - vx[e]) * t;
      a[i*3+1] = vy[e] + (vy[n] - vy[e]) * t;
      a[i*3+2] = kind < 0.41 ? h / 2 : -h / 2;
    }
  }
  return a;
}

// clean ring facing the camera
export function ring(count) {
  const a = new Float32Array(count * 3);
  const R = 2.9, tube = 0.3, tilt = 0.35;
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  for (let i = 0; i < count; i++) {
    const u = rand(i * 1.9) * TAU, v = rand(i * 5.1) * TAU;
    const rr = tube * (0.35 + 0.65 * rand(i * 7.7));
    const x = (R + rr * Math.cos(v)) * Math.cos(u);
    const y = (R + rr * Math.cos(v)) * Math.sin(u);
    const z = rr * Math.sin(v);
    a[i*3] = x; a[i*3+1] = y * ct - z * st; a[i*3+2] = y * st + z * ct;
  }
  return a;
}

// wireframe cube in a 3/4 view
export function cube(count) {
  const a = new Float32Array(count * 3);
  const s = 2.0, c = [-s, s];
  const ry = 0.6, rx = 0.42;
  const cy = Math.cos(ry), sy = Math.sin(ry), cxx = Math.cos(rx), sxx = Math.sin(rx);
  for (let i = 0; i < count; i++) {
    const axis = Math.floor(rand(i * 1.3) * 3);
    const t = rand(i * 2.7) * 2 * s - s;
    const b1 = c[Math.floor(rand(i * 3.9) * 2)], b2 = c[Math.floor(rand(i * 5.3) * 2)];
    let x, y, z;
    if (axis === 0) { x = t; y = b1; z = b2; }
    else if (axis === 1) { x = b1; y = t; z = b2; }
    else { x = b1; y = b2; z = t; }
    const x1 = x * cy - z * sy, z1 = x * sy + z * cy;       // rotate Y
    const y1 = y * cxx - z1 * sxx, z2 = y * sxx + z1 * cxx; // rotate X
    a[i*3] = x1; a[i*3+1] = y1; a[i*3+2] = z2;
  }
  return a;
}

// dispersed flowing sheet — particles smeared into a wide ribbon
export function ribbon(count) {
  const a = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const t = rand(i * 3.1);
    const x = (t - 0.5) * 11;
    const w = rand(i * 5.9) - 0.5;
    const y = Math.sin(t * 6.0) * 1.6 + w * 1.4;
    const z = Math.cos(t * 4.0) * 1.4 + (rand(i * 7.3) - 0.5) * 1.0;
    a[i*3] = x; a[i*3+1] = y; a[i*3+2] = z;
  }
  return a;
}

// flattened galactic disc — for the gallery scene
export function disc(count) {
  const a = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const rr = Math.pow(rand(i * 1.7), 0.5) * 4.6;
    const ang = rand(i * 4.4) * TAU + rr * 0.6;
    a[i*3]   = Math.cos(ang) * rr;
    a[i*3+1] = (rand(i * 8.1) - 0.5) * 0.5 * (1.0 - rr / 6);
    a[i*3+2] = Math.sin(ang) * rr;
  }
  return a;
}

// hollow sphere shell
export function sphere(count) {
  const a = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = rand(i * 2.2), v = rand(i * 6.6);
    const th = Math.acos(2 * u - 1), ph = v * TAU;
    const r = 3.4 + (rand(i * 9.2) - 0.5) * 1.2;   // larger, softer shell
    a[i*3]   = r * Math.sin(th) * Math.cos(ph);
    a[i*3+1] = r * Math.cos(th);
    a[i*3+2] = r * Math.sin(th) * Math.sin(ph);
  }
  return a;
}

// torus
export function torus(count) {
  const a = new Float32Array(count * 3);
  const R = 2.6, r = 0.95;
  for (let i = 0; i < count; i++) {
    const u = rand(i * 1.9) * TAU, v = rand(i * 5.1) * TAU;
    const rr = r * (0.6 + 0.4 * rand(i * 7.7));
    a[i*3]   = (R + rr * Math.cos(v)) * Math.cos(u);
    a[i*3+1] = rr * Math.sin(v);
    a[i*3+2] = (R + rr * Math.cos(v)) * Math.sin(u);
  }
  return a;
}

// double helix strand
export function helix(count) {
  const a = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const t = rand(i * 2.9);
    const strand = rand(i * 6.1) > 0.5 ? 0 : Math.PI;
    const ang = t * TAU * 3 + strand;
    const jitter = (rand(i * 8.8) - 0.5) * 0.35;
    a[i*3]   = Math.cos(ang) * (1.7 + jitter);
    a[i*3+1] = (t - 0.5) * 8.2;
    a[i*3+2] = Math.sin(ang) * (1.7 + jitter);
  }
  return a;
}

// structured cube-lattice shell
export function lattice(count) {
  const a = new Float32Array(count * 3);
  const s = 3.4;
  for (let i = 0; i < count; i++) {
    const face = Math.floor(rand(i * 1.1) * 6);
    let x = (rand(i * 3.3) - 0.5) * s;
    let y = (rand(i * 5.5) - 0.5) * s;
    let z = (rand(i * 7.7) - 0.5) * s;
    const h = s / 2;
    if (face === 0) x = h; else if (face === 1) x = -h;
    else if (face === 2) y = h; else if (face === 3) y = -h;
    else if (face === 4) z = h; else z = -h;
    a[i*3] = x; a[i*3+1] = y; a[i*3+2] = z;
  }
  return a;
}

// tall converging column — the studio scene
export function column(count) {
  const a = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const t = rand(i * 2.4);
    const ang = rand(i * 4.9) * TAU;
    const rad = (0.4 + rand(i * 6.3) * 0.9) * (0.5 + Math.sin(t * Math.PI) * 0.9);
    a[i*3]   = Math.cos(ang) * rad;
    a[i*3+1] = (t - 0.5) * 9.5;
    a[i*3+2] = Math.sin(ang) * rad;
  }
  return a;
}

// dense implosion core — the contact scene
export function core(count) {
  const a = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const rr = Math.pow(rand(i * 3.7), 2.0) * 2.2;
    const u = rand(i * 5.2), v = rand(i * 8.4);
    const th = Math.acos(2 * u - 1), ph = v * TAU;
    a[i*3]   = rr * Math.sin(th) * Math.cos(ph);
    a[i*3+1] = rr * Math.cos(th);
    a[i*3+2] = rr * Math.sin(th) * Math.sin(ph);
  }
  return a;
}

export const FORMATIONS = { orb, vortex, globe, hexagon, ring, cube, knot, ribbon, disc, sphere, torus, helix, lattice, column, core };

// capability index → formation name
export const CAPABILITY_SHAPES = ['helix', 'lattice', 'sphere', 'torus', 'disc'];
