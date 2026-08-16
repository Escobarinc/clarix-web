/* ------------------------------------------------------------
   Device quality tiers. Never disables the art direction —
   mobile is a smaller, still-beautiful version of the field.
   ------------------------------------------------------------ */

export function detectQuality() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let tier = 'high';
  if (coarse || w < 760) tier = 'low';
  else if (w < 1280 || mem <= 4 || cores <= 4) tier = 'medium';

  const table = {
    high:   { count: 300000, size: 1.9, pixelRatio: Math.min(dpr, 2),   additive: true },
    medium: { count: 150000, size: 2.1, pixelRatio: Math.min(dpr, 1.75), additive: true },
    low:    { count: 55000,  size: 2.6, pixelRatio: Math.min(dpr, 1.5),  additive: true },
  };

  return { tier, reduced, ...table[tier] };
}
