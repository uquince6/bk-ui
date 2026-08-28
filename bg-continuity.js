// @bk/ui — continuidad visual del fondo entre navegaciones de páginas (MPA).
//
// Guarda el último fotograma del fondo al salir de una página y lo muestra al
// instante en la siguiente (tenue, DETRÁS de todo el contenido) mientras el
// efecto real se re-monta. Luego una línea de escaneo verde lo barre de arriba
// a abajo revelando el fondo vivo — se lee como que la pantalla se refresca.
//
//   const release = restoreBgSnapshot();     // al cargar la página
//   const bg = mountBackground(canvas, {…});
//   release(effectName);                      // programa el barrido
//   keepBgSnapshot();                         // guarda el fotograma al salir
//
// Garantías: el fotograma se dibuja con la MISMA opacidad con que se veía el
// canvas (nunca lava el contenido), va a z-index:-1, y se elimina siempre —
// aunque release() no llegue a llamarse — como muy tarde a los 4 s.

const KEY = 'bk:bg-snapshot:v2'; // v2: se captura con la opacidad real del canvas
const CANVAS_ID = 'matrix';
const STYLE_ID = 'bk-bg-continuity-style';
const MAX_LIFETIME = 4000;

const CSS = `
@keyframes bk-bg-wipe { to { clip-path: inset(100% 0 0 0); opacity: 0; } }
@keyframes bk-bg-fade { to { opacity: 0; } }
@keyframes bk-bg-scan {
  0%   { transform: translate3d(0,-4vh,0);  opacity: 0; }
  12%  { opacity: .9; }
  100% { transform: translate3d(0,104vh,0); opacity: 0; }
}
.bk-bg-snap {
  position: fixed; inset: 0; z-index: -1; pointer-events: none;
  background: center / cover no-repeat; opacity: .9; clip-path: inset(0 0 0 0);
}
.bk-bg-snap.bk-bg-out { animation: bk-bg-wipe .55s cubic-bezier(.4,0,.2,1) forwards; }
.bk-bg-scanline {
  position: fixed; left: 0; right: 0; top: 0; height: 2px; z-index: -1;
  pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--bk-accent, #3FC7B4) 25%, #d6fff4 50%, var(--bk-accent, #3FC7B4) 75%, transparent);
  box-shadow: 0 0 14px 2px var(--bk-accent, #3FC7B4), 0 0 30px 4px rgba(63,199,180,.25);
  animation: bk-bg-scan .55s linear forwards;
}
@media (prefers-reduced-motion: reduce) {
  .bk-bg-snap.bk-bg-out { animation: bk-bg-fade .3s ease forwards; }
  .bk-bg-scanline { display: none; }
}
`;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

export function restoreBgSnapshot({ canvasId = CANVAS_ID } = {}) {
  let el = null;
  let killed = false;
  const kill = () => {
    killed = true;
    el?.remove();
    document.querySelector('.bk-bg-scanline')?.remove();
    el = null;
  };

  try {
    const data = sessionStorage.getItem(KEY);
    if (data && data.length > 200) {
      ensureStyle();
      el = document.createElement('div');
      el.className = 'bk-bg-snap';
      el.setAttribute('aria-hidden', 'true');
      el.dataset.bkBgSnapshot = canvasId;
      el.style.backgroundImage = `url(${data})`;
      document.body.appendChild(el);
      setTimeout(kill, MAX_LIFETIME); // red de seguridad
    }
  } catch {}

  return function release(effect) {
    if (!el || killed) return;
    const hold = effect === 'matrix-engine' ? 900 : 220;
    const snap = el;
    el = null;
    setTimeout(() => {
      if (killed) return;
      try {
        const scan = document.createElement('div');
        scan.className = 'bk-bg-scanline';
        scan.setAttribute('aria-hidden', 'true');
        document.body.appendChild(scan);
      } catch {}
      snap.classList.add('bk-bg-out');
      snap.addEventListener('animationend', kill, { once: true });
      setTimeout(kill, 800);
    }, hold);
  };
}

export function keepBgSnapshot({ canvasId = CANVAS_ID, width = 900 } = {}) {
  const save = () => {
    try {
      const c = document.getElementById(canvasId);
      if (!c || !c.width || !c.height) return;
      // Capturar con la MISMA opacidad con que se ve el canvas (el buffer WebGL
      // está a brillo pleno; la sutileza la da el opacity CSS del efecto).
      const shown = parseFloat(getComputedStyle(c).opacity);
      if (!(shown > 0)) return;
      const h = Math.max(1, Math.round((width * c.height) / c.width));
      const off = document.createElement('canvas');
      off.width = width;
      off.height = h;
      const ctx = off.getContext('2d');
      ctx.globalAlpha = Math.min(shown * 1.4, 1); // un pelo más para que se lea el barrido
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
