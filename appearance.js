// @bk/ui — esquema de configuración de apariencia compartido entre apps.
//
// Define la FORMA y los defaults, no el almacenamiento: cada app persiste el
// objeto donde ya guarda su config (Navigator -> navigator-data.json,
// Vera -> Cloudflare KV). Usar normalizeAppearance() al leer datos crudos.
//
// applyAppearance() es el punto de entrada único que ambas apps usan para
// aplicar una apariencia: monta el fondo y expone .set() para re-aplicar cuando
// la config cambia. Así no se duplica la lógica de "leer config -> montar".

import { mountBackground } from './backgrounds.js';

export const KNOWN_EFFECTS = ['rain-lite', 'matrix-engine', 'none'];

export const DEFAULT_APPEARANCE = {
  theme: 'default',
  background: { effect: 'rain-lite', intensity: 3, options: {} },
};

export function normalizeAppearance(raw) {
  const a = raw && typeof raw === 'object' ? raw : {};
  const bg = a.background && typeof a.background === 'object' ? a.background : {};
  const intensityNum = Math.round(Number(bg.intensity));
  return {
    theme: typeof a.theme === 'string' && a.theme ? a.theme : DEFAULT_APPEARANCE.theme,
    background: {
      effect: KNOWN_EFFECTS.includes(bg.effect) ? bg.effect : DEFAULT_APPEARANCE.background.effect,
      intensity: Number.isFinite(intensityNum)
        ? Math.max(0, Math.min(6, intensityNum))
        : DEFAULT_APPEARANCE.background.intensity,
      options: bg.options && typeof bg.options === 'object' ? bg.options : {},
    },
  };
}

// Migración puntual: apps que guardaban `settings.matrixLevel` (0..6) pasan a
// `settings.appearance`. Devuelve el appearance normalizado.
export function fromLegacyMatrixLevel(matrixLevel, base) {
  const appearance = normalizeAppearance(base ?? DEFAULT_APPEARANCE);
  const lvl = Math.round(Number(matrixLevel));
  if (Number.isFinite(lvl)) appearance.background.intensity = Math.max(0, Math.min(6, lvl));
  return appearance;
}

function applyTheme(theme) {
  try {
    document.documentElement.dataset.bkTheme = theme || 'default';
  } catch {}
}

// applyAppearance(target, raw, { effectOptions }) -> handle
//   target        : <canvas> o contenedor (ver mountBackground)
//   raw           : objeto de apariencia crudo (se normaliza)
//   effectOptions : opciones que se pasan a TODOS los efectos; cada uno usa lo
//                   suyo. Claves relevantes:
//                     basePath  -> ruta de vendor/matrix-engine/ (obligatoria si
//                                  se va a usar el efecto matrix-engine)
//                     chars     -> glifos de rain-lite
//   handle.set(nextRaw)  re-aplica una apariencia nueva sin re-montar de cero
//   handle.pulse(ms)     realce transitorio (solo rain-lite)
//   handle.destroy()
export function applyAppearance(target, raw, { effectOptions = {} } = {}) {
  let current = normalizeAppearance(raw);
  applyTheme(current.theme);

  const bg = mountBackground(target, {
    effect: current.background.effect,
    intensity: current.background.intensity,
    options: { ...effectOptions, ...current.background.options },
  });

  return {
    handle: bg,
    get appearance() {
      return current;
    },
    set(nextRaw) {
      const next = normalizeAppearance(nextRaw);
      applyTheme(next.theme);
      bg.setEffect(next.background.effect, { ...effectOptions, ...next.background.options });
      bg.setIntensity(next.background.intensity);
      current = next;
    },
    pulse(ms) {
      bg.pulse?.(ms);
    },
    destroy() {
      bg.destroy();
    },
  };
}

export default {
  KNOWN_EFFECTS,
  DEFAULT_APPEARANCE,
  normalizeAppearance,
  fromLegacyMatrixLevel,
  applyAppearance,
};
