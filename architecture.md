APP: bk-ui
TIPO: Biblioteca · Sistema Visual Compartido
ESTADO: real
TITULO: @bk/ui
SUBTITULO: Una sola definición de la identidad visual para las aplicaciones locales y las desplegadas en la nube
RESULTADO: Navigator, Vera y las apps futuras comparten tokens, fondos animados, apariencia y avisos sin copiar archivos a mano

[tokens] Tokens | Fuente de verdad del diseño
tokens.json | Colores, tipografías y espacios (tokens.json) | palette
· Se genera tokens.css (variables --bk-*) y tokens.js para apps con y sin build
· Con build.mjs (script prepare) en dist/

[componentes] Componentes | Código reutilizable sin dependencias
Fondos | backgrounds.js y bg-continuity.js (mountBackground) | image
· Efectos animados con intensidad ajustable y continuidad entre páginas
Apariencia | appearance.js (normalizeAppearance, applyAppearance) | settings
· Esquema común de tema y fondo para que las apps coincidan
Notificaciones | notifications.js y feedback-styles.js (createNotifier) | bell
· Avisos accesibles con estilo Matrix

[consumo] Consumo | Cómo lo usan las apps
Sin build | Navigator sirve los archivos desde node_modules/@bk/ui | server
Con build | Vera lo empaqueta con esbuild | package
· Se instala desde GitHub con una etiqueta de versión (git+https://github.com/uquince6/bk-ui.git#vX.Y.Z)

[pruebas] Pruebas | node --test
Notificaciones | notifications.test.mjs | check
· El repositorio es público: no debe contener secretos ni datos personales
