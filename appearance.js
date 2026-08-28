// @bk/ui — esquema de configuración de apariencia compartido entre apps.
//
// Define la FORMA y los defaults, no el almacenamiento: cada app persiste el
// objeto donde ya guarda su config (Navigator -> navigator-data.json,
// Vera -> Cloudflare KV). Usar normalizeAppearance() al leer datos crudos.

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

export default { KNOWN_EFFECTS, DEFAULT_APPEARANCE, normalizeAppearance, fromLegacyMatrixLevel };
