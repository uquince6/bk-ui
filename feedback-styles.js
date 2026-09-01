// Primitivas visuales compartidas por los mensajes y las transiciones de @bk/ui.
// Este modulo es interno: los consumidores usan notifications o bg-continuity.

const STYLE_ID = 'bk-feedback-style';

const CSS = `
@keyframes bk-feedback-fade { to { opacity: 0; } }
@keyframes bk-feedback-scan {
  0%   { transform: translate3d(0,-4vh,0);  opacity: 0; }
  12%  { opacity: .9; }
  100% { transform: translate3d(0,104vh,0); opacity: 0; }
}
@keyframes bk-feedback-flicker {
  0%,100% { opacity: 1; } 46% { opacity: .84; } 47% { opacity: .98; }
  48% { opacity: .72; } 49% { opacity: 1; } 72% { opacity: .9; }
}
.bk-feedback {
  --bk-feedback-accent: var(--bk-accent, #3FC7B4);
  --bk-feedback-danger: var(--bk-danger, #E0687A);
  pointer-events: none;
}
`;

export function ensureFeedbackStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

export default ensureFeedbackStyles;
