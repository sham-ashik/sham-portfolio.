import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { inflateRawSync } from 'node:zlib';

// Restore the original slide previews and PDFs from the existing site ZIP.
const zip = readFileSync(resolve('Sham_Ashik_Vercel_Portfolio_Website.zip'));
const out = resolve('dist');
const prefix = 'sham-portfolio-site/public/assets/';
mkdirSync(out, { recursive: true });
copyFileSync('index.html', join(out, 'index.html'));
copyFileSync('styles.css', join(out, 'styles.css'));
let end = -1;
for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--) {
  if (zip.readUInt32LE(i) === 0x06054b50) { end = i; break; }
}
if (end < 0) throw new Error('Source ZIP directory not found');
const entries = zip.readUInt16LE(end + 10);
let cursor = zip.readUInt32LE(end + 16), extracted = 0;
for (let i = 0; i < entries; i++) {
  if (zip.readUInt32LE(cursor) !== 0x02014b50) throw new Error('Corrupt ZIP entry');
  const method = zip.readUInt16LE(cursor + 10);
  const bytes = zip.readUInt32LE(cursor + 20);
  const n = zip.readUInt16LE(cursor + 28);
  const x = zip.readUInt16LE(cursor + 30);
  const c = zip.readUInt16LE(cursor + 32);
  const offset = zip.readUInt32LE(cursor + 42);
  const name = zip.subarray(cursor + 46, cursor + 46 + n).toString('utf8');
  cursor += 46 + n + x + c;
  if (!name.startsWith(prefix) || name.endsWith('/')) continue;
  const relative = name.slice(prefix.length);
  if (!relative || relative.split('/').some(p => p === '.' || p === '..')) throw new Error('Unsafe ZIP path');
  if (zip.readUInt32LE(offset) !== 0x04034b50) throw new Error('Corrupt ZIP header');
  const start = offset + 30 + zip.readUInt16LE(offset + 26) + zip.readUInt16LE(offset + 28);
  const packed = zip.subarray(start, start + bytes);
  const content = method === 8 ? inflateRawSync(packed) : method === 0 ? packed : null;
  if (!content) throw new Error('Unsupported ZIP compression');
  const file = join(out, 'assets', relative);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  extracted++;
}
for (const file of ['Sham-Ashik-CV.pdf', 'Sham-Ashik-Portfolio.pdf', 'portfolio_page_2.png', 'portfolio_page_3.png', 'portfolio_page_4.png']) {
  if (!readFileSync(join(out, 'assets', file)).length) throw new Error('Missing asset ' + file);
}
console.log('Built portfolio with ' + extracted + ' original assets.');