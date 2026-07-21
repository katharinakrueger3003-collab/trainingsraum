import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');

const app    = express();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.static(ROOT));   // serviert index.html

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
});
