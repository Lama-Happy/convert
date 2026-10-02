import { build, parse, format } from './commands.js';
import { ext } from './files.js';
import * as ff from './ffmpeg.js';
export const inputName = file => 'input.' + (file ? ext(file.name) : 'mp4');
export function effectiveArgs(s, cat) {
  const inName = inputName(s.file);
  return s.override[cat] ? parse(s.override[cat], inName) : build(cat, inName, s.fmt[cat], s.opts[cat]);
}
export const commandText = (s, cat) => s.override[cat] || format(build(cat, inputName(s.file), s.fmt[cat], s.opts[cat]));
export async function convert(s, cat, status, progress) {
  const args = effectiveArgs(s, cat), outName = args[args.length - 1];
  const blob = await ff.run(s.file, inputName(s.file), args, outName, status, progress);
  return { blob, name: outName };
}
export const cancel = ff.cancel, UserCancel = ff.UserCancel;
