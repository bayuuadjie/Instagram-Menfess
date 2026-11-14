const IG_ID = process.env.IG_USER_ID;
const TOKEN = process.env.IG_ACCESS_TOKEN;
const API = 'https://graph.facebook.com/v21.0'; // cek versi terbaru di dokumentasi Meta

export async function publishToInstagram(imageUrl, caption) {
  // Langkah 1: buat container
  const c = await fetch(`${API}/${IG_ID}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: TOKEN }),
  }).then(r => r.json());
  if (!c.id) throw new Error(JSON.stringify(c));

  // Langkah 2: publish
  const p = await fetch(`${API}/${IG_ID}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: c.id, access_token: TOKEN }),
  }).then(r => r.json());
  if (!p.id) throw new Error(JSON.stringify(p));
  return p.id;
}