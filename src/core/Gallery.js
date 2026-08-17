import { projects } from '../data/projects.js';

/**
 * Product coverflow. Glass "boxes" float in perspective — the centred one is
 * upright and large, neighbours rotate away and recede. Drag / wheel / touch /
 * arrows / keyboard / dots all drive one shared, snapping position.
 */
export default class Gallery {
  constructor() {
    this.viewport = document.getElementById('gallery');
    this.track = document.getElementById('gallery-track');
    this.dotsEl = document.getElementById('gallery-dots');
    this.marqueeEl = document.getElementById('marquee-row');
    this.counterEl = document.getElementById('work-current');
    this.totalEl = document.getElementById('work-total');
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.x = 0; this.target = 0;
    this.min = 0; this.max = 0;
    this.snaps = [];
    this.dragging = false;
    this.startX = 0; this.startTarget = 0;
    this.velocity = 0; this.lastX = 0;
    this.index = Math.floor(projects.length / 2);
    this._settleTimer = null;

    this._build();
    this._bind();
    this._measure();
    this.target = this.x = this.snaps[this.index] || 0;
    this._loop();
  }

  _build() {
    const frag = document.createDocumentFragment();
    projects.forEach((p) => {
      const panel = document.createElement('article');
      panel.className = 'panel';
      panel.setAttribute('data-cursor', 'view');
      panel.style.setProperty('--accent', p.accent);
      panel.innerHTML = `
        <div class="panel__top"><span>${p.index}</span><span>${p.tag}</span></div>
        <div class="panel__icon">${p.icon}</div>
        <div class="panel__brand">${p.title}</div>
        <div class="panel__disc">${p.discipline}</div>
        <p class="panel__meta">${p.result}</p>
        <span class="panel__link">Detail <em>→</em></span>`;
      frag.appendChild(panel);
    });
    this.track.appendChild(frag);
    this.panels = Array.from(this.track.children);

    // dots
    if (this.dotsEl) {
      this.dotsEl.innerHTML = '';
      this.dots = projects.map((_, i) => {
        const b = document.createElement('button');
        b.className = 'dot';
        b.setAttribute('aria-label', `Produkt ${i + 1}`);
        b.setAttribute('data-cursor', 'link');
        b.addEventListener('click', () => this.goTo(i));
        this.dotsEl.appendChild(b);
        return b;
      });
    }

    // running marquee of names
    if (this.marqueeEl) {
      const names = projects.map((p) => p.title).join('&nbsp;&nbsp;&nbsp;✦&nbsp;&nbsp;&nbsp;');
      this.marqueeEl.innerHTML = `<span>${names}</span><span>${names}</span>`;
    }

    if (this.totalEl) this.totalEl.textContent = String(projects.length).padStart(2, '0');
  }

  _measure() {
    const prev = this.track.style.transform;
    this.track.style.transform = 'none';
    const trackLeft = this.track.getBoundingClientRect().left;
    const Vc = window.innerWidth / 2;
    this.snaps = this.panels.map((p) => Vc - (trackLeft + p.offsetLeft + p.offsetWidth / 2));
    this.track.style.transform = prev;
    this.panelW = this.panels[0] ? this.panels[0].offsetWidth : 320;
    this.max = this.snaps[0];
    this.min = this.snaps[this.snaps.length - 1];
  }

  _clamp(v) { return Math.max(this.min, Math.min(this.max, v)); }

  _nearestSnap(v) {
    let best = 0, bd = Infinity;
    this.snaps.forEach((s, i) => { const d = Math.abs(s - v); if (d < bd) { bd = d; best = i; } });
    this.index = best;
    return this.snaps[best];
  }

  _settleSoon() {
    clearTimeout(this._settleTimer);
    this._settleTimer = setTimeout(() => { this.target = this._nearestSnap(this.target); }, 150);
  }

  goTo(i) {
    this.index = Math.max(0, Math.min(this.panels.length - 1, i));
    this.target = this.snaps[this.index];
  }

  snap(dir) { this.goTo(this.index + dir); }

  _bind() {
    this.viewport.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      this.viewport.setPointerCapture(e.pointerId);
      this.startX = e.clientX; this.startTarget = this.target;
      this.lastX = e.clientX; this.velocity = 0;
      this.viewport.classList.add('is-dragging');
    });
    this.viewport.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      this.target = this._clamp(this.startTarget + (e.clientX - this.startX));
      this.velocity = e.clientX - this.lastX;
      this.lastX = e.clientX;
    });
    const end = () => {
      if (!this.dragging) return;
      this.dragging = false;
      this.viewport.classList.remove('is-dragging');
      this.target = this._clamp(this.target + this.velocity * 5);
      this._settleSoon();
    };
    this.viewport.addEventListener('pointerup', end);
    this.viewport.addEventListener('pointercancel', end);

    this.viewport.addEventListener('wheel', (e) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(d) < 1) return;
      e.preventDefault();
      this.target = this._clamp(this.target - d * 0.9);
      this._settleSoon();
    }, { passive: false });

    document.getElementById('work-next')?.addEventListener('click', () => this.snap(1));
    document.getElementById('work-prev')?.addEventListener('click', () => this.snap(-1));

    window.addEventListener('keydown', (e) => {
      if (!this._inView()) return;
      if (e.key === 'ArrowRight') this.snap(1);
      if (e.key === 'ArrowLeft') this.snap(-1);
    });

    window.addEventListener('resize', () => {
      this._measure();
      this.target = this.x = this.snaps[this.index] || 0;
    });
  }

  _inView() {
    const r = this.viewport.getBoundingClientRect();
    return r.top < window.innerHeight * 0.75 && r.bottom > window.innerHeight * 0.25;
  }

  _loop = () => {
    this.x += (this.target - this.x) * (this.reduced ? 1 : 0.10);
    this.track.style.transform = `translate3d(${this.x}px,0,0)`;

    const Vc = window.innerWidth / 2;
    let nearest = 0, nd = Infinity;
    this.panels.forEach((panel, i) => {
      const rect = panel.getBoundingClientRect();
      const pc = rect.left + rect.width / 2;
      const d = (pc - Vc) / (this.panelW || 320); // in panel-widths
      const ad = Math.abs(d);
      if (ad < nd) { nd = ad; nearest = i; }

      if (!this.reduced) {
        const scale = 1 - Math.min(ad * 0.14, 0.4);
        const rotY = Math.max(-42, Math.min(42, -d * 26));
        const tz = -Math.min(ad, 2.6) * 150;
        const ty = Math.min(ad, 2.6) * 6;
        panel.style.transform =
          `translate3d(0,${ty}px,${tz}px) rotateY(${rotY}deg) scale(${scale})`;
        panel.style.opacity = String(1 - Math.min(ad * 0.5, 0.72));
        panel.style.zIndex = String(100 - Math.round(ad * 10));
      }
      panel.classList.toggle('is-center', ad < 0.45);
    });

    if (!this.dragging) this.index = nearest;
    if (this.counterEl) this.counterEl.textContent = String(this.index + 1).padStart(2, '0');
    if (this.dots) this.dots.forEach((d, i) => d.classList.toggle('is-active', i === this.index));

    requestAnimationFrame(this._loop);
  };
}
