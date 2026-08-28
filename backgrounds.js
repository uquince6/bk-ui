// @bk/ui — sistema de fondos reutilizable.
//
//   const handle = mountBackground(target, { effect, intensity, options });
//
//   target    : un <canvas> existente, o un contenedor (se crea el canvas), o nada (document.body)
//   effect    : "rain-lite" | "none"   (más efectos se registran en EFFECTS)
//   intensity : 0..6
//   options   : específicas del efecto
//
//   handle.setIntensity(0..6)
//   handle.setEffect(name, options)   — cambia de efecto en vivo
//   handle.pulse(ms)                  — realce transitorio (p. ej. al completar una acción)
//   handle.destroy()

const clampIntensity = (n) => Math.max(0, Math.min(6, Math.round(Number(n) || 0)));

function readToken(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch {
    return fallback;
  }
}

function toRgbTriplet(value, fallback = '73, 220, 177') {
  const m = String(value).trim().match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return fallback;
  return `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}`;
}

/* ----------------------------------------------------------------------------
   rain-lite — lluvia de glifos en canvas 2D.
   Portado del efecto original de Navigator; el color sale de los tokens salvo
   que se pase `color` / `trailColor` en options.
---------------------------------------------------------------------------- */
function createRainLite(canvas, options = {}) {
  const ctx = canvas.getContext('2d');
  const chars = options.chars || '01{}[]<>/\\|+-*=';
  const fontSize = options.fontSize || 16;
  const fontStack = options.font || '"JetBrains Mono", ui-monospace, Consolas, monospace';
  const glyphColor = toRgbTriplet(options.color || readToken('--bk-accent', '#3FC7B4'));
  const trailColor = toRgbTriplet(options.trailColor || readToken('--bk-bg', '#0F131B'), '9, 11, 20');

  let intensity = clampIntensity(options.intensity ?? 3);
  let columns = [];
  let frame = 0;
  let raf = 0;
  let boostUntil = 0;
  let seeded = false;

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(innerWidth * ratio);
    canvas.height = Math.floor(innerHeight * ratio);
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    // Primer render: se siembran las columnas repartidas por toda la altura para
    // que se vea "ya lloviendo" al instante (evita el barrido de ~2 s desde
    // vacío al volver a montar el fondo tras navegar). Resizes posteriores:
    // comportamiento normal (entran desde arriba).
    const rows = innerHeight / fontSize;
    columns = Array.from({ length: Math.ceil(innerWidth / fontSize) }, () =>
      seeded ? Math.random() * -80 : Math.random() * (rows + 20) - 20,
    );
    seeded = true;
  }

  function applyOpacity() {
    canvas.style.opacity = intensity === 0 ? '0' : String(0.035 + intensity * 0.055);
  }

  function draw() {
    raf = requestAnimationFrame(draw);
    if (document.hidden || intensity === 0 || frame++ % 2) return;
    const boosted = Date.now() < boostUntil;
    ctx.fillStyle = `rgba(${trailColor}, ${boosted ? 0.055 : 0.1})`;
    ctx.fillRect(0, 0, innerWidth, innerHeight);
    ctx.font = `${fontSize}px ${fontStack}`;
    ctx.fillStyle = `rgba(${glyphColor}, ${Math.min(0.28 + intensity * 0.075 + (boosted ? 0.18 : 0), 0.92)})`;
    columns.forEach((y, i) => {
      ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * fontSize, y * fontSize);
      if (y * fontSize > innerHeight && Math.random() > 0.975) columns[i] = Math.random() * -20;
      columns[i] += (boosted ? 0.82 : 0.34) + Math.random() * (boosted ? 0.36 : 0.16);
    });
  }

  resize();
  applyOpacity();
  addEventListener('resize', resize, { passive: true });
  draw();

  return {
    setIntensity(n) {
      intensity = clampIntensity(n);
      applyOpacity();
    },
    pulse(ms = 2000) {
      boostUntil = Date.now() + ms;
    },
    destroy() {
      cancelAnimationFrame(raf);
      removeEventListener('resize', resize);
      try {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      } catch {}
      canvas.style.opacity = '0';
    },
  };
}

/* ----------------------------------------------------------------------------
   matrix-engine — el motor WebGL de Rezmason/matrix (vendorizado y recortado
   en vendor/matrix-engine/). Se carga en diferido; la intensidad se traduce a
   opacidad del canvas para mantenerlo discreto como fondo.

   El montaje es cancelable en cualquier punto: si se cambia de efecto mientras
   el motor todavía está bajando assets, `destroy()` libera el contexto WebGL
   igual (a través de `hooks.onTeardown`), sin fugas ni promesas colgadas.
---------------------------------------------------------------------------- */
let _engineModules = null;
function loadEngineModules() {
  if (!_engineModules) {
    const base = new URL('./vendor/matrix-engine/', import.meta.url).href;
    _engineModules = Promise.all([
      import(`${base}js/config.js`),
      import(`${base}js/regl/main.js`),
    ]).catch((err) => {
      _engineModules = null; // reintentar en el próximo montaje
      throw err;
    });
  }
  return _engineModules;
}

function createMatrixEngine(canvas, options = {}) {
  const opacityFor = (i) => (i <= 0 ? '0' : String(Math.min(0.05 + i * 0.055, 0.5)));
  let intensity = clampIntensity(options.intensity ?? 3);
  let aborted = false;
  let teardown = null; // lo entrega el motor apenas existe el contexto WebGL

  canvas.style.opacity = opacityFor(intensity);

  loadEngineModules()
    .then(([configMod, mainMod]) => {
      if (aborted) return undefined;
      // makeConfig() espera strings (viene de URLSearchParams: parseFloat / toLowerCase).
      const params = {};
      for (const [k, v] of Object.entries({ resolution: '0.6', ...(options.params || {}) })) {
        params[k] = String(v);
      }
      const hooks = {
        aborted: () => aborted,
        onTeardown: (fn) => {
          teardown = fn;
          if (aborted) fn();
        },
      };
      return mainMod.default(canvas, configMod.default(params), hooks);
    })
    .then((handle) => {
      if (aborted) handle?.destroy?.();
    })
    .catch((err) => {
      // Al navegar entre páginas, los import()/fetch en vuelo se cancelan: eso
      // no es un fallo real, así que no se ruidea la consola.
      if (aborted || document.hidden) return;
      try { window.__bkMatrixEngineError = err; } catch {}
      console.warn('[bk-ui] matrix-engine:', err?.message || err);
    });

  return {
    setIntensity(n) {
      intensity = clampIntensity(n);
      canvas.style.opacity = opacityFor(intensity);
    },
    pulse() {}, // el motor no expone realce; no-op
    destroy() {
      aborted = true;
      try { teardown?.(); } catch {}
      teardown = null;
      canvas.style.opacity = '0';
    },
  };
}

const noop = () => ({ setIntensity() {}, pulse() {}, destroy() {} });

const EFFECTS = {
  'rain-lite': createRainLite,
  'matrix-engine': createMatrixEngine,
  none: noop,
};

export const BACKGROUND_EFFECTS = Object.keys(EFFECTS);

export function mountBackground(target, config = {}) {
  let canvas = target instanceof HTMLCanvasElement ? target : null;
  let ownsCanvas = false;
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      zIndex: '-2',
      pointerEvents: 'none',
    });
    (target instanceof HTMLElement ? target : document.body).appendChild(canvas);
    ownsCanvas = true;
  }

  // Identidad "de fábrica" del canvas — se captura ANTES de que ningún efecto lo
  // toque. Los efectos escriben estilos inline (rain-lite fija width/height en px,
  // el motor fija opacity); si al reemplazar el canvas copiáramos esos estilos,
  // el nuevo quedaría con un tamaño fijo y no volvería a cubrir la ventana al
  // redimensionar. Por eso se restaura este snapshot limpio.
  const pristine = { id: canvas.id, className: canvas.className, cssText: canvas.style.cssText };

  // Un <canvas> solo admite un tipo de contexto de por vida: si rain-lite pidió
  // "2d", el motor WebGL ya no puede pedir "webgl" en ese mismo elemento. Al
  // cambiar de efecto se reemplaza el canvas por uno virgen en la misma posición.
  function replaceCanvas() {
    const fresh = document.createElement('canvas');
    fresh.id = pristine.id;
    fresh.className = pristine.className;
    fresh.setAttribute('aria-hidden', 'true');
    fresh.style.cssText = pristine.cssText;
    canvas.replaceWith(fresh);
    canvas = fresh;
  }

  let intensity = clampIntensity(config.intensity ?? 3);
  let current = EFFECTS[config.effect] ? config.effect : 'rain-lite';
  let impl = EFFECTS[current](canvas, { ...config.options, intensity });

  return {
    get effect() {
      return current;
    },
    setIntensity(n) {
      intensity = clampIntensity(n);
      impl.setIntensity(intensity);
    },
    pulse(ms) {
      impl.pulse?.(ms);
    },
    setEffect(name, options = {}) {
      if (!EFFECTS[name] || name === current) return;
      impl.destroy();
      replaceCanvas();
      current = name;
      impl = EFFECTS[name](canvas, { ...options, intensity });
    },
    destroy() {
      impl.destroy();
      if (ownsCanvas) canvas.remove();
    },
  };
}

export default mountBackground;
