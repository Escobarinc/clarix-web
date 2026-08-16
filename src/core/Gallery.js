import { projects } from '../data/projects.js';

/* procedural in-glass UI mockups — read as app screenshots, no stock imagery */
function mockup(kind) {
  if (kind === 'list') return `
    <div class="mock mock--list">
      <div class="mock__head"><span></span><em></em></div>
      <div class="mock__row"></div><div class="mock__row"></div>
      <div class="mock__row is-hot"></div><div class="mock__row"></div>
      <div class="mock__row"></div>
    </div>`;
  if (kind === 'board') return `
    <div class="mock mock--board">
      <div class="mock__col"><i></i><i></i></div>
      <div class="mock__col"><i class="is-hot"></i><i></i><i></i></div>
      <div class="mock__col"><i></i></div>
    </div>`;
  if (kind === 'web') return `
    <div class="mock mock--web">
      <div class="mock__hero"></div>
      <div class="mock__ln"></div><div class="mock__ln mock__ln--short"></div>
    </div>`;
  return `
    <div class="mock mock--chart">
      <div class="mock__bars">
        <b style="height:38%"></b><b style="height:64%"></b><b style="height:29%"></b>
        <b style="height:82%"></b><b style="height:52%"></b><b style="height:95%"></b>
        <b style="height:44%"></b>
      </div>
    </div>`;
}

/**
 * Spatial glass gallery. Panels float in perspective with depth and angle;
 * drag / wheel / touch / arrows / keyboard all drive one shared position.
 */
export default class Gallery {
  constructor() {
    this.viewport = document.getElementById('gallery');
    this.track = document.getElementById('gallery-track');
    this.counterEl = document.getElementById('work-current');
    this.totalEl = document.getElementById('work-total');
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.x = 0; this.target = 0;
    this.min = 0; this.max = 0;
    this.dragging = false;
    this.startX = 0; this.startTarget = 0;
    this.velocity = 0; this.lastX = 0;
    this.index = 0;

    this._build();
    this._bind();
    this._measure();
    this._loop();
  }

  _build() {
    const frag = document.createDocumentFragment();
    projects.forEach((p) => {
      const panel = document.createElement('article');
      panel.className = 'panel';
      panel.setAttribute('data-cursor', 'view');
      panel.innerHTML = `
        <div class="panel__media" style="background:${p.media}">
          ${mockup(p.kind)}
          <div class="panel__scrim"></div>
        </div>
        <div class="panel__inner">
          <div class="panel__index"><span>${p.index}</span><span>${p.tag}</span></div>
          <div class="panel__body">
            <div class="panel__disc">${p.discipline}</div>
            <h3 class="panel__title">${p.title}</h3>
            <p class="panel__meta">${p.result}</p>
            <span class="panel__link">Detail projektu <em>→</em></span>
          </div>
        </div>`;
      frag.appendChild(panel);
    });
    this.track.appendChild(frag);
    this.panels = Array.from(this.track.children);
    if (this.totalEl) this.totalEl.textContent = String(projects.length).padStart(2, '0');
  }

  _measure() {
    const trackWidth = this.track.scrollWidth;
    const vpWidth = this.viewport.clientWidth;
    this.max = 0;
    this.min = -(trackWidth - vpWidth);
    if (this.min > 0) this.min = 0;
    this.step = this.panels[0]
      ? this.panels[0].offsetWidth + parseFloat(getComputedStyle(this.track).columnGap || 40)
      : 400;
  }

  _clamp(v) { return Math.max(this.min, Math.min(this.max, v)); }

  _bind() {
    // pointer drag (covers mouse + touch via pointer events)
    this.viewport.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      this.viewport.setPointerCapture(e.pointerId);
      this.startX = e.clientX; this.startTarget = this.target;
      this.lastX = e.clientX; this.velocity = 0;
      this.viewport.classList.add('is-dragging');
    });
    this.viewport.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.startX;
      this.target = this._clamp(this.startTarget + dx);
      this.velocity = e.clientX - this.lastX;
      this.lastX = e.clientX;
    });
    const end = () => {
      if (!this.dragging) return;
      this.dragging = false;
      this.viewport.classList.remove('is-dragging');
      this.target = this._clamp(this.target + this.velocity * 6);
    };
    this.viewport.addEventListener('pointerup', end);
    this.viewport.addEventListener('pointercancel', end);

    // wheel / trackpad — horizontal or vertical both scroll the gallery
    this.viewport.addEventListener('wheel', (e) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(d) < 1) return;
      e.preventDefault();
      this.target = this._clamp(this.target - d * 1.1);
    }, { passive: false });

    // arrows
    document.getElementById('work-next')?.addEventListener('click', () => this.snap(1));
    document.getElementById('work-prev')?.addEventListener('click', () => this.snap(-1));

    // keyboard when the section is in view
    window.addEventListener('keydown', (e) => {
      if (!this._inView()) return;
      if (e.key === 'ArrowRight') this.snap(1);
      if (e.key === 'ArrowLeft') this.snap(-1);
    });

    window.addEventListener('resize', () => this._measure());
  }

  _inView() {
    const r = this.viewport.getBoundingClientRect();
    return r.top < window.innerHeight * 0.75 && r.bottom > window.innerHeight * 0.25;
  }

  snap(dir) {
    this.index = Math.max(0, Math.min(this.panels.length - 1, this.index + dir));
    this.target = this._clamp(-this.index * this.step);
  }

  _loop = () => {
    this.x += (this.target - this.x) * (this.reduced ? 1 : 0.09);

    // apply base translation
    this.track.style.transform = `translate3d(${this.x}px,0,0)`;

    // per-panel depth + angle relative to viewport centre
    const center = this.viewport.clientWidth / 2;
    let nearest = 0, nearestDist = Infinity;
    this.panels.forEach((panel, i) => {
      const rect = panel.getBoundingClientRect();
      const pc = rect.left + rect.width / 2;
      const d = (pc - center) / center; // -1 .. 1
      const ad = Math.abs(d);
      if (ad < nearestDist) { nearestDist = ad; nearest = i; }
      if (!this.reduced) {
        const rotY = d * -8;
        const tz = -Math.abs(d) * 120;
        const ty = Math.abs(d) * 14;
        panel.style.transform = `translate3d(0,${ty}px,${tz}px) rotateY(${rotY}deg)`;
        panel.style.opacity = String(1 - Math.min(ad * 0.35, 0.4));
      }
    });

    if (nearest !== this.index && !this.dragging) this.index = nearest;
    if (this.counterEl) this.counterEl.textContent = String(this.index + 1).padStart(2, '0');

    requestAnimationFrame(this._loop);
  };
}
