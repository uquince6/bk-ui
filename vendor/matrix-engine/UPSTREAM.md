# matrix-engine — copia vendorizada

Origen: **https://github.com/Rezmason/matrix**
Commit: **5ba90490453ceceb6812d6b1bc658a99a92411d0** (2024-10-31, "Adding SVGs of the resurrections glyphs")
Licencia: **MIT** (ver `LICENSE`)

No es un paquete npm. Se vendoriza el runtime recortado porque `@bk/ui` lo
expone como efecto `matrix-engine` a través de `../../backgrounds.js`.

## Qué se incluye

- `js/` (sin `js/main.js` ni `js/webgpu/`) — se entra por `js/regl/main.js` + `js/config.js`
- `lib/regl.min.js`, `lib/gl-matrix.js`
- `shaders/glsl/` (sin `shaders/wgsl/`)
- `assets/` — solo un subconjunto de fuentes MSDF y texturas:
  `matrixcode` (default), `resurrections` (+glint), `megacity`, `gothic`, `coptic`,
  y texturas `sand` / `pixel_grid` / `mesh` / `metal`.

## Qué se quitó del repo original

`msdfgen/` (submódulo C++), `playdate/`, `svg sources/`, `screenshot.png`,
render WebGPU, `lib/regl.js` sin minificar, `lib/gpu-buffer.js`,
`lib/holoplaycore.module.js`, fuentes MSDF no usadas, documentación.

## Actualizar

1. `git -C <clon-de-Rezmason/matrix> pull`
2. Rehacer la copia de `js/` `lib/` `shaders/glsl/` `assets/<subset>`.
3. Reaplicar los parches de `PATCHES.md`.
4. `npm run build` no aplica; bump de versión de `@bk/ui` y `git tag`.
