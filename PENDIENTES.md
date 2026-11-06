# Pendientes

Formato en `forja/ESTANDAR.md`. Un pendiente entra en el modo cuota solo si está `listo`, es `autónomo: sí` y tiene `terminado cuando`.

## El repo es público en GitHub
- estado: bloqueado (decisión del usuario: ¿debe ser público?)
- valor: alto
- esfuerzo: S
- modelo: haiku
- autónomo: no
- terminado cuando: el repo es privado (`gh repo edit bk-ui --visibility private --accept-visibility-change-consequences`) o el estándar anota por qué es la excepción, y `forja revisar --github` ya no lo marca
Es el único repo público de la cuenta (revisión del 2026-11-05). El estándar pide repos privados. Antes de cambiarlo, comprobar que ninguna app lo carga desde GitHub (por ejemplo, desde un CDN).
