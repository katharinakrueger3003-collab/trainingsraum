import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');

const app    = express();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.static(ROOT));   // serviert index.html

// ── Fortschritt der Kundenberater ────────────────────────────────────────────
// Primär in Upstash (Redis über REST) — übersteht das Einschlafen des Gratis-
// Hostings. Ohne Upstash-Zugangsdaten (z.B. lokale Entwicklung) fällt der
// Server auf eine lokale JSON-Datei zurück, die per .gitignore ausgenommen ist.
const DATA_DIR      = join(ROOT, 'data');
const PROGRESS_FILE = join(DATA_DIR, 'progress.json');
const PROGRESS_KEY  = 'trainingsraum:progress';

const UPSTASH_URL   = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const useUpstash    = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

if (!useUpstash && !existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

async function loadProgress() {
  if (useUpstash) {
    const r = await fetch(`${UPSTASH_URL}/get/${PROGRESS_KEY}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
    const d = await r.json();
    if (!d.result) return {};
    try { return JSON.parse(d.result); } catch { return {}; }
  }
  if (!existsSync(PROGRESS_FILE)) return {};
  try { return JSON.parse(readFileSync(PROGRESS_FILE, 'utf8')); }
  catch { return {}; }
}

async function saveProgress(data) {
  if (useUpstash) {
    await fetch(`${UPSTASH_URL}/set/${PROGRESS_KEY}`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      body:    JSON.stringify(data),
    });
    return;
  }
  writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Wer die Team-Übersicht sehen darf. Kommagetrennt, Groß-/Kleinschreibung egal.
const ADMIN_NAMES = (process.env.ADMIN_NAMES || 'Käthe,Katharina,Katharina Krüger')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

function isAdminName(name) {
  return ADMIN_NAMES.includes(String(name || '').trim().toLowerCase());
}

// Sagt dem Frontend, ob für den eingeloggten Namen der Team-Tab erscheinen soll.
app.get('/api/is-admin', (req, res) => {
  res.json({ isAdmin: isAdminName(req.query.name) });
});

// Ein Kundenberater schließt einen Test/ein Quiz/ein Rollenspiel ab — Ergebnis sichern.
app.post('/api/progress', async (req, res) => {
  const { name, type, data } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name und type erforderlich' });

  try {
    const key   = name.trim().toLowerCase();
    const store = await loadProgress();
    if (!store[key]) store[key] = { displayName: name.trim() };
    store[key].displayName = name.trim();

    const entry = { ...data, completedAt: new Date().toISOString() };
    if (type === 'rollenspiel') {
      if (!Array.isArray(store[key].rollenspiele)) store[key].rollenspiele = [];
      store[key].rollenspiele.push(entry);
    } else {
      store[key][type] = entry;
    }
    await saveProgress(store);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Team-Übersicht — nur für Namen aus ADMIN_NAMES.
app.get('/api/progress', async (req, res) => {
  if (!isAdminName(req.query.admin)) return res.status(403).json({ error: 'Kein Zugriff' });
  try {
    res.json(await loadProgress());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Chat (Claude) ──────────────────────────────────────────────────────────
// Reiner Passthrough: system + messages kommen unverändert vom Frontend
// (Rollenspiel-Personas, Feedback-Coach) und werden 1:1 an Claude gereicht.
app.post('/api/chat', async (req, res) => {
  const { system, messages, max_tokens = 600 } = req.body;
  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens,
      system,
      messages,
    });
    res.json({ reply: response.content.filter(b => b.type === 'text').map(b => b.text).join('') });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3010;
app.listen(PORT, () => {
  console.log(`✦ Trainingsraum-Backend läuft auf http://localhost:${PORT}`);
  console.log(`✦ Claude API: ${process.env.ANTHROPIC_API_KEY ? 'OK' : 'FEHLT!'}`);
  console.log(`✦ Fortschritts-Speicher: ${useUpstash ? 'Upstash (persistent)' : 'lokale Datei (nicht persistent im Hosting!)'}`);
});
