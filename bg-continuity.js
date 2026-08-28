// @bk/ui — continuidad visual del fondo entre navegaciones de páginas (MPA).
//
// En una app multipágina, cada navegación destruye y recrea el fondo; el efecto
// tarda en "llenarse" y se ve un hueco. Esto guarda el último fotograma al salir
// y lo muestra al instante en la página siguiente mientras el efecto real se
// re-monta por detrás. El fotograma no se desvanece sin más: lo "barre" una
// línea de escaneo verde de arriba a abajo, revelando el fondo vivo — se lee
// como que la pantalla se refresca, sin salir de la estética Matrix.
//
//   const release = restoreBgSnapshot();          // al cargar la página
//   const bg = mountBackground(canvas, { ... });
//   release(effectName);                           // programa el barrido
//   keepBgSnapshot();                              // guarda el fotograma al salir

const KEY = 'bk:bg-snapshot';
const CANVAS_ID = 'matrix';
const STYLE_ID = 'bk-bg-continuity-style';

const CSS = `
@keyframes bk-bg-wipe { to { clip-path: inset(100% 0 0 0); opacity: .35; } }
@keyframes bk-bg-scan {
  0%   { transform: translate3d(0,-4vh,0);  opacity: 0; }
  10%  { opacity: 1; }
  100% { transform: translate3d(0,104vh,0); opacity: 0; }
}
@keyframes bk-bg-fade { to { opacity: 0; } }
.bk-bg-snap {
  position: fixed; inset: 0; z-index: -1; pointer-events: none;
  background: center / cover no-repeat; clip-path: inset(0 0 0 0);
}
.bk-bg-snap.bk-bg-out { animation: bk-bg-wipe .62s cubic-bezier(.4,0,.2,1) forwards; }
.bk-bg-scanline {
  position: fixed; left: 0; right: 0; top: 0; height: 3px; z-index: -1;
  pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--bk-accent, #3FC7B4) 20%, #c9fff0 50%, var(--bk-accent, #3FC7B4) 80%, transparent);
  box-shadow: 0 0 22px 5px var(--bk-accent, #3FC7B4), 0 0 60px 12px rgba(63,199,180,.35);
  animation: bk-bg-scan .62s linear forwards;
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
  try {
    const data = sessionStorage.getItem(KEY);
    if (data) {
      ensureStyle();
      el = document.createElement('div');
      el.className = 'bk-bg-snap';
      el.setAttribute('aria-hidden', 'true');
      el.dataset.bkBgSnapshot = canvasId;
      el.style.backgroundImage = `url(${data})`;
      document.body.appendChild(el);
    }
  } catch {}

  return function release(effect) {
    if (!el) return;
    // El motor WebGL tarda más en tener una imagen "llena"; rain-lite (sembrado)
    // es casi inmediato.
    const hold = effect === 'matrix-engine' ? 1200 : 320;
    const snap = el;
    el = null;
    setTimeout(() => {
      let scan = null;
      try {
        scan = document.createElement('div');
        scan.className = 'bk-bg-scanline';
        scan.setAttribute('aria-hidden', 'true');
        document.body.appendChild(scan);
      } catch {}
      snap.classList.add('bk-bg-out');
      const cleanup = () => {
        snap.remove();
        scan?.remove();
      };
      snap.addEventListener('animationend', cleanup, { once: true });
      setTimeout(cleanup, 900); // respaldo
    }, hold);
  };
}

export function keepBgSnapshot({ canvasId = CANVAS_ID, width = 900 } = {}) {
  const save = () => {
    try {
      const c = document.getElementById(canvasId);
      if (!c || !c.width || !c.height) return;
      const h = Math.max(1, Math.round((width * c.height) / c.width));
      const off = document.createElement('canvas');
      off.width = width;
      off.height = h;
      off.getContext('2d').drawImage(c, 0, 0, width, h);
      sessionStorage.setItem(KEY, off.toDataURL('image/webp', 0.55));
    } catch {}
  };
  addEventListener('pagehide', save);
  addEventListener('visibilitychange', () => {
    if (document.hidden) save();
  });
}

export default { restoreBgSnapshot, keepBgSnapshot };
