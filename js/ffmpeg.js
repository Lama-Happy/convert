// ffmpeg.wasm is loaded lazily, only when a conversion starts. Files are vendored locally (see scripts/vendor.mjs).
let ff = null, onProgress = null, logs = [], cancelled = false;
export class UserCancel extends Error {}
async function load(status) {
  if (ff) return ff;
  status('loading ffmpeg (~30 MB, cached after first use)');
  try {
    const { FFmpeg } = await import('../vendor/ffmpeg/index.js');
    const f = new FFmpeg();
    f.on('log', ({ message }) => { logs.push(message); if (logs.length > 40) logs.shift(); });
    f.on('progress', ({ progress }) => onProgress && onProgress(progress));
    await f.load({
      coreURL: new URL('../vendor/core/ffmpeg-core.js', import.meta.url).href,
      wasmURL: new URL('../vendor/core/ffmpeg-core.wasm', import.meta.url).href,
    });
    return (ff = f);
  } catch (e) { ff = null; throw new Error('ffmpeg failed to load. Check your connection and that the vendor/ folder is deployed. (' + e.message + ')'); }
}
export function cancel() { cancelled = true; if (ff) { ff.terminate(); ff = null; } }
export async function run(file, inName, args, outName, status, progress) {
  cancelled = false; logs = []; onProgress = progress;
  try {
    const f = await load(status);
    status('processing');
    await f.writeFile(inName, new Uint8Array(await file.arrayBuffer()));
    const code = await f.exec(['-y', ...args]);
    if (cancelled) throw new UserCancel('cancelled');
    if (code !== 0) throw new Error(explain());
    const data = await f.readFile(outName);
    if (!data.length) throw new Error('ffmpeg produced an empty file');
    return new Blob([data]);
  } catch (e) {
    if (cancelled || /terminate/i.test(e.message)) throw new UserCancel('cancelled');
    if (/memory|allocation|RangeError/i.test(e.message)) throw new Error('not enough memory for this file. Try a smaller file or a lower resolution.');
    throw e;
  } finally {
    onProgress = null;
    if (ff) { ff.terminate(); ff = null; } // free wasm memory after each run
  }
}
function explain() {
  const l = logs.join('\n');
  if (/Unknown encoder|Encoder .* not found/i.test(l)) return 'this ffmpeg build has no encoder for the chosen output. Pick another format or codec.';
  if (/Invalid data found|moov atom|could not find codec/i.test(l)) return 'file is corrupted or its format is not supported.';
  return 'ffmpeg could not process this file. ' + logs.filter(Boolean).slice(-2).join(' ');
}
