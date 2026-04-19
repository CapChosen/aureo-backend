// src/routes/news.js
// Uses Finnhub market news API (free plan, works from production servers)
// NewsAPI free plan blocks server-side production requests — Finnhub does not.
const express = require('express');
const router = express.Router();

let newsCache = {
  data: null,
  timestamp: null,
  TTL: 5 * 60 * 1000
};

async function fetchNewsFromFinnhub() {
  const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
  if (!FINNHUB_KEY) throw new Error('FINNHUB_API_KEY no configurada en .env');

  console.log(`[News] Finnhub key: ${FINNHUB_KEY.substring(0,4)}... (${FINNHUB_KEY.length} chars)`);

  const categories = ['general', 'crypto'];
  const twoWeeksAgoSec = Math.floor(Date.now() / 1000) - (14 * 24 * 60 * 60);
  const allArticles = [];
  const seen = new Set();

  for (const category of categories) {
    const url = `https://finnhub.io/api/v1/news?category=${category}&token=${FINNHUB_KEY}`;
    let response;
    try {
      response = await fetch(url);
    } catch (netErr) {
      console.error(`[News] Network error (${category}):`, netErr.message);
      continue;
    }

    const body = await response.json();

    if (!response.ok || !Array.isArray(body)) {
      console.error(`[News] Finnhub error (${category}) HTTP ${response.status}:`, JSON.stringify(body));
      continue;
    }

    console.log(`[News] Finnhub ${category}: ${body.length} articles`);

    for (const a of body) {
      if (!a.headline || seen.has(a.id)) continue;
      if (a.datetime && a.datetime < twoWeeksAgoSec) continue;
      seen.add(a.id);
      allArticles.push(a);
    }
  }

  // Sort by datetime descending (newest first)
  allArticles.sort((a, b) => (b.datetime || 0) - (a.datetime || 0));

  console.log(`[News] Total unique articles: ${allArticles.length}`);
  return allArticles;
}

router.get('/', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const now = Date.now();

    const needsRefresh = !newsCache.data ||
                        !newsCache.timestamp ||
                        (now - newsCache.timestamp) > newsCache.TTL ||
                        forceRefresh;

    if (needsRefresh) {
      console.log('[News] Refreshing cache from Finnhub...');
      const articles = await fetchNewsFromFinnhub();

      if (articles.length === 0 && newsCache.data && newsCache.data.length > 0) {
        console.warn('[News] Finnhub returned 0 articles — keeping previous cache');
      } else {
        newsCache = { data: articles, timestamp: now, TTL: 5 * 60 * 1000 };
      }
    } else {
      console.log('[News] Serving from cache');
    }

    // Map Finnhub format → frontend-compatible format
    // Frontend expects: { title, description, content, source:{name}, publishedAt, url }
    const mapped = (newsCache.data || []).map(a => ({
      title:       a.headline || 'Sin título',
      description: a.summary  || '',
      content:     a.summary  || '',
      source:      { name: a.source || 'Finnhub' },
      publishedAt: a.datetime ? new Date(a.datetime * 1000).toISOString() : new Date().toISOString(),
      url:         a.url      || '#',
      urlToImage:  a.image    || null,
    }));

    res.json({
      articles:  mapped,
      cached:    !needsRefresh,
      timestamp: new Date(newsCache.timestamp || now).toISOString(),
      count:     mapped.length,
    });

  } catch (error) {
    console.error('[News] Error:', error);
    res.status(500).json({
      error:   'Error al obtener noticias',
      message: error.message
    });
  }
});

module.exports = router;
