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

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(innerWidth * ratio);
    canvas.height = Math.floor(innerHeight * ratio);
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    columns = Array.from({ length: Math.ceil(innerWidth / fontSize) }, () => Math.random() * -80);
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

const noop = () => ({ setIntensity() {}, pulse() {}, destroy() {} });

const EFFECTS = {
  'rain-lite': createRainLite,
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
