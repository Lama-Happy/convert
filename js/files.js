import { CONFIG } from './config.js';
export const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const size = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : n < 1073741824 ? (n / 1048576).toFixed(1) + ' MB' : (n / 1073741824).toFixed(2) + ' GB';
export const ext = name => (name.includes('.') ? name.split('.').pop() : 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
export function check(file, cat) {
  if (file.size > CONFIG.maxBytes) return `file is ${size(file.size)}; ffmpeg.wasm handles about 2 GB at most`;
  if (file.size === 0) return 'file is empty';
  const t = file.type.split('/')[0];
  if (t && t !== cat && !(cat === 'audio' && t === 'video')) return `expected a ${cat} file, got "${file.type}"`;
  return null;
}
export function dimensions(file) {
  return new Promise(res => {
    const u = URL.createObjectURL(file), i = new Image();
    i.onload = () => { res(i.naturalWidth + '×' + i.naturalHeight); URL.revokeObjectURL(u); };
    i.onerror = () => { res(''); URL.revokeObjectURL(u); };
    i.src = u;
  });
}
