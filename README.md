# @bk/ui

Sistema visual compartido entre aplicaciones (Navigator, Vera, futuras).

**Objetivo:** una sola definición de la identidad visual, consumible tanto por apps locales
como por apps desplegadas en la nube, sin copiar archivos a mano.

## Contenido (v0.1)

| Export | Qué es | Para |
|---|---|---|
| `@bk/ui/tokens.css` | `:root { --bk-* }` con todos los tokens | apps con CSS (Navigator) |
| `@bk/ui/tokens.js` | `export const tokens` (objeto) | apps con JS/build (Vera) |
| `@bk/ui/base.css` | reset mínimo + scrollbar + focus + reduced-motion | opcional |
| `@bk/ui/tokens.json` | fuente de verdad | herramientas |

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

- v0.2 — sistema de fondos: interfaz `mount/setIntensity/destroy` + efecto `rain-lite`.
- v0.3 — motor Matrix (Rezmason) vendorizado y recortado como segundo efecto.
- v0.x — escala de espaciado, más primitivas, quizá componentes.
