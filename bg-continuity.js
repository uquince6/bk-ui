// @bk/ui — continuidad visual del fondo entre navegaciones de páginas (MPA).
//
// Guarda el último fotograma del fondo al salir de una página y lo muestra al
// instante en la siguiente (tenue, DETRÁS de todo el contenido), con un cartel
// "CARGANDO …" estilo Matrix, mientras el efecto real se re-monta. Luego una
// línea de escaneo verde lo barre de arriba a abajo revelando el fondo vivo.
//
//   const release = restoreBgSnapshot({ label: 'CARGANDO ARQUITECTURA' });
//   const bg = mountBackground(canvas, {…});
//   release(effectName);
//   keepBgSnapshot();
//
// Garantías: el fotograma se dibuja tenue (nunca lava el contenido ni la
// cabecera), va a z-index:-1, y todo el overlay se elimina siempre — aunque
// release() no llegue a llamarse — como muy tarde a los 4 s.

import { ensureFeedbackStyles } from './feedback-styles.js';

const KEY = 'bk:bg-snapshot:v3';
const CANVAS_ID = 'matrix';
const STYLE_ID = 'bk-bg-continuity-style';
const MAX_LIFETIME = 4000;
const SNAP_ALPHA_CAP = 0.5;

const CSS = `
@keyframes bk-bg-wipe { to { clip-path: inset(100% 0 0 0); opacity: 0; } }
.bk-bg-snap {
  position: fixed; inset: 0; z-index: -1; pointer-events: none;
  background: center / cover no-repeat; opacity: .8; clip-path: inset(0 0 0 0);
}
.bk-bg-snap.bk-bg-out { animation: bk-bg-wipe .55s cubic-bezier(.4,0,.2,1) forwards; }
.bk-bg-loading {
  position: fixed; left: 50%; top: 50%; transform: translate(-50%,-50%);
  z-index: -1; pointer-events: none;
  padding: 16px 34px; border: 1px solid var(--bk-accent, #3FC7B4); border-radius: 2px;
  color: #dcfff5;
  font: 700 clamp(14px, 2.3vw, 25px)/1 var(--bk-font-mono, ui-monospace, monospace);
  letter-spacing: .4em; text-transform: uppercase; white-space: nowrap;
  text-shadow: 0 0 12px var(--bk-accent, #3FC7B4), 0 0 3px rgba(220,255,245,.6);
  background: radial-gradient(130% 180% at 50% 50%, rgba(63,199,180,.26), rgba(63,199,180,.04) 68%, transparent);
  box-shadow: 0 0 34px rgba(63,199,180,.45), inset 0 0 20px rgba(63,199,180,.2);
  animation: bk-feedback-flicker 2s linear infinite;
}
.bk-bg-loading > span { margin-right: -.4em; }
.bk-bg-loading.bk-bg-out { animation: bk-feedback-fade .4s ease forwards; }
.bk-bg-scanline {
  position: fixed; left: 0; right: 0; top: 0; height: 2px; z-index: -1; pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--bk-accent, #3FC7B4) 25%, #d6fff4 50%, var(--bk-accent, #3FC7B4) 75%, transparent);
  box-shadow: 0 0 14px 2px var(--bk-accent, #3FC7B4), 0 0 30px 4px rgba(63,199,180,.25);
  animation: bk-feedback-scan .55s linear forwards;
}
@media (prefers-reduced-motion: reduce) {
  .bk-bg-snap.bk-bg-out { animation: bk-feedback-fade .3s ease forwards; }
  .bk-bg-loading { animation: none; }
  .bk-bg-scanline { display: none; }
}
`;

function ensureStyle() {
  ensureFeedbackStyles();
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

export function restoreBgSnapshot({ canvasId = CANVAS_ID, label = '' } = {}) {
  const nodes = [];
  let killed = false;
  const kill = () => {
    killed = true;
    for (const n of nodes.splice(0)) n?.remove();
    document.querySelector('.bk-bg-scanline')?.remove();
  };

  try {
    const data = sessionStorage.getItem(KEY);
    if (data && data.length > 200) {
      ensureStyle();
      const snap = document.createElement('div');
      snap.className = 'bk-bg-snap';
      snap.setAttribute('aria-hidden', 'true');
      snap.dataset.bkBgSnapshot = canvasId;
      snap.style.backgroundImage = `url(${data})`;
      document.body.appendChild(snap);
      nodes.push(snap);

      if (label) {
        const box = document.createElement('div');
        box.className = 'bk-feedback bk-bg-loading';
        box.setAttribute('aria-hidden', 'true');
        const span = document.createElement('span');
        span.textContent = String(label);
        box.appendChild(span);
        document.body.appendChild(box);
        nodes.push(box);
      }

      setTimeout(kill, MAX_LIFETIME); // red de seguridad
    }
  } catch {}

  return function release(effect) {
    if (killed || nodes.length === 0) return;
    const current = nodes.slice();
    nodes.length = 0;
    const hold = effect === 'matrix-engine' ? 1100 : 650;
    setTimeout(() => {
      if (killed) return;
      try {
        const scan = document.createElement('div');
        scan.className = 'bk-bg-scanline';
        scan.setAttribute('aria-hidden', 'true');
        document.body.appendChild(scan);
        current.push(scan);
      } catch {}
      const snap = current.find((n) => n.classList?.contains('bk-bg-snap'));
      for (const n of current) n.classList?.add('bk-bg-out');
      const done = () => {
        for (const n of current) n?.remove();
      };
      (snap || current[0])?.addEventListener('animationend', done, { once: true });
      setTimeout(done, 800);
    }, hold);
  };
}

export function keepBgSnapshot({ canvasId = CANVAS_ID, width = 900, shouldSave = () => true } = {}) {
  const save = () => {
    try {
      if (!shouldSave()) return;
      const c = document.getElementById(canvasId);
      if (!c || !c.width || !c.height) return;
      // El buffer WebGL está a brillo pleno; la sutileza del fondo la da el
      // opacity CSS del efecto. Se captura con esa opacidad y con tope duro.
      const shown = parseFloat(getComputedStyle(c).opacity);
      const alpha = Math.min(Number.isFinite(shown) && shown > 0 ? shown * 1.5 : 0.3, SNAP_ALPHA_CAP);
      const h = Math.max(1, Math.round((width * c.height) / c.width));
      const off = document.createElement('canvas');
      off.width = width;
      off.height = h;
      const ctx = off.getContext('2d');
      ctx.globalAlpha = alpha;
      ctx.drawImage(c, 0, 0, width, h);
      sessionStorage.setItem(KEY, off.toDataURL('image/webp', 0.5));
    } catch {}
  };
  addEventListener('pagehide', save);
  addEventListener('visibilitychange', () => {
    if (document.hidden) save();
  });
}

export default { restoreBgSnapshot, keepBgSnapshot };
