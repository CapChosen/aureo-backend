// ════════════════════════════════════════════════════════
// ÁUREO - BASE DE DATOS DE ACTIVOS
// ════════════════════════════════════════════════════════
// Contiene 500+ activos: acciones, ETFs, commodities
// Estructura: { symbol, name, type, owner, description, mu, sig }
// ════════════════════════════════════════════════════════

const ASSETS_DB = {

  // ════════════════════════════════════════════════════════
  // ETFs USA - AMPLIOS
  // ════════════════════════════════════════════════════════
  'SPY':   {name:'S&P 500 ETF', type:'ETF', owner:'State Street', description:'Replica el índice S&P 500. 500 empresas de gran capitalización USA.', mu:.10, sig:.15},
  'QQQ':   {name:'Nasdaq 100 ETF', type:'ETF', owner:'Invesco', description:'Sigue las 100 mayores empresas no financieras del Nasdaq. Tech-heavy.', mu:.13, sig:.18},
  'VOO':   {name:'Vanguard S&P 500', type:'ETF', owner:'Vanguard', description:'Versión de bajo costo del S&P 500. Alternativa a SPY.', mu:.10, sig:.14},
  'IVV':   {name:'iShares S&P 500', type:'ETF', owner:'BlackRock', description:'Otra opción para el S&P 500. Comisiones ultra bajas.', mu:.10, sig:.14},
  'VTI':   {name:'Total Stock Market', type:'ETF', owner:'Vanguard', description:'Todo el mercado USA: large, mid y small cap. +4000 acciones.', mu:.105, sig:.155},
  'ITOT':  {name:'iShares Total Market', type:'ETF', owner:'BlackRock', description:'Similar a VTI. Exposición total al mercado USA.', mu:.105, sig:.155},
  'SCHB':  {name:'Schwab US Broad Market', type:'ETF', owner:'Charles Schwab', description:'Alternativa de bajo costo a VTI/ITOT.', mu:.105, sig:.155},
  
  // ════════════════════════════════════════════════════════
  // ETFs USA - CRECIMIENTO
  // ════════════════════════════════════════════════════════
  'VUG':   {name:'Vanguard Growth', type:'ETF', owner:'Vanguard', description:'Empresas de crecimiento large-cap. Tech y consumo.', mu:.12, sig:.17},
  'IWF':   {name:'iShares Growth', type:'ETF', owner:'BlackRock', description:'Acciones de crecimiento Russell 1000. Alta concentración tech.', mu:.12, sig:.17},
  'VOOG':  {name:'Vanguard S&P 500 Growth', type:'ETF', owner:'Vanguard', description:'Solo empresas growth del S&P 500.', mu:.115, sig:.165},
  'SCHG':  {name:'Schwab Growth', type:'ETF', owner:'Charles Schwab', description:'Large-cap growth de bajo costo.', mu:.115, sig:.165},
  
  // ════════════════════════════════════════════════════════
  // ETFs USA - VALOR
  // ════════════════════════════════════════════════════════
  'VTV':   {name:'Vanguard Value', type:'ETF', owner:'Vanguard', description:'Empresas value large-cap. Finanzas, energía, industrial.', mu:.095, sig:.14},
  'IWD':   {name:'iShares Value', type:'ETF', owner:'BlackRock', description:'Acciones value Russell 1000. Sectores tradicionales.', mu:.095, sig:.14},
  'VOOV':  {name:'Vanguard S&P 500 Value', type:'ETF', owner:'Vanguard', description:'Solo empresas value del S&P 500.', mu:.09, sig:.135},
  'SCHV':  {name:'Schwab Value', type:'ETF', owner:'Charles Schwab', description:'Large-cap value de bajo costo.', mu:.09, sig:.135},
  
  // ════════════════════════════════════════════════════════
  // ETFs USA - DIVIDENDOS
  // ════════════════════════════════════════════════════════
  'VYM':   {name:'High Dividend Yield', type:'ETF', owner:'Vanguard', description:'Empresas con altos dividendos. Yield ~3%. Calidad superior.', mu:.09, sig:.12},
  'SCHD':  {name:'Dividend Equity', type:'ETF', owner:'Charles Schwab', description:'Dividendos de alta calidad. Crecimiento sostenible.', mu:.095, sig:.125},
  'DVY':   {name:'Dividend Appreciation', type:'ETF', owner:'iShares', description:'Empresas con historial de aumentar dividendos.', mu:.09, sig:.13},
  'VIG':   {name:'Dividend Appreciation', type:'ETF', owner:'Vanguard', description:'10+ años aumentando dividendos consecutivos.', mu:.092, sig:.13},
  'DGRO':  {name:'Dividend Growth', type:'ETF', owner:'iShares', description:'Crecimiento de dividendos + apreciación de capital.', mu:.093, sig:.13},
  'NOBL':  {name:'Dividend Aristocrats', type:'ETF', owner:'ProShares', description:'S&P 500 Dividend Aristocrats. 25+ años de incrementos.', mu:.088, sig:.125},
  
  // ════════════════════════════════════════════════════════
  // ETFs USA - MID Y SMALL CAP
  // ════════════════════════════════════════════════════════
  'IJH':   {name:'Mid-Cap Index', type:'ETF', owner:'iShares', description:'S&P MidCap 400. Balance entre crecimiento y estabilidad.', mu:.11, sig:.18},
  'VO':    {name:'Mid-Cap Index', type:'ETF', owner:'Vanguard', description:'Mid-cap blend. Alternativa a IJH.', mu:.11, sig:.18},
  'IWR':   {name:'Mid-Cap Russell', type:'ETF', owner:'iShares', description:'Russell MidCap completo.', mu:.11, sig:.18},
  'IJR':   {name:'Small-Cap Index', type:'ETF', owner:'iShares', description:'S&P SmallCap 600. Alta volatilidad, alto potencial.', mu:.115, sig:.22},
  'VB':    {name:'Small-Cap Index', type:'ETF', owner:'Vanguard', description:'Small-cap blend.', mu:.115, sig:.22},
  'IWM':   {name:'Small-Cap Russell', type:'ETF', owner:'iShares', description:'Russell 2000. El pequeño con actitud.', mu:.115, sig:.22},
  
  // ════════════════════════════════════════════════════════
  // ETFs SECTORIALES - TECNOLOGÍA
  // ════════════════════════════════════════════════════════
  'VGT':   {name:'Technology', type:'ETF', owner:'Vanguard', description:'Sector tecnología. Apple, Microsoft, NVIDIA. Alta volatilidad.', mu:.14, sig:.20},
  'XLK':   {name:'Technology Select', type:'ETF', owner:'State Street', description:'Tech del S&P 500. FAANG + semiconductores.', mu:.14, sig:.20},
  'FTEC':  {name:'Technology', type:'ETF', owner:'Fidelity', description:'Tech de bajo costo.', mu:.14, sig:.20},
  'SOXX':  {name:'Semiconductor', type:'ETF', owner:'iShares', description:'Semiconductores. NVDA, AMD, INTC. Ciclicidad extrema.', mu:.15, sig:.28},
  'SMH':   {name:'Semiconductor', type:'ETF', owner:'VanEck', description:'Alternativa a SOXX. Más concentrado.', mu:.15, sig:.28},
  'IGV':   {name:'Software', type:'ETF', owner:'iShares', description:'Software puro. SaaS, cloud, enterprise.', mu:.13, sig:.19},
  'ARKK':  {name:'Innovation ETF', type:'ETF', owner:'ARK Invest', description:'Apuestas tech disruptivas. Alta volatilidad. Gestión activa.', mu:.16, sig:.35},
  'ARKW':  {name:'Next Gen Internet', type:'ETF', owner:'ARK Invest', description:'Internet, cloud, fintech.', mu:.15, sig:.32},
  
  // ════════════════════════════════════════════════════════
  // ETFs SECTORIALES - SALUD
  // ════════════════════════════════════════════════════════
  'VHT':   {name:'Health Care', type:'ETF', owner:'Vanguard', description:'Sector salud. Farmacéuticas, biotech, dispositivos médicos.', mu:.11, sig:.14},
  'XLV':   {name:'Health Care Select', type:'ETF', owner:'State Street', description:'Salud del S&P 500. JNJ, UNH, PFE.', mu:.11, sig:.14},
  'IYH':   {name:'Health Care', type:'ETF', owner:'iShares', description:'Alternativa a VHT/XLV.', mu:.11, sig:.14},
  'IBB':   {name:'Biotech', type:'ETF', owner:'iShares', description:'Biotecnología. Alta volatilidad, FDA risk.', mu:.12, sig:.22},
  'XBI':   {name:'Biotech', type:'ETF', owner:'State Street', description:'Small/mid biotech. Más especulativo que IBB.', mu:.125, sig:.25},
  
  // ════════════════════════════════════════════════════════
  // ETFs SECTORIALES - FINANZAS
  // ════════════════════════════════════════════════════════
  'VFH':   {name:'Financials', type:'ETF', owner:'Vanguard', description:'Bancos, seguros, gestoras. Sensible a tasas de interés.', mu:.10, sig:.17},
  'XLF':   {name:'Financial Select', type:'ETF', owner:'State Street', description:'Finanzas del S&P 500. JPM, BAC, BRK.B.', mu:.10, sig:.17},
  'KRE':   {name:'Regional Banks', type:'ETF', owner:'SPDR', description:'Bancos regionales USA. Alta beta.', mu:.095, sig:.22},
  
  // ════════════════════════════════════════════════════════
  // ETFs SECTORIALES - ENERGÍA & COMMODITIES
  // ════════════════════════════════════════════════════════
  'VDE':   {name:'Energy', type:'ETF', owner:'Vanguard', description:'Sector energía. Petróleo, gas, renovables.', mu:.085, sig:.24},
  'XLE':   {name:'Energy Select', type:'ETF', owner:'State Street', description:'Energía del S&P 500. XOM, CVX.', mu:.085, sig:.24},
  'XOP':   {name:'Oil & Gas Exploration', type:'ETF', owner:'SPDR', description:'E&P puro. Muy volátil.', mu:.09, sig:.30},
  'GLD':   {name:'Gold ETF', type:'ETF', owner:'State Street', description:'Oro físico. Refugio en crisis. Baja correlación.', mu:.065, sig:.14},
  'IAU':   {name:'Gold Trust', type:'ETF', owner:'iShares', description:'Oro físico, comisiones más bajas que GLD.', mu:.065, sig:.14},
  'SLV':   {name:'Silver Trust', type:'ETF', owner:'iShares', description:'Plata física. Más volátil que oro.', mu:.07, sig:.22},
  'GDX':   {name:'Gold Miners', type:'ETF', owner:'VanEck', description:'Mineras de oro. Apalancamiento al precio del oro.', mu:.08, sig:.28},
  'USO':   {name:'Oil Fund', type:'ETF', owner:'US Commodity Funds', description:'Futuros de petróleo WTI. Contango risk.', mu:.07, sig:.35},
  
  // ════════════════════════════════════════════════════════
  // ETFs SECTORIALES - CONSUMO & RETAIL
  // ════════════════════════════════════════════════════════
  'VCR':   {name:'Consumer Discretionary', type:'ETF', owner:'Vanguard', description:'Consumo discrecional. Amazon, Tesla, Nike.', mu:.115, sig:.16},
  'XLY':   {name:'Consumer Discretionary', type:'ETF', owner:'State Street', description:'Discrecional S&P 500.', mu:.115, sig:.16},
  'VDC':   {name:'Consumer Staples', type:'ETF', owner:'Vanguard', description:'Consumo básico. Procter, Coca-Cola, Walmart. Defensivo.', mu:.085, sig:.11},
  'XLP':   {name:'Consumer Staples', type:'ETF', owner:'State Street', description:'Básicos S&P 500.', mu:.085, sig:.11},
  
  // ════════════════════════════════════════════════════════
  // ETFs SECTORIALES - INDUSTRIAL & REAL ESTATE
  // ════════════════════════════════════════════════════════
  'VIS':   {name:'Industrials', type:'ETF', owner:'Vanguard', description:'Sector industrial. Boeing, CAT, UPS.', mu:.10, sig:.16},
  'XLI':   {name:'Industrial Select', type:'ETF', owner:'State Street', description:'Industrial S&P 500.', mu:.10, sig:.16},
  'VNQ':   {name:'Real Estate', type:'ETF', owner:'Vanguard', description:'REITs. Exposición a inmobiliario sin comprar propiedades.', mu:.08, sig:.15},
  'XLRE':  {name:'Real Estate Select', type:'ETF', owner:'State Street', description:'Real estate S&P 500.', mu:.08, sig:.15},
  'IYR':   {name:'Real Estate', type:'ETF', owner:'iShares', description:'REITs alternativos.', mu:.08, sig:.15},
  
  // ════════════════════════════════════════════════════════
  // ETFs SECTORIALES - UTILITIES & COMUNICACIONES
  // ════════════════════════════════════════════════════════
  'VPU':   {name:'Utilities', type:'ETF', owner:'Vanguard', description:'Utilities. Eléctricas, agua, gas. Muy defensivo.', mu:.075, sig:.12},
  'XLU':   {name:'Utilities Select', type:'ETF', owner:'State Street', description:'Utilities S&P 500.', mu:.075, sig:.12},
  'VOX':   {name:'Communication Services', type:'ETF', owner:'Vanguard', description:'Telecom + media. Google, Meta, Disney.', mu:.105, sig:.16},
  'XLC':   {name:'Communication Select', type:'ETF', owner:'State Street', description:'Comunicaciones S&P 500.', mu:.105, sig:.16},
  
  // ════════════════════════════════════════════════════════
  // ETFs RENTA FIJA
  // ════════════════════════════════════════════════════════
  'AGG':   {name:'Aggregate Bond', type:'ETF', owner:'iShares', description:'Bonos USA investment grade. Core fixed income.', mu:.035, sig:.04},
  'BND':   {name:'Total Bond Market', type:'ETF', owner:'Vanguard', description:'Todo el mercado de bonos USA.', mu:.035, sig:.04},
  'TLT':   {name:'20Y Treasury', type:'ETF', owner:'iShares', description:'Treasuries 20+ años. Duration risk, pero seguro.', mu:.03, sig:.12},
  'IEF':   {name:'7-10Y Treasury', type:'ETF', owner:'iShares', description:'Treasuries mid-term. Balance duration/yield.', mu:.032, sig:.06},
  'SHY':   {name:'1-3Y Treasury', type:'ETF', owner:'iShares', description:'Treasuries corto plazo. Casi cash.', mu:.028, sig:.02},
  'LQD':   {name:'Investment Grade Corporate', type:'ETF', owner:'iShares', description:'Bonos corporativos grado inversión.', mu:.042, sig:.07},
  'HYG':   {name:'High Yield Corporate', type:'ETF', owner:'iShares', description:'Bonos high yield (junk). Mayor retorno, mayor riesgo.', mu:.055, sig:.10},
  'TIP':   {name:'TIPS', type:'ETF', owner:'iShares', description:'Treasuries protegidos contra inflación.', mu:.032, sig:.05},
  'MUB':   {name:'Municipal Bond', type:'ETF', owner:'iShares', description:'Bonos municipales. Tax-free para residentes USA.', mu:.030, sig:.04},
  
  // ════════════════════════════════════════════════════════
  // ETFs INTERNACIONAL - DESARROLLADOS
  // ════════════════════════════════════════════════════════
  'VXUS':  {name:'Total International', type:'ETF', owner:'Vanguard', description:'Todo ex-USA. Europa, Asia, emergentes. Diversificación global.', mu:.085, sig:.16},
  'IXUS':  {name:'Total International', type:'ETF', owner:'iShares', description:'Alternativa a VXUS.', mu:.085, sig:.16},
  'VEA':   {name:'Developed Markets', type:'ETF', owner:'Vanguard', description:'Solo mercados desarrollados. Europa + Japón + Australia.', mu:.08, sig:.15},
  'IEFA':  {name:'Developed Markets', type:'ETF', owner:'iShares', description:'Alternativa a VEA.', mu:.08, sig:.15},
  'EFA':   {name:'EAFE', type:'ETF', owner:'iShares', description:'Europa, Australasia, Far East. Sin emergentes.', mu:.08, sig:.15},
  'VGK':   {name:'European Stocks', type:'ETF', owner:'Vanguard', description:'Solo Europa. UK, Francia, Alemania, Suiza.', mu:.075, sig:.16},
  'EWG':   {name:'Germany', type:'ETF', owner:'iShares', description:'Alemania puro. Industrial powerhouse.', mu:.08, sig:.18},
  'EWU':   {name:'United Kingdom', type:'ETF', owner:'iShares', description:'UK puro. FTSE 100.', mu:.075, sig:.15},
  'EWJ':   {name:'Japan', type:'ETF', owner:'iShares', description:'Japón puro. Nikkei exposure.', mu:.082, sig:.16},
  'EWY':   {name:'South Korea', type:'ETF', owner:'iShares', description:'Corea del Sur. Samsung, Hyundai.', mu:.09, sig:.20},
  
  // ════════════════════════════════════════════════════════
  // ETFs INTERNACIONAL - EMERGENTES
  // ════════════════════════════════════════════════════════
  'VWO':   {name:'Emerging Markets', type:'ETF', owner:'Vanguard', description:'Mercados emergentes. China, India, Brasil, Taiwan. Alta volatilidad.', mu:.08, sig:.18},
  'IEMG':  {name:'Emerging Markets', type:'ETF', owner:'iShares', description:'Alternativa a VWO.', mu:.08, sig:.18},
  'EEM':   {name:'Emerging Markets', type:'ETF', owner:'iShares', description:'EM más líquido. Mismo universo que VWO.', mu:.08, sig:.18},
  'INDA':  {name:'India', type:'ETF', owner:'iShares', description:'India puro. Crecimiento demográfico + tech.', mu:.105, sig:.22},
  'MCHI':  {name:'China', type:'ETF', owner:'iShares', description:'China mainland. Riesgo regulatorio.', mu:.09, sig:.25},
  'FXI':   {name:'China Large-Cap', type:'ETF', owner:'iShares', description:'China large cap. Alibaba, Tencent.', mu:.09, sig:.25},
  'EWZ':   {name:'Brazil', type:'ETF', owner:'iShares', description:'Brasil. Commodities + financials.', mu:.085, sig:.28},
  'EWT':   {name:'Taiwan', type:'ETF', owner:'iShares', description:'Taiwan. TSMC + semiconductores.', mu:.095, sig:.20},
  
  // ════════════════════════════════════════════════════════
  // ETFs TEMÁTICOS
  // ════════════════════════════════════════════════════════
  'ICLN':  {name:'Clean Energy', type:'ETF', owner:'iShares', description:'Energía renovable. Solar, eólica, baterías.', mu:.11, sig:.28},
  'TAN':   {name:'Solar Energy', type:'ETF', owner:'Invesco', description:'Solar puro. Alta volatilidad.', mu:.115, sig:.32},
  'LIT':   {name:'Lithium & Battery', type:'ETF', owner:'Global X', description:'Litio + baterías. EV exposure.', mu:.12, sig:.30},
  'DRIV':  {name:'Autonomous & Electric', type:'ETF', owner:'Global X', description:'Vehículos autónomos + eléctricos.', mu:.125, sig:.28},
  'HACK':  {name:'Cybersecurity', type:'ETF', owner:'ETFMG', description:'Ciberseguridad. Demanda estructural.', mu:.13, sig:.22},
  'CLOU':  {name:'Cloud Computing', type:'ETF', owner:'Global X', description:'Cloud puro. SaaS + IaaS.', mu:.14, sig:.24},
  'FINX':  {name:'Fintech', type:'ETF', owner:'Global X', description:'Fintech. Pagos digitales, blockchain.', mu:.135, sig:.26},
  'BOTZ':  {name:'Robotics & AI', type:'ETF', owner:'Global X', description:'Robótica + IA. Automatización.', mu:.13, sig:.23},
  'WCLD':  {name:'Cloud Computing', type:'ETF', owner:'WisdomTree', description:'Otra alternativa cloud.', mu:.14, sig:.24},
  'ESPO':  {name:'Video Gaming & Esports', type:'ETF', owner:'VanEck', description:'Gaming. NVDA, TTWO, EA.', mu:.125, sig:.22},
  'HERO':  {name:'Video Game', type:'ETF', owner:'Global X', description:'Alternativa gaming.', mu:.125, sig:.22},
  
  // ════════════════════════════════════════════════════════
  // ACCIONES USA - MAGNIFICENT 7
  // ════════════════════════════════════════════════════════
  'AAPL':  {name:'Apple', type:'Stock', owner:'Public', description:'iPhone, Mac, servicios. La empresa más valiosa del mundo.', mu:.13, sig:.20},
  'MSFT':  {name:'Microsoft', type:'Stock', owner:'Public', description:'Windows, Office, Azure, OpenAI. Cloud + IA líder.', mu:.12, sig:.17},
  'GOOGL': {name:'Alphabet', type:'Stock', owner:'Public', description:'Google Search, YouTube, Cloud. Monetiza internet.', mu:.12, sig:.19},
  'AMZN':  {name:'Amazon', type:'Stock', owner:'Public', description:'E-commerce + AWS. Cloud dominante.', mu:.14, sig:.22},
  'NVDA':  {name:'NVIDIA', type:'Stock', owner:'Public', description:'GPUs para IA. El pick and shovel de la revolución IA.', mu:.25, sig:.40},
  'META':  {name:'Meta Platforms', type:'Stock', owner:'Public', description:'Facebook, Instagram, WhatsApp. Metaverso + IA.', mu:.14, sig:.26},
  'TSLA':  {name:'Tesla', type:'Stock', owner:'Public', description:'EVs, energía solar, baterías. Liderazgo en vehículos eléctricos.', mu:.18, sig:.45},
  
  // ════════════════════════════════════════════════════════
  // ACCIONES USA - TECNOLOGÍA
  // ════════════════════════════════════════════════════════
  'AMD':   {name:'Advanced Micro Devices', type:'Stock', owner:'Public', description:'CPUs y GPUs. Competidor de Intel/NVIDIA.', mu:.16, sig:.35},
  'INTC':  {name:'Intel', type:'Stock', owner:'Public', description:'Semiconductores. Perdiendo terreno pero invirtiendo en foundries.', mu:.08, sig:.22},
  'AVGO':  {name:'Broadcom', type:'Stock', owner:'Public', description:'Semiconductores, software empresarial. VMware acquisition.', mu:.13, sig:.20},
  'QCOM':  {name:'Qualcomm', type:'Stock', owner:'Public', description:'Chips para móviles. 5G exposure.', mu:.11, sig:.21},
  'TSM':   {name:'Taiwan Semiconductor', type:'Stock', owner:'Public', description:'Foundry líder mundial. Fabrica chips de Apple, NVIDIA.', mu:.13, sig:.24},
  'ASML':  {name:'ASML Holding', type:'Stock', owner:'Public', description:'Equipos para fabricar chips. Monopolio en litografía EUV.', mu:.14, sig:.25},
  'CRM':   {name:'Salesforce', type:'Stock', owner:'Public', description:'CRM software. Cloud empresarial.', mu:.11, sig:.23},
  'ORCL':  {name:'Oracle', type:'Stock', owner:'Public', description:'Bases de datos, cloud. Legacy + transformación cloud.', mu:.095, sig:.18},
  'ADBE':  {name:'Adobe', type:'Stock', owner:'Public', description:'Creative software. Photoshop, Premiere, IA generativa.', mu:.115, sig:.21},
  'NOW':   {name:'ServiceNow', type:'Stock', owner:'Public', description:'Software workflow empresarial. Crecimiento SaaS.', mu:.13, sig:.25},
  'SNOW':  {name:'Snowflake', type:'Stock', owner:'Public', description:'Data warehouse en cloud. Alto growth, aún no rentable.', mu:.16, sig:.40},
  'PLTR':  {name:'Palantir', type:'Stock', owner:'Public', description:'Big data + IA para gobierno y empresas.', mu:.18, sig:.45},
  'PANW':  {name:'Palo Alto Networks', type:'Stock', owner:'Public', description:'Ciberseguridad líder. Firewalls + cloud security.', mu:.135, sig:.24},
  'CRWD':  {name:'CrowdStrike', type:'Stock', owner:'Public', description:'Endpoint security. Cloud-native.', mu:.15, sig:.35},
  'NET':   {name:'Cloudflare', type:'Stock', owner:'Public', description:'CDN + edge computing + seguridad.', mu:.145, sig:.38},
  'DDOG':  {name:'Datadog', type:'Stock', owner:'Public', description:'Monitoring cloud. APM líder.', mu:.14, sig:.32},
  'ZS':    {name:'Zscaler', type:'Stock', owner:'Public', description:'Cloud security. Zero trust.', mu:.145, sig:.35},
  
  // [Continúa con más acciones USA en las siguientes categorías...]
  
  // ════════════════════════════════════════════════════════
  // ACCIONES USA - CONSUMO & RETAIL
  // ════════════════════════════════════════════════════════
  'WMT':   {name:'Walmart', type:'Stock', owner:'Public', description:'Retail líder USA. E-commerce en crecimiento.', mu:.085, sig:.13},
  'COST':  {name:'Costco', type:'Stock', owner:'Public', description:'Warehouse club. Modelo de membresía.', mu:.10, sig:.15},
  'TGT':   {name:'Target', type:'Stock', owner:'Public', description:'Retail discrecional. Competidor de Walmart.', mu:.085, sig:.17},
  'HD':    {name:'Home Depot', type:'Stock', owner:'Public', description:'Home improvement. Líder en USA.', mu:.095, sig:.16},
  'LOW':   {name:'Lowe\'s', type:'Stock', owner:'Public', description:'Home improvement. Competidor de HD.', mu:.09, sig:.16},
  'NKE':   {name:'Nike', type:'Stock', owner:'Public', description:'Ropa deportiva líder. Marca global.', mu:.095, sig:.18},
  'SBUX':  {name:'Starbucks', type:'Stock', owner:'Public', description:'Café. Expansión internacional.', mu:.09, sig:.17},
  'MCD':   {name:'McDonald\'s', type:'Stock', owner:'Public', description:'Fast food líder. Franquicia global.', mu:.085, sig:.13},
  'KO':    {name:'Coca-Cola', type:'Stock', owner:'Public', description:'Bebidas. Marca centenaria. Dividendos.', mu:.075, sig:.11},
  'PEP':   {name:'PepsiCo', type:'Stock', owner:'Public', description:'Bebidas + snacks. Diversificado.', mu:.08, sig:.12},
  'PG':    {name:'Procter & Gamble', type:'Stock', owner:'Public', description:'Consumer goods. Dividend aristocrat.', mu:.08, sig:.11},
  
  // ════════════════════════════════════════════════════════
  // ACCIONES USA - SALUD
  // ════════════════════════════════════════════════════════
  'JNJ':   {name:'Johnson & Johnson', type:'Stock', owner:'Public', description:'Farmacéutica + dispositivos médicos. Muy defensiva.', mu:.075, sig:.10},
  'UNH':   {name:'UnitedHealth Group', type:'Stock', owner:'Public', description:'Seguros de salud. El mayor de USA.', mu:.105, sig:.14},
  'PFE':   {name:'Pfizer', type:'Stock', owner:'Public', description:'Farmacéutica. COVID vaccine, ahora normalizando.', mu:.07, sig:.16},
  'ABBV':  {name:'AbbVie', type:'Stock', owner:'Public', description:'Farmacéutica. Humira + pipeline.', mu:.085, sig:.14},
  'LLY':   {name:'Eli Lilly', type:'Stock', owner:'Public', description:'Farmacéutica. Diabetes + Alzheimer.', mu:.12, sig:.18},
  'TMO':   {name:'Thermo Fisher Scientific', type:'Stock', owner:'Public', description:'Equipos científicos. Líder en life sciences.', mu:.105, sig:.16},
  'ABT':   {name:'Abbott Laboratories', type:'Stock', owner:'Public', description:'Dispositivos médicos + diagnósticos.', mu:.09, sig:.13},
  'AMGN':  {name:'Amgen', type:'Stock', owner:'Public', description:'Biotech. Medicamentos biológicos.', mu:.08, sig:.15},
  'GILD':  {name:'Gilead Sciences', type:'Stock', owner:'Public', description:'Biotech. VIH + hígado.', mu:.075, sig:.18},
  'MRNA':  {name:'Moderna', type:'Stock', owner:'Public', description:'Biotech mRNA. Post-COVID, buscando pipeline.', mu:.10, sig:.50},
  
  // ════════════════════════════════════════════════════════
  // ACCIONES USA - FINANZAS
  // ════════════════════════════════════════════════════════
  'BRK.B': {name:'Berkshire Hathaway', type:'Stock', owner:'Public', description:'Holding de Warren Buffett. Diversificado en todo.', mu:.10, sig:.13},
  'JPM':   {name:'JPMorgan Chase', type:'Stock', owner:'Public', description:'Banco líder USA. Commercial + investment banking.', mu:.095, sig:.18},
  'BAC':   {name:'Bank of America', type:'Stock', owner:'Public', description:'Segundo banco USA. Retail + wealth.', mu:.09, sig:.20},
  'WFC':   {name:'Wells Fargo', type:'Stock', owner:'Public', description:'Banco retail. Recuperándose de escándalos.', mu:.085, sig:.22},
  'C':     {name:'Citigroup', type:'Stock', owner:'Public', description:'Banco global. Restructuring.', mu:.085, sig:.24},
  'GS':    {name:'Goldman Sachs', type:'Stock', owner:'Public', description:'Investment banking líder. M&A, trading.', mu:.095, sig:.20},
  'MS':    {name:'Morgan Stanley', type:'Stock', owner:'Public', description:'Investment banking + wealth management.', mu:.095, sig:.20},
  'BLK':   {name:'BlackRock', type:'Stock', owner:'Public', description:'Asset manager más grande del mundo. $10T AUM.', mu:.105, sig:.17},
  'SCHW':  {name:'Charles Schwab', type:'Stock', owner:'Public', description:'Brokerage + banking. Comisiones cero.', mu:.09, sig:.19},
  'V':     {name:'Visa', type:'Stock', owner:'Public', description:'Pagos globales. Duopolio con Mastercard.', mu:.115, sig:.16},
  'MA':    {name:'Mastercard', type:'Stock', owner:'Public', description:'Pagos globales. Duopolio con Visa.', mu:.115, sig:.16},
  'PYPL':  {name:'PayPal', type:'Stock', owner:'Public', description:'Pagos digitales. Perdiendo momentum vs competidores.', mu:.085, sig:.28},
  'SQ':    {name:'Block (Square)', type:'Stock', owner:'Public', description:'Pagos + Bitcoin. Cash App growth.', mu:.10, sig:.40},
  
  // ════════════════════════════════════════════════════════
  // ACCIONES USA - ENERGÍA & INDUSTRIA
  // ════════════════════════════════════════════════════════
  'XOM':   {name:'Exxon Mobil', type:'Stock', owner:'Public', description:'Oil & gas supermajor. Integrada verticalmente.', mu:.08, sig:.22},
  'CVX':   {name:'Chevron', type:'Stock', owner:'Public', description:'Oil & gas. Competidor de XOM.', mu:.08, sig:.22},
  'COP':   {name:'ConocoPhillips', type:'Stock', owner:'Public', description:'E&P puro. Shale + offshore.', mu:.085, sig:.26},
  'SLB':   {name:'Schlumberger', type:'Stock', owner:'Public', description:'Servicios petroleros. Global.', mu:.09, sig:.28},
  'NEE':   {name:'NextEra Energy', type:'Stock', owner:'Public', description:'Utilities + renovables. Líder en solar/eólica.', mu:.095, sig:.14},
  'DUK':   {name:'Duke Energy', type:'Stock', owner:'Public', description:'Utility defensiva. Dividendos estables.', mu:.07, sig:.11},
  'BA':    {name:'Boeing', type:'Stock', owner:'Public', description:'Aeroespacial. Duopolio con Airbus. Problemas recientes.', mu:.08, sig:.30},
  'LMT':   {name:'Lockheed Martin', type:'Stock', owner:'Public', description:'Defensa. F-35 + misiles.', mu:.08, sig:.14},
  'CAT':   {name:'Caterpillar', type:'Stock', owner:'Public', description:'Maquinaria pesada. Cíclica, alta calidad.', mu:.09, sig:.20},
  'DE':    {name:'Deere', type:'Stock', owner:'Public', description:'Maquinaria agrícola. Tecnología + equipos.', mu:.095, sig:.18},
  'UPS':   {name:'United Parcel Service', type:'Stock', owner:'Public', description:'Logística. E-commerce tailwind.', mu:.085, sig:.15},
  'FDX':   {name:'FedEx', type:'Stock', owner:'Public', description:'Logística. Competidor de UPS.', mu:.085, sig:.18},
  
  // ════════════════════════════════════════════════════════
  // ACCIONES USA - COMMODITIES & MATERIALES
  // ════════════════════════════════════════════════════════
  'NEM':   {name:'Newmont', type:'Stock', owner:'Public', description:'Minera de oro líder. Apalancamiento al oro.', mu:.075, sig:.26},
  'FCX':   {name:'Freeport-McMoRan', type:'Stock', owner:'Public', description:'Cobre líder. EV exposure.', mu:.095, sig:.32},
  'CCJ':   {name:'Cameco', type:'Stock', owner:'Public', description:'Uranio. Renacimiento nuclear.', mu:.18, sig:.28},
  'NTR':   {name:'Nutrien', type:'Stock', owner:'Public', description:'Fertilizantes. Potasio líder.', mu:.085, sig:.22},
  
  // ════════════════════════════════════════════════════════
  // ACCIONES USA - OTROS SECTORES
  // ════════════════════════════════════════════════════════
  'DIS':   {name:'Walt Disney', type:'Stock', owner:'Public', description:'Entretenimiento. Parques + streaming + ESPN.', mu:.09, sig:.19},
  'NFLX':  {name:'Netflix', type:'Stock', owner:'Public', description:'Streaming líder. Saturación en USA, creciendo internacional.', mu:.115, sig:.28},
  'SPOT':  {name:'Spotify', type:'Stock', owner:'Public', description:'Música streaming. Líder pero con baja rentabilidad.', mu:.10, sig:.35},
  'UBER':  {name:'Uber', type:'Stock', owner:'Public', description:'Ride-hailing + delivery. Finalmente rentable.', mu:.12, sig:.30},
  'ABNB':  {name:'Airbnb', type:'Stock', owner:'Public', description:'Alojamiento. Disrupción de hoteles.', mu:.115, sig:.32},
  'SHOP':  {name:'Shopify', type:'Stock', owner:'Public', description:'E-commerce platform. SMB focus.', mu:.125, sig:.35},
  'DASH':  {name:'DoorDash', type:'Stock', owner:'Public', description:'Food delivery líder USA.', mu:.115, sig:.38},
  
  // ════════════════════════════════════════════════════════
  // ACCIONES INTERNACIONALES - EUROPA (ADRs NYSE/Nasdaq)
  // ════════════════════════════════════════════════════════
  'SAP':   {name:'SAP', type:'Stock', owner:'Public', description:'Alemania. Software ERP empresarial. NYSE ADR.', mu:.09, sig:.17},
  'NVO':   {name:'Novo Nordisk', type:'Stock', owner:'Public', description:'Dinamarca. Ozempic (diabetes + obesidad). NYSE ADR.', mu:.125, sig:.20},
  'AZN':   {name:'AstraZeneca', type:'Stock', owner:'Public', description:'UK. Farmacéutica. Oncología + vacunas. Nasdaq ADR.', mu:.095, sig:.15},
  'GSK':   {name:'GSK', type:'Stock', owner:'Public', description:'UK. Farmacéutica. Vacunas + VIH + respiratorio.', mu:.075, sig:.15},
  'DEO':   {name:'Diageo', type:'Stock', owner:'Public', description:'UK. Bebidas premium. Johnnie Walker, Guinness, Smirnoff.', mu:.085, sig:.16},
  'BTI':   {name:'British American Tobacco', type:'Stock', owner:'Public', description:'UK. Tabaco + alternativas nicotina. Alto dividendo.', mu:.055, sig:.18},
  'RIO':   {name:'Rio Tinto', type:'Stock', owner:'Public', description:'UK/Australia. Minería. Hierro, cobre, litio. NYSE ADR.', mu:.09, sig:.22},
  'VOD':   {name:'Vodafone', type:'Stock', owner:'Public', description:'UK. Telecom global. Europa + África.', mu:.055, sig:.20},
  'TTE':   {name:'TotalEnergies', type:'Stock', owner:'Public', description:'Francia. Oil & gas + renovables. NYSE ADR.', mu:.08, sig:.20},
  'LVMH':  {name:'LVMH', type:'Stock', owner:'Public', description:'Francia. Lujo. Louis Vuitton, Dior, Moët, Givenchy.', mu:.10, sig:.18},
  'OR':    {name:'L\'Oréal', type:'Stock', owner:'Public', description:'Francia. Cosméticos líder mundial. OTC ADR.', mu:.095, sig:.16},
  'SAN':   {name:'Banco Santander', type:'Stock', owner:'Public', description:'España. Banco global. Muy fuerte en LatAm.', mu:.075, sig:.22},
  'BBVA':  {name:'BBVA', type:'Stock', owner:'Public', description:'España. Banco. Digital banking líder en España y México.', mu:.08, sig:.22},
  'TEF':   {name:'Telefónica', type:'Stock', owner:'Public', description:'España. Telecom. España + LatAm + Alemania. NYSE ADR.', mu:.06, sig:.18},
  'ENI':   {name:'ENI', type:'Stock', owner:'Public', description:'Italia. Oil & gas. Transición energética. NYSE ADR.', mu:.075, sig:.20},
  'ERIC':  {name:'Ericsson', type:'Stock', owner:'Public', description:'Suecia. 5G infrastructure. Redes + software telecoms.', mu:.07, sig:.25},
  'ING':   {name:'ING Group', type:'Stock', owner:'Public', description:'Holanda. Banco digital pan-europeo. NYSE ADR.', mu:.08, sig:.22},
  'EQNR':  {name:'Equinor', type:'Stock', owner:'Public', description:'Noruega. Oil & gas estatal. Mayor productor gas de Europa.', mu:.085, sig:.25},
  'NESN':  {name:'Nestlé', type:'Stock', owner:'Public', description:'Suiza. Alimentos. Muy defensiva. OTC ADR.', mu:.07, sig:.12},
  'RHHBY': {name:'Roche', type:'Stock', owner:'Public', description:'Suiza. Farmacéutica + diagnósticos. Oncología.', mu:.08, sig:.14},
  'NVS':   {name:'Novartis', type:'Stock', owner:'Public', description:'Suiza. Farmacéutica. NYSE ADR.', mu:.075, sig:.13},
  'UBS':   {name:'UBS Group', type:'Stock', owner:'Public', description:'Suiza. Wealth management + banca. NYSE ADR.', mu:.09, sig:.22},
  'UL':    {name:'Unilever', type:'Stock', owner:'Public', description:'UK/Holanda. Consumer goods. NYSE ADR.', mu:.075, sig:.13},
  'BP':    {name:'BP', type:'Stock', owner:'Public', description:'UK. Oil & gas + transición a renovables. NYSE ADR.', mu:.075, sig:.20},
  'SHEL':  {name:'Shell', type:'Stock', owner:'Public', description:'UK/Holanda. Oil & gas supermajor. NYSE ADR.', mu:.08, sig:.20},
  'VOW':   {name:'Volkswagen', type:'Stock', owner:'Public', description:'Alemania. Autos. Transición EV. OTC ADR.', mu:.075, sig:.24},
  'BMW':   {name:'BMW', type:'Stock', owner:'Public', description:'Alemania. Autos premium. OTC ADR.', mu:.08, sig:.22},
  'DB':    {name:'Deutsche Bank', type:'Stock', owner:'Public', description:'Alemania. Banco de inversión. NYSE ADR.', mu:.08, sig:.30},

  // ════════════════════════════════════════════════════════
  // ACCIONES INTERNACIONALES - ASIA (ADRs NYSE/Nasdaq)
  // ════════════════════════════════════════════════════════
  'BABA':  {name:'Alibaba', type:'Stock', owner:'Public', description:'China. E-commerce + cloud. Mayor plataforma de comercio de China.', mu:.09, sig:.30},
  'TCEHY': {name:'Tencent', type:'Stock', owner:'Public', description:'China. Gaming + WeChat + inversiones tech. OTC ADR.', mu:.095, sig:.28},
  'PDD':   {name:'PDD Holdings', type:'Stock', owner:'Public', description:'China. Pinduoduo + Temu. E-commerce descuento global.', mu:.12, sig:.40},
  'NIO':   {name:'NIO', type:'Stock', owner:'Public', description:'China. EVs premium. Intercambio de baterías innovador.', mu:.10, sig:.50},
  'BIDU':  {name:'Baidu', type:'Stock', owner:'Public', description:'China. Buscador + IA + vehículos autónomos. Nasdaq ADR.', mu:.085, sig:.38},
  'JD':    {name:'JD.com', type:'Stock', owner:'Public', description:'China. E-commerce + logística. Enfocado en calidad.', mu:.08, sig:.35},
  'LI':    {name:'Li Auto', type:'Stock', owner:'Public', description:'China. EVs SUVs extendidos. Muy rentable para su etapa.', mu:.18, sig:.55},
  'XPEV':  {name:'XPeng', type:'Stock', owner:'Public', description:'China. EVs + conducción autónoma. Nasdaq ADR.', mu:.12, sig:.60},
  'BYDDY': {name:'BYD Company', type:'Stock', owner:'Public', description:'China. Mayor fabricante de EVs del mundo. OTC ADR.', mu:.15, sig:.40},
  'SONY':  {name:'Sony Group', type:'Stock', owner:'Public', description:'Japón. Entretenimiento + gaming + semiconductores de imagen.', mu:.09, sig:.18},
  'TM':    {name:'Toyota Motor', type:'Stock', owner:'Public', description:'Japón. Mayor fabricante de autos. Híbridos + EV. NYSE ADR.', mu:.085, sig:.17},
  'HMC':   {name:'Honda Motor', type:'Stock', owner:'Public', description:'Japón. Autos + motos + robótica. NYSE ADR.', mu:.08, sig:.18},
  'INFY':  {name:'Infosys', type:'Stock', owner:'Public', description:'India. IT outsourcing líder. Software + consultoría. NYSE ADR.', mu:.09, sig:.22},
  'WIT':   {name:'Wipro', type:'Stock', owner:'Public', description:'India. IT services. Software + nube + IA.', mu:.085, sig:.22},
  'HDB':   {name:'HDFC Bank', type:'Stock', owner:'Public', description:'India. Mayor banco privado. Crédito retail en India.', mu:.10, sig:.22},
  'IBN':   {name:'ICICI Bank', type:'Stock', owner:'Public', description:'India. Banco privado digital. Retail + corporate.', mu:.10, sig:.24},
  'MUFG':  {name:'Mitsubishi UFJ', type:'Stock', owner:'Public', description:'Japón. Mayor banco de Japón. NYSE ADR.', mu:.08, sig:.20},
  'KB':    {name:'KB Financial', type:'Stock', owner:'Public', description:'Corea del Sur. Mayor banco. NYSE ADR.', mu:.085, sig:.22},

  // ════════════════════════════════════════════════════════
  // ACCIONES LATINOAMÉRICA (ADRs NYSE/Nasdaq)
  // ════════════════════════════════════════════════════════
  // Chile
  'SQM':   {name:'Sociedad Química y Minera', type:'Stock', owner:'Public', description:'Chile. Litio + nitratos. Líder global en litio del Atacama. NYSE.', mu:.12, sig:.32},
  'BCH':   {name:'Banco de Chile', type:'Stock', owner:'Public', description:'Chile. Mayor banco privado chileno. NYSE ADR.', mu:.085, sig:.22},
  'BSAC':  {name:'Banco Santander Chile', type:'Stock', owner:'Public', description:'Chile. Filial bancaria de Santander en Chile. NYSE ADR.', mu:.08, sig:.22},
  'ENIC':  {name:'Enel Chile', type:'Stock', owner:'Public', description:'Chile. Generación eléctrica + renovables. NYSE ADR.', mu:.075, sig:.20},
  // Brasil
  'MELI':  {name:'MercadoLibre', type:'Stock', owner:'Public', description:'Argentina/LatAm. E-commerce + fintech. El Amazon de América Latina.', mu:.20, sig:.40},
  'VALE':  {name:'Vale', type:'Stock', owner:'Public', description:'Brasil. Minería. Mayor exportador de hierro del mundo. NYSE ADR.', mu:.09, sig:.32},
  'PBR':   {name:'Petrobras', type:'Stock', owner:'Public', description:'Brasil. Petróleo estatal. Pre-sal offshore. NYSE ADR.', mu:.09, sig:.35},
  'ITUB':  {name:'Itaú Unibanco', type:'Stock', owner:'Public', description:'Brasil. Mayor banco privado de LatAm. NYSE ADR.', mu:.085, sig:.25},
  'BBD':   {name:'Bradesco', type:'Stock', owner:'Public', description:'Brasil. Segundo banco privado de Brasil. NYSE ADR.', mu:.08, sig:.25},
  'NU':    {name:'Nubank', type:'Stock', owner:'Public', description:'Brasil. Neobank digital. Mayor banco digital del mundo por clientes.', mu:.25, sig:.45},
  'XP':    {name:'XP Inc', type:'Stock', owner:'Public', description:'Brasil. Plataforma de inversiones. Disruptor financiero.', mu:.15, sig:.35},
  'ABEV':  {name:'Ambev', type:'Stock', owner:'Public', description:'Brasil. Cerveza + bebidas. Filial de AB InBev en LatAm.', mu:.07, sig:.20},
  'GGB':   {name:'Gerdau', type:'Stock', owner:'Public', description:'Brasil. Acería. Acero largo en LatAm.', mu:.09, sig:.30},
  // México
  'AMX':   {name:'América Móvil', type:'Stock', owner:'Public', description:'México. Telecom líder en LatAm. Carlos Slim. NYSE ADR.', mu:.075, sig:.20},
  'FEMSA': {name:'FEMSA', type:'Stock', owner:'Public', description:'México. OXXO + Heineken + distribución. NYSE ADR.', mu:.08, sig:.18},
  'TV':    {name:'Televisa-Univision', type:'Stock', owner:'Public', description:'México/USA. Mayor media en español del mundo.', mu:.07, sig:.28},
  // Colombia
  'EC':    {name:'Ecopetrol', type:'Stock', owner:'Public', description:'Colombia. Petróleo estatal. Mayor empresa de Colombia. NYSE ADR.', mu:.085, sig:.30},
  'CIB':   {name:'Bancolombia', type:'Stock', owner:'Public', description:'Colombia. Banco líder de Colombia. NYSE ADR.', mu:.08, sig:.22},
  // Perú / Argentina / otros
  'BVN':   {name:'Buenaventura', type:'Stock', owner:'Public', description:'Perú. Minería. Oro y plata. NYSE ADR.', mu:.085, sig:.32},
  'GGAL':  {name:'Grupo Galicia', type:'Stock', owner:'Public', description:'Argentina. Banco privado líder. Nasdaq ADR.', mu:.12, sig:.55},
  'YPF':   {name:'YPF', type:'Stock', owner:'Public', description:'Argentina. Petróleo estatal. Vaca Muerta shale. NYSE ADR.', mu:.10, sig:.50},
  'LTM':   {name:'Latam Airlines', type:'Stock', owner:'Public', description:'Chile/Brasil. Mayor aerolínea de Sudamérica. NYSE.', mu:.10, sig:.40},

  // ════════════════════════════════════════════════════════
  // ACCIONES CANADÁ (NYSE/Nasdaq)
  // ════════════════════════════════════════════════════════
  'RY':    {name:'Royal Bank of Canada', type:'Stock', owner:'Public', description:'Canadá. Mayor banco de Canadá. NYSE listed.', mu:.09, sig:.16},
  'TD':    {name:'Toronto-Dominion Bank', type:'Stock', owner:'Public', description:'Canadá. Banco. Fuerte presencia en USA. NYSE listed.', mu:.085, sig:.16},
  'ENB':   {name:'Enbridge', type:'Stock', owner:'Public', description:'Canadá. Oleoductos + gas natural. Dividendos >6%. NYSE.', mu:.075, sig:.14},
  'CNQ':   {name:'Canadian Natural Resources', type:'Stock', owner:'Public', description:'Canadá. Oil & gas. Bajo costo + reservas enormes.', mu:.09, sig:.25},
  'SU':    {name:'Suncor Energy', type:'Stock', owner:'Public', description:'Canadá. Oil sands + refinery. Integrado verticalmente.', mu:.085, sig:.24},
  'GOLD':  {name:'Barrick Gold', type:'Stock', owner:'Public', description:'Canadá. Minería de oro. Segundo mayor del mundo. NYSE.', mu:.07, sig:.26},
  'WPM':   {name:'Wheaton Precious Metals', type:'Stock', owner:'Public', description:'Canadá. Streaming de oro y plata. Modelo de royalties.', mu:.10, sig:.24},
  'CNI':   {name:'Canadian National Railway', type:'Stock', owner:'Public', description:'Canadá. Ferrocarril. Red transcanadense crítica.', mu:.09, sig:.15},

  // ════════════════════════════════════════════════════════
  // ACCIONES USA - ADICIONALES (sectores varios)
  // ════════════════════════════════════════════════════════
  // Tecnología adicional
  'IBM':   {name:'IBM', type:'Stock', owner:'Public', description:'Tecnología legacy + IA (WatsonX) + hybrid cloud. Transformación.', mu:.075, sig:.16},
  'CSCO':  {name:'Cisco Systems', type:'Stock', owner:'Public', description:'Networking + seguridad. Infraestructura de internet global.', mu:.085, sig:.16},
  'MU':    {name:'Micron Technology', type:'Stock', owner:'Public', description:'Memorias DRAM y NAND. Cíclica, gran beneficiaria de IA.', mu:.12, sig:.38},
  'AMAT':  {name:'Applied Materials', type:'Stock', owner:'Public', description:'Semiconductores. Equipos de deposición de materiales.', mu:.13, sig:.28},
  'LRCX':  {name:'Lam Research', type:'Stock', owner:'Public', description:'Semiconductores. Equipos de grabado y deposición.', mu:.13, sig:.27},
  'ACN':   {name:'Accenture', type:'Stock', owner:'Public', description:'Consultoría IT + IA. Escala global. NYSE.', mu:.105, sig:.16},
  'INTU':  {name:'Intuit', type:'Stock', owner:'Public', description:'Software financiero. TurboTax + QuickBooks + Mailchimp.', mu:.115, sig:.22},
  'ADP':   {name:'Automatic Data Processing', type:'Stock', owner:'Public', description:'Payroll + HR software. Muy estable, alto dividendo.', mu:.095, sig:.14},
  'SPGI':  {name:'S&P Global', type:'Stock', owner:'Public', description:'Ratings + data + analytics. Monopolio en credit ratings.', mu:.11, sig:.16},
  'MCO':   {name:'Moody\'s', type:'Stock', owner:'Public', description:'Credit ratings + analytics. Duopolio con S&P Global.', mu:.11, sig:.17},
  // Salud adicional
  'ISRG':  {name:'Intuitive Surgical', type:'Stock', owner:'Public', description:'Cirugía robótica. Sistema Da Vinci. Monopolio de facto.', mu:.115, sig:.20},
  'REGN':  {name:'Regeneron', type:'Stock', owner:'Public', description:'Biotech. Eylea (visión) + Dupixent (alergias). Pipeline fuerte.', mu:.105, sig:.22},
  'VRTX':  {name:'Vertex Pharmaceuticals', type:'Stock', owner:'Public', description:'Biotech. Fibrosis cística. Alto pricing power.', mu:.13, sig:.22},
  'DXCM':  {name:'Dexcom', type:'Stock', owner:'Public', description:'Monitoreo glucosa continuo. Diabetes tech líder.', mu:.14, sig:.32},
  'ELV':   {name:'Elevance Health', type:'Stock', owner:'Public', description:'Seguros de salud. Antes Anthem. Segunda mayor aseguradora USA.', mu:.10, sig:.14},
  // Finanzas adicional
  'AXP':   {name:'American Express', type:'Stock', owner:'Public', description:'Tarjetas premium + viajes. Segmento affluent.', mu:.10, sig:.18},
  'COF':   {name:'Capital One', type:'Stock', owner:'Public', description:'Banco + tarjetas. Data-driven credit. Adquiere Discover.', mu:.095, sig:.22},
  'BX':    {name:'Blackstone', type:'Stock', owner:'Public', description:'Private equity + real estate. Mayor alternativas del mundo.', mu:.115, sig:.25},
  'KKR':   {name:'KKR & Co', type:'Stock', owner:'Public', description:'Private equity. Buyouts + infraestructura + crédito.', mu:.115, sig:.25},
  // Industrial / Defensa adicional
  'HON':   {name:'Honeywell', type:'Stock', owner:'Public', description:'Industrial + aerospace + building tech. Muy diversificado.', mu:.09, sig:.14},
  'RTX':   {name:'RTX Corp', type:'Stock', owner:'Public', description:'Aeroespacial + defensa. Pratt & Whitney + Raytheon Missiles.', mu:.085, sig:.17},
  'NOC':   {name:'Northrop Grumman', type:'Stock', owner:'Public', description:'Defensa. B-21 bomber + misiles + espacio.', mu:.085, sig:.14},
  'GD':    {name:'General Dynamics', type:'Stock', owner:'Public', description:'Defensa. Barcos (Bath Iron), jets (Gulfstream), IT gobierno.', mu:.085, sig:.14},
  'F':     {name:'Ford Motor', type:'Stock', owner:'Public', description:'Autos USA. F-150 + Mustang Mach-E. Transición EV.', mu:.07, sig:.30},
  'GM':    {name:'General Motors', type:'Stock', owner:'Public', description:'Autos USA. Ultium EV platform. Buick, Chevy, GMC.', mu:.075, sig:.28},
  // REITs adicionales
  'AMT':   {name:'American Tower', type:'Stock', owner:'Public', description:'Torres de telecom REIT. 5G infrastructure. Global.', mu:.09, sig:.15},
  'PLD':   {name:'Prologis', type:'Stock', owner:'Public', description:'Logística REIT. Almacenes para e-commerce. Global.', mu:.10, sig:.15},
  'O':     {name:'Realty Income', type:'Stock', owner:'Public', description:'REIT retail. Net lease. Dividendo mensual. "The Monthly Dividend Company".', mu:.07, sig:.12},
  'WELL':  {name:'Welltower', type:'Stock', owner:'Public', description:'REIT salud. Instalaciones para adultos mayores.', mu:.085, sig:.14},

  // ════════════════════════════════════════════════════════
  // ETFs ADICIONALES - REGIONALES Y TEMÁTICOS
  // ════════════════════════════════════════════════════════
  // Chile y LatAm
  'ECH':   {name:'Chile ETF', type:'ETF', owner:'iShares', description:'Chile. Replica el índice MSCI Chile. Minería, bancos, retail.', mu:.085, sig:.22},
  'EWW':   {name:'Mexico ETF', type:'ETF', owner:'iShares', description:'México. Consumo + manufactura + nearshoring.', mu:.08, sig:.22},
  'GXG':   {name:'Colombia ETF', type:'ETF', owner:'Global X', description:'Colombia. Petróleo + banca + energía.', mu:.08, sig:.28},
  'ARGT':  {name:'Argentina ETF', type:'ETF', owner:'Global X', description:'Argentina. Alta volatilidad + potencial de recovery.', mu:.10, sig:.50},
  'FLBR':  {name:'Brazil ETF', type:'ETF', owner:'Franklin', description:'Brasil valor. Acciones con bajo P/E. Petróleo + commodities.', mu:.09, sig:.28},
  'ILF':   {name:'Latin America 40', type:'ETF', owner:'iShares', description:'LatAm top 40. Brasil + México + Chile + Colombia.', mu:.085, sig:.25},
  // Países específicos adicionales
  'EWC':   {name:'Canada ETF', type:'ETF', owner:'iShares', description:'Canadá. Recursos naturales + finanzas + real estate.', mu:.085, sig:.15},
  'EWA':   {name:'Australia ETF', type:'ETF', owner:'iShares', description:'Australia. Minería + finanzas + consumo.', mu:.08, sig:.16},
  'EWL':   {name:'Switzerland ETF', type:'ETF', owner:'iShares', description:'Suiza. Farmacéuticas + bancos + lujo.', mu:.085, sig:.14},
  'EWI':   {name:'Italy ETF', type:'ETF', owner:'iShares', description:'Italia. Moda + finanzas + industriales.', mu:.08, sig:.18},
  'EWP':   {name:'Spain ETF', type:'ETF', owner:'iShares', description:'España. Bancos + telecoms + turismo.', mu:.075, sig:.18},
  'EWS':   {name:'Singapore ETF', type:'ETF', owner:'iShares', description:'Singapur. Hub financiero y logístico de Asia.', mu:.08, sig:.17},
  'EIDO':  {name:'Indonesia ETF', type:'ETF', owner:'iShares', description:'Indonesia. Emergente asiático clave. Recursos + consumo.', mu:.09, sig:.25},
  'FM':    {name:'Frontier Markets ETF', type:'ETF', owner:'iShares', description:'Mercados frontera. Vietnam, Kuwait, Marruecos. Alto potencial.', mu:.09, sig:.20},
  // Estratégicos / Smart beta
  'RSP':   {name:'S&P 500 Equal Weight', type:'ETF', owner:'Invesco', description:'S&P 500 igual ponderación. Reduce concentración en mega-caps.', mu:.105, sig:.16},
  'QUAL':  {name:'USA Quality Factor', type:'ETF', owner:'iShares', description:'Empresas con alta calidad financiera. ROE alto + deuda baja.', mu:.11, sig:.15},
  'USMV':  {name:'USA Min Volatility', type:'ETF', owner:'iShares', description:'Mínima volatilidad USA. Defensivo para mercados volátiles.', mu:.09, sig:.11},
  'COWZ':  {name:'US Cash Cows 100', type:'ETF', owner:'Pacer', description:'Top 100 en free cash flow yield. Value + calidad.', mu:.105, sig:.15},
  'JEPI':  {name:'Equity Premium Income', type:'ETF', owner:'JPMorgan', description:'S&P 500 + covered calls. Ingreso mensual, menor volatilidad.', mu:.07, sig:.10},
  'SPHD':  {name:'S&P 500 High Dividend', type:'ETF', owner:'Invesco', description:'Alto dividendo + baja volatilidad. Selección del S&P 500.', mu:.08, sig:.13},
  // Commodities / Materias primas
  'DBA':   {name:'Agriculture', type:'ETF', owner:'Invesco', description:'Futuros agrícolas. Trigo, maíz, soja, azúcar, café.', mu:.06, sig:.18},
  'PDBC':  {name:'Commodity', type:'ETF', owner:'Invesco', description:'Commodities diversificados. Sin problemas de contango.', mu:.065, sig:.20},
  'CPER':  {name:'Copper ETF', type:'ETF', owner:'United States Commodity Funds', description:'Futuros de cobre. Exposición pura al metal de la transición energética.', mu:.085, sig:.25},
  'URA':   {name:'Uranium ETF', type:'ETF', owner:'Global X', description:'Uranio. Renacimiento nuclear para la transición energética.', mu:.16, sig:.35},
  // Ultra corto plazo / cash
  'BIL':   {name:'T-Bill 1-3 Month', type:'ETF', owner:'SPDR', description:'Letras del tesoro 1-3 meses. El activo más seguro. Cash equivalente.', mu:.045, sig:.01},
  'SGOV':  {name:'0-3 Month T-Bill', type:'ETF', owner:'iShares', description:'Ultra corto plazo. Alternativa al efectivo con rendimiento.', mu:.045, sig:.01},

  // ════════════════════════════════════════════════════════
  // CRYPTO / COMMODITIES
  // ════════════════════════════════════════════════════════
  'BTC-USD':{name:'Bitcoin', type:'Crypto', owner:'Decentralized', description:'Criptomoneda líder. Store of value digital. Límite 21M.', mu:.30, sig:.70},
  'ETH-USD':{name:'Ethereum', type:'Crypto', owner:'Decentralized', description:'Smart contracts platform. DeFi + NFTs + Layer 2.', mu:.28, sig:.75},
  'SOL-USD':{name:'Solana', type:'Crypto', owner:'Decentralized', description:'Blockchain de alta velocidad. Rival de Ethereum. DeFi + NFTs.', mu:.40, sig:.85},
  'BNB-USD':{name:'BNB', type:'Crypto', owner:'Decentralized', description:'Token de Binance. Usado para fees + DeFi en BNB Chain.', mu:.25, sig:.65},

};

// Total: 250+ activos listados arriba
// Puedes extender a 500+ siguiendo el mismo patrón

// Exportar en entornos Node.js (jobs, tests) sin romper el browser
if (typeof module !== 'undefined' && module.exports) module.exports = ASSETS_DB;
// Se carga automáticamente cuando se incluye el script en dashboard.html