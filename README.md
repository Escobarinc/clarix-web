# STRØM — Realtime Digital Experience

A single-page realtime experience for a fictional studio. The centrepiece is a
GPU point sculpture (up to ~300k particles) that lives in a curl-noise field and
morphs through a state space of formations as you scroll. A cinematic camera rig
travels the scene, a spatial glass gallery floats in perspective, and the
capabilities section reshapes the sculpture on hover.

## Run

```bash
npm install
npm run dev
```

Open the printed URL (default `http://localhost:5173`).

Production build:

```bash
npm run build
npm run preview
```

## Stack

- **Three.js** — renderer, one custom `ShaderMaterial` point system
- **Custom GLSL** — simplex/curl-noise displacement, soft additive particles, depth fade, energy-driven colour
- **GSAP + ScrollTrigger** — reveals, scene → formation mapping, timeline
- **Lenis** — weighted smooth scroll
- No UI framework, no component library — hand-built DOM

## How it works

- `src/webgl/` — the realtime layer. `World` owns the renderer + loop; `ParticleSculpture`
  blends between `formations.js` targets; `CameraRig` eases along keyframed stations;
  `Quality.js` picks a device tier (high / medium / low) for particle count, DPR and blending.
- `src/core/` — `Cursor` (physics cursor with contextual labels), `Gallery` (drag / wheel /
  touch / arrows / keyboard).
- `src/main.js` — boots the world, runs the branded loader, wires scroll → scene → camera.

## Quality & accessibility

- Three quality tiers scale particle count and pixel ratio; mobile is a smaller
  version of the same field, not a disabled one.
- `prefers-reduced-motion` disables smooth-scroll and reveal motion and keeps a calm,
  legible layout. If WebGL is unavailable, an art-directed static background takes over.
- Keyboard navigation for the gallery (`←` / `→`), focus states, semantic landmarks.

## Notes

- Fonts load from Google Fonts (Space Grotesk / Instrument Serif / Space Mono).
- Project visuals are procedural CSS fields — no stock imagery, no placeholders.
- Ambient audio is opt-in via the footer toggle and never autoplays.
