// Archivo: public/i18n.js
const translations = {
  es: {
    // Header
    dashboard: 'Dashboard',
    projections: 'Proyecciones',
    scenarios: 'Escenarios',
    news: 'Noticias',
    logout: 'Salir',
    
    // Portfolio
    portfolio: 'Portafolio',
    assets: 'activos',
    allocation: 'Asignación',
    return: 'Retorno μ',
    risk: 'Riesgo σ',
    sharpe: 'Sharpe',
    
    // Phases
    phases: 'Fases de aportación',
    newPhase: 'Nueva fase',
    phase: 'Fase',
    monthStart: 'Mes inicio',
    monthEnd: 'Mes fin',
    perMonth: '$/mes',
    
    // Investment
    initialInvestment: 'Inversión inicial',
    initialCapital: 'Capital inicial (USD)',
    autoSaved: 'Guardado automáticamente',
    
    // Projection
    monteCarloProjection: 'Proyección Monte Carlo',
    simulations: 'simulaciones',
    horizon: 'Horizonte',
    years: 'años',
    medianFinal: 'Mediana final',
    scenarioP90: 'Escenario P90',
    gainP50: 'Ganancia P50',
    scenarioP10: 'Escenario P10',
    totalContributed: 'Total aportado',
    multiplier: 'Multiplicador',
    contributed: 'Aportado',
    median: 'Mediana',
    
    // AI
    aiAssistant: 'Asistente financiero',
    aiGreeting: 'Hola, soy Au·IA. Analizo tu portafolio en tiempo real. ¿En qué te ayudo hoy?',
    askAboutPortfolio: 'Pregunta sobre tu portafolio...',
    send: 'Enviar',
    consultations: 'consultas este mes',
    
    // News
    newsImpact: 'Noticias · Impacto',
    update: 'Actualizar',
    loadingNews: 'Cargando noticias...',
    economy: 'Economía',
    geopolitics: 'Geopolítica',
    technology: 'Tecnología',
    commodities: 'Commodities',
    crypto: 'Cripto',
    
    // News categories
    economyDesc: 'Política monetaria · Inflación · Tasas',
    geopoliticsDesc: 'Conflictos · Sanciones · Comercio',
    technologyDesc: 'IA · Semiconductores · Innovación',
    commoditiesDesc: 'Petróleo · Cobre · Oro · Materias primas',
    cryptoDesc: 'Bitcoin · Ethereum · Regulación',
    
    // Misc
    live: 'Live',
    markets: 'Mercados'
  },
  
  en: {
    // Header
    dashboard: 'Dashboard',
    projections: 'Projections',
    scenarios: 'Scenarios',
    news: 'News',
    logout: 'Logout',
    
    // Portfolio
    portfolio: 'Portfolio',
    assets: 'assets',
    allocation: 'Allocation',
    return: 'Return μ',
    risk: 'Risk σ',
    sharpe: 'Sharpe',
    
    // Phases
    phases: 'Contribution phases',
    newPhase: 'New phase',
    phase: 'Phase',
    monthStart: 'Start month',
    monthEnd: 'End month',
    perMonth: '$/month',
    
    // Investment
    initialInvestment: 'Initial investment',
    initialCapital: 'Initial capital (USD)',
    autoSaved: 'Automatically saved',
    
    // Projection
    monteCarloProjection: 'Monte Carlo Projection',
    simulations: 'simulations',
    horizon: 'Horizon',
    years: 'years',
    medianFinal: 'Final median',
    scenarioP90: 'P90 Scenario',
    gainP50: 'P50 Gain',
    scenarioP10: 'P10 Scenario',
    totalContributed: 'Total contributed',
    multiplier: 'Multiplier',
    contributed: 'Contributed',
    median: 'Median',
    
    // AI
    aiAssistant: 'Financial assistant',
    aiGreeting: 'Hi, I\'m Au·IA. I analyze your portfolio in real time. How can I help you today?',
    askAboutPortfolio: 'Ask about your portfolio...',
    send: 'Send',
    consultations: 'consultations this month',
    
    // News
    newsImpact: 'News · Impact',
    update: 'Update',
    loadingNews: 'Loading news...',
    economy: 'Economy',
    geopolitics: 'Geopolitics',
    technology: 'Technology',
    commodities: 'Commodities',
    crypto: 'Crypto',
    
    // News categories
    economyDesc: 'Monetary policy · Inflation · Rates',
    geopoliticsDesc: 'Conflicts · Sanctions · Trade',
    technologyDesc: 'AI · Semiconductors · Innovation',
    commoditiesDesc: 'Oil · Copper · Gold · Raw materials',
    cryptoDesc: 'Bitcoin · Ethereum · Regulation',
    
    // Misc
    live: 'Live',
    markets: 'Markets'
  }
};

// Estado global de idioma
let currentLang = localStorage.getItem('aureo_lang') || 'es';

// Función para traducir
function t(key) {
  return translations[currentLang][key] || key;
}

// Función para cambiar idioma
function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('aureo_lang', lang);
  updateUITexts();
}

// Función para actualizar todos los textos de la UI
function updateUITexts() {
  // Actualizar elementos con data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  
  // Actualizar placeholders con data-i18n-placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });
}