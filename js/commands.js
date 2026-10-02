// Builds ffmpeg argument lists from UI options, and parses user-edited commands.
export const defaults = () => ({
  image: { quality: 85, width: '' },
  audio: { bitrate: 192, rate: 'auto' },
  video: { codec: 'h264', crf: 23, res: 'original', fps: 'original', acodec: 'aac', abr: 128 },
});
export const fields = {
  image: [['quality', 'quality', 'number', '1-100'], ['width', 'width px', 'number', 'empty = original']],
  audio: [['bitrate', 'bitrate kb/s', 'select', [64, 128, 192, 256, 320]], ['rate', 'sample rate', 'select', ['auto', 44100, 48000]]],
  video: [['codec', 'codec', 'select', ['h264', 'mpeg4']], ['crf', 'quality (crf)', 'number', '0-51, lower = better'],
    ['res', 'resolution', 'select', ['original', 2160, 1080, 720, 480]], ['fps', 'fps', 'select', ['original', 60, 30, 24, 15]],
    ['acodec', 'audio', 'select', ['aac', 'mp3', 'none']], ['abr', 'audio kb/s', 'select', [64, 128, 192, 256]]],
};
const n = (v, a, b, d) => { v = Math.round(Number(v)); return Number.isFinite(v) && String(v) !== '' ? Math.min(b, Math.max(a, v)) : d; };

export function build(cat, inName, fmt, o) {
  const out = 'output.' + (fmt === 'aac' ? 'm4a' : fmt), a = ['-i', inName];
  if (cat === 'image') {
    const q = n(o.quality, 1, 100, 85), w = o.width === '' ? 0 : n(o.width, 0, 16384, 0);
    if (w) a.push('-vf', `scale=${w}:-2`);
    if (fmt === 'jpg') a.push('-q:v', String(Math.round(31 - q * 0.29)));
    if (fmt === 'webp') a.push('-c:v', 'libwebp', '-quality', String(q));
    if (fmt === 'avif') a.push('-c:v', 'libaom-av1', '-crf', String(Math.round(63 - q * 0.63)), '-still-picture', '1');
    if (fmt === 'png') a.push('-compression_level', '9');
    a.push('-frames:v', '1');
  } else if (cat === 'audio') {
    a.push('-vn', '-c:a', { mp3: 'libmp3lame', wav: 'pcm_s16le', flac: 'flac', ogg: 'libvorbis', aac: 'aac' }[fmt]);
    if (['mp3', 'ogg', 'aac'].includes(fmt)) a.push('-b:a', n(o.bitrate, 32, 512, 192) + 'k');
    if (o.rate !== 'auto') a.push('-ar', String(o.rate));
  } else {
    const vf = [];
    if (fmt === 'gif') {
      vf.push(`fps=${o.fps === 'original' ? 12 : o.fps}`, o.res !== 'original' ? `scale=-2:${o.res}` : 'scale=480:-2');
      a.push('-vf', vf.join(','), '-loop', '0');
    } else {
      if (o.res !== 'original') a.push('-vf', `scale=-2:${o.res}`);
      if (o.fps !== 'original') a.push('-r', String(o.fps));
      const crf = n(o.crf, 0, 51, 23);
      if (fmt === 'webm') a.push('-c:v', 'libvpx-vp9', '-crf', String(Math.max(crf, 10)), '-b:v', '0', '-deadline', 'realtime', '-cpu-used', '8');
      else if (o.codec === 'mpeg4') a.push('-c:v', 'mpeg4', '-q:v', String(Math.round(crf / 2 + 1)));
      else a.push('-c:v', 'libx264', '-crf', String(crf), '-preset', 'veryfast');
      if (o.acodec === 'none') a.push('-an');
      else a.push('-c:a', fmt === 'webm' ? 'libvorbis' : { aac: 'aac', mp3: 'libmp3lame' }[o.acodec], '-b:a', n(o.abr, 32, 512, 128) + 'k');
      if (fmt === 'mp4' || fmt === 'mov') a.push('-pix_fmt', 'yuv420p');
    }
  }
  return [...a, out];
}
export const format = args => 'ffmpeg ' + args.map(x => /[\s"']/.test(x) ? `"${x.replace(/"/g, '\\"')}"` : x).join(' ');
export function tokenize(s) {
  const t = []; let cur = '', q = null, has = false;
  for (const c of s) {
    if (q) { if (c === q) q = null; else cur += c; }
    else if (c === '"' || c === "'") { q = c; has = true; }
    else if (/\s/.test(c)) { if (cur || has) t.push(cur); cur = ''; has = false; }
    else cur += c;
  }
  if (q) throw new Error('unclosed quote');
  if (cur || has) t.push(cur);
  return t;
}
// Validates a user-edited command. Only ffmpeg arguments are accepted; nothing is evaluated.
export function parse(s, inName) {
  const t = tokenize(s.trim());
  if (t[0] !== 'ffmpeg') throw new Error('command must start with "ffmpeg"');
  const a = t.slice(1);
  if (a.length < 3) throw new Error('missing arguments');
  if (a.filter(x => x === '-i').length !== 1 || a[a.indexOf('-i') + 1] !== inName) throw new Error(`exactly one input is allowed: -i ${inName}`);
  const out = a[a.length - 1];
  if (out.startsWith('-') || !/^[\w.-]+\.[a-z0-9]+$/i.test(out) || out === inName) throw new Error('last argument must be a plain output file name, e.g. output.mp4');
  return a;
}
