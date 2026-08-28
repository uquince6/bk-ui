# Parches sobre el motor original

Todos marcados en el código con `// [bk-ui patch]`. Motivo común: el motor
asumía estar servido en la raíz de un sitio dedicado; embebido en otra app y
bajo una subruta, hay que resolver rutas contra la ubicación real del módulo y
no pisar handlers globales de la app anfitriona.

### `js/regl/utils.js`
- `ENGINE_BASE` / `engineURL()` nuevos.
- `loadImage`: `data.src = engineURL(url)`.
- `loadText`: `fetch(engineURL(url))`.

### `js/config.js`
- Tras armar `config`, se resuelven `glyphMSDFURL`, `glintMSDFURL`,
  `baseTextureURL`, `glintTextureURL` contra `new URL("../", import.meta.url)`.

### `js/regl/main.js`
- `ENGINE_BASE` nuevo; `loadJS` resuelve `src` contra él y evita reinyectar
  `regl.min.js` / `gl-matrix.js` si ya están (marca con `data-matrix-engine`).
- `window.onresize = resize` → `window.addEventListener("resize", resize)`.
- Se elimina el bloque `window.ondblclick` (toggle de pantalla completa), no
  deseado en uso embebido.
- La función `default` ahora **retorna** `{ destroy() }` que cancela el
  `regl.frame`, quita el listener de resize y llama `regl.destroy()`.
