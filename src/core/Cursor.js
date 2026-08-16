/**
 * Physics-based interaction cursor with contextual labels.
 * Falls back to the native cursor on touch devices (never instantiated there).
 */
const LABELS = {
  drag: 'Drag', view: 'View', open: 'Open', next: 'Next',
  prev: 'Back', scroll: 'Scroll', play: 'Play',
};

export default class Cursor {
  constructor() {
    this.el = document.getElementById('cursor');
    this.labelEl = document.getElementById('cursor-label');
    this.x = window.innerWidth / 2;
    this.y = window.innerHeight / 2;
    this.tx = this.x; this.ty = this.y;
    this._raf = null;
    this._bind();
    this._loop();
  }

  _bind() {
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      this.tx = e.clientX; this.ty = e.clientY;
    }, { passive: true });

    window.addEventListener('pointerdown', () => this.el.classList.add('is-down'));
    window.addEventListener('pointerup', () => this.el.classList.remove('is-down'));

    // delegate hover states from data-cursor attributes
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('[data-cursor]');
      if (t) {
        const kind = t.getAttribute('data-cursor');
        const label = LABELS[kind];
        if (label) {
          this.labelEl.textContent = label;
          this.el.classList.add('is-label');
          this.el.classList.remove('is-hover');
        } else {
          this.el.classList.add('is-hover');
        }
      }
    });
    document.addEventListener('pointerout', (e) => {
      const t = e.target.closest('[data-cursor]');
      if (t && !e.relatedTarget?.closest?.('[data-cursor]')) {
        this.el.classList.remove('is-hover', 'is-label');
      }
    });
  }

  _loop = () => {
    // spring toward target with weight
    this.x += (this.tx - this.x) * 0.18;
    this.y += (this.ty - this.y) * 0.18;
    this.el.style.transform = `translate(${this.x}px, ${this.y}px)`;
    this._raf = requestAnimationFrame(this._loop);
  };
}
