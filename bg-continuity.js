// @bk/ui — continuidad visual del fondo entre navegaciones de páginas (MPA).
//
// En una app multipágina, cada navegación destruye y recrea el fondo; el efecto
// tarda en "llenarse" y se ve un hueco. Esto guarda el último fotograma al salir
// y lo muestra al instante en la página siguiente mientras el efecto real se
// re-monta por detrás; luego se desvanece.
//
//   const release = restoreBgSnapshot();          // al cargar la página
//   const bg = mountBackground(canvas, { ... });
//   release(effectName);                           // programa el fade-out
//   keepBgSnapshot();                              // guarda el fotograma al salir

const KEY = 'bk:bg-snapshot';
const CANVAS_ID = 'matrix';

export function restoreBgSnapshot({ canvasId = CANVAS_ID } = {}) {
  let el = null;
  try {
    const data = sessionStorage.getItem(KEY);
    if (data) {
      el = document.createElement('div');
      el.setAttribute('aria-hidden', 'true');
      el.dataset.bkBgSnapshot = canvasId;
      el.style.cssText =
        'position:fixed;inset:0;z-index:-1;pointer-events:none;background:center/cover no-repeat;transition:opacity .55s ease';
      el.style.backgroundImage = `url(${data})`;
      document.body.appendChild(el);
    }
  } catch {}

  return function release(effect) {
    if (!el) return;
    // El motor WebGL tarda más en tener una imagen "llena"; rain-lite (sembrado)
    // es casi inmediato.
    const hold = effect === 'matrix-engine' ? 1600 : 450;
    setTimeout(() => {
      if (!el) return;
      el.style.opacity = '0';
      setTimeout(() => {
        el?.remove();
        el = null;
      }, 600);
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
