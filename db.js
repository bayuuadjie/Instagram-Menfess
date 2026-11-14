import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('menfess.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS menfess (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    text       TEXT NOT NULL,
    template   TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'pending', -- pending | posting | posted | failed | rejected
    error      TEXT,
    created_at INTEGER NOT NULL
  )
`);

export const add = (text, template) =>
  db.prepare('INSERT INTO menfess (text, template, created_at) VALUES (?, ?, ?)')
    .run(text, template, Date.now());

export const list = (status) =>
  db.prepare('SELECT * FROM menfess WHERE status = ? ORDER BY id DESC LIMIT 100').all(status);

export const get = (id) => db.prepare('SELECT * FROM menfess WHERE id = ?').get(id);

// Ambil item untuk diposting. Mencegah dobel posting kalau admin klik dua kali.
export const claim = (id) =>
  db.prepare("UPDATE menfess SET status = 'posting' WHERE id = ? AND status IN ('pending','failed')")
    .run(id).changes === 1;

export const setStatus = (id, status, error = null) =>
  db.prepare('UPDATE menfess SET status = ?, error = ? WHERE id = ?').run(status, error, id);