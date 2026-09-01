// @bk/ui - notificaciones visuales reutilizables para apps con o sin framework.

import { ensureFeedbackStyles } from './feedback-styles.js';

const STYLE_ID = 'bk-notification-style';

const CSS = `
.bk-notification {
  position: fixed; left: 50%; bottom: var(--bk-notification-bottom, 14px);
  z-index: var(--bk-notification-z, 60);
  min-width: min(520px, calc(100% - 28px)); padding: 14px 20px;
  border: 1px solid rgba(73,220,177,.38); border-radius: 14px;
  background: linear-gradient(180deg,rgba(9,20,20,.88),rgba(6,12,17,.82));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.05),0 0 28px rgba(73,220,177,.18),0 14px 50px rgba(0,0,0,.45);
  backdrop-filter: blur(16px); text-align: center; opacity: 0;
  transform: translate(-50%,18px) scale(.97);
  transition: opacity .22s ease,transform .22s ease;
}
.bk-notification.bk-notification-visible { opacity: 1; transform: translate(-50%,0) scale(1); }
.bk-notification.bk-notification-error {
  border-color: rgba(255,139,158,.48);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.05),0 0 28px rgba(255,139,158,.16),0 14px 50px rgba(0,0,0,.45);
}
.bk-notification-title {
  color: #a5ffe8; font: 800 13px/1.2 var(--bk-font-mono, ui-monospace, monospace);
  letter-spacing: .19em; text-shadow: 0 0 12px rgba(73,220,177,.78);
}
.bk-notification-error .bk-notification-title {
  color: #ffb0bd; text-shadow: 0 0 12px rgba(255,139,158,.65);
}
.bk-notification-detail {
  margin-top: 5px; color: rgba(231,255,249,.82);
  font: 11px/1.3 var(--bk-font-mono, ui-monospace, monospace); letter-spacing: .07em;
}
@media (prefers-reduced-motion: reduce) {
  .bk-notification { transition-duration: .001ms; }
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

  const show = ({ title = '', detail = '', variant = 'info', timeout = duration, announce } = {}) => {
    if (destroyed) return;
    clearTimeout(timer);
    titleElement.textContent = String(title);
    detailElement.textContent = String(detail);
    element.classList.toggle('bk-notification-error', variant === 'error');
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
