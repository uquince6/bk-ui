# @bk/ui

Sistema visual compartido entre aplicaciones (Navigator, Vera, futuras).

**Objetivo:** una sola definición de la identidad visual, consumible tanto por apps locales
como por apps desplegadas en la nube, sin copiar archivos a mano.

## Contenido

| Export | Qué es | Para |
|---|---|---|
| `@bk/ui/tokens.css` | `:root { --bk-* }` con todos los tokens | apps con CSS (Navigator) |
| `@bk/ui/tokens.js` | `export const tokens` (objeto) | apps con JS/build (Vera) |
| `@bk/ui/base.css` | reset mínimo + scrollbar + focus + reduced-motion | opcional |
| `@bk/ui/tokens.json` | fuente de verdad de los tokens | herramientas |
| `@bk/ui/backgrounds` | `mountBackground(target, cfg)` → `{ setIntensity, setEffect, pulse, destroy }` | fondos animados |
| `@bk/ui/appearance` | esquema `{ theme, background: { effect, intensity, options } }` + `normalizeAppearance()` | config consistente entre apps |
| `@bk/ui/notifications` | `createNotifier(options)` → `{ show, hide, destroy }` | avisos Matrix accesibles |

### Notificaciones

```js
import { createNotifier } from '@bk/ui/notifications';

const notifications = createNotifier({ duration: 2600 });
notifications.show({
  title: 'PROJECT SAVED',
  detail: 'CONFIGURACIÓN ACTUALIZADA',
});
notifications.show({
  title: 'SAVE ERROR',
  detail: error.message,
  variant: 'error',
});

// Aviso excepcional, central y de alta visibilidad.
notifications.show({
  title: 'DESCANSO',
  detail: '25 MINUTOS DE CONCENTRACIÓN · TE TOCA DESCANSAR',
  presentation: 'attention',
  announce: 'assertive',
  timeout: 6500,
});
```

El módulo crea el marcado accesible y conserva una sola notificación visible. Las
primitivas visuales Matrix se comparten internamente con `bg-continuity`.

### Fondos

```js
import { mountBackground } from '@bk/ui/backgrounds';
const bg = mountBackground(canvasOrContainer, { effect: 'rain-lite', intensity: 3 });
bg.setIntensity(5);
bg.pulse(2200);          // realce transitorio
bg.setEffect('none');
```

Efectos disponibles:
- `rain-lite` — lluvia de glifos en canvas 2D, portada de Navigator. Barata. Soporta `pulse()`.
- `matrix-engine` — el motor WebGL de [Rezmason/matrix](https://github.com/Rezmason/matrix),
  vendorizado y recortado en `vendor/matrix-engine/` (ver su `UPSTREAM.md` / `PATCHES.md`).
  Más pesado; la intensidad se traduce a opacidad. `pulse()` es no-op.
- `none`.

En apps con bundler (Vera) el efecto `matrix-engine` hace `import()` dinámico de
`vendor/matrix-engine/`; hay que copiar esa carpeta a los assets servidos.

Fuente única: **`tokens.json`**. `npm run build` regenera `dist/`. No editar `dist/` a mano.

## Uso

```jsonc
// package.json de la app
"dependencies": { "@bk/ui": "github:uquince6/bk-ui#v0.1.0" }
```

Actualizar = subir el tag en la URL y `npm install`. Nunca se editan archivos copiados.

### Navigator (sin build)

`server.mjs` sirve `node_modules/@bk/ui/dist/` bajo `/vendor/bk-ui/`; `index.html`:

```html
<link rel="stylesheet" href="/vendor/bk-ui/tokens.css" />
```

Luego mapea sus nombres locales sobre los `--bk-*` en su propio `:root`.

### Vera (esbuild)

```js
import { tokens } from '@bk/ui/tokens.js';
```

## Roadmap

- v0.1 — design tokens. ✅
- v0.2 — sistema de fondos: `mountBackground` + efecto `rain-lite` + esquema `appearance`. ✅
- v0.3 — motor Matrix (Rezmason) vendorizado y recortado como efecto `matrix-engine`. ✅
  - v0.3.3 — ciclo de montaje/desmontaje robusto: alternar rain-lite / matrix-engine
    / none repetidas veces sin recargar, sin fugas de contexto WebGL, con cache de
    shaders y texturas entre montajes.
- v0.4 — `applyAppearance()` como punto de entrada único (leer config → montar → `.set()`);
  `matrix-engine` recibe `basePath` explícito (empaquetable con bundler, p. ej. Vera). ✅
- v0.x — escala de espaciado, más primitivas, quizá componentes.

### `applyAppearance`

```js
import { applyAppearance } from '@bk/ui/appearance';
const bg = applyAppearance(canvas, config.appearance, {
  effectOptions: { basePath: '/vendor/matrix-engine/', chars: '01…' }
});
bg.set(nuevaConfig);   // re-aplica sin re-montar
bg.destroy();
```

`basePath` (obligatorio si se usa `matrix-engine`) = URL desde donde se sirve
`vendor/matrix-engine/`. En Navigator `"/vendor/bk-ui/vendor/matrix-engine/"`;
en apps con bundler, copiar esa carpeta al hosting y pasar su ruta.
