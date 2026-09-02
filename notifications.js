// @bk/ui - notificaciones visuales reutilizables para apps con o sin framework.

import { ensureFeedbackStyles } from './feedback-styles.js';

const STYLE_ID = 'bk-notification-style';

const CSS = `
.bk-notification {
  position: fixed; left: 50%; bottom: var(--bk-notification-bottom, 14px);
  z-index: var(--bk-notification-z, 60);
  width: min(680px, calc(100% - 28px)); padding: 15px 28px 14px;
  overflow: hidden; border: 1px solid rgba(73,220,177,.55); border-radius: 2px;
  background: radial-gradient(130% 180% at 50% 50%,rgba(63,199,180,.24),rgba(5,17,18,.9) 68%,rgba(3,10,14,.94));
  box-shadow: inset 0 0 22px rgba(73,220,177,.16),0 0 30px rgba(73,220,177,.22),0 14px 50px rgba(0,0,0,.5);
  backdrop-filter: blur(12px); text-align: center; opacity: 0;
  transform: translate(-50%,18px) scale(.985);
  transition: opacity .22s ease,transform .22s ease;
}
.bk-notification.bk-notification-visible { opacity: 1; transform: translate(-50%,0) scale(1); }
.bk-notification.bk-notification-attention {
  top: 50%; bottom: auto; width: min(820px, calc(100% - 28px));
  padding: 22px 38px 20px; border-color: var(--bk-feedback-accent);
  background: radial-gradient(130% 180% at 50% 50%,rgba(63,199,180,.28),rgba(5,17,18,.92) 68%,rgba(3,10,14,.96));
  box-shadow: inset 0 0 24px rgba(73,220,177,.22),0 0 38px rgba(73,220,177,.42),0 18px 60px rgba(0,0,0,.58);
  transform: translate(-50%,calc(-50% + 18px)) scale(.97);
  --bk-notification-scan-distance: 116px;
}
.bk-notification.bk-notification-attention.bk-notification-visible {
  transform: translate(-50%,-50%) scale(1);
  animation: bk-feedback-flicker 2s linear infinite;
}
.bk-notification::after {
  content: ''; position: absolute; left: 0; right: 0; top: 0; height: 2px;
  background: linear-gradient(90deg,transparent,rgba(73,220,177,.75) 25%,#d6fff4 50%,rgba(73,220,177,.75) 75%,transparent);
  box-shadow: 0 0 12px 2px rgba(73,220,177,.72),0 0 24px 4px rgba(73,220,177,.2);
  opacity: 0;
}
.bk-notification.bk-notification-visible::after { animation: bk-notification-scan .62s linear; }
@keyframes bk-notification-scan {
  0% { transform: translateY(-2px); opacity: 0; }
  12% { opacity: .9; }
  100% { transform: translateY(var(--bk-notification-scan-distance, 62px)); opacity: 0; }
}
.bk-notification.bk-notification-error {
  border-color: rgba(255,139,158,.48);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.05),0 0 28px rgba(255,139,158,.16),0 14px 50px rgba(0,0,0,.45);
}
.bk-notification-title {
  color: #d9fff5; font: 800 15px/1.2 var(--bk-font-mono, ui-monospace, monospace);
  letter-spacing: .34em; text-transform: uppercase;
  text-shadow: 0 0 13px rgba(73,220,177,.9),0 0 3px rgba(220,255,245,.65);
}
.bk-notification-error .bk-notification-title {
  color: #ffb0bd; text-shadow: 0 0 12px rgba(255,139,158,.65);
}
.bk-notification-detail {
  margin-top: 7px; color: rgba(231,255,249,.86);
  font: 11px/1.35 var(--bk-font-mono, ui-monospace, monospace); letter-spacing: .1em;
}
.bk-notification-attention .bk-notification-title {
  margin-right: -.38em; color: #dcfff5;
  font-size: clamp(19px,3.2vw,32px); letter-spacing: .38em;
  text-shadow: 0 0 16px var(--bk-feedback-accent),0 0 4px rgba(220,255,245,.72);
}
.bk-notification-attention .bk-notification-detail {
  margin-top: 11px; font-size: clamp(11px,1.5vw,14px);
  letter-spacing: .14em; text-transform: uppercase;
}
@media (prefers-reduced-motion: reduce) {
  .bk-notification { transition-duration: .001ms; }
  .bk-notification.bk-notification-attention.bk-notification-visible { animation: none; }
  .bk-notification::after { display: none; }
}
`;

function ensureNotificationStyles() {
  ensureFeedbackStyles();
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

export function createNotifier({
  container,
  duration = 2600,
  bottom = '14px',
  zIndex = 60,
  ariaLive = 'polite',
} = {}) {
  if (typeof document === 'undefined') {
    return { show() {}, hide() {}, destroy() {} };
  }

  ensureNotificationStyles();
  const host = container || document.body;
  const element = document.createElement('div');
  element.className = 'bk-feedback bk-notification';
  element.setAttribute('role', 'status');
  element.setAttribute('aria-live', ariaLive);
  element.setAttribute('aria-atomic', 'true');
  element.style.setProperty('--bk-notification-bottom', String(bottom));
  element.style.setProperty('--bk-notification-z', String(zIndex));

  const titleElement = document.createElement('div');
  titleElement.className = 'bk-notification-title';
  const detailElement = document.createElement('div');
  detailElement.className = 'bk-notification-detail';
  element.append(titleElement, detailElement);
  host.appendChild(element);

  let timer = null;
  let destroyed = false;

  const hide = () => {
    if (destroyed) return;
    clearTimeout(timer);
    timer = null;
    element.classList.remove('bk-notification-visible');
  };

  const show = ({ title = '', detail = '', variant = 'info', presentation = 'compact', timeout = duration, announce } = {}) => {
    if (destroyed) return;
    clearTimeout(timer);
    titleElement.textContent = String(title);
    detailElement.textContent = String(detail);
    element.classList.toggle('bk-notification-error', variant === 'error');
    element.classList.toggle('bk-notification-attention', presentation === 'attention');
    element.setAttribute('role', announce === 'assertive' ? 'alert' : 'status');
    element.setAttribute('aria-live', announce || ariaLive);
    element.classList.remove('bk-notification-visible');
    void element.offsetWidth;
    element.classList.add('bk-notification-visible');
    if (Number(timeout) > 0) timer = setTimeout(hide, Number(timeout));
  };

  const destroy = () => {
    if (destroyed) return;
    clearTimeout(timer);
    destroyed = true;
    element.remove();
  };

  return { element, show, hide, destroy };
}

export default createNotifier;
