// ─────────────────────────────────────────────────────────────────────────────
// VERITAS API PROXY SERVER
// Sits between the app and OpenAI/Serper/Tavily.
// API keys live here as environment variables — never in the APK.
//
// Endpoints:
//   POST /api/openai    → proxies to OpenAI chat completions
//   POST /api/serper    → proxies to Serper search
//   POST /api/tavily    → proxies to Tavily search
//   POST /api/tavily/extract → proxies to Tavily extract
//   GET  /health        → keep-alive ping
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Images can be large

// ── API KEYS (from Render environment variables) ─────────────────────────────
const OPENAI_KEY = process.env.OPENAI_KEY;
const SERPER_KEY = process.env.SERPER_KEY;
const TAVILY_KEY = process.env.TAVILY_KEY;

// ── HEALTH CHECK (also used for keep-alive ping) ─────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'veritas-api' });
});

// ── OPENAI PROXY ─────────────────────────────────────────────────────────────
app.post('/api/openai', async (req, res) => {
  try {
    if (!OPENAI_KEY) {
      return res.status(500).json({ error: 'OpenAI key not configured' });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('OpenAI proxy error:', err.message);
    res.status(502).json({ error: 'Failed to reach OpenAI' });
  }
});

// ── SERPER PROXY ─────────────────────────────────────────────────────────────
app.post('/api/serper', async (req, res) => {
  try {
    if (!SERPER_KEY) {
      return res.status(500).json({ error: 'Serper key not configured' });
    }

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': SERPER_KEY,
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Serper proxy error:', err.message);
    res.status(502).json({ error: 'Failed to reach Serper' });
  }
});

// ── TAVILY SEARCH PROXY ──────────────────────────────────────────────────────
app.post('/api/tavily', async (req, res) => {
  try {
    if (!TAVILY_KEY) {
      return res.status(500).json({ error: 'Tavily key not configured' });
    }

    // Inject API key into the body (Tavily expects it there)
    const body = { ...req.body, api_key: TAVILY_KEY };

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Tavily proxy error:', err.message);
    res.status(502).json({ error: 'Failed to reach Tavily' });
  }
});

// ── TAVILY EXTRACT PROXY ─────────────────────────────────────────────────────
app.post('/api/tavily/extract', async (req, res) => {
  try {
    if (!TAVILY_KEY) {
      return res.status(500).json({ error: 'Tavily key not configured' });
    }

    const body = { ...req.body, api_key: TAVILY_KEY };

    const response = await fetch('https://api.tavily.com/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Tavily extract proxy error:', err.message);
    res.status(502).json({ error: 'Failed to reach Tavily' });
  }
});

// ── START SERVER ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Veritas API proxy running on port ${PORT}`);
});
