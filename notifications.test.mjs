import test from 'node:test';
import assert from 'node:assert/strict';
import { createNotifier } from './notifications.js';

class FakeClassList {
  values = new Set();
  add(...names) { names.forEach((name) => this.values.add(name)); }
  remove(...names) { names.forEach((name) => this.values.delete(name)); }
  contains(name) { return this.values.has(name); }
  toggle(name, force) {
    const enabled = force ?? !this.values.has(name);
    enabled ? this.values.add(name) : this.values.delete(name);
    return enabled;
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.attributes = new Map();
    this.classList = new FakeClassList();
    this.style = { values: new Map(), setProperty: (key, value) => this.style.values.set(key, value) };
    this.offsetWidth = 520;
    this.removed = false;
  }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute(key, value) { this.attributes.set(key, String(value)); }
  getAttribute(key) { return this.attributes.get(key); }
  remove() { this.removed = true; }
}

function createFakeDocument() {
  const head = new FakeElement('head');
  const body = new FakeElement('body');
  return {
    head,
    body,
    createElement: (tagName) => new FakeElement(tagName),
    getElementById: (id) => [...head.children, ...body.children].find((node) => node.id === id) || null,
  };
}

test('createNotifier funciona sin DOM para renderizado de servidor', () => {
  const notifier = createNotifier();
  assert.doesNotThrow(() => notifier.show({ title: 'IGNORED' }));
  assert.doesNotThrow(() => notifier.destroy());
});

test('crea, actualiza, oculta y destruye una notificación accesible', async () => {
  globalThis.document = createFakeDocument();
  const notifier = createNotifier({ duration: 15, bottom: '40px', zIndex: 30 });

  assert.equal(document.body.children.at(-1), notifier.element);
  assert.equal(notifier.element.getAttribute('role'), 'status');
  assert.equal(notifier.element.style.values.get('--bk-notification-bottom'), '40px');
  assert.equal(notifier.element.style.values.get('--bk-notification-z'), '30');

  notifier.show({ title: 'SAVE ERROR', detail: 'NO SE PUDO GUARDAR', variant: 'error' });
  assert.equal(notifier.element.children[0].textContent, 'SAVE ERROR');
  assert.equal(notifier.element.children[1].textContent, 'NO SE PUDO GUARDAR');
  assert.equal(notifier.element.classList.contains('bk-notification-visible'), true);
  assert.equal(notifier.element.classList.contains('bk-notification-error'), true);

  notifier.show({ title: 'DESCANSO', presentation: 'attention', announce: 'assertive' });
  assert.equal(notifier.element.classList.contains('bk-notification-attention'), true);
  assert.equal(notifier.element.getAttribute('role'), 'alert');
  assert.equal(notifier.element.getAttribute('aria-live'), 'assertive');

  notifier.show({ title: 'PROJECT SAVED' });
  assert.equal(notifier.element.classList.contains('bk-notification-error'), false);
  assert.equal(notifier.element.classList.contains('bk-notification-attention'), false);
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(notifier.element.classList.contains('bk-notification-visible'), false);

  notifier.destroy();
  assert.equal(notifier.element.removed, true);
  delete globalThis.document;
});
