import { CONFIG } from './config.js';
import { esc, size, ext, check, dimensions } from './files.js';
import { fields, defaults, parse } from './commands.js';
import { convert, cancel, commandText, effectiveArgs, inputName, UserCancel } from './convert.js';

export const state = { file: null, catOfFile: null, info: '', fmt: { image: 'png', audio: 'mp3', video: 'mp4' }, opts: defaults(), override: {}, cat: 'video', url: null };
const $ = id => document.getElementById(id);
const back = '<p><a href="#/">← back</a></p>';

export function home(app) {
  app.innerHTML = `<h1>$ convert</h1><p class="dim">local media converter</p><h2>&gt; select a category</h2>
  <nav class="list">${['image', 'audio', 'video'].map(c => `<a class="btn" href="#/${c}">[ ${c} ]</a>`).join('')}</nav>
  <h2>&gt; tools</h2><nav class="list"><a class="btn" href="#/command">[ edit ffmpeg command ]</a></nav>`;
}

export function category(app, cat) {
  state.cat = cat;
  if (state.file && state.catOfFile !== cat) state.file = null;
  app.innerHTML = `${back}<h1>$ convert / ${cat}</h1><h2>&gt; input</h2>
  <label class="drop" id="drop" tabindex="0" role="button" aria-label="Select ${cat} file"><input id="file" type="file" accept="${cat}/*" hidden>
  <span id="dropmsg"></span></label><div id="finfo" aria-live="polite"></div>
  <h2>&gt; output</h2><div class="row" id="fmts">${CONFIG.formats[cat].map(f => `<button data-f="${f}" aria-pressed="${state.fmt[cat] === f}">[ ${f} ]</button>`).join('')}</div>
  <h2>&gt; options</h2><div class="fields" id="opts"></div>
  <p class="dim" style="word-break:break-all"><a href="#/command">command</a>: <span id="cmdp"></span></p>
  <p class="row"><button id="go" class="primary" disabled>[ convert ]</button><button id="stop" hidden>[ cancel ]</button></p>
  <div id="status" aria-live="polite"></div><div id="error" class="err" role="alert"></div>`;
  const drop = $('drop'), input = $('file');
  const cmd = () => { try { $('cmdp').textContent = commandText(state, cat); } catch { $('cmdp').textContent = '(invalid)'; } };
  const renderOpts = () => {
    const f = state.fmt[cat], hide = k =>
      (cat === 'audio' && ['wav', 'flac'].includes(f) && k === 'bitrate') ||
      (cat === 'video' && f === 'gif' && ['crf', 'codec', 'acodec', 'abr'].includes(k)) ||
      (cat === 'video' && f === 'webm' && k === 'codec') || (cat === 'image' && f === 'png' && k === 'quality');
    $('opts').innerHTML = fields[cat].filter(([k]) => !hide(k)).map(([k, label, type, extra]) => `<label for="o_${k}">${label}</label>` +
      (type === 'select' ? `<select id="o_${k}" data-k="${k}">${extra.map(v => `<option ${String(state.opts[cat][k]) === String(v) ? 'selected' : ''}>${v}</option>`).join('')}</select>`
        : `<input id="o_${k}" data-k="${k}" type="number" inputmode="numeric" placeholder="${extra}" value="${state.opts[cat][k]}">`)).join('');
    cmd();
  };
  const showFile = () => {
    const f = state.file; $('go').disabled = !f;
    $('finfo').innerHTML = f ? `<p>${esc(f.name)}<br><span class="dim">${size(f.size)}${state.info ? ' · ' + state.info : ''}</span><br><button id="repl">[ replace file ]</button></p>` : '';
    $('dropmsg').innerHTML = f ? 'file selected' : `drop ${cat} here<br>or click to select`;
    if (f) $('repl').onclick = () => input.click();
  };
  const setFile = async file => {
    $('error').textContent = ''; $('status').textContent = '';
    const err = check(file, cat);
    if (err) { $('error').textContent = 'error: ' + err; return; }
    state.file = file; state.catOfFile = cat; state.override[cat] = null; state.info = cat === 'image' ? await dimensions(file) : '';
    if (file.size > CONFIG.warnBytes) $('status').textContent = 'warning: large file, conversion may be slow or run out of memory';
    showFile(); cmd();
  };
  input.onchange = () => input.files[0] && setFile(input.files[0]);
  drop.onkeydown = e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), input.click());
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); e.dataTransfer.files[0] && setFile(e.dataTransfer.files[0]); };
  $('fmts').onclick = e => { const b = e.target.closest('button'); if (!b) return; state.fmt[cat] = b.dataset.f; state.override[cat] = null;
    [...$('fmts').children].forEach(x => x.setAttribute('aria-pressed', x === b)); renderOpts(); };
  $('opts').oninput = e => { state.opts[cat][e.target.dataset.k] = e.target.value; state.override[cat] = null; cmd(); };
  $('go').onclick = () => run(cat);
  $('stop').onclick = () => cancel();
  renderOpts(); showFile();
}

async function run(cat) {
  const st = $('status'), er = $('error'), go = $('go'), stop = $('stop');
  er.textContent = ''; go.disabled = true; stop.hidden = false;
  if (state.url) { URL.revokeObjectURL(state.url); state.url = null; }
  const bar = p => { const n = Math.max(0, Math.min(20, Math.round(p * 20))), pc = Math.max(0, Math.min(100, Math.round(p * 100)));
    st.innerHTML = `&gt; processing<br><span class="bar">${'█'.repeat(n)}${'░'.repeat(20 - n)} ${pc}%</span>`; };
  try {
    effectiveArgs(state, cat);
    const { blob, name } = await convert(state, cat, m => (st.textContent = '> ' + m), bar);
    state.url = URL.createObjectURL(blob);
    st.innerHTML = `<p class="ok">&gt; done</p><p>${esc(name)}<br><span class="dim">${size(blob.size)}</span></p><a class="btn primary" id="dl" href="${state.url}" download="${esc(state.file.name.replace(/\.[^.]+$/, '') + '.' + ext(name))}">[ download ]</a>`;
    $('dl').focus();
  } catch (e) {
    st.textContent = '';
    er.textContent = e instanceof UserCancel ? 'cancelled' : 'error: ' + e.message;
  } finally { go.disabled = false; stop.hidden = true; }
}

export function command(app) {
  const cat = state.cat;
  app.innerHTML = `${back}<h1>$ convert / command</h1><h2>&gt; generated command (${cat})</h2>
  <label for="cmd" class="dim">editable ffmpeg arguments; input and output must stay plain file names</label>
  <textarea id="cmd" spellcheck="false" autocapitalize="off" autocomplete="off"></textarea>
  <p class="row"><button id="reset">[ reset ]</button><button id="apply" class="primary">[ apply ]</button><a class="btn" href="#/${cat}">[ back to ${cat} ]</a></p><div id="msg" aria-live="polite"></div>`;
  const t = $('cmd'); t.value = commandText(state, cat);
  $('reset').onclick = () => { state.override[cat] = null; t.value = commandText(state, cat); $('msg').textContent = 'reset to ui settings'; };
  $('apply').onclick = () => { try { parse(t.value, inputName(state.file)); state.override[cat] = t.value.trim(); $('msg').innerHTML = '<span class="ok">applied: this command runs on convert</span>'; }
    catch (e) { $('msg').innerHTML = `<span class="err" role="alert">error: ${esc(e.message)}</span>`; } };
}
