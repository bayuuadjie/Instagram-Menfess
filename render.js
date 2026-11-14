import { createCanvas } from '@napi-rs/canvas';
import fs from 'fs';

// bg string = warna solid, bg array = gradient diagonal
export const TEMPLATES = {
  pink:     { bg: '#ffd6e0', fg: '#4a1d2b' },
  dark:     { bg: '#1a1a2e', fg: '#eaeaea' },
  mint:     { bg: '#d4f5e9', fg: '#154734' },
  lemon:    { bg: '#fff3a8', fg: '#4a3b00' },
  gradient: { bg: ['#ffd1e8', '#b9a6ff'], fg: '#1b1340' },
};

function wrap(ctx, text, maxWidth) {
  const lines = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const w of para.split(' ')) {
      const test = line + w + ' ';
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line.trim());
        line = w + ' ';
      } else line = test;
    }
    lines.push(line.trim());
  }
  return lines;
}

export async function renderPost(text, templateName = 'pink') {
  const t = TEMPLATES[templateName] || TEMPLATES.pink;
  const size = 1080;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  if (Array.isArray(t.bg)) {
    const g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, t.bg[0]);
    g.addColorStop(1, t.bg[1]);
    ctx.fillStyle = g;
  } else ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = t.fg;
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';

  const lines = wrap(ctx, text, 840);
  const lineHeight = 66;
  let y = (size - lines.length * lineHeight) / 2 + lineHeight;
  for (const l of lines) {
    ctx.fillText(l, size / 2, y);
    y += lineHeight;
  }

  const filename = `${Date.now()}.jpg`; // Instagram butuh JPEG
  fs.mkdirSync('public/images', { recursive: true });
  fs.writeFileSync(`public/images/${filename}`, canvas.toBuffer('image/jpeg'));
  return filename;
}