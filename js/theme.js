import { CONFIG } from './config.js';
export function applyTheme(t) {
  const r = document.documentElement;
  r.dataset.theme = t;
  for (const [k, v] of Object.entries(CONFIG.colors[t] || {})) r.style.setProperty(k, v);
  try { localStorage.setItem('theme', t); } catch {}
}
export function initTheme() {
  applyTheme(document.documentElement.dataset.theme);
  document.getElementById('theme').addEventListener('click', () =>
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
}
