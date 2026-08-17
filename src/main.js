import './styles/main.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import World from './webgl/World.js';
import Cursor from './core/Cursor.js';
import Gallery from './core/Gallery.js';
import { CAPABILITY_SHAPES } from './webgl/formations.js';

gsap.registerPlugin(ScrollTrigger);

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const COARSE = window.matchMedia('(pointer: coarse)').matches;

// section data-scene → sculpture formation
const SCENE_FORMATION = {
  origin: 'orb',
  dissolve: 'orb',
  gallery: 'orb',
  morph: 'orb',
  converge: 'orb',
  collapse: 'core',
};

// preview helper: ?shape=globe|hexagon|ring|cube|... forces the hero shape
const FORCED_SHAPE = new URLSearchParams(location.search).get('shape');
if (FORCED_SHAPE) SCENE_FORMATION.origin = FORCED_SHAPE;

class Site {
  constructor() {
    this.world = new World(document.getElementById('stage'));
    if (!this.world.supported) document.body.classList.add('no-webgl');
    this.boot();
  }

  async boot() {
    // custom cursor (desktop only)
    if (!COARSE) this.cursor = new Cursor();

    // start the field immediately so it is alive behind the preloader
    this.world.start();

    // branded load sequence — waits on fonts, honours a minimum beat
    await this.preload();

    this.gallery = new Gallery();
    this.initScroll();
    this.initReveals();
    this.initNav();
    this.initCapabilities();
    this.initMute();
    this.initFrameCounter();

    if (FORCED_SHAPE) this.world.morphTo(FORCED_SHAPE, 0.9);

    this.reveal();
  }

  /* ---------------- preloader ---------------- */
  preload() {
    return new Promise((resolve) => {
      const bar = document.getElementById('preload-bar');
      const count = document.getElementById('preload-count');
      const start = performance.now();
      const minMs = REDUCED ? 300 : 1100;
      let fontsReady = false;
      (document.fonts?.ready || Promise.resolve()).then(() => { fontsReady = true; });

      const tick = () => {
        const elapsed = performance.now() - start;
        const timeP = Math.min(elapsed / minMs, 1);
        // ease progress, but never reach 100 until fonts are in
        let p = timeP * (fontsReady ? 1 : 0.92);
        p = Math.min(p, 1);
        bar.style.width = (p * 100).toFixed(0) + '%';
        count.textContent = String(Math.round(p * 100)).padStart(3, '0');
        if (p >= 1 && fontsReady) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  reveal() {
    const pre = document.getElementById('preloader');
    const tl = gsap.timeline({
      onComplete: () => { pre.style.display = 'none'; ScrollTrigger.refresh(); },
    });
    tl.to(pre, { autoAlpha: 0, duration: 0.8, ease: 'power2.inOut' }, 0);
    pre.classList.add('is-done');

    if (REDUCED) {
      gsap.set('[data-reveal] span, .hero__line span, [data-reveal-soft]', { clearProps: 'all', opacity: 1, y: 0 });
      return;
    }

    // cinematic intro — background is already live, now the type arrives
    tl.from('.hero__line span', {
      yPercent: 115, duration: 1.1, ease: 'power4.out', stagger: 0.09,
    }, 0.2);
    tl.from('.hero__lede', { autoAlpha: 0, y: 20, duration: 0.9, ease: 'power2.out' }, 0.7);
    tl.from('.hero__cue, .hero__scene-label, .hero__meta', {
      autoAlpha: 0, y: 14, duration: 0.8, ease: 'power2.out', stagger: 0.08,
    }, 0.8);
    tl.from('.nav', { autoAlpha: 0, y: -14, duration: 0.8, ease: 'power2.out' }, 0.6);
  }

  /* ---------------- smooth scroll + scene driving ---------------- */
  initScroll() {
    if (!REDUCED) {
      this.lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
      this.lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => this.lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    // overall scroll progress → camera rig + velocity
    let lastScroll = window.scrollY, lastT = performance.now();
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      const now = performance.now();
      const dt = Math.max(now - lastT, 16);
      const vel = (window.scrollY - lastScroll) / dt; // px/ms
      lastScroll = window.scrollY; lastT = now;
      this.world.setScroll(p, Math.min(Math.abs(vel) * 0.12, 1));
      const pe = document.getElementById('scroll-progress');
      if (pe) pe.textContent = Math.round(p * 100) + '%';
    };
    (this.lenis ? this.lenis.on.bind(this.lenis, 'scroll') : (cb) => window.addEventListener('scroll', cb, { passive: true }))(onScroll);
    onScroll();

    // each section requests a formation as it enters
    document.querySelectorAll('[data-scene]').forEach((sec) => {
      const name = SCENE_FORMATION[sec.dataset.scene];
      if (!name) return;
      ScrollTrigger.create({
        trigger: sec,
        start: 'top 60%',
        end: 'bottom 40%',
        onEnter: () => this.world.morphTo(name),
        onEnterBack: () => this.world.morphTo(name),
      });
    });
  }

  /* ---------------- text reveals ---------------- */
  initReveals() {
    if (REDUCED) {
      gsap.set('[data-reveal-soft]', { opacity: 1 });
      return;
    }
    gsap.utils.toArray('[data-reveal-soft]').forEach((el) => {
      gsap.fromTo(el, { autoAlpha: 0, y: 26 }, {
        autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 82%' },
      });
    });
    // line-by-line reveals for strip + contact gesture
    gsap.utils.toArray('.strip__text [data-line]').forEach((el, i) => {
      gsap.from(el, {
        yPercent: 110, autoAlpha: 0, duration: 1, ease: 'power4.out', delay: i * 0.08,
        scrollTrigger: { trigger: '.strip', start: 'top 60%' },
      });
    });
    gsap.utils.toArray('.contact__gesture span span').forEach((el, i) => {
      gsap.from(el, {
        yPercent: 115, duration: 1, ease: 'power4.out', delay: i * 0.06,
        scrollTrigger: { trigger: '.contact', start: 'top 65%' },
      });
    });
    gsap.utils.toArray('.work__title, .cap__head').forEach((el) => {
      gsap.from(el, {
        autoAlpha: 0, y: 30, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 82%' },
      });
    });
  }

  /* ---------------- navigation ---------------- */
  initNav() {
    const toggle = document.getElementById('nav-toggle');
    const close = () => {
      document.body.classList.remove('menu-open');
      toggle.setAttribute('aria-expanded', 'false');
    };
    toggle?.addEventListener('click', () => {
      const open = document.body.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    document.querySelectorAll('[data-menu-link]').forEach((a) =>
      a.addEventListener('click', close));

    // smooth anchor scrolling through Lenis
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id.length < 2) return;
        const el = document.querySelector(id);
        if (!el) return;
        e.preventDefault();
        close();
        if (this.lenis) this.lenis.scrollTo(el, { offset: 0, duration: 1.4 });
        else el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
      });
    });

    // nav contrast shift after hero
    ScrollTrigger.create({
      start: 'top -80', end: 99999,
      onUpdate: (self) => document.getElementById('nav')
        .classList.toggle('is-scrolled', self.scroll() > 80),
    });
  }

  /* ---------------- capabilities → morph the field ---------------- */
  initCapabilities() {
    const items = document.querySelectorAll('.cap__item');
    let restore = null;
    items.forEach((item) => {
      const shape = CAPABILITY_SHAPES[+item.dataset.morph] || 'sphere';
      const enter = () => {
        items.forEach((n) => n.classList.remove('is-active'));
        item.classList.add('is-active');
        clearTimeout(restore);
        this.world.morphTo(shape, 1.4);
      };
      item.addEventListener('pointerenter', enter);
      item.addEventListener('focus', enter);
    });
    document.getElementById('cap-list')?.addEventListener('pointerleave', () => {
      items.forEach((n) => n.classList.remove('is-active'));
      restore = setTimeout(() => this.world.morphTo('sphere', 1.6), 200);
    });
  }

  /* ---------------- ambient audio (optional, off by default) ---------------- */
  initMute() {
    const btn = document.getElementById('mute');
    if (!btn) return;
    let on = false, ctx = null, nodes = null;
    const label = btn.querySelector('.footer__mute-icon');
    btn.addEventListener('click', () => {
      on = !on;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', String(on));
      btn.childNodes[btn.childNodes.length - 1].textContent = on ? ' Zvuk · zap' : ' Zvuk · vyp';
      if (on) {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        nodes = createDrone(ctx);
      } else if (nodes) {
        nodes.stop();
      }
    });
  }

  /* ---------------- hero frame counter (micro-typography) ---------------- */
  initFrameCounter() {
    const el = document.getElementById('frame-counter');
    if (!el || REDUCED) return;
    let f = 0;
    const loop = () => {
      f = (f + 1) % 10000;
      el.textContent = 'FRAME ' + String(f).padStart(4, '0');
      requestAnimationFrame(loop);
    };
    loop();
  }
}

// a very subtle two-oscillator drone; never autoplays
function createDrone(ctx) {
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  const mk = (freq, type, g) => {
    const o = ctx.createOscillator();
    const gain = ctx.createGain();
    o.type = type; o.frequency.value = freq; gain.gain.value = g;
    o.connect(gain); gain.connect(master); o.start();
    return o;
  };
  const a = mk(55, 'sine', 0.5);
  const b = mk(82.4, 'triangle', 0.18);
  gsap.to(master.gain, { value: 0.06, duration: 2, ease: 'power1.out' });
  return {
    stop() {
      gsap.to(master.gain, {
        value: 0, duration: 1.2, ease: 'power1.in',
        onComplete: () => { a.stop(); b.stop(); },
      });
    },
  };
}

window.addEventListener('DOMContentLoaded', () => new Site());
