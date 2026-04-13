// src/routes/news.js
const express = require('express');
const router = express.Router();

// Cache de noticias
let newsCache = {
  data: null,
  timestamp: null,
  TTL: 5 * 60 * 1000
};

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function fetchNewsFromAPI() {
  const NEWS_API_KEY = process.env.NEWS_API_KEY;
  
  if (!NEWS_API_KEY) {
    throw new Error('NEWS_API_KEY no configurada en .env');
  }

  const today = new Date();
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(today.getDate() - 14);

  const toDate = formatDate(today);
  const fromDate = formatDate(twoWeeksAgo);

  const queries = [
    'stock market OR S&P 500 OR Nasdaq OR Dow Jones',
    'Federal Reserve OR interest rates OR inflation OR monetary policy',
    'oil prices OR crude OR commodities OR gold OR copper',
    'Bitcoin OR cryptocurrency OR Ethereum OR crypto market',
    'NVIDIA OR Apple OR Microsoft OR tech stocks OR semiconductors',
    'geopolitical OR trade war OR sanctions OR conflict',
    'earnings OR revenue OR quarterly results OR IPO'
  ];

  const query = queries.join(' OR ');

  const params = new URLSearchParams({
    q: query,
    from: fromDate,
    to: toDate,
    language: 'en',
    sortBy: 'publishedAt',
    pageSize: 50,
    apiKey: NEWS_API_KEY
  });

  const url = `https://newsapi.org/v2/everything?${params.toString()}`;

  console.log(`[NewsAPI] Fetching from ${fromDate} to ${toDate}`);

  const response = await fetch(url);
  
  if (!response.ok) {
    const errorData = await response.json();
    console.error('[NewsAPI] Error:', errorData);
    throw new Error(`NewsAPI error: ${errorData.message || response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.articles || data.articles.length === 0) {
    console.warn('[NewsAPI] No articles returned');
    return [];
  }

  const validArticles = data.articles.filter(article => {
    if (!article.title || !article.publishedAt) return false;
    
    const publishedDate = new Date(article.publishedAt);
    const daysDiff = Math.floor((today - publishedDate) / (1000 * 60 * 60 * 24));
    
    return daysDiff <= 14;
  });

  console.log(`[NewsAPI] Retrieved ${validArticles.length} valid articles from last 14 days`);

  return validArticles;
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
      console.log('[News] Refreshing cache...');
      const articles = await fetchNewsFromAPI();
      
      newsCache = {
        data: articles,
        timestamp: now,
        TTL: 5 * 60 * 1000
      };
    } else {
      console.log('[News] Serving from cache');
    }

    res.json({
      articles: newsCache.data,
      cached: !needsRefresh,
      timestamp: new Date(newsCache.timestamp).toISOString()
    });

  } catch (error) {
    console.error('[News] Error:', error);
    res.status(500).json({
      error: 'Error al obtener noticias',
      message: error.message
    });
  }
});

module.exports = router;