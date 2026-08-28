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
- `dimensions` pasa de singleton de módulo a variable local: como singleton,
  al re-montar conservaba el tamaño anterior, el frame loop no detectaba cambio
  y nunca llamaba `setSize()` sobre el pipeline nuevo → lienzo en blanco al
  alternar efectos.
- Tercer parámetro `hooks = {}` con `aborted()` y `onTeardown(fn)`. Permite a la
  app anfitriona (a) abortar un montaje en curso — se comprueba tras cada
  `await` — y (b) recibir el `teardown` en cuanto existe el contexto WebGL,
  aunque la carga de assets no haya terminado.
- `teardown` idempotente (`torn`): `tick.cancel()`, quita listener de resize,
  `regl.destroy()` y fuerza `WEBGL_lose_context.loseContext()`.
- `await Promise.all(pipeline...ready)` va en `try/catch`: si un asset falla se
  llama `teardown()` antes de propagar el error (antes el contexto quedaba
  colgado y se agotaba el límite de contextos WebGL del navegador).
- `default` retorna `{ destroy: teardown }`.

### `js/regl/utils.js` (cache)
- `_textCache` / `_imageCache` a nivel de módulo: al alternar efectos se
  re-montaba el motor y se re-descargaban/decodificaban los mismos shaders y
  PNGs MSDF cada vez. Ahora la descarga se cachea (la textura sigue siendo por
  instancia de `regl`). Entrada fallida se descarta del cache.
