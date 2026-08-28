// Genera dist/ a partir de tokens.json. Sin dependencias.
//   dist/tokens.css  -> :root { --bk-* } para apps con CSS (Navigator)
//   dist/tokens.js   -> export const tokens = {...} para apps con JS (Vera)
//   dist/base.css    -> reset + primitivas compartidas (opcional de importar)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, 'dist');
mkdirSync(dist, { recursive: true });

const tokens = JSON.parse(readFileSync(join(root, 'tokens.json'), 'utf8'));
const groups = ['color', 'font', 'radius', 'shadow'];

// --- dist/tokens.css ---
const cssLines = [];
for (const group of groups) {
  for (const [name, value] of Object.entries(tokens[group] ?? {})) {
    const prefix = group === 'color' ? '' : `${group}-`;
    cssLines.push(`  --bk-${prefix}${name}: ${value};`);
  }
}
const css = `/* Generado desde tokens.json por build.mjs — no editar a mano. */\n:root {\n${cssLines.join('\n')}\n}\n`;
writeFileSync(join(dist, 'tokens.css'), css);

// --- dist/tokens.js ---
const js = `// Generado desde tokens.json por build.mjs — no editar a mano.\nexport const tokens = ${JSON.stringify(
  Object.fromEntries(groups.map((g) => [g, tokens[g] ?? {}])),
  null,
  2,
)};\nexport default tokens;\n`;
writeFileSync(join(dist, 'tokens.js'), js);

// --- dist/base.css ---
const base = `/* bk-ui base: reset mínimo + primitivas compartidas. Importar después de tokens.css. */
* { box-sizing: border-box; }
body { margin: 0; color: var(--bk-ink); background: var(--bk-bg); font-family: var(--bk-font-sans); }
:focus-visible { outline: 2px solid var(--bk-accent); outline-offset: 2px; }
::selection { background: color-mix(in srgb, var(--bk-accent) 35%, transparent); }
::-webkit-scrollbar { width: 9px; height: 9px; }
::-webkit-scrollbar-thumb { background: var(--bk-surface-3); border-radius: var(--bk-radius-sm); }
::-webkit-scrollbar-track { background: transparent; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; }
}
`;
writeFileSync(join(dist, 'base.css'), base);

console.log(`bk-ui: generados ${cssLines.length} tokens -> dist/tokens.css, dist/tokens.js, dist/base.css`);
