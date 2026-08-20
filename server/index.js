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

// WICHTIG: Wirft bei jedem Fehler, statt still {} zurückzugeben. Ein leeres
// Objekt aus einem fehlgeschlagenen Lesevorgang würde beim nächsten Schreiben
// den kompletten Team-Fortschritt überschreiben.
async function loadProgress() {
  if (useUpstash) {
    const r = await fetch(`${UPSTASH_URL}/get/${PROGRESS_KEY}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
    if (!r.ok) throw new Error(`Upstash-Lesefehler: HTTP ${r.status} ${await r.text()}`);
    const d = await r.json();
    if (d.error) throw new Error(`Upstash-Lesefehler: ${d.error}`);
    if (d.result === null || d.result === undefined) return {};   // Key existiert noch nicht
    try { return JSON.parse(d.result); }
    catch (e) { throw new Error(`Fortschritt in Upstash ist kein gültiges JSON: ${e.message}`); }
  }
  if (!existsSync(PROGRESS_FILE)) return {};
  return JSON.parse(readFileSync(PROGRESS_FILE, 'utf8'));
}

async function saveProgress(data) {
  if (useUpstash) {
    const r = await fetch(`${UPSTASH_URL}/set/${PROGRESS_KEY}`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      body:    JSON.stringify(data),
    });
    if (!r.ok) throw new Error(`Upstash-Schreibfehler: HTTP ${r.status} ${await r.text()}`);
    const d = await r.json();
    if (d.error) throw new Error(`Upstash-Schreibfehler: ${d.error}`);
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

// Zeigt, ob der Fortschritts-Speicher wirklich funktioniert — ohne die Daten
// selbst preiszugeben. Damit lässt sich ein stiller Ausfall sofort erkennen.
app.get('/api/health', async (req, res) => {
  try {
    const store = await loadProgress();
    res.json({ ok: true, speicher: useUpstash ? 'upstash' : 'datei', berater: Object.keys(store).length });
  } catch (e) {
    console.error('[health] Speicher nicht lesbar:', e.message);
    res.status(500).json({ ok: false, speicher: useUpstash ? 'upstash' : 'datei', error: e.message });
  }
});

// Ein Kundenberater schließt einen Test/ein Quiz/ein Rollenspiel ab — oder
// meldet einen Zwischenstand. Zwischenstände landen unter `<type>Lauf`, damit
// ein abgebrochener Durchlauf ein früheres fertiges Ergebnis nicht überschreibt.
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
      // Ein Rollenspiel wird während des Gesprächs mehrfach gemeldet. Über die
      // runId wird derselbe Durchlauf aktualisiert statt dupliziert.
      const i = entry.runId ? store[key].rollenspiele.findIndex(r => r.runId === entry.runId) : -1;
      if (i >= 0) store[key].rollenspiele[i] = { ...store[key].rollenspiele[i], ...entry };
      else store[key].rollenspiele.push(entry);
    } else if (data && data.abgeschlossen === false) {
      store[key][type + 'Lauf'] = entry;
    } else {
      store[key][type] = entry;
      delete store[key][type + 'Lauf'];
    }

    await saveProgress(store);
    res.json({ ok: true });
  } catch (e) {
    console.error(`[progress] Speichern für "${name}" (${type}) fehlgeschlagen:`, e.message);
    res.status(500).json({ error: e.message });
  }
});

// Team-Übersicht — nur für Namen aus ADMIN_NAMES.
app.get('/api/progress', async (req, res) => {
  if (!isAdminName(req.query.admin)) return res.status(403).json({ error: 'Kein Zugriff' });
  try {
    res.json(await loadProgress());
  } catch (e) {
    console.error('[progress] Laden fehlgeschlagen:', e.message);
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
    console.error('[chat] Fehler:', e.message);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3010;
app.listen(PORT, () => {
  console.log(`✦ Trainingsraum-Backend läuft auf http://localhost:${PORT}`);
  console.log(`✦ Claude API: ${process.env.ANTHROPIC_API_KEY ? 'OK' : 'FEHLT!'}`);
  console.log(`✦ Fortschritts-Speicher: ${useUpstash ? 'Upstash (persistent)' : 'lokale Datei (nicht persistent im Hosting!)'}`);
});
