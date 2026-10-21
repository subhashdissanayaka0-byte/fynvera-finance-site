// Main application: navigation, articles, workspace, calculators, demo mode and optional Supabase integration.
import React, { useEffect, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { categories, calculatorList, markets, seedArticles, workspaceItems, siteSocialLinks } from './data/content.js';
import { isSupabaseConfigured, supabase } from './lib/supabase.js';
import { loadLocal, saveLocal } from './lib/storage.js';

// Public Binance market data only: these symbols do not require an API key or account credentials.
const BINANCE_COINS = [
  { symbol: 'BTC', name: 'Bitcoin', color: '#ffab3e' },
  { symbol: 'ETH', name: 'Ethereum', color: '#7ea8ff' },
  { symbol: 'BNB', name: 'BNB', color: '#ffc44d' },
  { symbol: 'SOL', name: 'Solana', color: '#9e8cff' },
  { symbol: 'XRP', name: 'XRP', color: '#8db3d8' },
  { symbol: 'ADA', name: 'Cardano', color: '#5d91ff' },
  { symbol: 'DOGE', name: 'Dogecoin', color: '#d8c46a' },
  { symbol: 'LINK', name: 'Chainlink', color: '#6b9cff' },
  { symbol: 'TRX', name: 'TRON', color: '#f46e7b' },
  { symbol: 'AVAX', name: 'Avalanche', color: '#f08080' }
];

// Live non-crypto symbols from biquote's public, keyless quote endpoint.
// These are display/watch symbols only; the provider's last quote may be stale when a market is closed.
const LIVE_MARKET_GROUPS = {
  Indices: [
    { symbol: 'SPX', name: 'S&P 500', quoteSymbol: 'US500', assetClass: 'index', color: '#5d91ff' },
    { symbol: 'DXY', name: 'US Dollar Index', quoteSymbol: 'DXY', assetClass: 'index', color: '#9e8cff' },
    { symbol: 'NDX', name: 'NASDAQ 100', quoteSymbol: 'USTEC', assetClass: 'index', color: '#42c6fb' },
    { symbol: 'DJI', name: 'Dow Jones Industrial Average', quoteSymbol: 'US30', assetClass: 'index', color: '#55c5ca' }
  ],
  Stocks: [
    { symbol: 'AAPL', name: 'Apple', quoteSymbol: 'AAPL', assetClass: 'stock', color: '#80a5bb' },
    { symbol: 'JPM', name: 'JPMorgan Chase', quoteSymbol: 'JPM', assetClass: 'stock', color: '#5d91ff' },
    { symbol: 'MSFT', name: 'Microsoft', quoteSymbol: 'MSFT', assetClass: 'stock', color: '#7bcf85' }
  ],
  Forex: [
    { symbol: 'EUR/USD', name: 'Euro / US Dollar', quoteSymbol: 'EURUSD', assetClass: 'forex', color: '#5d91ff' },
    { symbol: 'GBP/USD', name: 'Pound / US Dollar', quoteSymbol: 'GBPUSD', assetClass: 'forex', color: '#42c6fb' },
    { symbol: 'USD/JPY', name: 'US Dollar / Yen', quoteSymbol: 'USDJPY', assetClass: 'forex', color: '#9e8cff' }
  ],
  Commodities: [
    { symbol: 'XAU/USD', name: 'Gold / US Dollar', quoteSymbol: 'XAUUSD', assetClass: 'commodity', color: '#ffc44d' },
    { symbol: 'XAG/USD', name: 'Silver / US Dollar', quoteSymbol: 'XAGUSD', assetClass: 'commodity', color: '#b7c8d8' },
    { symbol: 'WTI', name: 'WTI Crude Oil', quoteSymbol: 'USOIL', assetClass: 'commodity', color: '#f08080' }
  ]
};


// Resolve legacy watchlist symbols (e.g. GOLD) to the real provider quote symbols.
function findLiveMarketInstrument(symbol) {
  const aliases = { GOLD: 'XAUUSD', SILVER: 'XAGUSD', WTI: 'USOIL', SPX: 'US500', NDX: 'USTEC', DJI: 'US30' };
  const target = aliases[String(symbol || '').toUpperCase()] || String(symbol || '').toUpperCase();
  return Object.values(LIVE_MARKET_GROUPS).flat().find((candidate) =>
    candidate.symbol.toUpperCase() === String(symbol || '').toUpperCase() ||
    candidate.quoteSymbol.toUpperCase() === target ||
    candidate.quoteSymbol.replace(/[^A-Z0-9]/g, '') === target.replace(/[^A-Z0-9]/g, '')
  ) || null;
}

function formatLiveMarketPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: number < 1 ? 5 : number < 100 ? 4 : 2
  }).format(number);
}

function liveMarketRow(instrument, marketQuotes = {}, marketStatus = 'connecting') {
  const quote = marketQuotes[instrument.quoteSymbol] || marketQuotes[instrument.quoteSymbol.replace(/[^A-Z0-9]/g, '')];
  const quoteValue = quote ? Number(quote.mid ?? quote.lastPrice ?? quote.bid ?? quote.ask) : NaN;
  const quoteIsClosed = quote?.marketState === 'closed';
  const quoteIsStale = Boolean(quote?.stale || Number(quote?.quoteAgeSeconds ?? 0) > 300);
  const change = quote && !quoteIsClosed && !quoteIsStale && Number.isFinite(Number(quote.dayDiffPercent)) ? Number(quote.dayDiffPercent) : null;
  return {
    symbol: instrument.symbol,
    name: instrument.name,
    value: Number.isFinite(quoteValue) ? formatLiveMarketPrice(quoteValue) : marketStatus === 'connecting' ? 'Loading…' : 'No quote',
    change: change === null ? '—' : formatCryptoChange(change),
    positive: change === null ? false : change >= 0,
    color: instrument.color,
    isLive: Boolean(quote && !quoteIsStale && !quoteIsClosed),
    marketState: quote?.marketState || '',
    stale: quoteIsStale,
    source: quote?.source || '',
    currencyPrefix: ['stock', 'commodity'].includes(instrument.assetClass) ? '$' : ''
  };
}

function formatCryptoPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: number < 1 ? 6 : number < 100 ? 4 : 2
  }).format(number);
}

function formatCryptoChange(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return `${number > 0 ? '+' : ''}${number.toFixed(2)}%`;
}

function cryptoTickerRow(coin, cryptoPrices = {}, cryptoStatus = 'connecting') {
  const ticker = cryptoPrices[coin.pairSymbol || `${coin.symbol}USDT`];
  const change = Number(ticker?.priceChangePercent || 0);
  return {
    symbol: coin.symbol,
    name: coin.name,
    value: ticker ? `$${formatCryptoPrice(ticker.lastPrice)}` : 'Connecting…',
    change: ticker ? formatCryptoChange(change) : '—',
    positive: change >= 0,
    color: coin.color,
    isLive: Boolean(ticker && cryptoStatus === 'live'),
    isSnapshot: Boolean(ticker && cryptoStatus !== 'live')
  };
}

// Use one safe icon wrapper so a typo in an icon name never breaks the page.
function Icon({ name, size = 18, ...props }) {
  const Component = Lucide[name] || Lucide.CircleHelp;
  return <Component size={size} strokeWidth={1.8} aria-hidden="true" {...props} />;
}

// Displays a named image placeholder until the owner adds their generated file to public/images.
function ImageSlot({ id, src, alt, className = '', compact = false }) {
  const [failed, setFailed] = useState(!src);
  useEffect(() => setFailed(!src), [src]);
  return (
    <div className={`image-slot ${compact ? 'image-slot-compact' : ''} ${className}`} data-image-id={id}>
      {/* Keep this image ID when replacing the placeholder with a generated finance image. */}
      {src && !failed && <img src={src} alt={alt || ''} onError={() => setFailed(true)} loading="lazy" />}
      {failed && (
        <div className="image-slot-art" aria-label={alt || id}>
          <div className="image-gridlines" />
          <div className="image-orb image-orb-one" />
          <div className="image-orb image-orb-two" />
          <div className="image-chart">
            <svg viewBox="0 0 520 150" role="img" aria-label="Abstract market chart illustration">
              <defs><linearGradient id={`chartFill-${id}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#21d7e8" stopOpacity=".35"/><stop offset="100%" stopColor="#21d7e8" stopOpacity="0"/></linearGradient></defs>
              <path d="M0,132 C32,128 40,90 68,106 S100,125 130,92 S175,105 202,73 S246,91 269,62 S305,75 333,46 S380,72 405,38 S455,52 520,10 L520,150 L0,150 Z" fill={`url(#chartFill-${id})`} />
              <path d="M0,132 C32,128 40,90 68,106 S100,125 130,92 S175,105 202,73 S246,91 269,62 S305,75 333,46 S380,72 405,38 S455,52 520,10" fill="none" stroke="#22d6e7" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <span className="image-placeholder-id">{id}</span>
          <span className="image-placeholder-note">Add your generated image</span>
        </div>
      )}
    </div>
  );
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div className={`toast toast-${toast.type || 'info'}`} role="status">
      <Icon name={toast.type === 'error' ? 'CircleAlert' : toast.type === 'success' ? 'CircleCheck' : 'Info'} size={18} />
      <span>{toast.message}</span>
      <button className="icon-button toast-close" onClick={onClose} aria-label="Dismiss notification"><Icon name="X" size={16} /></button>
    </div>
  );
}

function Brand({ onClick }) {
  return (
    <button className="brand" onClick={onClick} aria-label="Fynvera home">
      <span className="brand-mark"><Icon name="ChartNoAxesCombined" size={30} /></span>
      <span className="brand-words"><strong>FYNVERA</strong><small>Understand Money, Build Wealth.</small></span>
    </button>
  );
}

function Header({ onHome, onCategory, onAuth, onWorkspace, onSearch, user, activeView }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [openMoreCategory, setOpenMoreCategory] = useState(null);
  const mainLinks = [
    { label: 'Home', action: onHome },
    { label: 'News & Insights', action: () => onCategory('News & Insights') },
    { label: 'Investing', action: () => onCategory('Investing') },
    { label: 'Stock Market', action: () => onCategory('Stock Market') },
    { label: 'Personal Finance', action: () => onCategory('Personal Finance') },
    { label: 'Crypto', action: () => onCategory('Crypto') },
    { label: 'Forex', action: () => onCategory('Forex') },
    { label: 'Business & Economy', action: () => onCategory('Business & Economy') }
  ];
  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand onClick={onHome} />
        <nav className={`main-nav ${mobileOpen ? 'main-nav-open' : ''}`} aria-label="Main navigation">
          {mainLinks.map((item) => {
            const category = categories.find((entry) => entry.name === item.label);
            const hasSubcategories = Boolean(category?.subcategories?.length) && item.label !== 'Home';
            const isOpen = openDropdown === item.label;
            return (
              <div className={`nav-category-wrap ${isOpen ? 'nav-category-open' : ''}`} key={item.label}>
                <div className="nav-category-controls">
                  <button className={`nav-link ${activeView === item.label ? 'nav-link-active' : ''}`} onClick={() => { item.action(); setOpenDropdown(null); setMobileOpen(false); }}>{item.label}</button>
                  {hasSubcategories && <button className="nav-dropdown-toggle" aria-label={`Show ${item.label} subcategories`} aria-expanded={isOpen} onClick={() => setOpenDropdown((current) => current === item.label ? null : item.label)}><Icon name="ChevronDown" size={13} /></button>}
                </div>
                {hasSubcategories && <div className={`nav-dropdown ${isOpen ? 'nav-dropdown-open' : ''}`}>
                  <button className="nav-dropdown-all" onClick={() => { onCategory(item.label); setOpenDropdown(null); setMobileOpen(false); }}>All {item.label}<Icon name="ArrowUpRight" size={14} /></button>
                  {category.subcategories.map((subcategory) => <button key={subcategory} onClick={() => { onCategory(item.label, subcategory); setOpenDropdown(null); setMobileOpen(false); }}>{subcategory}<Icon name="ChevronRight" size={14} /></button>)}
                </div>}
              </div>
            );
          })}
          <div className={`more-nav-wrap ${openDropdown === 'More' ? 'more-nav-open' : ''}`}>
            <button className="nav-link" onClick={() => setOpenDropdown((current) => current === 'More' ? null : 'More')} aria-expanded={openDropdown === 'More'}>More <Icon name="ChevronDown" size={13} /></button>
            {openDropdown === 'More' && <div className="nav-dropdown more-category-dropdown">{categories.filter((item) => !mainLinks.some((nav) => nav.label === item.name)).map((item) => <div key={item.name} className={`more-subcategory-wrap ${openMoreCategory === item.name ? 'more-subcategory-open' : ''}`}><div className="more-category-row"><button className="more-category-link" onClick={() => { onCategory(item.name); setOpenDropdown(null); setMobileOpen(false); }}>{item.name}<Icon name="ArrowUpRight" size={14} /></button><button className="more-category-toggle" aria-label={`Show ${item.name} subcategories`} aria-expanded={openMoreCategory === item.name} onClick={() => setOpenMoreCategory((current) => current === item.name ? null : item.name)}><Icon name="ChevronRight" size={14}/></button></div><div className="more-subdropdown"><button onClick={() => { onCategory(item.name); setOpenDropdown(null); setOpenMoreCategory(null); setMobileOpen(false); }}>All {item.name}<Icon name="ArrowUpRight" size={14}/></button>{item.subcategories.map((subcategory) => <button key={subcategory} onClick={() => { onCategory(item.name, subcategory); setOpenDropdown(null); setOpenMoreCategory(null); setMobileOpen(false); }}>{subcategory}<Icon name="ChevronRight" size={14}/></button>)}</div></div>)}</div>}
          </div>
        </nav>
        <div className="header-actions">
          <button className="icon-button search-trigger" onClick={onSearch} aria-label="Search articles"><Icon name="Search" size={20} /></button>
          {user ? (
            <button className="header-user" onClick={onWorkspace} title="Open your workspace">
              <span className="avatar avatar-small">{user.avatar ? <img src={user.avatar} alt="" /> : (user.name || user.email || 'U').slice(0, 1).toUpperCase()}</span>
              <span className="header-user-label">Workspace</span>
            </button>
          ) : (
            <><button className="button button-outline header-signin" onClick={() => onAuth('signin')}>Sign In</button><button className="button button-primary header-signup" onClick={() => onAuth('signup')}>Sign Up <Icon name="ArrowUpRight" size={16} /></button></>
          )}
        </div>
        <button className="icon-button mobile-menu" onClick={() => setMobileOpen((value) => !value)} aria-label="Toggle menu" aria-expanded={mobileOpen}><Icon name={mobileOpen ? 'X' : 'Menu'} size={22} /></button>
      </div>
    </header>
  );
}

function AdSlot({ id, format = 'wide' }) {
  return (
    <div className={`ad-slot-placeholder ad-slot-${format}`} data-ad-slot-id={id} aria-label="Advertisement placement">
      {/* Replace this named placeholder with your approved AdSense unit. Do not invent publisher or slot IDs. */}
      <span className="ad-slot-label">{id}</span>
      <span className="ad-slot-message">Advertisement space · add AdSense after approval</span>
    </div>
  );
}

function SectionTitle({ eyebrow, title, description, actionLabel, onAction }) {
  return (
    <div className="section-title-row">
      <div>{eyebrow && <div className="eyebrow"><span />{eyebrow}</div>}<h2>{title}</h2>{description && <p>{description}</p>}</div>
      {actionLabel && <button className="text-link" onClick={onAction}>{actionLabel}<Icon name="ArrowRight" size={16} /></button>}
    </div>
  );
}

function MarketPanel({ compact = false, onOpenMarkets, cryptoPrices = {}, cryptoStatus = 'connecting', marketQuotes = {}, marketCatalog = [], marketStatus = 'connecting', marketFetchedAt = null }) {
  const [tab, setTab] = useState('Indices');
  const [cryptoSearch, setCryptoSearch] = useState('');
  const [cryptoLimit, setCryptoLimit] = useState(100);
  const [marketSearch, setMarketSearch] = useState('');
  const [marketLimit, setMarketLimit] = useState(100);
  const tabs = ['Indices', 'Stocks', 'Forex', 'Crypto', 'Commodities'];
  // The feed can contain hundreds of spot USDT pairs. Sort by 24h quote volume and let readers search/load more.
  const allCryptoCoins = Object.keys(cryptoPrices)
    .filter((pair) => pair.endsWith('USDT') && Number.isFinite(Number(cryptoPrices[pair]?.lastPrice)))
    .sort((a, b) => Number(cryptoPrices[b]?.quoteVolume || 0) - Number(cryptoPrices[a]?.quoteVolume || 0))
    .map((pair) => {
      const symbol = pair.slice(0, -4);
      const known = BINANCE_COINS.find((coin) => coin.symbol === symbol);
      return { ...(known || { symbol, name: symbol, color: '#7ea8ff' }), pairSymbol: pair };
    });
  const cryptoSource = allCryptoCoins.length ? allCryptoCoins : BINANCE_COINS.map((coin) => ({ ...coin, pairSymbol: `${coin.symbol}USDT` }));
  const matchedCryptoCoins = cryptoSource.filter((coin) => `${coin.symbol} ${coin.name} ${coin.pairSymbol}`.toLowerCase().includes(cryptoSearch.trim().toLowerCase()));
  const visibleCryptoCoins = matchedCryptoCoins.slice(0, cryptoLimit);
  // Combine a few friendly common aliases with the full free quote-provider catalogue.
  // Deduping by quote symbol keeps AAPL / EURUSD etc. from appearing twice.
  const remoteClass = { Indices: 'index', Stocks: 'stock', Forex: 'forex', Commodities: 'commodity' }[tab];
  const uniqueInstruments = [...new Map([...(marketCatalog || []).filter((item) => item.assetClass === remoteClass), ...(LIVE_MARKET_GROUPS[tab] || [])].map((item) => [String(item.quoteSymbol).toUpperCase().replace(/[^A-Z0-9]/g, ''), item])).values()];
  const normalizedQuery = marketSearch.trim().toLowerCase();
  const matchedInstruments = uniqueInstruments.filter((item) => `${item.symbol} ${item.name} ${item.quoteSymbol}`.toLowerCase().includes(normalizedQuery));
  const visibleInstruments = matchedInstruments.slice(0, marketLimit);
  const rows = tab === 'Crypto'
    ? visibleCryptoCoins.map((coin) => cryptoTickerRow(coin, cryptoPrices, cryptoStatus))
    : visibleInstruments.map((instrument) => liveMarketRow(instrument, marketQuotes, marketStatus));
  const allLive = rows.length > 0 && rows.every((row) => row.isLive);
  return (
    <section className={`panel market-panel ${compact ? 'market-panel-compact' : ''}`}>
      <div className="panel-heading"><div className="heading-icon"><Icon name="ChartNoAxesColumnIncreasing" size={20} /></div><h3>Market Overview</h3><button className="text-link text-link-small" onClick={onOpenMarkets}>View All <Icon name="ArrowRight" size={14} /></button></div>
      <div className="market-tabs" role="tablist" aria-label="Market type">
        {tabs.map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? 'market-tab-active' : ''} onClick={() => { setTab(item); setMarketLimit(100); setMarketSearch(''); setCryptoLimit(100); setCryptoSearch(''); }}>{item}</button>)}
      </div>
      {tab === 'Crypto' ? <div className="market-crypto-search"><Icon name="Search" size={15}/><input value={cryptoSearch} onChange={(event) => { setCryptoSearch(event.target.value); setCryptoLimit(100); }} placeholder="Search any Binance USDT coin…" aria-label="Search crypto coins"/><span>{matchedCryptoCoins.length.toLocaleString('en-US')} pairs</span></div> : <div className="market-crypto-search"><Icon name="Search" size={15}/><input value={marketSearch} onChange={(event) => { setMarketSearch(event.target.value); setMarketLimit(100); }} placeholder={`Search ${tab.toLowerCase()} symbols…`} aria-label={`Search ${tab.toLowerCase()} markets`}/><span>{matchedInstruments.length.toLocaleString('en-US')} markets</span></div>}
      <div className={`market-rows ${tab === 'Crypto' ? 'market-rows-live-crypto market-rows-all-crypto' : 'market-rows-all-crypto'}`}>
        {rows.map((item) => <div className="market-row" key={item.pairSymbol || item.symbol}>
          <span className="market-symbol" style={{ '--symbol-color': item.color }}>{item.symbol.slice(0, 1)}</span>
          <span className="market-name">{item.name}{tab === 'Crypto' && <small className="market-pair-symbol">{item.pairSymbol || `${item.symbol}USDT`}</small>}</span><strong>{tab === 'Crypto' ? item.value : (item.value === 'Loading…' || item.value === 'No quote' || item.value === 'Unavailable' ? item.value : `${item.currencyPrefix || ''}${item.value}`)}</strong>
          <span className={`market-change ${item.positive ? 'positive' : 'negative'}`}><Icon name={item.positive ? 'TrendingUp' : 'TrendingDown'} size={14} />{item.change}</span>
        </div>)}
        {!rows.length && <div className="market-empty-row">{tab === 'Crypto' && cryptoSearch ? 'No USDT coin matches this search.' : 'Waiting for the market data feed…'}</div>}
      </div>
      {tab === 'Crypto' && matchedCryptoCoins.length > visibleCryptoCoins.length && <button className="market-load-more" onClick={() => setCryptoLimit((limit) => limit + 100)}>Load 100 more coins <Icon name="ChevronDown" size={14}/></button>}
      {tab !== 'Crypto' && matchedInstruments.length > visibleInstruments.length && <button className="market-load-more" onClick={() => setMarketLimit((limit) => limit + 100)}>Load 100 more markets <Icon name="ChevronDown" size={14}/></button>}
      {tab === 'Crypto'
        ? <div className="sample-data-note market-live-note"><span className={`live-dot ${cryptoStatus === 'live' ? '' : 'live-dot-muted'}`} />{cryptoStatus === 'live' ? `Live Binance Spot data · ${allCryptoCoins.length.toLocaleString('en-US')} USDT pairs · public ticker stream + 60-second snapshot backup` : cryptoStatus === 'snapshot' ? 'Binance snapshot loaded · reconnecting to live updates' : 'Connecting to Binance public market data…'}</div>
        : <div className="sample-data-note market-live-note"><span className={`live-dot ${allLive ? '' : 'live-dot-muted'}`} />{allLive ? 'Live quotes from biquote · market prices may vary by venue' : marketStatus === 'unavailable' ? 'Live quote feed is unavailable right now · retrying automatically' : 'Market-closed or stale rows show their last quote without a live-change value'}{marketFetchedAt && <small> · Fetched {new Date(marketFetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>}</div>}
    </section>
  );
}

function ArticleCard({ article, onOpen, featured = false, onToggleWatch, watched = false }) {
  return (
    <article className={`article-card ${featured ? 'article-card-featured' : ''}`}>
      <button className="article-card-image-button" onClick={() => onOpen(article)} aria-label={`Read ${article.title}`}>
        <ImageSlot id={article.imageId || 'IMG-ARTICLE-CUSTOM'} src={article.image} alt={article.title} className="article-card-image" />
        <span className="image-category-pill">{article.category}</span>
      </button>
      <div className="article-card-body">
        <div className="article-meta"><span>{article.subcategory || article.category}</span>{articleWasEdited(article) && <span className="article-edited-label">EDITED</span>}<span className="meta-dot" /><span>{formatDate(article.date)}</span><span className="meta-dot" /><span>{article.readTime || 5} min read</span></div>
        <button className="article-title-button" onClick={() => onOpen(article)}><h3>{article.title}</h3></button>
        <p>{article.excerpt}</p>
        <div className="article-card-footer"><span className="author-mini"><span className="author-initial">{(article.author || 'F').slice(0, 1)}</span>{article.author || 'Fynvera Editorial'}</span><div className="article-actions"><button className={`icon-button ${watched ? 'icon-button-on' : ''}`} onClick={() => onToggleWatch(article)} aria-label={watched ? 'Remove from reading list' : 'Save article'}><Icon name={watched ? 'BookmarkCheck' : 'Bookmark'} size={16} /></button><button className="icon-button" onClick={() => onOpen(article)} aria-label="Read article"><Icon name="ArrowUpRight" size={17} /></button></div></div>
      </div>
    </article>
  );
}

function ArticleDetail({ article, onBack, onCategory, onToggleWatch, watched, onShare, user, onAuth, showToast, cryptoPrices = {}, cryptoStatus = 'connecting', marketQuotes = {}, marketCatalog = [], marketStatus = 'connecting', marketFetchedAt = null }) {
  const articleText = Array.isArray(article.body) ? article.body : String(article.body || '').split('\n\n').filter(Boolean);
  return (
    <main className="article-detail page-wrap fade-in">
      <button className="back-link" onClick={onBack}><Icon name="ArrowLeft" size={16} /> Back to insights</button>
      <div className="article-detail-grid">
        <article className="article-main-column">
          <div className="breadcrumbs"><button onClick={onBack}>Home</button><Icon name="ChevronRight" size={13} /><button onClick={() => onCategory(article.category)}>{article.category}</button><Icon name="ChevronRight" size={13} /><span>Article</span></div>
          <span className="category-label">{article.category.toUpperCase()}</span>
          <h1>{article.title}</h1>
          <p className="article-lead">{article.excerpt}</p>
          <div className="article-byline"><div className="author-avatar">{(article.author || 'F').slice(0, 1)}</div><div><strong>{article.author || 'Fynvera Editorial'}</strong><small>{article.authorRole || 'Finance Contributor'}{articleWasEdited(article) ? ' · EDITED' : ''}</small></div><span className="byline-separator" /><span><Icon name="CalendarDays" size={15} />{formatDate(article.date)}</span><span><Icon name="Clock3" size={15} />{article.readTime || 5} min read</span></div>
          {article.authorId && <div className="article-top-follow"><FollowAuthorButton targetId={article.authorId} user={user} authorName={article.author} onAuth={onAuth} showToast={showToast}/></div>}
          <div className="article-detail-image"><ImageSlot id={article.imageId || 'IMG-ARTICLE-CUSTOM'} src={article.image} alt={article.title} /></div>
          <div className="article-toolbar"><span><Icon name="BookOpenText" size={16} /> Reading guide</span><div><button className={`button button-soft button-small ${watched ? 'button-soft-active' : ''}`} onClick={() => onToggleWatch(article)}><Icon name={watched ? 'BookmarkCheck' : 'Bookmark'} size={15} />{watched ? 'Saved' : 'Save article'}</button><button className="button button-soft button-small" onClick={() => onShare(article)}><Icon name="Share2" size={15} />Share</button></div></div>
          <div className="article-body-copy">{articleText.map((paragraph, index) => <React.Fragment key={`${article.id}-${index}`}><p>{paragraph}</p>{index === 1 && <AdSlot id="ADSLOT-ARTICLE-001" format="article"/>}</React.Fragment>)}<div className="disclaimer-block"><Icon name="ShieldCheck" size={19} /><p><strong>Important note</strong><br />This content is for general education only. It is not personal financial, investment, tax or legal advice. Market values and examples may be illustrative.</p></div></div>
          <div className="keyword-tags">{(article.keywords || []).map((keyword) => <button key={keyword} onClick={() => onCategory(article.category)}>#{keyword.replaceAll(' ', '')}</button>)}</div>
          <ArticleCommunity article={article} user={user} onAuth={onAuth} showToast={showToast}/>
        </article>
        <aside className="article-aside"><MarketPanel compact cryptoPrices={cryptoPrices} cryptoStatus={cryptoStatus} marketQuotes={marketQuotes} marketCatalog={marketCatalog} marketStatus={marketStatus} marketFetchedAt={marketFetchedAt} onOpenMarkets={() => onCategory('Stock Market')} /><div className="panel author-panel"><div className="author-avatar author-avatar-large">{(article.author || 'F').slice(0, 1)}</div><div><h3>{article.author || 'Fynvera Editorial'}</h3><p>{article.authorRole || 'Finance Contributor'}</p></div><p>Clear, practical finance insights to help you make more informed money decisions.</p>{article.authorId && <PublicAuthorLinks authorId={article.authorId}/>}<button className="button button-outline button-block" onClick={() => onCategory(article.category)}>More in {article.category}<Icon name="ArrowRight" size={15} /></button></div><div className="panel article-aside-tags"><h3><Icon name="Tags" size={17} /> In this article</h3>{(article.keywords || []).slice(0, 5).map((keyword) => <button key={keyword} onClick={() => onCategory(article.category)}>{keyword}</button>)}</div></aside>
      </div>
    </main>
  );
}

function HomePage({ articles, onOpenArticle, onCategory, onWorkspace, onCalculator, onAllCalculators, onToggleWatch, watchlist, cryptoPrices = {}, cryptoStatus = 'connecting', marketQuotes = {}, marketCatalog = [], marketStatus = 'connecting', marketFetchedAt = null }) {
  // Topic-only articles stay on their category pages, not in the News & Insights editorial feed.
  const editorialArticles = articles.filter((article) => article.contentType !== 'topic');
  const [newsFilter, setNewsFilter] = useState('All');
  // Apply the filter to the feature story as well as the smaller cards, so categories never mix.
  const filteredEditorial = newsFilter === 'All' ? editorialArticles : editorialArticles.filter((article) => article.category === newsFilter);
  const feature = filteredEditorial[0] || null;
  const snapshotInstruments = [
    { symbol: 'SPX', name: 'S&P 500', quoteSymbol: 'US500', assetClass: 'index', color: '#5d91ff' },
    { symbol: 'NDX', name: 'NASDAQ 100', quoteSymbol: 'USTEC', assetClass: 'index', color: '#9e8cff' },
    { symbol: 'GOLD', name: 'Gold', quoteSymbol: 'XAUUSD', assetClass: 'commodity', color: '#ffc44d' }
  ];
  const snapshotRows = [
    ...snapshotInstruments.map((item) => ({ ...liveMarketRow(item, marketQuotes, marketStatus), tickerName: item.name, currency: item.assetClass === 'commodity' ? '$' : '' })),
    ...BINANCE_COINS.slice(0, 2).map((coin) => ({ ...cryptoTickerRow(coin, cryptoPrices, cryptoStatus), tickerName: coin.name, currency: '' }))
  ];
  const newsItems = filteredEditorial.slice(0, 4);
  return (
    <main className="page-wrap home-page">
      <div className="hero-grid">
        <section className="hero-copy">
          <div className="hero-kicker"><span className="live-dot" /> YOUR MONEY. YOUR FUTURE.</div>
          <h1>See money <span>clearly.</span><br />Build wealth <span>confidently.</span></h1>
          <p>Independent insights, smarter tools, and real-world financial knowledge to help you make your next move with confidence.</p>
          <div className="hero-actions"><button className="button button-primary button-large" onClick={() => onCategory('Investing')}>Explore Investing <Icon name="ArrowRight" size={17} /></button><button className="button button-ghost button-large" onClick={onWorkspace}><Icon name="LayoutDashboard" size={17} /> Open Workspace</button></div>
          <div className="hero-proof"><div className="proof-avatars"><span>J</span><span>A</span><span>M</span><span><Icon name="Plus" size={12} /></span></div><div><strong>Finance made more approachable</strong><small>Learn at your pace. Plan on your terms.</small></div></div>
        </section>
        <section className="hero-visual" aria-label="Featured finance illustration">
          <ImageSlot id="IMG-HERO-001" src="/images/hero-finance-dashboard.jpg" alt="Finance dashboard and upward market chart" className="hero-image" />
          <div className="hero-floating-card float-card-top"><span className="float-icon"><Icon name="TrendingUp" size={17} /></span><div><small>Build habits that grow</small><strong>Long-term mindset</strong></div><Icon name="ArrowUpRight" size={17} /></div>
          <div className="hero-floating-card float-card-bottom"><div className="mini-chart-header"><span>Portfolio journey</span><span className="positive">↗ 12.8%</span></div><svg viewBox="0 0 220 62" className="mini-chart" role="img" aria-label="Illustrative rising trend"><path d="M0 53 C20 49 22 37 43 43 S70 50 87 28 S112 41 130 22 S157 29 171 11 S199 19 220 2" fill="none" stroke="#23d9e8" strokeWidth="3" strokeLinecap="round"/><path d="M0 53 C20 49 22 37 43 43 S70 50 87 28 S112 41 130 22 S157 29 171 11 S199 19 220 2 L220 62 L0 62 Z" fill="#23d9e8" opacity=".1"/></svg><small>Illustrative only · Not a promise of returns</small></div>
          <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
        </section>
      </div>

      <div className="market-ticker"><div className="ticker-label"><span className={`live-dot ${cryptoStatus === 'live' && marketStatus === 'live' ? '' : 'live-dot-muted'}`} /> MARKET SNAPSHOT</div><div className="ticker-items">{snapshotRows.map((item) => <div key={item.symbol} className="ticker-item"><span>{item.tickerName || item.name}{item.isLive ? ' · LIVE' : item.marketState === 'closed' ? ' · MARKET CLOSED' : item.stale ? ' · LAST QUOTE' : item.isSnapshot ? ' · SNAPSHOT' : ' · CONNECTING'}</span><strong>{item.value === 'Loading…' || item.value === 'No quote' || item.value === 'Unavailable' ? item.value : `${item.currency || ''}${item.value}`}</strong><em className={item.positive ? 'positive' : 'negative'}>{item.change || '—'}</em></div>)}</div><span className="ticker-demo">BINANCE CRYPTO · BIQUOTE FX / METALS / INDEX / STOCK CFDs</span></div>
      <AdSlot id="ADSLOT-HOME-001" format="wide"/>

      <section className="home-feature-section section-gap">
        <div className="feature-story-wrap">
          <div className="section-title-row"><div><div className="eyebrow"><span /> NEWS & INSIGHTS</div><h2>Ideas for your next move</h2><p>Fresh finance stories and practical guides in one feed. Topic pages remain separate.</p></div><button className="text-link" onClick={() => onCategory('News & Insights')}>All insights <Icon name="ArrowRight" size={16} /></button></div>
          <div className="news-filter-row" aria-label="Filter home insights">{['All', ...categories.map((category) => category.name)].map((item) => <button key={item} className={newsFilter === item ? 'news-filter-active' : ''} onClick={() => setNewsFilter(item)}>{item}</button>)}</div>
          {feature ? <div className="feature-story-card"><button className="feature-image-button" onClick={() => onOpenArticle(feature)}><ImageSlot id={feature.imageId || 'IMG-ARTICLE-001'} src={feature.image} alt={feature.title} className="feature-story-image" /></button><div className="feature-story-info"><div className="article-meta"><span>{feature.category}</span><span className="meta-dot" /><span>{formatDate(feature.date)}</span><span className="meta-dot" /><span>{feature.readTime || 5} min read</span>{articleWasEdited(feature) && <span className="article-edited-label">EDITED</span>}</div><button className="article-title-button" onClick={() => onOpenArticle(feature)}><h3>{feature.title}</h3></button><p>{feature.excerpt}</p><div className="feature-story-bottom"><span className="author-mini"><span className="author-initial">{(feature.author || 'F').slice(0, 1)}</span>By {feature.author || 'Fynvera Editorial'}</span><button className="circle-arrow" onClick={() => onOpenArticle(feature)} aria-label="Read featured article"><Icon name="ArrowUpRight" size={20} /></button></div></div></div> : <div className="feature-story-empty"><Icon name="Newspaper" size={27}/><strong>No stories in this filter yet.</strong><span>Choose another category or publish a News & Insights article from your workspace.</span><div><button className="button button-soft button-small" onClick={() => setNewsFilter('All')}>Show all stories</button><button className="button button-primary button-small" onClick={onWorkspace}>Open workspace</button></div></div>}
          <div className="latest-card-grid">{newsItems.filter((article) => article.id !== feature?.id).slice(0, 3).map((article) => <ArticleCard key={article.id} article={article} onOpen={onOpenArticle} onToggleWatch={onToggleWatch} watched={watchlist.includes(article.id)} />)}</div>
        </div>
        <aside className="home-sidebar"><MarketPanel cryptoPrices={cryptoPrices} cryptoStatus={cryptoStatus} marketQuotes={marketQuotes} marketCatalog={marketCatalog} marketStatus={marketStatus} marketFetchedAt={marketFetchedAt} onOpenMarkets={() => onCategory('Stock Market')} /><div className="panel trade-cta"><div className="trade-cta-copy"><span className="eyebrow">PLAN WITH PURPOSE</span><h3>Your money journey, all in one place.</h3><p>Track ideas, organize your goals and learn as you go.</p><button className="button button-primary" onClick={onWorkspace}>Explore Workspace <Icon name="ArrowRight" size={16} /></button></div><div className="trade-art"><div className="phone-art"><div className="phone-speaker"/><div className="phone-screen-label">TOTAL VALUE</div><strong>$24,580</strong><svg viewBox="0 0 120 70"><path d="M2 58 L18 48 L29 52 L43 34 L53 40 L68 19 L79 25 L98 12 L118 5" fill="none" stroke="#26d6e7" strokeWidth="2.7"/><path d="M2 58 L18 48 L29 52 L43 34 L53 40 L68 19 L79 25 L98 12 L118 5 L118 70 L2 70 Z" fill="#26d6e7" opacity=".14"/></svg></div></div></div><div className="panel calculator-promo"><div className="panel-heading"><div className="heading-icon"><Icon name="Calculator" size={20} /></div><h3>Tools that make sense</h3><button className="text-link text-link-small" onClick={onAllCalculators}>View all <Icon name="ArrowRight" size={14} /></button></div><div className="calculator-mini-grid">{calculatorList.slice(0, 4).map((calc) => <button key={calc.id} className="calculator-mini" onClick={() => onCalculator(calc.id)}><span><Icon name={calc.icon} size={18} /></span><strong>{calc.name}</strong><small>{calc.description}</small></button>)}</div></div></aside>
      </section>

      <section className="category-section section-gap"><SectionTitle eyebrow="EXPLORE YOUR INTERESTS" title="One home for every money topic" description="Start with a subject you care about. Learn the basics, then go deeper." actionLabel="Browse all topics" onAction={() => onCategory('Education')} /><div className="category-grid">{categories.slice(0, 8).map((category) => <button key={category.name} className={`category-tile tone-${category.color}`} onClick={() => onCategory(category.name)}><span className="category-tile-icon"><Icon name={category.icon} size={21} /></span><strong>{category.name}</strong><small>{category.subcategories.slice(0, 2).join(' · ')}</small><span className="category-arrow"><Icon name="ArrowUpRight" size={16} /></span></button>)}</div></section>
      <AdSlot id="ADSLOT-HOME-002" format="wide"/>

      <section className="workspace-banner section-gap"><div className="workspace-banner-orbit"/><div className="workspace-banner-copy"><div className="eyebrow"><span /> YOUR PRIVATE FINANCE SPACE</div><h2>A clearer picture of your financial life.</h2><p>Bring your watchlist, portfolio notes, money goals and saved reads into one personal workspace.</p><div className="workspace-banner-actions"><button className="button button-primary button-large" onClick={onWorkspace}>Open your workspace <Icon name="ArrowRight" size={17} /></button><span><Icon name="LockKeyhole" size={15} /> Private by design when connected to your account</span></div></div><div className="workspace-preview-card"><div className="preview-card-head"><span>MY OVERVIEW</span><span className="preview-status"><i/> DEMO</span></div><div className="preview-total"><small>Portfolio tracker</small><strong>$18,420.00</strong><span className="positive"><Icon name="TrendingUp" size={14}/> +6.4% <em>illustrative</em></span></div><div className="preview-bars"><i style={{ height: '38%' }}/><i style={{ height: '56%' }}/><i style={{ height: '48%' }}/><i style={{ height: '72%' }}/><i style={{ height: '64%' }}/><i style={{ height: '87%' }}/><i style={{ height: '76%' }}/><i style={{ height: '100%' }}/></div><div className="preview-card-foot"><span><i className="preview-dot preview-dot-blue"/> Investments</span><span><i className="preview-dot preview-dot-cyan"/> Savings goals</span></div></div></section>
      <footer className="site-footer"><div className="footer-main"><Brand onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}/><p>Financial knowledge for a more confident future.</p><div className="footer-socials"><span>Global audience · English edition</span><div className="site-social-links">{[
          { label: 'X', url: siteSocialLinks.x, icon: 'AtSign' },
          { label: 'TikTok', url: siteSocialLinks.tiktok, icon: 'Music2' },
          { label: 'Facebook', url: siteSocialLinks.facebook, icon: 'Facebook' },
          { label: 'Telegram', url: siteSocialLinks.telegram, icon: 'Send' }
        ].filter((link) => Boolean(link.url)).map((link) => <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={`Fynvera on ${link.label}`} title={link.label}><Icon name={link.icon} size={16}/></a>)}</div></div></div><div className="footer-links"><div><strong>Explore</strong>{['Stock Market', 'Investing', 'Crypto', 'Forex'].map((item) => <button key={item} onClick={() => onCategory(item)}>{item}</button>)}</div><div><strong>Money</strong>{['Personal Finance', 'Real Estate', 'Commodities', 'Education'].map((item) => <button key={item} onClick={() => onCategory(item)}>{item}</button>)}</div><div><strong>Tools</strong><button onClick={onCalculator}>Financial calculators</button><button onClick={onWorkspace}>Your workspace</button><button onClick={() => onCategory('Regulatory Policy')}>Policy & disclosures</button></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Fynvera. Educational content only.</span><nav className="footer-legal-links" aria-label="Legal links"><a href="/about.html">About</a><a href="/privacy-policy.html">Privacy</a><a href="/terms-of-use.html">Terms</a><a href="/editorial-policy.html">Editorial Policy</a><a href="/financial-disclaimer.html">Disclaimer</a><a href="/contact.html">Contact</a></nav></div></footer>
    </main>
  );
}

function NewsInsightsPage({ articles, onOpenArticle, onCategory, onToggleWatch, watchlist }) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const filters = ['All', ...categories.map((item) => item.name)];
  const normalized = search.trim().toLowerCase();
  const results = articles.filter((article) => {
    if (article.contentType === 'topic') return false;
    const categoryMatches = filter === 'All' || article.category === filter;
    const text = [article.title, article.excerpt, article.category, article.subcategory, ...(article.keywords || [])].join(' ').toLowerCase();
    return categoryMatches && (!normalized || text.includes(normalized));
  });
  return <main className="page-wrap news-insights-page fade-in">
    <div className="news-insights-hero"><div className="eyebrow"><span/> THE FYNVERA EDITORIAL DESK</div><h1>News & <span>Insights</span></h1><p>Freshly published financial explainers, market context and practical money guides. Use filters to explore this editorial feed; topic pages stay separate.</p><label className="news-insights-search"><Icon name="Search" size={18}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search headlines, topics or keywords…" aria-label="Search news and insights"/></label></div>
    <div className="news-filter-row news-filter-row-all" aria-label="Filter news by topic">{filters.map((item) => <button key={item} className={filter === item ? 'news-filter-active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div>
    <div className="news-insights-result-label"><span>{results.length} {results.length === 1 ? 'story' : 'stories'}</span><span>Educational content · Updated as articles are published</span></div>
    {results.length ? <div className="news-insights-grid">{results.map((article) => <ArticleCard key={article.id} article={article} onOpen={onOpenArticle} onToggleWatch={onToggleWatch} watched={watchlist.includes(article.id)}/>)}</div> : <div className="empty-state"><Icon name="SearchX" size={27}/><strong>No stories match these filters.</strong><span>Try another category or a shorter search.</span><button className="button button-outline" onClick={() => { setFilter('All'); setSearch(''); }}>Clear filters</button></div>}
    <p className="news-insights-footnote"><Icon name="Info" size={15}/> Market values can change quickly. Articles provide general education, not individual investment advice.</p>
  </main>;
}

function CategoryPage({ category, initialSubcategory = 'All', articles, onOpenArticle, onCategory, onToggleWatch, watchlist, onWorkspace, onCalculator, cryptoPrices = {}, cryptoStatus = 'connecting', marketQuotes = {}, marketCatalog = [], marketStatus = 'connecting', marketFetchedAt = null }) {
  const selected = categories.find((item) => item.name === category) || categories[0];
  const [selectedSub, setSelectedSub] = useState(initialSubcategory);
  useEffect(() => setSelectedSub(initialSubcategory || 'All'), [category, initialSubcategory]);
  const list = articles.filter((article) => article.contentType !== 'news_insights' && article.category === selected.name && (selectedSub === 'All' || article.subcategory === selectedSub));
  const displayList = list.length ? list : articles.filter((article) => article.contentType !== 'news_insights' && ['Stock Market', 'Personal Finance', 'Crypto', 'Forex'].includes(article.category)).slice(0, 3);
  return (
    <main className="page-wrap category-page fade-in">
      <div className={`category-hero tone-${selected.color}`}><div className="category-hero-copy"><div className="breadcrumbs"><button onClick={() => onCategory('Home')}>Home</button><Icon name="ChevronRight" size={13}/><span>{selected.name}</span></div><span className="category-label">FYNVERA TOPICS</span><h1>{selected.name}<br/><span>made clearer.</span></h1><p>Understand the trends, concepts and practical decisions shaping {selected.name.toLowerCase()} with useful guides and approachable analysis.</p><div className="category-hero-actions"><button className="button button-primary" onClick={() => onCalculator()}>Explore calculators <Icon name="ArrowRight" size={16}/></button><button className="button button-ghost" onClick={onWorkspace}>Open workspace</button></div></div><div className="category-hero-art"><div className="category-art-ring ring-a"/><div className="category-art-ring ring-b"/><div className="category-art-icon"><Icon name={selected.icon} size={58}/></div><div className="category-art-chip chip-a"><Icon name="ShieldCheck" size={15}/> Learn with context</div><div className="category-art-chip chip-b"><Icon name="ChartNoAxesCombined" size={15}/> Make informed choices</div></div></div>
      <div className="subcategory-row"><strong>Explore {selected.name}</strong><div className="subcategory-chips"><button className={selectedSub === 'All' ? 'subcategory-active' : ''} onClick={() => setSelectedSub('All')}>All topics</button>{selected.subcategories.map((sub) => <button key={sub} className={selectedSub === sub ? 'subcategory-active' : ''} onClick={() => setSelectedSub(sub)}>{sub}</button>)}</div></div>
      <div className="category-content-grid"><div><SectionTitle eyebrow="CURATED FOR YOU" title={selectedSub === 'All' ? `Latest in ${selected.name}` : selectedSub} description="Practical context and useful next steps for your learning journey."/><div className="category-articles-grid">{displayList.map((article) => <ArticleCard key={article.id} article={article} onOpen={onOpenArticle} onToggleWatch={onToggleWatch} watched={watchlist.includes(article.id)}/>)}</div><div className="editorial-note"><Icon name="Info" size={17}/><span>New articles can be published from <strong>Workspace → Author Profile → Publish Article</strong>. Sample articles are provided as starter content.</span></div></div><aside className="category-aside"><MarketPanel cryptoPrices={cryptoPrices} cryptoStatus={cryptoStatus} marketQuotes={marketQuotes} marketCatalog={marketCatalog} marketStatus={marketStatus} marketFetchedAt={marketFetchedAt} onOpenMarkets={() => onCategory('Stock Market')}/><div className="panel topic-list-panel"><h3><Icon name="Layers3" size={17}/> {selected.name} topics</h3>{selected.subcategories.map((sub, index) => <button key={sub} onClick={() => setSelectedSub(sub)}><span className="topic-number">0{index + 1}</span><span>{sub}</span><Icon name="ArrowUpRight" size={15}/></button>)}</div><div className="panel learn-cta"><Icon name="GraduationCap" size={23}/><h3>Learn a little every day.</h3><p>Save articles you want to revisit and build your own reading list.</p><button className="button button-outline button-block" onClick={onWorkspace}>Open reading list <Icon name="ArrowRight" size={15}/></button></div></aside></div>
    </main>
  );
}

function AuthModal({ mode, onClose, onModeChange, onSubmit, onGoogle, busy, configured }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const isSignup = mode === 'signup';
  const handleSubmit = async (event) => {
    event.preventDefault(); setMessage('');
    const result = await onSubmit({ mode, name, email, password });
    if (result?.message) setMessage(result.message);
  };
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="auth-modal modal-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="modal-close icon-button" onClick={onClose} aria-label="Close dialog"><Icon name="X" size={19}/></button>
        <div className="auth-modal-brand"><Brand onClick={onClose}/></div><div className="auth-modal-visual"><div className="auth-visual-orbit"/><Icon name="ChartNoAxesCombined" size={30}/><span>YOUR MONEY, WITH A PLAN</span></div>
        <div className="auth-modal-copy"><div className="eyebrow"><span/> PERSONAL WORKSPACE</div><h2 id="auth-title">{isSignup ? 'Make room for your goals.' : 'Welcome back.'}</h2><p>{isSignup ? 'Create your free account to keep your watchlist, reading list and money notes together.' : 'Sign in to continue to your personal finance workspace.'}</p></div>
        <form className="form-stack" onSubmit={handleSubmit}>
          {isSignup && <label className="field-label">Full name<div className="input-wrap"><Icon name="UserRound" size={17}/><input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" required/></div></label>}
          <label className="field-label">Email address<div className="input-wrap"><Icon name="Mail" size={17}/><input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required/></div></label>
          <label className="field-label">Password<div className="input-wrap"><Icon name="LockKeyhole" size={17}/><input autoComplete={isSignup ? 'new-password' : 'current-password'} type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isSignup ? 'At least 8 characters' : 'Your password'} minLength={8} required/><button type="button" className="input-trailing-button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}><Icon name={showPassword ? 'EyeOff' : 'Eye'} size={17}/></button></div></label>
          {message && <div className="form-message"><Icon name="MailCheck" size={16}/>{message}</div>}
          <button type="submit" className="button button-primary button-block button-large" disabled={busy}>{busy ? <Icon name="LoaderCircle" className="spin" size={17}/> : null}{busy ? 'Please wait…' : isSignup ? 'Create free account' : 'Sign in securely'}<Icon name="ArrowRight" size={17}/></button>
        </form>
        <div className="auth-divider"><span/>or continue with<span/></div><button className="button button-google button-block" onClick={onGoogle} disabled={!configured && !import.meta.env.DEV}><Icon name="Chrome" size={18}/>{configured ? 'Continue with Google' : import.meta.env.DEV ? 'Try Google sign-in (preview)' : 'Google sign-in unavailable'}</button>
        {!configured && <p className="preview-warning"><Icon name="Info" size={14}/> {import.meta.env.DEV ? 'Preview mode: accounts are simulated until you connect Supabase.' : 'Account services are temporarily unavailable. The site owner needs to configure Supabase.'}</p>}
        <p className="auth-switch">{isSignup ? 'Already have an account?' : 'New to Fynvera?'} <button onClick={() => { onModeChange(isSignup ? 'signin' : 'signup'); setMessage(''); }}>{isSignup ? 'Sign in' : 'Create an account'}</button></p>
        <small className="auth-legal">By continuing, you agree to the site terms and privacy policy. Fynvera provides financial education, not personalized investment advice.</small>
      </section>
    </div>
  );
}

function SearchModal({ onClose, articles, onOpenArticle, onCategory }) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return articles.slice(0, 4);
    return articles.filter((article) => [article.title, article.excerpt, article.category, ...(article.keywords || [])].join(' ').toLowerCase().includes(normalized)).slice(0, 8);
  }, [query, articles]);
  return (
    <div className="modal-backdrop search-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="search-modal modal-card" role="dialog" aria-modal="true" aria-label="Search Fynvera"><div className="search-input-wrap"><Icon name="Search" size={20}/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search markets, money guides, calculators…"/><button className="icon-button" onClick={onClose} aria-label="Close search"><Icon name="X" size={18}/></button></div><div className="search-modal-results"><div className="search-results-label">{query ? `${results.length} matching insights` : 'POPULAR INSIGHTS'}</div>{results.map((article) => <button className="search-result" key={article.id} onClick={() => onOpenArticle(article)}><span className="search-result-icon"><Icon name="FileText" size={17}/></span><span><strong>{article.title}</strong><small>{article.category} · {article.readTime || 5} min read</small></span><Icon name="ArrowUpRight" size={17}/></button>)}{!results.length && <div className="search-empty"><Icon name="SearchX" size={24}/><strong>No results yet</strong><span>Try “investing”, “crypto”, or “saving”.</span></div>}</div><div className="search-topic-links"><span>Explore</span>{categories.slice(0, 5).map((category) => <button key={category.name} onClick={() => onCategory(category.name)}>{category.name}</button>)}</div></section></div>
  );
}

function CalculatorModal({ calculator, onClose, showToast }) {
  const [values, setValues] = useState({ principal: '10000', monthly: '300', rate: '7', years: '10', amount: '250000', down: '50000', mortgageRate: '6.5', term: '30', age: '30', retireAge: '65', monthlySave: '400', amountToConvert: '100', fromCurrency: 'USD', toCurrency: 'EUR', loanAmount: '12000', loanRate: '9.5', loanTerm: '36', goalAmount: '20000', goalSaved: '2500', goalMonths: '36', goalRate: '4', inflationRate: '3', inflationYears: '10', stockBuyPrice: '100', stockNowPrice: '125', stockShares: '10', stockFees: '5', entryPrice: '100', stopPrice: '90', targetPrice: '125', breakEvenPrice: '100', buyFeePercent: '0.2', sellFeePercent: '0.2' });
  const update = (key, value) => setValues((current) => ({ ...current, [key]: value }));
  const number = (key) => Math.max(0, Number(values[key]) || 0);
  const [referenceRates, setReferenceRates] = useState({ USD: 1 });
  const [referenceDate, setReferenceDate] = useState('');
  const [ratesStatus, setRatesStatus] = useState('loading');
  useEffect(() => {
    if (!calculator || calculator.id !== 'currency') return undefined;
    let active = true;
    fetch('https://api.frankfurter.dev/v2/rates?base=USD&quotes=EUR,GBP,LKR,JPY,AUD,CAD')
      .then((response) => { if (!response.ok) throw new Error('Reference exchange rates unavailable'); return response.json(); })
      .then((rows) => { if (!active) return; const rates = { USD: 1 }; (Array.isArray(rows) ? rows : []).forEach((row) => { rates[String(row.quote || '').toUpperCase()] = Number(row.rate); }); if (Object.keys(rates).length > 1) { setReferenceRates(rates); setReferenceDate(rows[0]?.date || ''); setRatesStatus('live'); } else setRatesStatus('fallback'); })
      .catch(() => { if (active) setRatesStatus('fallback'); });
    return () => { active = false; };
  }, [calculator?.id]);
  const money = (value, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);
  const calculated = useMemo(() => {
    if (!calculator || calculator.id === 'currency') {
      const rates = { USD: 1, EUR: 0.92, GBP: 0.78, LKR: 300, JPY: 149.5, AUD: 1.52, CAD: 1.36, ...referenceRates };
      return { result: number('amountToConvert') * (rates[values.toCurrency] || 1) / (rates[values.fromCurrency] || 1), label: 'Estimated converted amount', note: ratesStatus === 'live' ? `Reference rate date: ${referenceDate || 'latest available'}. Central-bank reference data can differ from provider fees and live dealing prices.` : 'Live reference rates could not be fetched; showing approximate fallback rates. Do not use this estimate for an actual transfer.', format: 'currency' };
    }
    if (calculator.id === 'mortgage') {
      const principal = Math.max(0, number('amount') - number('down'));
      const months = Math.max(1, number('term') * 12);
      const monthlyRate = number('mortgageRate') / 1200;
      const payment = monthlyRate === 0 ? principal / months : principal * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
      return { result: payment || 0, label: 'Estimated monthly payment', note: `Loan principal ${money(principal)} · excludes taxes, insurance and fees.` };
    }
    if (calculator.id === 'loan') {
      const principal = number('loanAmount'); const months = Math.max(1, number('loanTerm')); const rate = number('loanRate') / 1200;
      const payment = rate === 0 ? principal / months : principal * rate * Math.pow(1 + rate, months) / (Math.pow(1 + rate, months) - 1);
      return { result: payment || 0, label: 'Estimated monthly repayment', note: `Estimated total paid ${money((payment || 0) * months)}. Fees may change your total.` };
    }
    if (calculator.id === 'savings-goal') {
      const months = Math.max(1, number('goalMonths'));
      const rate = number('goalRate') / 1200;
      const futureSaved = number('goalSaved') * Math.pow(1 + rate, months);
      const growthFactor = rate === 0 ? months : (Math.pow(1 + rate, months) - 1) / rate;
      const monthlyNeeded = Math.max(0, number('goalAmount') - futureSaved) / Math.max(growthFactor, 1);
      return { result: monthlyNeeded, label: 'Estimated monthly saving needed', note: `Based on a ${number('goalRate')}% assumed annual return over ${months} months. Actual returns are not guaranteed.`, format: 'currency' };
    }
    if (calculator.id === 'inflation') {
      const years = number('inflationYears');
      const futureCost = number('principal') * Math.pow(1 + number('inflationRate') / 100, years);
      return { result: futureCost, label: 'Estimated future cost', note: `At ${number('inflationRate')}% annual inflation, today's amount would cost about ${money(futureCost / Math.pow(1 + number('inflationRate') / 100, years))} today; this is a scenario, not a forecast.`, format: 'currency' };
    }
    if (calculator.id === 'stock-return') {
      const initial = number('stockBuyPrice') * number('stockShares') + number('stockFees');
      const current = number('stockNowPrice') * number('stockShares');
      const gain = current - initial;
      const percent = initial > 0 ? gain / initial * 100 : 0;
      return { result: gain, label: 'Estimated profit / loss', note: `Approximate return: ${percent.toFixed(2)}% after the entered fees; excludes taxes and other costs.`, format: 'currency' };
    }
    if (calculator.id === 'risk-reward') {
      const entry = number('entryPrice'); const risk = Math.abs(entry - number('stopPrice')); const reward = Math.abs(number('targetPrice') - entry);
      return { result: risk > 0 ? reward / risk : 0, label: 'Potential reward-to-risk ratio', note: `Potential risk per unit: ${money(risk)} · potential reward per unit: ${money(reward)}. This is an arithmetic scenario, not a recommendation.`, format: 'ratio' };
    }
    if (calculator.id === 'break-even') {
      const price = number('breakEvenPrice'); const buyFee = number('buyFeePercent') / 100; const sellFee = number('sellFeePercent') / 100;
      const result = sellFee >= 1 ? 0 : (price * (1 + buyFee)) / (1 - sellFee);
      return { result, label: 'Estimated break-even sale price', note: `Includes entered buy and sell fee percentages. Spreads, taxes and slippage are not included.`, format: 'currency' };
    }
    const years = Math.max(0, number(calculator.id === 'retirement' ? 'retireAge' : 'years') - (calculator.id === 'retirement' ? number('age') : 0));
    const monthlyRate = number('rate') / 1200; const months = years * 12;
    const principal = calculator.id === 'retirement' ? 0 : number('principal');
    const contribution = calculator.id === 'retirement' ? number('monthlySave') : number('monthly');
    const startingGrowth = monthlyRate === 0 ? principal : principal * Math.pow(1 + monthlyRate, months);
    const contributionGrowth = monthlyRate === 0 ? contribution * months : contribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    return { result: startingGrowth + contributionGrowth, label: calculator.id === 'retirement' ? 'Illustrative retirement balance' : 'Potential future value', note: `Based on ${years} year(s), ${number('rate')}% annual return and regular monthly contributions. Returns are not guaranteed.` };
  // Values object is intentionally used for every calculator result so inputs recalculate immediately.
  }, [calculator, values]);
  if (!calculator) return null;
  const field = (label, key, unit = '$', step = 'any') => <label className="field-label" key={key}>{label}<div className="input-wrap"><span className="field-unit">{unit}</span><input type="number" min="0" step={step} value={values[key]} onChange={(event) => update(key, event.target.value)}/></div></label>;
  const currencyField = (label, key) => <label className="field-label">{label}<select className="select-field" value={values[key]} onChange={(event) => update(key, event.target.value)}>{['USD', 'EUR', 'GBP', 'LKR', 'JPY', 'AUD', 'CAD'].map((currency) => <option key={currency}>{currency}</option>)}</select></label>;
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="calculator-modal modal-card" role="dialog" aria-modal="true" aria-labelledby="calculator-modal-title"><button className="modal-close icon-button" onClick={onClose} aria-label="Close calculator"><Icon name="X" size={19}/></button><div className="calculator-modal-heading"><span className="calculator-modal-icon"><Icon name={calculator.icon} size={24}/></span><div><div className="eyebrow"><span/> FINANCIAL TOOL</div><h2 id="calculator-modal-title">{calculator.name}</h2><p>{calculator.description}</p></div></div>
      <div className="calculator-modal-body"><div className="calculator-fields">
        {calculator.id === 'compound' && <>{field('Initial investment', 'principal', '$')}{field('Monthly contribution', 'monthly', '$')}{field('Expected annual return', 'rate', '%')}{field('Time horizon', 'years', 'years', '1')}</>}
        {calculator.id === 'mortgage' && <>{field('Home price', 'amount', '$')}{field('Down payment', 'down', '$')}{field('Annual interest rate', 'mortgageRate', '%')}{field('Loan term', 'term', 'years', '1')}</>}
        {calculator.id === 'retirement' && <>{field('Current age', 'age', 'years', '1')}{field('Retirement age', 'retireAge', 'years', '1')}{field('Monthly contribution', 'monthlySave', '$')}{field('Expected annual return', 'rate', '%')}</>}
        {calculator.id === 'currency' && <>{field('Amount', 'amountToConvert', '')}{currencyField('From currency', 'fromCurrency')}{currencyField('To currency', 'toCurrency')}</>}
        {calculator.id === 'loan' && <>{field('Loan balance', 'loanAmount', '$')}{field('Annual interest rate', 'loanRate', '%')}{field('Repayment term', 'loanTerm', 'months', '1')}</>}
        {calculator.id === 'savings-goal' && <>{field('Target amount', 'goalAmount', '$')}{field('Current savings', 'goalSaved', '$')}{field('Months to target', 'goalMonths', 'months', '1')}{field('Assumed annual return', 'goalRate', '%')}</>}
        {calculator.id === 'inflation' && <>{field('Amount today', 'principal', '$')}{field('Annual inflation', 'inflationRate', '%')}{field('Years ahead', 'inflationYears', 'years', '1')}</>}
        {calculator.id === 'stock-return' && <>{field('Purchase price per share', 'stockBuyPrice', '$')}{field('Current price per share', 'stockNowPrice', '$')}{field('Number of shares', 'stockShares', 'shares', '1')}{field('Fees paid', 'stockFees', '$')}</>}
        {calculator.id === 'risk-reward' && <>{field('Entry price', 'entryPrice', '$')}{field('Stop-loss price', 'stopPrice', '$')}{field('Target price', 'targetPrice', '$')}</>}
        {calculator.id === 'break-even' && <>{field('Purchase price', 'breakEvenPrice', '$')}{field('Buy fee', 'buyFeePercent', '%')}{field('Sell fee', 'sellFeePercent', '%')}</>}
      </div><div className="calculator-result-card"><span className="result-label"><Icon name="Sparkles" size={15}/>{calculated.label}</span><strong>{calculated.format === 'ratio' ? `${calculated.result.toFixed(2)} : 1` : money(calculated.result, calculator.id === 'currency' ? values.toCurrency : 'USD')}</strong><p>{calculated.note}</p>{calculator.id === 'currency' && <small className={`reference-rate-status ${ratesStatus === 'live' ? 'positive' : 'negative'}`}>{ratesStatus === 'live' ? `Live daily reference rates · ${referenceDate}` : ratesStatus === 'loading' ? 'Loading free reference rates…' : 'Fallback rates in use'}</small>}<div className="result-foot"><Icon name="ShieldCheck" size={15}/> Free · Private preview · No financial account connection</div></div></div>
      <div className="calculator-modal-footer"><span><Icon name="Info" size={14}/> Estimates are educational, not financial advice.</span><button className="button button-primary" onClick={() => { showToast('Your calculator inputs are ready to save in Workspace settings.', 'success'); onClose(); }}>Done <Icon name="Check" size={16}/></button></div></section></div>
  );
}

function NewsInsightsWorkspace({ articles, onOpenArticle, onToggleWatch, watchlist, onNavigate }) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const allFilters = ['All', ...categories.map((item) => item.name)];
  const query = search.trim().toLowerCase();
  const results = articles.filter((article) => article.contentType !== 'topic' && (filter === 'All' || article.category === filter) && [article.title, article.excerpt, article.category, article.subcategory, ...(article.keywords || [])].join(' ').toLowerCase().includes(query));
  return <>
    <div className="workspace-welcome"><div><div className="eyebrow"><span/> EDITORIAL LIBRARY</div><h1>News & Insights</h1><p>Browse published stories. To publish, edit, or manage drafts, open <strong>Author Profile → Publish Article</strong>.</p></div><span className="data-pill"><Icon name="BookOpen" size={14}/> Published stories</span></div>
    <label className="news-insights-search workspace-news-search"><Icon name="Search" size={18}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search published headlines and keywords…" aria-label="Search workspace articles"/></label>
    <div className="news-filter-row news-filter-row-all" aria-label="Filter articles by category">{allFilters.map((item) => <button key={item} className={filter === item ? 'news-filter-active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div>
    <div className="news-insights-result-label"><span>{results.length} {results.length === 1 ? 'story' : 'stories'}</span><span>Published archive · Drafts stay under Publish Article</span></div>
    {results.length ? <div className="news-insights-grid">{results.map((article) => <ArticleCard key={article.id} article={article} onOpen={onOpenArticle} onToggleWatch={onToggleWatch} watched={watchlist.includes(article.id)}/>)}</div> : <div className="empty-state"><Icon name="SearchX" size={27}/><strong>No published stories found.</strong><span>Try another category or search term.</span><button className="button button-outline" onClick={() => { setFilter('All'); setSearch(''); }}>Clear filters</button></div>}
  </>;
}

// The dedicated article studio owns the draft/edit/publish lifecycle; it writes only columns in the existing Supabase schema.
function PublishArticleWorkspace({ user, onPublish, onDeleteArticle, onOpenArticle, showToast, articles }) {
  const [editor, setEditor] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('Investing');
  const [subcategory, setSubcategory] = useState(categories.find((item) => item.name === 'Investing').subcategories[0]);
  const [body, setBody] = useState('');
  const [keywords, setKeywords] = useState('investing, finance, money');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [articleStatus, setArticleStatus] = useState('published');
  const [contentType, setContentType] = useState('news_insights');
  const [draggingImage, setDraggingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ownedArticles, setOwnedArticles] = useState([]);
  const [listFilter, setListFilter] = useState('All');
  const [listSearch, setListSearch] = useState('');
  const localKey = `author-articles-${user?.id || 'unknown'}`;

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    const loadOwned = async () => {
      if (supabase && !user.demo && isUuid(user.id)) {
        const { data, error } = await supabase.from('articles').select('id,title,summary,article_body,category,subcategory,seo_keywords,image_url,created_at,updated_at,user_id,status,content_type').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200);
        if (!active) return;
        if (error) { showToast(`Your article library could not load: ${error.message}`, 'error'); return; }
        setOwnedArticles((data || []).map((row) => mapDatabaseArticle(row, user)));
      } else {
        const saved = loadLocal(localKey, []);
        if (active) setOwnedArticles(Array.isArray(saved) ? saved : []);
      }
    };
    loadOwned().catch((error) => { if (active) showToast(error.message || 'Your article library could not load.', 'error'); });
    return () => { active = false; };
  }, [user?.id]);

  const resetEditor = () => {
    setEditor(false); setEditingArticle(null); setTitle(''); setExcerpt(''); setCategory('Investing');
    setSubcategory(categories.find((item) => item.name === 'Investing').subcategories[0]);
    setBody(''); setKeywords('investing, finance, money'); setImageFile(null); setImagePreview(''); setArticleStatus('published'); setContentType('news_insights'); setDraggingImage(false);
  };
  const changeImage = (file) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { showToast('Use a PNG, JPG or WebP image.', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('Choose an article image smaller than 5 MB.', 'error'); return; }
    setImageFile(file);
    // Preview the selected file locally. It is only uploaded to Supabase when Save/Publish is pressed.
    const reader = new FileReader(); reader.onload = () => setImagePreview(String(reader.result)); reader.readAsDataURL(file);
  };
  const startEdit = (article) => {
    setEditingArticle(article); setTitle(article.title || ''); setExcerpt(article.excerpt || '');
    setCategory(article.category || 'Investing'); setSubcategory(article.subcategory || categories.find((item) => item.name === 'Investing').subcategories[0]);
    setBody(Array.isArray(article.body) ? article.body.join('\n\n') : String(article.body || ''));
    setKeywords((article.keywords || []).join(', ')); setImageFile(null); setImagePreview(article.image || ''); setArticleStatus(article.status || 'published'); setContentType(article.contentType || 'news_insights'); setEditor(true);
    window.setTimeout(() => document.getElementById('fynvera-article-studio')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };
  const saveArticle = async (nextStatus, event) => {
    event?.preventDefault();
    if (!title.trim() || !excerpt.trim() || !body.trim()) { showToast('Add a headline, summary and article body first.', 'error'); return; }
    if (title.trim().length < 8) { showToast('Use a clear, descriptive headline of at least 8 characters.', 'error'); return; }
    setSaving(true);
    const result = await onPublish({ id: editingArticle?.id, createdAt: editingArticle?.createdAt, title, excerpt, category, subcategory, body: body.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean), keywords: keywords.split(',').map((item) => item.trim()).filter(Boolean), imageFile, imagePreview, status: nextStatus, contentType });
    setSaving(false);
    if (!result?.ok) { showToast(result?.message || 'Article could not be saved.', 'error'); return; }
    const savedArticle = result.article;
    if (savedArticle) {
      setOwnedArticles((current) => {
        const next = [savedArticle, ...current.filter((article) => article.id !== savedArticle.id)];
        if (!supabase || user?.demo) saveLocal(localKey, next);
        return next;
      });
    }
    showToast(result.message || (nextStatus === 'draft' ? 'Draft saved.' : 'Article published.'), 'success');
    resetEditor();
  };
  const deleteOwnedArticle = async (article) => {
    if (!window.confirm(`Delete “${article.title}”? This cannot be undone.`)) return;
    const result = await onDeleteArticle(article);
    if (!result?.ok) { showToast(result?.message || 'Article could not be deleted.', 'error'); return; }
    setOwnedArticles((current) => {
      const next = current.filter((item) => item.id !== article.id);
      if (!supabase || user?.demo) saveLocal(localKey, next);
      return next;
    });
    if (editingArticle?.id === article.id) resetEditor();
    showToast('Article deleted.', 'success');
  };
  const filteredArticles = ownedArticles.filter((article) => (listFilter === 'All' || (article.status || 'published') === listFilter.toLowerCase()) && [article.title, article.excerpt, article.category, ...(article.keywords || [])].join(' ').toLowerCase().includes(listSearch.trim().toLowerCase()));

  return <>
    <div className="workspace-welcome"><div><div className="eyebrow"><span/> AUTHOR STUDIO</div><h1>{editingArticle ? 'Edit article' : 'Publish an Article'}</h1><p>Write, save drafts, edit or delete your own stories. Published articles appear in the public News & Insights feed.</p></div><button className="button button-primary" onClick={() => { resetEditor(); setEditor(true); }}><Icon name="Plus" size={16}/> New article</button></div>
    <div className="article-studio-intro"><div><span className="studio-intro-icon"><Icon name="FileText" size={22}/></span><div><strong>Your editorial workspace</strong><p>Drafts remain private. Only published articles show on the public site. Images can be selected or dragged into the upload area.</p></div></div><span className="data-pill"><Icon name="ShieldCheck" size={14}/> AUTHOR-OWNED CONTENT</span></div>
    {editor && <section className="panel article-editor-panel article-studio-editor" id="fynvera-article-studio"><div className="editor-panel-heading"><div><span className="eyebrow"><span/> {editingArticle ? 'UPDATE STORY' : articleStatus === 'draft' ? 'PRIVATE DRAFT' : 'NEW STORY'}</span><h2>{editingArticle ? 'Improve your insight' : 'Create an insight'}</h2><p>Use a clear title, a useful summary, readable paragraphs and relevant SEO keywords.</p></div><div className="editor-image-preview">{imagePreview ? <img src={imagePreview} alt="Article image preview"/> : <><Icon name="ImagePlus" size={25}/><span>ARTICLE IMAGE</span></>}</div></div>
      <form className="article-editor-form" onSubmit={(event) => saveArticle(articleStatus, event)}><div className="editor-form-main">
        <label className="field-label">Article headline<input className="plain-field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Write a clear, useful headline" maxLength={120} required/></label>
        <label className="field-label">Short summary<textarea className="plain-field" value={excerpt} onChange={(event) => setExcerpt(event.target.value)} placeholder="What will readers learn? (140–220 characters works well)" rows={3} maxLength={320} required/></label>
        <div className="editor-form-two"><label className="field-label">Category<select className="select-field" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item.name}>{item.name}</option>)}</select></label><label className="field-label">Subcategory<select className="select-field" value={subcategory} onChange={(event) => setSubcategory(event.target.value)}>{(categories.find((item) => item.name === category)?.subcategories || []).map((item) => <option key={item}>{item}</option>)}</select></label></div><label className="field-label">Publish destination<select className="select-field" value={contentType} onChange={(event) => setContentType(event.target.value)}><option value="news_insights">News & Insights feed</option><option value="topic">Category page only</option></select><small>Choose News & Insights for newsroom filters; choose Category page only to keep the story off the News & Insights feed.</small></label>
        <label className="field-label">Article body<textarea className="plain-field article-body-input" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write your article here. Separate paragraphs with a blank line. Use meaningful subheadings and cite reliable sources when needed." rows={12} required/></label>
        <label className="field-label">SEO keywords <small>(comma separated)</small><input className="plain-field" value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="investing, finance news, wealth building"/></label>
      </div><div className="editor-form-aside">
        <label className={`image-upload-zone ${draggingImage ? 'image-upload-zone-dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDraggingImage(true); }} onDragLeave={(event) => { event.preventDefault(); setDraggingImage(false); }} onDrop={(event) => { event.preventDefault(); setDraggingImage(false); changeImage(event.dataTransfer.files?.[0]); }}><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => changeImage(event.target.files?.[0])}/><Icon name="CloudUpload" size={26}/><strong>{draggingImage ? 'Drop image here' : imageFile ? imageFile.name : imagePreview ? 'Image selected' : 'Add article image'}</strong><span>Drag & drop, or click to browse</span><small>PNG, JPG or WebP · maximum 5 MB. The file is sent only when you save or publish.</small></label>
        <div className="seo-preview"><div className="seo-preview-label"><Icon name="Search" size={15}/> SEARCH PREVIEW</div><strong>{title || 'Your article headline'} | Fynvera</strong><span>fynvera-finance-site.vercel.app › insights › {slugify(title) || 'your-article'}</span><p>{excerpt || 'Add a useful article description for search results and social previews.'}</p><small>Tip: use your main keyword naturally in the headline, summary, first paragraph and headings.</small></div>
        <div className="editor-checklist"><strong><Icon name="ClipboardCheck" size={16}/> Before publishing</strong><span><Icon name="CheckCircle2" size={14}/> Clear title and summary</span><span><Icon name="CheckCircle2" size={14}/> Helpful, original content</span><span><Icon name="CheckCircle2" size={14}/> Relevant image and alt text</span><span><Icon name="CheckCircle2" size={14}/> Educational disclaimer</span></div>
      </div><div className="editor-actions"><button type="button" className="button button-outline" onClick={resetEditor}>Cancel</button><button type="button" className="button button-soft" disabled={saving} onClick={(event) => saveArticle('draft', event)}><Icon name="FileEdit" size={16}/> Save draft</button><button type="button" className="button button-primary" disabled={saving} onClick={(event) => saveArticle('published', event)}>{saving ? <Icon name="LoaderCircle" className="spin" size={16}/> : <Icon name="Send" size={16}/>} {saving ? 'Saving…' : editingArticle ? 'Save changes & publish' : 'Publish article'} <Icon name="ArrowRight" size={16}/></button></div></form>
    </section>}
    <section className="article-library-section"><div className="editorial-toolbar"><div><strong>{ownedArticles.length} of your articles</strong><span>Published stories and private drafts</span></div><div className="article-library-controls"><input className="plain-field" value={listSearch} onChange={(event) => setListSearch(event.target.value)} placeholder="Search your articles" aria-label="Search your articles"/><select className="select-field" value={listFilter} onChange={(event) => setListFilter(event.target.value)} aria-label="Filter article status"><option>All</option><option>Published</option><option>Draft</option></select></div></div>
      {filteredArticles.length ? <div className="manage-article-list">{filteredArticles.map((article) => <div className="manage-article-row" key={article.id}><ImageSlot id={article.imageId || 'IMG-ARTICLE-CUSTOM'} src={article.image} alt={article.title} compact/><div className="manage-article-copy"><span className={`article-status ${article.status === 'draft' ? 'article-status-draft' : ''}`}><i/> {(article.status || 'published').toUpperCase()} · {article.category}{articleWasEdited(article) ? ' · EDITED' : ''}</span><button onClick={() => article.status === 'draft' ? startEdit(article) : onOpenArticle(article)}><strong>{article.title}</strong></button><small>{formatDate(article.date)} · {article.readTime || 5} min read · {articleWasEdited(article) ? 'Edited recently' : 'Created'} </small></div><div className="manage-article-actions">{article.status !== 'draft' && <button className="button button-soft button-small" onClick={() => onOpenArticle(article)}>Preview <Icon name="ArrowUpRight" size={14}/></button>}<button className="button button-outline button-small" onClick={() => startEdit(article)}><Icon name="Pencil" size={14}/> Edit</button><button className="button button-danger-soft button-small" onClick={() => deleteOwnedArticle(article)}><Icon name="Trash2" size={14}/> Delete</button></div></div>)}</div> : <div className="empty-state"><Icon name="FileText" size={27}/><strong>No articles in this view yet.</strong><span>Your published articles and saved drafts will appear here.</span><button className="button button-primary" onClick={() => { resetEditor(); setEditor(true); }}>Write your first article</button></div>}
    </section>
  </>;
}

function WorkspaceSidebar({ active, collapsed, onToggle, onNavigate, user, mobileOpen, onCloseMobile }) {
  return (
    <aside className={`workspace-sidebar ${collapsed ? 'workspace-sidebar-collapsed' : ''} ${mobileOpen ? 'workspace-sidebar-mobile-open' : ''}`}>
      <div className="workspace-brand-row"><Brand onClick={() => onNavigate('Dashboard')}/><button className="icon-button sidebar-collapse" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Minimize sidebar'}><Icon name={collapsed ? 'PanelLeftOpen' : 'PanelLeftClose'} size={18}/></button><button className="icon-button sidebar-mobile-close" onClick={onCloseMobile} aria-label="Close workspace navigation"><Icon name="X" size={18}/></button></div>
      <div className="workspace-user-mini"><span className="avatar avatar-medium">{user?.avatar ? <img src={user.avatar} alt=""/> : (user?.name || user?.email || 'U').slice(0, 1).toUpperCase()}</span><div><strong>{user?.name || 'Your workspace'}</strong><small>{user?.email || 'Preview account'}</small></div><span className="user-status-dot"/></div>
      <div className="sidebar-section-label">WORKSPACE</div>
      <nav className="workspace-nav" aria-label="Workspace navigation">{workspaceItems.map((item) => <button key={item.label} title={collapsed ? item.label : undefined} className={`workspace-nav-link ${active === item.label ? 'workspace-nav-active' : ''} ${item.special ? 'workspace-nav-logout' : ''} ${item.subItem ? 'workspace-nav-link-subitem' : ''}`} onClick={() => { onNavigate(item.label); onCloseMobile(); }}><Icon name={item.icon} size={19}/><span>{item.label}</span>{active === item.label && <i className="nav-active-indicator"/>}</button>)}</nav>
      <div className="sidebar-bottom-card"><div className="sidebar-bottom-icon"><Icon name="Sparkles" size={17}/></div><strong>Small steps add up.</strong><p>Learn a new money concept this week.</p><button onClick={() => onNavigate('Education')}>Explore learning <Icon name="ArrowRight" size={14}/></button></div>
      <div className="sidebar-footer"><span className="privacy-dot"/> {collapsed ? 'Private' : 'Your space, your pace'}</div>
    </aside>
  );
}

function WorkspaceContent({ page, user, articles, watchlist, marketWatchlist, portfolio, profile, onProfileChange, onAvatarChange, onAddHolding, onRemoveHolding, onMarketWatchChange, onToggleWatch, onOpenArticle, onPublish, onEditArticle, onDeleteArticle, onCalculator, onAuth, onCategory, showToast, cryptoPrices = {}, cryptoStatus = 'connecting', marketQuotes = {}, marketCatalog = [], marketStatus = 'connecting', marketFetchedAt = null }) {
  const [holdingSymbol, setHoldingSymbol] = useState('VOO');
  const [holdingType, setHoldingType] = useState('ETF');
  const [holdingAmount, setHoldingAmount] = useState('1500');
  const [holdingCost, setHoldingCost] = useState('1400');
  const [saving, setSaving] = useState(false);
  const [profileDraft, setProfileDraft] = useState(profile);
  const [riskLevel, setRiskLevel] = useState(profile.riskLevel || 'Moderate');
  useEffect(() => { setProfileDraft(profile); setRiskLevel(profile.riskLevel || 'Moderate'); }, [profile]);
  const updateProfileField = (key, value) => setProfileDraft((current) => ({ ...current, [key]: value }));
  const saveCurrentProfile = () => { onProfileChange({ ...profileDraft, riskLevel }); showToast('Profile preferences saved.', 'success'); };
  const portfolioValue = portfolio.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const latestItems = articles.filter((article) => article.contentType !== 'topic').slice(0, 3);

  return (
    <div className="workspace-content fade-in">
      <div className="workspace-topline"><div className="workspace-breadcrumb"><span>FYNVERA WORKSPACE</span><Icon name="ChevronRight" size={14}/><strong>{page}</strong></div><div className="workspace-top-actions"><span className="workspace-secure"><Icon name="ShieldCheck" size={14}/> Personal space</span><button className="icon-button" title="Notifications" onClick={() => showToast('You are all caught up.', 'info')}><Icon name="Bell" size={18}/></button><button className="button button-primary button-small" onClick={() => onAuth('signup')}><Icon name="Plus" size={15}/> Add account</button></div></div>
      {page === 'Dashboard' && <>
        <div className="workspace-welcome"><div><div className="eyebrow"><span/> YOUR FINANCIAL HOME</div><h1>Good to see you, {(user?.name || 'investor').split(' ')[0]}.</h1><p>A calm place to keep track of what you are learning and working toward.</p></div><div className="welcome-date"><Icon name="CalendarDays" size={16}/>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div></div>
        <div className="demo-banner"><Icon name="Info" size={17}/><div><strong>{isSupabaseConfigured ? 'Your Supabase connection is configured.' : 'You are viewing a free preview workspace.'}</strong><span>{isSupabaseConfigured ? 'Saved data depends on your account permissions and database policies.' : 'Your demo profile, reading list and portfolio notes stay in this browser. Connect a free Supabase project for secure multi-device accounts.'}</span></div><button onClick={() => onCategory('Education')}>Learn how it works <Icon name="ArrowRight" size={14}/></button></div>
        <div className="dashboard-summary-grid"><div className="summary-card summary-card-highlight"><div className="summary-card-top"><span>TRACKED PORTFOLIO</span><span className="summary-icon"><Icon name="Wallet" size={18}/></span></div><strong>{formatMoney(portfolioValue)}</strong><small><Icon name="Info" size={13}/> Values you entered manually</small><button onClick={() => onCategory('Personal Finance')}>Keep your plan in view <Icon name="ArrowRight" size={14}/></button></div><div className="summary-card"><div className="summary-card-top"><span>SAVED INSIGHTS</span><span className="summary-icon"><Icon name="Bookmark" size={18}/></span></div><strong>{watchlist.length.toString().padStart(2, '0')} <small>articles</small></strong><small>Ideas to read or revisit later</small><button onClick={() => onCategory('Education')}>Keep learning <Icon name="ArrowRight" size={14}/></button></div><div className="summary-card"><div className="summary-card-top"><span>WATCHLIST</span><span className="summary-icon"><Icon name="Eye" size={18}/></span></div><strong>{marketWatchlist.length.toString().padStart(2, '0')} <small>markets</small></strong><small>Examples saved for tracking</small><button onClick={() => onCategory('Stock Market')}>Explore markets <Icon name="ArrowRight" size={14}/></button></div><div className="summary-card"><div className="summary-card-top"><span>FINANCE HABIT</span><span className="summary-icon"><Icon name="CalendarCheck" size={18}/></span></div><strong>1 <small>next step</small></strong><small>Choose one small action this week</small><button onClick={() => onCategory('Personal Finance')}>Set your next step <Icon name="ArrowRight" size={14}/></button></div></div>
        <div className="workspace-main-grid"><section className="panel workspace-table-panel"><div className="panel-heading"><div><h3>Your portfolio notes</h3><p>Manual entries · Not synced with a broker</p></div><button className="text-link text-link-small" onClick={() => onNavigateSafe('My Portfolio')}>View portfolio <Icon name="ArrowRight" size={14}/></button></div><PortfolioTable portfolio={portfolio.slice(0, 4)} onRemove={onRemoveHolding}/></section><section className="panel dashboard-side-panel"><div className="panel-heading"><div><h3>Keep moving forward</h3><p>Simple actions for your money journey</p></div><span className="heading-icon"><Icon name="Compass" size={19}/></span></div><div className="quick-action-list"><button onClick={() => onNavigateSafe('My Portfolio')}><span className="quick-action-icon"><Icon name="BriefcaseBusiness" size={17}/></span><span><strong>Review your portfolio notes</strong><small>Update values and goals</small></span><Icon name="ArrowUpRight" size={16}/></button><button onClick={() => onCalculator('compound')}><span className="quick-action-icon"><Icon name="Calculator" size={17}/></span><span><strong>Try a calculator</strong><small>Explore future scenarios</small></span><Icon name="ArrowUpRight" size={16}/></button><button onClick={() => onNavigateSafe('News & Insights')}><span className="quick-action-icon"><Icon name="BookOpenText" size={17}/></span><span><strong>Read your next insight</strong><small>Short, practical explainers</small></span><Icon name="ArrowUpRight" size={16}/></button></div></section></div>
        <section className="workspace-latest-section"><SectionTitle eyebrow="FRESH PERSPECTIVES" title="A few ideas worth your time" actionLabel="All insights" onAction={() => onNavigateSafe('News & Insights')}/><div className="workspace-article-grid">{latestItems.map((article) => <ArticleCard key={article.id} article={article} onOpen={onOpenArticle} onToggleWatch={onToggleWatch} watched={watchlist.includes(article.id)}/>)}</div></section>
      </>}
      {page === 'My Portfolio' && <><div className="workspace-welcome"><div><div className="eyebrow"><span/> YOUR TRACKER</div><h1>My Portfolio</h1><p>Keep a simple record of holdings, goals and the notes that matter to you.</p></div><button className="button button-primary" onClick={() => onCalculator('compound')}><Icon name="Calculator" size={16}/> Growth calculator</button></div><div className="portfolio-total-card"><div><span>MANUALLY TRACKED VALUE</span><strong>{formatMoney(portfolioValue)}</strong><small>Enter values yourself; no brokerage is connected.</small></div><div className="portfolio-chart-art"><svg viewBox="0 0 320 95"><path d="M0 80 C30 70 45 81 68 58 S100 67 128 45 S157 52 183 31 S220 38 241 20 S286 26 320 4" fill="none" stroke="#22d6e7" strokeWidth="3" strokeLinecap="round"/><path d="M0 80 C30 70 45 81 68 58 S100 67 128 45 S157 52 183 31 S220 38 241 20 S286 26 320 4 L320 95 L0 95 Z" fill="#22d6e7" opacity=".11"/></svg><small>Illustrative line, not performance history</small></div></div><div className="portfolio-work-grid"><section className="panel workspace-table-panel"><div className="panel-heading"><div><h3>Holdings & notes</h3><p>Update values when you review your finances.</p></div><span className="heading-icon"><Icon name="BriefcaseBusiness" size={19}/></span></div><PortfolioTable portfolio={portfolio} onRemove={onRemoveHolding}/></section><section className="panel holding-form-panel"><h3><Icon name="PlusCircle" size={19}/> Add a holding</h3><p>Record a stock, ETF, fund, savings goal or any asset for personal reference.</p><form className="form-stack" onSubmit={(event) => { event.preventDefault(); onAddHolding({ symbol: holdingSymbol.toUpperCase(), type: holdingType, value: Number(holdingAmount), cost: Number(holdingCost) }); setHoldingSymbol(''); showToast('Portfolio note added.', 'success'); }}><label className="field-label">Asset / symbol<input className="plain-field" value={holdingSymbol} onChange={(event) => setHoldingSymbol(event.target.value)} placeholder="e.g. VOO" required/></label><label className="field-label">Type<select className="select-field" value={holdingType} onChange={(event) => setHoldingType(event.target.value)}>{['Stock', 'ETF', 'Crypto', 'Fund', 'Savings', 'Property', 'Other'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="field-label">Current value (USD)<input className="plain-field" type="number" min="0" step="0.01" value={holdingAmount} onChange={(event) => setHoldingAmount(event.target.value)} required/></label><label className="field-label">Your cost basis (USD)<input className="plain-field" type="number" min="0" step="0.01" value={holdingCost} onChange={(event) => setHoldingCost(event.target.value)} required/></label><button className="button button-primary button-block" type="submit"><Icon name="Plus" size={16}/> Add to my portfolio</button></form></section></div></>}
      {page === 'Watchlist' && <><div className="workspace-welcome"><div><div className="eyebrow"><span/> KEEP AN EYE ON WHAT MATTERS</div><h1>Your Watchlist</h1><p>Save articles and track example markets worth following.</p></div><button className="button button-primary" onClick={() => onCategory('Stock Market')}><Icon name="Plus" size={16}/> Discover more</button></div><div className="watchlist-market-grid">{markets.map((item) => { const saved = marketWatchlist.includes(item.symbol); const cryptoCoin = BINANCE_COINS.find((coin) => coin.symbol === item.symbol); const liveTicker = cryptoCoin ? cryptoPrices[`${cryptoCoin.symbol}USDT`] : null; const instrument = findLiveMarketInstrument(item.symbol); const marketRow = instrument ? liveMarketRow(instrument, marketQuotes, marketStatus) : null; const liveChange = Number(liveTicker?.priceChangePercent ?? 0); const shownValue = liveTicker ? `$${formatCryptoPrice(liveTicker.lastPrice)}` : marketRow ? (marketRow.value === 'Loading…' || marketRow.value === 'No quote' ? marketRow.value : `${marketRow.currencyPrefix || ''}${marketRow.value}`) : 'No quote'; const shownChange = liveTicker ? formatCryptoChange(liveChange) : marketRow?.change || '—'; const shownPositive = liveTicker ? liveChange >= 0 : Boolean(marketRow?.positive); const freshness = liveTicker ? (cryptoStatus === 'live' ? 'Live Binance Spot · USDT' : 'Binance snapshot · reconnecting') : marketRow?.isLive ? `Live biquote · ${marketRow.source || 'market data'}` : marketRow?.marketState === 'closed' ? 'Market closed · last quote' : marketRow?.stale ? 'Last quote · stale' : 'Live quote unavailable'; return <div key={item.symbol} className="watchlist-market-card"><div className="watch-market-top"><span className="market-symbol" style={{ '--symbol-color': item.color }}>{item.symbol.slice(0, 1)}</span><button className={`icon-button ${saved ? 'icon-button-on' : ''}`} onClick={() => { const next = saved ? marketWatchlist.filter((symbol) => symbol !== item.symbol) : [...marketWatchlist, item.symbol]; onMarketWatchChange(next); showToast(saved ? `${item.name} removed from watchlist.` : `${item.name} added to watchlist.`, 'success'); }}>{saved ? <Icon name="Star" size={17} fill="currentColor"/> : <Icon name="Star" size={17}/>}</button></div><strong>{item.name}</strong><div className="watch-market-value">{shownValue}</div><span className={`market-change ${shownPositive ? 'positive' : 'negative'}`}><Icon name={shownPositive ? 'TrendingUp' : 'TrendingDown'} size={14}/>{shownChange}</span><div className="tiny-sparkline"><svg viewBox="0 0 180 42"><path d="M0 35 L18 30 L34 34 L48 20 L63 25 L81 16 L96 20 L112 9 L130 16 L148 6 L180 4" fill="none" stroke={item.color} strokeWidth="2.5" strokeLinecap="round"/></svg></div><small>{freshness}</small></div>; })}</div><section className="workspace-latest-section"><SectionTitle eyebrow="SAVED ARTICLES" title="Read again when you're ready"/><div className="workspace-article-grid">{articles.filter((article) => watchlist.includes(article.id)).map((article) => <ArticleCard key={article.id} article={article} onOpen={onOpenArticle} onToggleWatch={onToggleWatch} watched/>)}</div>{!articles.some((article) => watchlist.includes(article.id)) && <div className="empty-state"><Icon name="Bookmark" size={26}/><strong>Your reading list is waiting.</strong><span>Save an article using its bookmark icon and it will appear here.</span><button className="button button-outline" onClick={() => onNavigateSafe('News & Insights')}>Explore insights</button></div>}</section></>}
      {page === 'News & Insights' && <NewsInsightsWorkspace articles={articles} onOpenArticle={onOpenArticle} onToggleWatch={onToggleWatch} watchlist={watchlist} onNavigate={onNavigateSafe} />}
      {page === 'Markets' && <><div className="workspace-welcome"><div><div className="eyebrow"><span/> MARKET MONITOR</div><h1>Markets</h1><p>Live cryptocurrency prices from Binance and keyless live FX, metals, index and supported stock-CFD quotes.</p></div><span className="data-pill"><i/> LIVE FEEDS · NO API KEY</span></div><MarketPanel cryptoPrices={cryptoPrices} cryptoStatus={cryptoStatus} marketQuotes={marketQuotes} marketCatalog={marketCatalog} marketStatus={marketStatus} marketFetchedAt={marketFetchedAt} onOpenMarkets={() => showToast('Crypto uses Binance public spot data; other instruments use the free biquote feed. Closed or unsupported markets are labelled instead of displaying sample prices.', 'info')}/><div className="market-explainer-grid"><div className="panel"><Icon name="BookOpenText" size={22}/><h3>Understand the numbers</h3><p>Price, percentage change, market cap and volume describe different parts of a market. Compare like with like before drawing conclusions.</p></div><div className="panel"><Icon name="ShieldCheck" size={22}/><h3>Know the risks</h3><p>Quotes can become stale or markets may close. The screen labels closed/unavailable data; verify critical prices with your broker or exchange before making a decision.</p></div><div className="panel"><Icon name="Search" size={22}/><h3>Do your own research</h3><p>Use issuer filings, official economic releases and regulated sources to validate important financial information.</p></div></div></>}
      {page === 'Tools & Calculators' && <><div className="workspace-welcome"><div><div className="eyebrow"><span/> FREE FINANCIAL TOOLS</div><h1>Tools & Calculators</h1><p>Try scenarios with ten helpful calculators. Change the assumptions to learn how the result moves.</p></div><span className="data-pill"><Icon name="Zap" size={14}/> NO API REQUIRED</span></div><div className="all-calculators-grid">{calculatorList.map((calculator) => <button key={calculator.id} className="large-calculator-card" onClick={() => onCalculator(calculator.id)}><span className="large-calculator-icon"><Icon name={calculator.icon} size={23}/></span><strong>{calculator.name}</strong><p>{calculator.description}</p><span className="calculator-open-link">Open calculator <Icon name="ArrowUpRight" size={15}/></span></button>)}</div><div className="calculator-disclaimer"><Icon name="Info" size={17}/><span>Outputs are estimates based on the values you enter. Currency conversion uses free daily reference rates when available, not a bank dealing quote. No calculators connect to a financial institution.</span></div></>}
      {page === 'Settings' && <><div className="workspace-welcome"><div><div className="eyebrow"><span/> MAKE IT YOURS</div><h1>Account settings</h1><p>Update your display profile, financial preferences and personal planning details.</p></div><span className="data-pill"><Icon name="LockKeyhole" size={14}/> {isSupabaseConfigured ? 'ACCOUNT CONNECTED' : 'LOCAL PREVIEW'}</span></div><div className="settings-layout"><section className="panel settings-profile-panel"><div className="panel-heading"><div><h3>Profile information</h3><p>Choose how your workspace looks to you.</p></div><span className="heading-icon"><Icon name="UserRound" size={19}/></span></div><div className="profile-avatar-editor"><span className="avatar avatar-large">{user?.avatar ? <img src={user.avatar} alt="Profile"/> : (profileDraft.name || user?.email || 'U').slice(0, 1).toUpperCase()}</span><div><strong>{profileDraft.name || user?.name || 'Fynvera member'}</strong><small>{user?.email || 'Preview user'}</small><label className="button button-soft button-small avatar-upload-button"><Icon name="Camera" size={14}/> Change profile picture<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { if (event.target.files?.[0]) onAvatarChange(event.target.files[0]); }}/></label></div></div><div className="settings-form-grid"><label className="field-label">Display name<input className="plain-field" value={profileDraft.name || ''} onChange={(event) => updateProfileField('name', event.target.value)} placeholder="Your name"/></label><label className="field-label">Location / country<input className="plain-field" value={profileDraft.country || ''} onChange={(event) => updateProfileField('country', event.target.value)} placeholder="Country (optional)"/></label><label className="field-label">Preferred currency<select className="select-field" value={profileDraft.currency || 'USD'} onChange={(event) => updateProfileField('currency', event.target.value)}>{['USD', 'EUR', 'GBP', 'LKR', 'AUD', 'CAD', 'INR', 'JPY'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="field-label">Financial knowledge<select className="select-field" value={profileDraft.experience || 'Beginner'} onChange={(event) => updateProfileField('experience', event.target.value)}>{['Beginner', 'Intermediate', 'Advanced'].map((item) => <option key={item}>{item}</option>)}</select></label></div><button className="button button-primary" onClick={saveCurrentProfile}><Icon name="Save" size={16}/> Save profile</button></section><section className="panel finance-preferences-panel"><div className="panel-heading"><div><h3>Financial planning preferences</h3><p>Optional planning details, stored locally until backend is configured.</p></div><span className="heading-icon"><Icon name="Target" size={19}/></span></div><label className="field-label">Main financial goal<select className="select-field" value={profileDraft.goal || 'Build long-term wealth'} onChange={(event) => updateProfileField('goal', event.target.value)}>{['Build long-term wealth', 'Grow savings', 'Pay down debt', 'Plan for retirement', 'Buy a home', 'Learn how to invest'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="field-label">Risk comfort level<select className="select-field" value={riskLevel} onChange={(event) => setRiskLevel(event.target.value)}>{['Conservative', 'Moderate', 'Growth-oriented'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="field-label">Monthly savings target<input className="plain-field" type="number" min="0" value={profileDraft.monthlyTarget || ''} onChange={(event) => updateProfileField('monthlyTarget', event.target.value)} placeholder="e.g. 250"/></label><label className="field-label">Planning notes<textarea className="plain-field" rows={4} value={profileDraft.notes || ''} onChange={(event) => updateProfileField('notes', event.target.value)} placeholder="Goals, milestones or questions to discuss with an adviser"/></label><button className="button button-outline" onClick={saveCurrentProfile}><Icon name="Save" size={16}/> Save planning preferences</button><div className="settings-security-note"><Icon name="ShieldCheck" size={18}/><span><strong>Privacy tip</strong> Never store passwords, card numbers or bank login details in notes. Use the official website of your financial institution for account access.</span></div></section></div><section className="panel connected-services-panel"><Icon name="Database" size={20}/><div><h3>Account and database connection</h3><p>{isSupabaseConfigured ? 'Supabase credentials were detected. Verify Authentication, Storage buckets and Row Level Security policies in your project.' : 'No API key is needed for the preview. To enable verified email, Google sign-in, persistent accounts and cross-device data, use the free Supabase starter setup included in README.md.'}</p></div><button className="button button-soft" onClick={() => showToast(isSupabaseConfigured ? 'Supabase environment variables are present. See SETUP_GUIDE.md to validate policies.' : 'Open SETUP_GUIDE.md in the project ZIP for the free Supabase setup, including Google OAuth.', 'info')}>Setup guide <Icon name="ArrowUpRight" size={15}/></button></section></>}
      {['Investing', 'Forex', 'Personal Finance', 'Real Estate', 'Commodities', 'Education', 'Regulatory Policy'].includes(page) && <CategoryWorkspace page={page} articles={articles} onCategory={onCategory} onOpenArticle={onOpenArticle} onCalculator={onCalculator} onToggleWatch={onToggleWatch} watchlist={watchlist}/>}
      {page === 'Author Profile' && <AuthorProfileWorkspace user={user} showToast={showToast} onAuth={onAuth} />}
      {page === 'Publish Article' && <PublishArticleWorkspace user={user} onPublish={onPublish} onDeleteArticle={onDeleteArticle} onOpenArticle={onOpenArticle} showToast={showToast} articles={articles} />}
      {page === 'Log Out' && <div className="logout-confirm panel"><span className="logout-icon"><Icon name="LogOut" size={24}/></span><h2>Leave your workspace?</h2><p>Your locally saved demo notes remain in this browser, but you will return to the public site.</p><button className="button button-primary" onClick={() => onAuth('logout')}>Log out <Icon name="ArrowRight" size={16}/></button><button className="button button-ghost" onClick={() => onNavigateSafe('Dashboard')}>Stay here</button></div>}
      <div className="workspace-footer-note"><Icon name="ShieldCheck" size={14}/> Educational tools only · Your financial decisions remain yours.</div>
    </div>
  );

  // Workspace subviews use the same navigation callback exposed through a window event to keep this component reusable.
  function onNavigateSafe(target) { window.dispatchEvent(new CustomEvent('fynvera-navigate', { detail: target })); }
}

function PortfolioTable({ portfolio, onRemove }) {
  if (!portfolio.length) return <div className="table-empty"><Icon name="BriefcaseBusiness" size={24}/><strong>No holdings entered yet</strong><span>Add a holding or savings goal to create a personal record.</span></div>;
  return <div className="portfolio-table-wrap"><table className="portfolio-table"><thead><tr><th>Asset</th><th>Type</th><th>Current value</th><th>Gain / loss*</th><th aria-label="Actions"/></tr></thead><tbody>{portfolio.map((item) => { const gain = Number(item.value || 0) - Number(item.cost || 0); return <tr key={item.id}><td><div className="portfolio-asset"><span className="asset-avatar">{(item.symbol || '?').slice(0, 1)}</span><span><strong>{item.symbol}</strong><small>{item.name || 'Personal record'}</small></span></div></td><td><span className="type-pill">{item.type || 'Other'}</span></td><td><strong>{formatMoney(Number(item.value || 0))}</strong></td><td><span className={gain >= 0 ? 'positive' : 'negative'}>{gain >= 0 ? '+' : '-'}{formatMoney(Math.abs(gain))}</span></td><td><button className="icon-button" title="Remove holding" onClick={() => onRemove(item.id)}><Icon name="Trash2" size={15}/></button></td></tr>; })}</tbody></table><small className="table-footnote">*Calculated from the values you enter. Not investment performance or tax reporting.</small></div>;
}

function CategoryWorkspace({ page, articles, onCategory, onOpenArticle, onCalculator, onToggleWatch, watchlist }) {
  // Keep News & Insights editorial posts out of the topic-category pages.
  const topicArticles = articles.filter((article) => article.contentType !== 'news_insights');
  const matching = topicArticles.filter((article) => article.category === page);
  const fallback = matching.length ? matching : topicArticles.slice(0, 3);
  const meta = categories.find((item) => item.name === page) || categories[1];
  return <><div className="workspace-welcome"><div><div className="eyebrow"><span/> LEARN & EXPLORE</div><h1>{page}</h1><p>Browse curated guides, explore important concepts and keep your next steps practical.</p></div><button className="button button-primary" onClick={() => onCalculator()}><Icon name="Calculator" size={16}/> Use a calculator</button></div><div className="workspace-topic-chips">{meta.subcategories.map((sub) => <button key={sub} onClick={() => onCategory(page)}>{sub}<Icon name="ArrowUpRight" size={14}/></button>)}</div><div className="workspace-article-grid">{fallback.map((article) => <ArticleCard key={article.id} article={article} onOpen={onOpenArticle} onToggleWatch={onToggleWatch} watched={watchlist.includes(article.id)}/>)}</div><div className="panel category-workspace-disclaimer"><Icon name="BookOpenText" size={18}/><div><strong>Keep learning, one concept at a time</strong><p>Some categories may not have published sample articles yet. Use News & Insights to publish original content with images and relevant keywords.</p></div></div></>;
}

function AuthorProfileWorkspace({ user, showToast, onAuth }) {
  const [draft, setDraft] = useState({ username: '', display_name: user?.name || '', bio: '', x_url: '', tiktok_url: '', facebook_url: '', telegram_url: '' });
  const [stats, setStats] = useState({ followers: 0, following: 0, likes_received: 0, published_articles: 0 });
  const [loading, setLoading] = useState(Boolean(supabase && user && !user.demo));
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!supabase || !user || user.demo) { setLoading(false); return undefined; }
    let cancelled = false;
    Promise.all([
      supabase.from('author_profiles').select('username,display_name,bio,x_url,tiktok_url,facebook_url,telegram_url').eq('user_id', user.id).maybeSingle(),
      supabase.rpc('author_social_counts', { p_author_id: user.id })
    ]).then(([profileResult, statsResult]) => {
      if (cancelled) return;
      const row = profileResult.data || {};
      setDraft((current) => ({ ...current, username: row.username || current.username || (user.email || '').split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 24), display_name: row.display_name || user.name || current.display_name, bio: row.bio || '', x_url: row.x_url || '', tiktok_url: row.tiktok_url || '', facebook_url: row.facebook_url || '', telegram_url: row.telegram_url || '' }));
      const statsRow = Array.isArray(statsResult.data) ? statsResult.data[0] : statsResult.data;
      if (statsRow) setStats({ followers: Number(statsRow.followers) || 0, following: Number(statsRow.following) || 0, likes_received: Number(statsRow.likes_received) || 0, published_articles: Number(statsRow.published_articles) || 0 });
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);
  const change = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const save = async (event) => {
    event.preventDefault();
    if (!user) { onAuth('signup'); return; }
    if (!supabase || user.demo) { showToast('Create/verify your Supabase account to publish a real author profile. Preview mode does not sync this publicly.', 'error'); return; }
    const username = draft.username.trim().replace(/^@/, '').toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(username)) { showToast('Username must be 3–24 characters using letters, numbers or underscores.', 'error'); return; }
    setSaving(true);
    const { error } = await supabase.from('author_profiles').upsert({ user_id: user.id, username, display_name: draft.display_name.trim() || user.name || username, bio: draft.bio.trim(), x_url: draft.x_url.trim() || null, tiktok_url: draft.tiktok_url.trim() || null, facebook_url: draft.facebook_url.trim() || null, telegram_url: draft.telegram_url.trim() || null }, { onConflict: 'user_id' });
    setSaving(false);
    if (error) { showToast(error.message.includes('author_profiles') ? 'Run supabase/fynvera_upgrade_migration.sql in Supabase SQL Editor first.' : error.message, 'error'); return; }
    setDraft((current) => ({ ...current, username }));
    showToast('Your public author profile was saved.', 'success');
  };
  const externalLinks = [ ['X', 'x_url'], ['TikTok', 'tiktok_url'], ['Facebook', 'facebook_url'], ['Telegram', 'telegram_url'] ];
  return <>
    <div className="workspace-welcome"><div><div className="eyebrow"><span/> CREATOR SPACE</div><h1>Author Profile</h1><p>Create the public-facing profile readers see when they discover your articles.</p></div><span className="data-pill"><Icon name="UserRound" size={14}/> PUBLIC CREATOR PROFILE</span></div>
    <div className="author-profile-stats-grid">
      {[['Published articles', stats.published_articles, 'FileText'], ['Followers', stats.followers, 'Users'], ['Following', stats.following, 'UserRoundCheck'], ['Likes received', stats.likes_received, 'Heart']].map(([label, value, icon]) => <div className="summary-card" key={label}><div className="summary-card-top"><span>{label.toUpperCase()}</span><span className="summary-icon"><Icon name={icon} size={18}/></span></div><strong>{loading ? '…' : Number(value).toLocaleString('en-US')}</strong></div>)}
    </div>
    <section className="panel author-profile-form-panel"><div className="panel-heading"><div><h3>Public profile details</h3><p>These details are for your creator identity. Financial goals and planning notes remain private.</p></div><span className="heading-icon"><Icon name="BadgeCheck" size={19}/></span></div>
      <form className="author-profile-form" onSubmit={save}>
        <div className="settings-form-grid"><label className="field-label">Username<input className="plain-field" value={draft.username} onChange={(event) => change('username', event.target.value)} placeholder="e.g. market_writer" minLength={3} maxLength={24} required/><small>3–24 letters, numbers or underscores.</small></label><label className="field-label">Display name<input className="plain-field" value={draft.display_name} onChange={(event) => change('display_name', event.target.value)} placeholder="Your public author name" maxLength={80} required/></label></div>
        <label className="field-label">Short bio<textarea className="plain-field" value={draft.bio} onChange={(event) => change('bio', event.target.value)} rows={4} maxLength={500} placeholder="Tell readers about your finance topics, writing experience and editorial focus."/></label>
        <div className="settings-form-grid">{externalLinks.map(([label,key]) => <label className="field-label" key={key}>{label} profile/channel URL<input className="plain-field" type="url" value={draft[key]} onChange={(event) => change(key, event.target.value)} placeholder={`https://${label === 'Telegram' ? 't.me/yourchannel' : label.toLowerCase() + '.com/yourhandle'}`}/></label>)}</div>
        <div className="author-profile-form-footer"><p><Icon name="ShieldCheck" size={16}/> Never add passwords, financial information or private account details to this public profile.</p><button className="button button-primary" type="submit" disabled={saving}>{saving ? <Icon name="LoaderCircle" size={16} className="spin"/> : <Icon name="Save" size={16}/>} {saving ? 'Saving…' : 'Save author profile'}</button></div>
      </form>
    </section>
    {!supabase && <div className="calculator-disclaimer"><Icon name="Info" size={17}/><span>Supabase is not configured in this environment. This page is visible in preview mode, but public profile saves require the database setup.</span></div>}
  </>;
}

function FollowAuthorButton({ targetId, user, authorName, onAuth, showToast }) {
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState(Boolean(targetId && isUuid(targetId)));
  useEffect(() => {
    if (!targetId || !isUuid(targetId) || !supabase || !user || user.demo || user.id === targetId) { setAvailable(Boolean(targetId && isUuid(targetId))); setFollowing(false); return undefined; }
    let cancelled = false;
    supabase.from('author_follows').select('followed_id').eq('follower_id', user.id).eq('followed_id', targetId).maybeSingle().then(({ data, error }) => {
      if (!cancelled) { if (!error) setFollowing(Boolean(data)); setAvailable(!error); }
    });
    return () => { cancelled = true; };
  }, [targetId, user?.id]);
  const toggle = async () => {
    if (!user) { onAuth('signup'); showToast('Create a free account to follow authors.', 'info'); return; }
    if (user.demo || !supabase) { showToast('Follow authors needs your verified Supabase account to sync across devices.', 'error'); return; }
    if (!isUuid(targetId) || user.id === targetId) return;
    setBusy(true);
    const result = following
      ? await supabase.from('author_follows').delete().eq('follower_id', user.id).eq('followed_id', targetId)
      : await supabase.from('author_follows').insert({ follower_id: user.id, followed_id: targetId });
    setBusy(false);
    if (result.error) { showToast(result.error.message.includes('author_follows') ? 'Run supabase/fynvera_upgrade_migration.sql in Supabase SQL Editor first.' : result.error.message, 'error'); return; }
    setFollowing(!following);
    showToast(following ? `You unfollowed ${authorName || 'this author'}.` : `You are now following ${authorName || 'this author'}.`, 'success');
  };
  if (!targetId || !isUuid(targetId)) return null;
  if (user?.id === targetId) return <span className="author-self-label"><Icon name="BadgeCheck" size={14}/> Your author profile</span>;
  return <button className={`button ${following ? 'button-soft' : 'button-outline'} button-small follow-author-button`} disabled={busy || !available} onClick={toggle}><Icon name={following ? 'UserRoundCheck' : 'UserRoundPlus'} size={15}/>{busy ? 'Please wait…' : following ? 'Following' : 'Follow author'}</button>;
}


function PublicAuthorLinks({ authorId }) {
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    if (!supabase || !isUuid(authorId)) return undefined;
    let active = true;
    supabase.from('author_profiles').select('bio,x_url,tiktok_url,facebook_url,telegram_url').eq('user_id', authorId).maybeSingle()
      .then(({ data, error }) => { if (active && !error) setProfile(data || null); });
    return () => { active = false; };
  }, [authorId]);
  if (!profile) return null;
  const links = [
    ['X', profile.x_url], ['TikTok', profile.tiktok_url],
    ['Facebook', profile.facebook_url], ['Telegram', profile.telegram_url]
  ].filter(([, value]) => {
    try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol); }
    catch { return false; }
  });
  return <div className="public-author-info">{profile.bio && <p>{profile.bio}</p>}{links.length > 0 && <div className="public-author-links" aria-label="Author social links">{links.map(([label, url]) => <a key={label} href={url} target="_blank" rel="noopener noreferrer">{label}<Icon name="ArrowUpRight" size={12}/></a>)}</div>}</div>;
}

function ArticleCommunity({ article, user, onAuth, showToast }) {
  const localKey = `community-${article.id}`;
  const [reaction, setReaction] = useState(null);
  const [counts, setCounts] = useState({ likes: 0, dislikes: 0 });
  const [comments, setComments] = useState([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [animateLike, setAnimateLike] = useState(false);
  const local = !supabase || user?.demo || !isUuid(article.id);

  // All remote fields here match the existing Supabase schema: comments use `content`.
  const loadRemote = async () => {
    if (!supabase || !isUuid(article.id)) return;
    const [countsResult, commentsResult, myReactionResult] = await Promise.all([
      supabase.rpc('article_reaction_counts', { p_article_id: article.id }),
      supabase.from('article_comments').select('id,user_id,content,parent_id,created_at,updated_at').eq('article_id', article.id).order('created_at', { ascending: true }).limit(100),
      user && !user.demo ? supabase.from('article_reactions').select('reaction').eq('article_id', article.id).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null, error: null })
    ]);
    if (countsResult.error) console.warn('Reaction totals could not be loaded.', countsResult.error.message);
    const countRow = Array.isArray(countsResult.data) ? countsResult.data[0] : countsResult.data;
    if (countRow) setCounts({ likes: Number(countRow.likes) || 0, dislikes: Number(countRow.dislikes) || 0 });
    if (!myReactionResult.error) setReaction(myReactionResult.data?.reaction || null);
    if (commentsResult.error) { console.warn('Comments could not be loaded.', commentsResult.error.message); return; }
    if (commentsResult.data) {
      const ids = [...new Set(commentsResult.data.map((item) => item.user_id).filter(Boolean))];
      let profiles = [];
      if (ids.length) {
        const profilesResult = await supabase.from('author_profiles').select('user_id,username,display_name').in('user_id', ids);
        profiles = profilesResult.data || [];
      }
      const names = Object.fromEntries(profiles.map((profile) => [profile.user_id, profile.display_name || profile.username || 'Fynvera member']));
      setComments(commentsResult.data.map((item) => ({ ...item, body: item.content, display_name: names[item.user_id] || 'Fynvera member' })));
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (local) {
      const saved = loadLocal(localKey, { likes: [], dislikes: [], comments: [] });
      const myId = user?.id || null;
      setCounts({ likes: saved.likes?.length || 0, dislikes: saved.dislikes?.length || 0 });
      setReaction(myId && saved.likes?.includes(myId) ? 'like' : myId && saved.dislikes?.includes(myId) ? 'dislike' : null);
      setComments([...(saved.comments || [])].map((item) => ({ ...item, content: item.content ?? item.body ?? '' })).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
      return undefined;
    }
    loadRemote().catch((error) => { if (!cancelled) console.warn('Article community data could not be loaded.', error); });
    return () => { cancelled = true; };
  }, [article.id, user?.id]);

  const updateLocal = (next) => {
    saveLocal(localKey, next);
    setCounts({ likes: next.likes?.length || 0, dislikes: next.dislikes?.length || 0 });
    setComments([...(next.comments || [])].map((item) => ({ ...item, content: item.content ?? item.body ?? '' })).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
  };

  const react = async (value) => {
    if (!user) { onAuth('signup'); showToast('Create a free account to react to articles.', 'info'); return; }
    if (busy) return;
    if (value === 'like') { setAnimateLike(true); window.setTimeout(() => setAnimateLike(false), 480); }
    setBusy(true);
    try {
      if (local) {
        const saved = loadLocal(localKey, { likes: [], dislikes: [], comments: [] });
        const myId = user.id;
        const next = { likes: [...(saved.likes || [])], dislikes: [...(saved.dislikes || [])], comments: [...(saved.comments || [])] };
        next.likes = next.likes.filter((id) => id !== myId); next.dislikes = next.dislikes.filter((id) => id !== myId);
        const same = reaction === value;
        if (!same) next[value === 'like' ? 'likes' : 'dislikes'].push(myId);
        updateLocal(next); setReaction(same ? null : value);
      } else {
        const request = reaction === value
          ? await supabase.from('article_reactions').delete().eq('article_id', article.id).eq('user_id', user.id)
          : await supabase.from('article_reactions').upsert({ article_id: article.id, user_id: user.id, reaction: value }, { onConflict: 'article_id,user_id' });
        if (request.error) throw request.error;
        setReaction(reaction === value ? null : value);
        await loadRemote();
      }
      showToast(reaction === value ? 'Reaction removed.' : 'Thanks for sharing your feedback.', 'success');
    } catch (error) { showToast(error.message || 'Could not save your reaction.', 'error'); }
    finally { setBusy(false); }
  };

  const sendComment = async (event) => {
    event?.preventDefault();
    const content = commentDraft.trim();
    if (!content) return;
    if (!user) { onAuth('signup'); showToast('Create a free account to comment.', 'info'); return; }
    if (content.length > 2000) { showToast('Comments must be 2,000 characters or less.', 'error'); return; }
    setBusy(true);
    try {
      const createdAt = new Date().toISOString();
      if (local) {
        const saved = loadLocal(localKey, { likes: [], dislikes: [], comments: [] });
        const item = { id: `local-comment-${Date.now()}`, user_id: user.id, display_name: user.name || user.email?.split('@')[0] || 'Fynvera member', content, body: content, parent_id: replyTo?.id || null, created_at: createdAt };
        updateLocal({ ...saved, comments: [...(saved.comments || []), item] });
      } else {
        const { error } = await supabase.from('article_comments').insert({ article_id: article.id, user_id: user.id, parent_id: replyTo?.id || null, content });
        if (error) throw error;
        await loadRemote();
      }
      setCommentDraft(''); setReplyTo(null); showToast(replyTo ? 'Reply posted.' : 'Comment posted.', 'success');
    } catch (error) { showToast(error.message || 'Could not post your comment.', 'error'); }
    finally { setBusy(false); }
  };

  const editComment = async (comment) => {
    const content = editDraft.trim();
    if (!content) { showToast('A comment cannot be empty.', 'error'); return; }
    if (content.length > 2000) { showToast('Comments must be 2,000 characters or less.', 'error'); return; }
    setBusy(true);
    try {
      const updatedAt = new Date().toISOString();
      if (local) {
        const saved = loadLocal(localKey, { likes: [], dislikes: [], comments: [] });
        updateLocal({ ...saved, comments: (saved.comments || []).map((item) => item.id === comment.id ? { ...item, content, body: content, updated_at: updatedAt } : item) });
      } else {
        const { error } = await supabase.from('article_comments').update({ content, updated_at: updatedAt }).eq('id', comment.id).eq('user_id', user.id);
        if (error) throw error;
        await loadRemote();
      }
      setEditingCommentId(null); setEditDraft(''); showToast('Comment updated.', 'success');
    } catch (error) { showToast(error.message || 'Could not update your comment.', 'error'); }
    finally { setBusy(false); }
  };

  const deleteComment = async (comment) => {
    if (!window.confirm('Delete this comment? This cannot be undone.')) return;
    setBusy(true);
    try {
      if (local) {
        const saved = loadLocal(localKey, { likes: [], dislikes: [], comments: [] });
        // Preserve replies when a parent comment is deleted; they become top-level comments.
        updateLocal({ ...saved, comments: (saved.comments || []).filter((item) => item.id !== comment.id).map((item) => item.parent_id === comment.id ? { ...item, parent_id: null } : item) });
      } else {
        const { error } = await supabase.from('article_comments').delete().eq('id', comment.id).eq('user_id', user.id);
        if (error) throw error;
        await loadRemote();
      }
      showToast('Comment deleted.', 'success');
    } catch (error) { showToast(error.message || 'Could not delete your comment.', 'error'); }
    finally { setBusy(false); }
  };

  return <section className="article-community panel" aria-label="Article community"><div className="panel-heading"><div><h3>Join the conversation</h3><p>Share a reaction or add a useful, respectful comment.</p></div><span className="heading-icon"><Icon name="MessageCircle" size={19}/></span></div>
    <div className="article-reaction-row"><button className={`button button-soft ${reaction === 'like' ? 'button-soft-active' : ''} ${animateLike ? 'reaction-like-pop' : ''}`} disabled={busy} onClick={() => react('like')}><Icon name="ThumbsUp" size={16}/><span>Like</span><strong>{counts.likes}</strong></button><button className={`button button-soft ${reaction === 'dislike' ? 'button-soft-active' : ''}`} disabled={busy} onClick={() => react('dislike')}><Icon name="ThumbsDown" size={16}/><span>Dislike</span></button><span className="article-community-account-note">{user ? `Signed in as ${user.name || user.email}` : 'Sign in to react or comment'}</span></div>
    <form className="article-comment-form" onSubmit={sendComment}><label className="field-label" htmlFor={`comment-${article.id}`}>{replyTo ? `Reply to ${replyTo.display_name || 'comment'}` : 'Comment'}<textarea id={`comment-${article.id}`} className="plain-field" rows={3} maxLength={2000} value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder={user ? (replyTo ? 'Write your reply…' : 'Add a thoughtful comment…') : 'Sign in to join the discussion'} /></label><div className="article-comment-submit"><small>{commentDraft.length}/2000 · Keep it useful and respectful.</small><div>{replyTo && <button type="button" className="button button-soft button-small" onClick={() => { setReplyTo(null); setCommentDraft(''); }}>Cancel reply</button>}<button className="button button-primary button-small" type="submit" disabled={busy || !commentDraft.trim()}><Icon name="Send" size={14}/> {replyTo ? 'Post reply' : 'Post comment'}</button></div></div></form>
    <div className="article-comment-list">{comments.map((comment) => <article className={`article-comment ${comment.parent_id ? 'article-comment-reply' : ''}`} key={comment.id}><span className="author-initial">{(comment.display_name || 'F').slice(0,1).toUpperCase()}</span><div className="article-comment-content"><div className="article-comment-meta"><strong>{comment.display_name || 'Fynvera member'}</strong><time dateTime={comment.created_at}>{formatDate(comment.created_at?.slice(0,10))}{comment.updated_at && comment.updated_at !== comment.created_at ? ' · Edited' : ''}</time></div>{editingCommentId === comment.id ? <div className="comment-edit-form"><textarea className="plain-field" rows={3} maxLength={2000} value={editDraft} onChange={(event) => setEditDraft(event.target.value)}/><div><button type="button" className="button button-soft button-small" onClick={() => { setEditingCommentId(null); setEditDraft(''); }}>Cancel</button><button type="button" className="button button-primary button-small" disabled={busy || !editDraft.trim()} onClick={() => editComment(comment)}>Save edit</button></div></div> : <><p>{comment.content ?? comment.body}</p><div className="comment-action-row"><button type="button" onClick={() => { if (!user) { onAuth('signup'); showToast('Create a free account to reply.', 'info'); return; } setReplyTo(comment); setCommentDraft(''); setEditingCommentId(null); }}>Reply</button>{user?.id === comment.user_id && <><button type="button" onClick={() => { setEditingCommentId(comment.id); setEditDraft(comment.content ?? comment.body ?? ''); setReplyTo(null); }}>Edit</button><button type="button" onClick={() => deleteComment(comment)} disabled={busy}>Delete</button></>}</div></>}</div></article>)}{!comments.length && <p className="article-comment-empty">No comments yet. Start a helpful conversation.</p>}</div>
    <p className="article-community-moderation"><Icon name="ShieldCheck" size={14}/> Do not post private, financial-account or personal contact information. Comments may be moderated.</p>
  </section>;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function formatDate(dateValue) {
  const date = new Date(`${dateValue || new Date().toISOString().slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? 'Recently' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(value) || 0);
}

function slugify(value) {
  return (value || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 75);
}

// Map rows using the live `articles` table schema; keep the UI's friendlier names separate.
function mapDatabaseArticle(row, currentUser = null) {
  const articleBody = String(row.article_body || '');
  const keywords = Array.isArray(row.seo_keywords) ? row.seo_keywords : String(row.seo_keywords || '').split(',').map((item) => item.trim()).filter(Boolean);
  return {
    id: row.id, authorId: row.user_id, userId: row.user_id, title: row.title,
    slug: `${slugify(row.title)}-${String(row.id).slice(0, 8)}`, excerpt: row.summary || '',
    category: row.category || 'Investing', subcategory: row.subcategory || '', contentType: row.content_type || 'news_insights',
    author: row.user_id === currentUser?.id ? (currentUser.name || 'Fynvera Contributor') : 'Fynvera Contributor',
    authorRole: 'Finance Contributor', image: row.image_url || '', imageId: 'IMG-ARTICLE-CUSTOM',
    body: articleBody.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean), keywords,
    date: row.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    createdAt: row.created_at, updatedAt: row.updated_at || null, status: row.status || 'published',
    readTime: Math.max(1, Math.ceil(articleBody.split(/\s+/).filter(Boolean).length / 220))
  };
}

// A visible label appears when updated_at is newer than created_at, not merely because the row has an update timestamp.
function articleWasEdited(article) {
  if (!article?.createdAt || !article?.updatedAt) return false;
  return new Date(article.updatedAt).getTime() > new Date(article.createdAt).getTime();
}

export default function App() {
  const [activeView, setActiveView] = useState('Home');
  const [selectedSubcategory, setSelectedSubcategory] = useState('All');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspacePage, setWorkspacePage] = useState('Dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [authMode, setAuthMode] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [calculatorId, setCalculatorId] = useState(null);
  const [toast, setToast] = useState(null);
  // Never restore a browser-only preview identity as an authenticated session. Supabase restores real sessions below.
  const [currentUser, setCurrentUser] = useState(null);
  const [articles, setArticles] = useState(() => {
    const saved = loadLocal('articles', seedArticles);
    // Migrate older browser cache entries too: the first seed remains the editorial feature,
    // while the rest are topic-page starter content and do not bleed into the News & Insights feed.
    return (Array.isArray(saved) ? saved : seedArticles).map((article) => ({
      ...article,
      contentType: article.contentType || (article.id === 'seed-wall-street-rally' ? 'news_insights' : String(article.id || '').startsWith('seed-') ? 'topic' : 'news_insights')
    }));
  });
  const [watchlist, setWatchlist] = useState(() => loadLocal('articleWatchlist', []));
  // Start with an empty portfolio: users should not mistake illustrative figures for their own finances.
  const [portfolio, setPortfolio] = useState(() => loadLocal('portfolio', []));
  const [profile, setProfile] = useState(() => loadLocal('profile', { name: '', country: '', currency: 'USD', experience: 'Beginner', goal: 'Build long-term wealth', riskLevel: 'Moderate', monthlyTarget: '', notes: '' }));
  const [activeWatchMarket, setActiveWatchMarket] = useState(() => loadLocal('marketWatchlist', ['SPX', 'BTC']));
  const [cryptoPrices, setCryptoPrices] = useState({});
  const [cryptoStatus, setCryptoStatus] = useState('connecting');
  const [marketQuotes, setMarketQuotes] = useState({});
  const [marketCatalog, setMarketCatalog] = useState([]);
  const [marketStatus, setMarketStatus] = useState('connecting');
  const [marketFetchedAt, setMarketFetchedAt] = useState(null);

  const showToast = (message, type = 'info') => { setToast({ message, type, id: Date.now() }); window.setTimeout(() => setToast((value) => value?.message === message ? null : value), 3800); };
  const navigateCategory = (name, subcategory = 'All') => { setSelectedArticle(null); setWorkspaceOpen(false); setSelectedSubcategory(subcategory || 'All'); setActiveView(name === 'Home' ? 'Home' : name); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openWorkspace = (userOverride = null) => {
    if (!(userOverride || currentUser)) { setAuthMode('signup'); showToast('Create a free account or sign in to access your private workspace.', 'info'); return; }
    setWorkspaceOpen(true); setWorkspacePage('Dashboard'); setSelectedArticle(null); setActiveView('Workspace'); window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openCalculatorLibrary = () => {
    if (!currentUser) { setAuthMode('signup'); showToast('Create a free account to open workspace tools.', 'info'); return; }
    setWorkspaceOpen(true); setWorkspacePage('Tools & Calculators'); setSelectedArticle(null); setActiveView('Workspace'); window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const navigateWorkspace = (page) => {
    if (!currentUser) { setAuthMode('signup'); showToast('Please create an account or sign in first.', 'info'); return; }
    if (page === 'Log Out') { setWorkspacePage('Log Out'); return; }
    setWorkspacePage(page); setWorkspaceOpen(true); setSelectedArticle(null); setActiveView('Workspace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openArticle = (article) => { setSelectedArticle(article); setWorkspaceOpen(false); setActiveView('Article'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openCalculator = (id) => { setCalculatorId(id || calculatorList[0].id); };
  const openAuth = (mode) => { if (mode === 'logout') { handleLogout(); return; } setAuthMode(mode); };

  // One shared public Binance Spot market-data connection powers all crypto widgets.
  // No exchange API key is used or needed for public ticker streams.
  useEffect(() => {
    let active = true;
    let socket = null;
    let reconnectTimer = null;
    const parseTicker = (row) => ({ lastPrice: Number(row.c ?? row.lastPrice), priceChangePercent: Number(row.P ?? row.priceChangePercent), highPrice: Number(row.h ?? row.highPrice), lowPrice: Number(row.l ?? row.lowPrice), quoteVolume: Number(row.q ?? row.quoteVolume) });
    const fetchSnapshot = async () => {
      try {
        const url = new URL('https://data-api.binance.vision/api/v3/ticker/24hr');
        // An omitted `symbols` parameter returns the public market snapshot for all Binance spot symbols.
        const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`Binance snapshot returned ${response.status}`);
        const rows = await response.json();
        if (!active || !Array.isArray(rows)) return;
        setCryptoPrices((current) => ({ ...current, ...Object.fromEntries(rows.filter((row) => String(row.symbol || '').endsWith('USDT')).map((row) => [row.symbol, parseTicker(row)])) }));
        setCryptoStatus((current) => current === 'live' ? 'live' : 'snapshot');
      } catch (error) {
        if (active) setCryptoStatus((current) => current === 'live' || current === 'snapshot' ? current : 'connecting');
        console.warn('Binance public market snapshot is temporarily unavailable.', error);
      }
    };
    const connect = () => {
      if (!active) return;
      try {
        socket = new WebSocket('wss://data-stream.binance.vision:443/ws/!ticker@arr');
        socket.onopen = () => { if (active) setCryptoStatus('live'); };
        socket.onmessage = (event) => {
          if (!active) return;
          try {
            const message = JSON.parse(event.data);
            const rows = Array.isArray(message) ? message : Array.isArray(message.data) ? message.data : [message.data || message];
            const next = Object.fromEntries(rows.filter((row) => row?.s && String(row.s).endsWith('USDT')).map((row) => [row.s, parseTicker(row)]));
            if (Object.keys(next).length) {
              setCryptoPrices((current) => ({ ...current, ...next }));
              setCryptoStatus('live');
            }
          } catch (error) { console.warn('Ignored an invalid Binance ticker message.', error); }
        };
        socket.onerror = () => { if (active) setCryptoStatus((current) => current === 'live' ? 'snapshot' : current); };
        socket.onclose = () => { if (active) { setCryptoStatus((current) => current === 'live' ? 'snapshot' : current); reconnectTimer = window.setTimeout(connect, 5000); } };
      } catch (error) {
        setCryptoStatus('connecting');
        reconnectTimer = window.setTimeout(connect, 5000);
      }
    };
    fetchSnapshot();
    connect();
    const snapshotInterval = window.setInterval(fetchSnapshot, 60_000);
    return () => { active = false; window.clearInterval(snapshotInterval); if (reconnectTimer) window.clearTimeout(reconnectTimer); if (socket) { socket.onopen = null; socket.onmessage = null; socket.onclose = null; socket.onerror = null; socket.close(); } };
  }, []);

  // Fetch the free provider's quoted instrument catalogue, then refresh its quotes in 100-symbol batches.
  // The provider documents `/api/symbols?quotedWithinDays=7` and `/api/latest?symbols=...` as public endpoints.
  // Each row preserves the provider's symbol, asset type and description; unavailable prices are never fabricated.
  useEffect(() => {
    let active = true;
    let timer = null;
    let discoveredInstruments = [];
    const staticSymbols = Object.values(LIVE_MARKET_GROUPS).flat().map((item) => item.quoteSymbol);
    const normalizeRows = (payload) => {
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.items)) return payload.items;
      if (Array.isArray(payload?.quotes)) return payload.quotes;
      if (Array.isArray(payload?.data)) return payload.data;
      if (Array.isArray(payload?.symbols)) return payload.symbols;
      // Single-symbol endpoints return a quote object directly.
      if (payload && typeof payload === 'object' && (payload.symbol || payload.name || payload.mid !== undefined || payload.lastPrice !== undefined)) return [payload];
      // `/api/latest` can return a symbol-keyed object; add the key as `symbol` when the row omits it.
      const source = payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data) ? payload.data : payload;
      if (source && typeof source === 'object') return Object.entries(source).filter(([, value]) => value && typeof value === 'object' && !Array.isArray(value)).map(([key, value]) => ({ ...value, symbol: value.symbol || value.name || key }));
      return [];
    };
    const loadCatalogue = async () => {
      try {
        const response = await fetch('https://biquote.io/api/symbols?quotedWithinDays=7', { headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`Market catalogue returned ${response.status}`);
        const payload = await response.json();
        const rows = normalizeRows(payload);
        const classMap = { index: 'index', indices: 'index', stock: 'stock', stocks: 'stock', forex: 'forex', commodity: 'commodity', commodities: 'commodity' };
        const palette = { index: '#5d91ff', stock: '#80a5bb', forex: '#9e8cff', commodity: '#ffc44d' };
        discoveredInstruments = rows.map((row) => {
          const assetClass = classMap[String(row.type || row.assetClass || '').toLowerCase()];
          const quoteSymbol = String(row.name || row.symbol || '').toUpperCase();
          if (!assetClass || !quoteSymbol) return null;
          return { symbol: quoteSymbol, quoteSymbol, name: row.description || quoteSymbol, assetClass, color: palette[assetClass] };
        }).filter(Boolean);
        if (active) setMarketCatalog(discoveredInstruments);
      } catch (error) {
        // Keep the built-in common instruments usable if the public symbol catalogue is unavailable.
        console.warn('The extended public market catalogue could not be loaded; using the common instruments.', error);
      }
    };
    const refresh = async () => {
      try {
        if (!discoveredInstruments.length) await loadCatalogue();
        const symbols = [...new Set([...staticSymbols, ...discoveredInstruments.map((item) => item.quoteSymbol)])];
        const batches = [];
        for (let index = 0; index < symbols.length; index += 100) batches.push(symbols.slice(index, index + 100));
        const batchResults = await Promise.allSettled(batches.map(async (batch) => {
          const params = new URLSearchParams();
          batch.forEach((symbol) => params.append('symbols', symbol));
          const response = await fetch(`https://biquote.io/api/latest?${params.toString()}`, { headers: { Accept: 'application/json' } });
          if (!response.ok) throw new Error(`Quote feed returned ${response.status}`);
          return normalizeRows(await response.json());
        }));
        let rows = batchResults.filter((result) => result.status === 'fulfilled').flatMap((result) => result.value);
        // If a batch endpoint is down, try the 13 commonly displayed symbols individually, not the full catalogue.
        if (!rows.length) {
          const results = await Promise.allSettled(staticSymbols.map(async (symbol) => {
            const response = await fetch(`https://biquote.io/api/${encodeURIComponent(symbol)}`, { headers: { Accept: 'application/json' } });
            if (!response.ok) throw new Error(`${symbol}: ${response.status}`);
            return response.json();
          }));
          rows = results.filter((result) => result.status === 'fulfilled').map((result) => result.value).flatMap(normalizeRows);
        }
        if (!active) return;
        const next = Object.fromEntries(rows.filter((row) => row?.symbol || row?.name).map((row) => [String(row.symbol || row.name).toUpperCase().replace(/[^A-Z0-9]/g, ''), row]));
        if (Object.keys(next).length) {
          setMarketQuotes((current) => ({ ...current, ...next }));
          setMarketStatus(Object.keys(next).length >= 6 ? 'live' : 'partial');
          setMarketFetchedAt(Date.now());
        } else {
          setMarketStatus((current) => current === 'live' || current === 'partial' ? 'partial' : 'unavailable');
        }
      } catch (error) {
        if (active) setMarketStatus((current) => current === 'live' || current === 'partial' ? 'partial' : 'unavailable');
        console.warn('The free public market quote feed is temporarily unavailable.', error);
      }
    };
    refresh();
    timer = window.setInterval(refresh, 30_000);
    return () => { active = false; if (timer) window.clearInterval(timer); };
  }, []);

  // Load auth session only when Supabase is configured; otherwise preview mode remains fully usable.
  useEffect(() => {
    if (!supabase) return undefined;
    let isMounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;
      if (!data.session?.user) { setCurrentUser(null); saveLocal('demoUser', null); return; }
      const authUser = data.session.user;
      const nextUser = { id: authUser.id, email: authUser.email, name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0], avatar: authUser.user_metadata?.avatar_url || '', demo: false };
      setCurrentUser(nextUser); saveLocal('demoUser', nextUser);
      // Pull the profile row where available; missing rows are created during profile save.
      const { data: profileRow } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
      if (profileRow && isMounted) setProfile((current) => ({ ...current, name: profileRow.full_name || nextUser.name, country: profileRow.country || '', currency: profileRow.currency || 'USD', experience: profileRow.experience || 'Beginner', goal: profileRow.goal || current.goal, riskLevel: profileRow.risk_level || current.riskLevel || 'Moderate', monthlyTarget: String(profileRow.monthly_target ?? ''), notes: profileRow.notes || '', avatar: profileRow.avatar_url || nextUser.avatar || '' }));
    }).catch((error) => console.warn('Could not restore the session.', error));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      if (!session?.user) {
        // A sign-out from this tab or another tab must not leave the private workspace visible.
        setCurrentUser(null); saveLocal('demoUser', null); setWorkspaceOpen(false); setWorkspacePage('Dashboard'); setSelectedArticle(null); setActiveView('Home');
        return;
      }
      const authUser = session.user;
      const nextUser = { id: authUser.id, email: authUser.email, name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0], avatar: authUser.user_metadata?.avatar_url || '', demo: false };
      setCurrentUser(nextUser); saveLocal('demoUser', nextUser);
    });
    return () => { isMounted = false; listener.subscription.unsubscribe(); };
  }, []);

  // Load only published database articles for the public website. Column names match the deployed schema.
  useEffect(() => {
    if (!supabase) return;
    let isMounted = true;
    supabase.from('articles').select('id,title,summary,article_body,category,subcategory,seo_keywords,image_url,created_at,updated_at,user_id,status,content_type').eq('status', 'published').order('created_at', { ascending: false }).limit(100).then(async ({ data, error }) => {
      if (error || !data || !isMounted) {
        if (error) console.warn('Published articles could not be loaded; showing the starter library.', error.message);
        return;
      }
      const authorIds = [...new Set(data.map((row) => row.user_id).filter(Boolean))];
      let authorProfiles = [];
      if (authorIds.length) {
        const profileResult = await supabase.from('author_profiles').select('user_id,display_name,username').in('user_id', authorIds);
        authorProfiles = profileResult.data || [];
      }
      const profileById = Object.fromEntries(authorProfiles.map((profile) => [profile.user_id, profile]));
      const databaseArticles = data.map((row) => {
        const article = mapDatabaseArticle(row, currentUser);
        const author = profileById[row.user_id];
        return { ...article, author: author?.display_name || author?.username || article.author };
      });
      setArticles((current) => [...databaseArticles, ...current.filter((article) => String(article.id).startsWith('seed-') || String(article.id).startsWith('demo-'))]);
    }).catch((error) => console.warn('Published articles could not be loaded; showing the starter library.', error));
    return () => { isMounted = false; };
  }, [currentUser?.id, currentUser?.name]);

  // Load this signed-in user's private records from Supabase (RLS limits each query to that owner).
  useEffect(() => {
    if (!supabase || !currentUser || currentUser.demo) return undefined;
    let isMounted = true;
    Promise.all([
      supabase.from('portfolio_holdings').select('id,symbol,asset_type,current_value,cost_basis,notes').order('created_at', { ascending: false }),
      supabase.from('article_bookmarks').select('article_id').order('created_at', { ascending: false }),
      supabase.from('user_financial_profiles').select('primary_goal,risk_level,monthly_savings_target,notes').eq('user_id', currentUser.id).maybeSingle(),
      supabase.from('profiles').select('full_name,country,currency,experience,goal,risk_level,monthly_target,notes,avatar_url').eq('id', currentUser.id).maybeSingle(),
      supabase.from('market_watchlist').select('symbol').order('created_at', { ascending: false })
    ]).then(([holdingResult, watchResult, financeResult, profileResult, marketWatchResult]) => {
      if (!isMounted) return;
      if (!holdingResult.error && holdingResult.data) {
        setPortfolio(holdingResult.data.map((row) => ({ id: row.id, symbol: row.symbol, type: row.asset_type, value: Number(row.current_value) || 0, cost: Number(row.cost_basis) || 0, name: row.notes || 'Personal entry' })));
      }
      if (!watchResult.error && watchResult.data) setWatchlist(watchResult.data.map((row) => row.article_id));
      if (!marketWatchResult.error && marketWatchResult.data) setActiveWatchMarket(marketWatchResult.data.map((row) => row.symbol));
      const profileRow = profileResult.data || {};
      const financeRow = financeResult.data || {};
      setProfile((current) => ({ ...current, name: profileRow.full_name || currentUser.name || current.name, country: profileRow.country || current.country || '', currency: profileRow.currency || current.currency || 'USD', experience: profileRow.experience || current.experience || 'Beginner', goal: financeRow.primary_goal || profileRow.goal || current.goal, riskLevel: financeRow.risk_level || profileRow.risk_level || current.riskLevel || 'Moderate', monthlyTarget: String(financeRow.monthly_savings_target ?? profileRow.monthly_target ?? current.monthlyTarget ?? ''), notes: financeRow.notes ?? profileRow.notes ?? current.notes ?? '', avatar: profileRow.avatar_url || currentUser.avatar || '' }));
    }).catch((error) => console.warn('Could not load this account’s private records.', error));
    return () => { isMounted = false; };
  }, [currentUser?.id]);

  // Keep the preview data persistent locally; the real database is written separately when configured.
  useEffect(() => { saveLocal('articles', articles); }, [articles]);
  useEffect(() => { saveLocal('articleWatchlist', watchlist); }, [watchlist]);
  useEffect(() => { saveLocal('portfolio', portfolio); }, [portfolio]);
  useEffect(() => { saveLocal('profile', profile); }, [profile]);
  useEffect(() => { saveLocal('marketWatchlist', activeWatchMarket); }, [activeWatchMarket]);
  useEffect(() => {
    const refresh = () => setActiveWatchMarket(loadLocal('marketWatchlist', ['SPX', 'BTC']));
    const navigate = (event) => navigateWorkspace(event.detail);
    window.addEventListener('fynvera-refresh', refresh); window.addEventListener('fynvera-navigate', navigate);
    return () => { window.removeEventListener('fynvera-refresh', refresh); window.removeEventListener('fynvera-navigate', navigate); };
  }, []);

  // Open the article passed in a share URL, once the current article list is available.
  useEffect(() => {
    const requestedArticle = new URLSearchParams(window.location.search).get('article');
    if (!requestedArticle) return;
    const match = articles.find((item) => item.id === requestedArticle || item.slug === requestedArticle);
    if (match) { setSelectedArticle(match); setWorkspaceOpen(false); setActiveView('Article'); }
  }, [articles]);

  // Dynamic page titles, descriptions and social previews improve context on client-side navigation.
  useEffect(() => {
    const title = selectedArticle ? `${selectedArticle.title} | Fynvera` : workspaceOpen ? `${workspacePage} | Fynvera Workspace` : activeView === 'Home' ? 'Fynvera — Understand Money, Build Wealth' : `${activeView} | Fynvera`;
    const description = selectedArticle?.excerpt || `Explore ${activeView.toLowerCase()} insights, practical financial guides, and free calculators on Fynvera.`;
    document.title = title;
    const updateMeta = (selector, value) => { const element = document.querySelector(selector); if (element) element.setAttribute('content', value); };
    updateMeta('meta[name="description"]', description);
    updateMeta('meta[property="og:title"]', title);
    updateMeta('meta[property="og:description"]', description);
    updateMeta('meta[name="keywords"]', selectedArticle?.keywords?.join(', ') || 'investing, stock market news, finance news, personal finance, forex, cryptocurrency, wealth building');
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = window.location.origin + window.location.pathname + (selectedArticle ? `?article=${encodeURIComponent(selectedArticle.slug || selectedArticle.id)}` : '');
  }, [activeView, selectedArticle, workspaceOpen, workspacePage]);

  async function handleAuthSubmit({ mode, name, email, password }) {
    setAuthBusy(true);
    try {
      if (supabase) {
        if (mode === 'signup') {
          const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
          if (error) throw error;
          if (data.session && data.user) {
            const user = { id: data.user.id, email: data.user.email, name, avatar: '', demo: false };
            setCurrentUser(user); saveLocal('demoUser', user); setProfile((current) => ({ ...current, name })); setAuthMode(null); openWorkspace(user); showToast('Account created successfully.', 'success');
            return { ok: true };
          }
          return { message: 'Check your inbox to verify your email, then return here to sign in.' };
        }
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          const user = { id: data.user.id, email: data.user.email, name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0], avatar: data.user.user_metadata?.avatar_url || '', demo: false };
          setCurrentUser(user); saveLocal('demoUser', user); setAuthMode(null); openWorkspace(user); showToast('Welcome back to Fynvera.', 'success');
        }
        return { ok: true };
      }
      // Local demo accounts are allowed only on the development server, never on the deployed public site.
      if (!import.meta.env.DEV) return { message: 'Fynvera account services are not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your Vercel project, then redeploy.' };
      const user = { id: `demo-${Date.now()}`, email, name: name.trim() || email.split('@')[0], avatar: '', demo: true };
      setCurrentUser(user); saveLocal('demoUser', user); setProfile((current) => ({ ...current, name: user.name })); setAuthMode(null); openWorkspace(user);
      showToast(mode === 'signup' ? 'Preview profile created in this browser.' : 'Signed in to preview mode.', 'success');
      return { ok: true };
    } catch (error) {
      showToast(error.message || 'We could not complete that request. Check your connection and settings.', 'error');
      return { message: error.message || 'Please check your account details and try again.' };
    } finally { setAuthBusy(false); }
  }

  async function handleGoogleSignIn() {
    if (supabase) {
      try {
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
        if (error) throw error;
      } catch (error) { showToast(error.message || 'Google sign-in could not be started.', 'error'); }
      return;
    }
    if (!import.meta.env.DEV) { showToast('Google sign-in is not configured. Configure Supabase Google OAuth first.', 'error'); return; }
    const user = { id: `demo-google-${Date.now()}`, email: 'google-preview@fynvera.local', name: 'Google Preview User', avatar: '', demo: true };
    setCurrentUser(user); saveLocal('demoUser', user); setProfile((current) => ({ ...current, name: user.name })); setAuthMode(null); openWorkspace(user);
    showToast('Google button preview only. Connect Supabase to enable real Google OAuth.', 'info');
  }

  async function handleLogout() {
    if (supabase) { const { error } = await supabase.auth.signOut(); if (error) showToast(error.message, 'error'); }
    setCurrentUser(null); saveLocal('demoUser', null); setAuthMode(null); setWorkspaceOpen(false); setWorkspacePage('Dashboard'); setActiveView('Home'); setSelectedArticle(null); showToast('You have left the workspace.', 'success');
  }


  async function toggleArticleWatch(article) {
    if (!currentUser) { setAuthMode('signup'); showToast('Create a free account to save articles to your reading list.', 'info'); return; }
    if (!supabase && !import.meta.env.DEV) { showToast('Account services are not configured. Please try again later.', 'error'); return; }
    const exists = watchlist.includes(article.id);
    if (supabase && currentUser && !currentUser.demo && isUuid(article.id)) {
      const result = exists
        ? await supabase.from('article_bookmarks').delete().eq('user_id', currentUser.id).eq('article_id', article.id)
        : await supabase.from('article_bookmarks').insert({ user_id: currentUser.id, article_id: article.id });
      if (result.error) { showToast(`Bookmark could not be saved: ${result.error.message}`, 'error'); return; }
    }
    setWatchlist((current) => exists ? current.filter((id) => id !== article.id) : [...current, article.id]);
    showToast(exists ? 'Removed from your bookmarks.' : 'Added to your bookmarks.', 'success');
  }

  async function publishArticle(form) {
    if (!currentUser) { setAuthMode('signup'); return { message: 'Create a free account and sign in before publishing.' }; }
    if (currentUser.demo && !import.meta.env.DEV) return { message: 'A verified account is required to publish articles.' };
    let imageUrl = form.imagePreview || '';
    const articleSlug = `${slugify(form.title)}-${form.id ? String(form.id).slice(0, 8) : Date.now().toString().slice(-5)}`;
    const status = form.status === 'draft' ? 'draft' : 'published';

    if (supabase && !currentUser.demo) {
      try {
        if (form.imageFile) {
          // Each author uploads only into their own folder; see the matching storage RLS policy in the SQL migration.
          const file = form.imageFile;
          const safeName = `${currentUser.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
          const { error: uploadError } = await supabase.storage.from('article-images').upload(safeName, file, { upsert: true, contentType: file.type });
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage.from('article-images').getPublicUrl(safeName);
          imageUrl = urlData.publicUrl;
        }
        // IMPORTANT: use the actual deployed table columns (user_id, summary, article_body, seo_keywords).
        const payload = {
          user_id: currentUser.id,
          title: form.title.trim(),
          summary: form.excerpt.trim(),
          article_body: form.body.join('\n\n'),
          category: form.category,
          subcategory: form.subcategory || null,
          seo_keywords: form.keywords.join(', '),
          image_url: imageUrl || null,
          status,
          content_type: form.contentType === 'topic' ? 'topic' : 'news_insights'
          // The database trigger sets updated_at on edits; leaving it out on INSERT keeps new posts from being mislabeled EDITED.
        };
        let query = supabase.from('articles');
        if (form.id && isUuid(form.id)) {
          query = query.update(payload).eq('id', form.id).eq('user_id', currentUser.id);
        } else {
          query = query.insert(payload);
        }
        const { data, error } = await query.select('id,title,summary,article_body,category,subcategory,seo_keywords,image_url,created_at,updated_at,user_id,status,content_type').single();
        if (error) throw error;
        if (!data) throw new Error('The database did not return the saved article.');
        const mapped = mapDatabaseArticle(data, currentUser);
        setArticles((current) => status === 'published'
          ? [mapped, ...current.filter((article) => article.id !== mapped.id)]
          : current.filter((article) => article.id !== mapped.id));
        return { ok: true, article: mapped, message: status === 'draft' ? 'Draft saved privately.' : form.id ? 'Article updated and published.' : 'Article published successfully.' };
      } catch (error) {
        const detail = error?.message || 'Unknown Supabase error.';
        return { message: `Article could not be saved: ${detail}. Check the new Supabase SQL migration and article-images storage bucket if you added an image.` };
      }
    }

    // Browser preview only: keep drafts private in this browser and show published entries in the public preview.
    if (form.imageFile && !imageUrl) imageUrl = await readFileAsDataURL(form.imageFile);
    const now = new Date().toISOString();
    const id = form.id || `demo-${Date.now()}`;
    const oldArticle = articles.find((article) => article.id === id);
    const mapped = {
      id, userId: currentUser.id, authorId: currentUser.id,
      title: form.title.trim(), excerpt: form.excerpt.trim(), category: form.category, subcategory: form.subcategory,
      author: currentUser.name || 'Fynvera Contributor', authorRole: 'Fynvera Contributor',
      date: oldArticle?.date || (form.createdAt ? form.createdAt.slice(0, 10) : now.slice(0, 10)), createdAt: form.createdAt || oldArticle?.createdAt || now,
      updatedAt: form.id ? now : null, status, contentType: form.contentType === 'topic' ? 'topic' : 'news_insights', image: imageUrl, imageId: 'IMG-ARTICLE-CUSTOM',
      readTime: Math.max(1, Math.ceil(form.body.join(' ').split(/\s+/).filter(Boolean).length / 220)),
      keywords: form.keywords, body: form.body, slug: articleSlug
    };
    setArticles((current) => status === 'published'
      ? [mapped, ...current.filter((article) => article.id !== id)]
      : current.filter((article) => article.id !== id));
    return { ok: true, article: mapped, message: status === 'draft' ? 'Draft saved in this browser preview.' : 'Article published in this browser preview. Connect Supabase for cross-device publishing.' };
  }

  // Only the signed-in author can delete their own article; the migration enforces ownership again in RLS.
  async function deleteArticle(article) {
    if (!currentUser) return { message: 'Sign in before deleting an article.' };
    if (supabase && !currentUser.demo && isUuid(article?.id)) {
      const { data, error } = await supabase.from('articles').delete().eq('id', article.id).eq('user_id', currentUser.id).select('id').maybeSingle();
      if (error) return { message: `Article could not be deleted: ${error.message}` };
      if (!data) return { message: 'The article was not deleted. Check article ownership and the delete policy in Supabase.' };
    } else if (!import.meta.env.DEV && currentUser.demo) {
      return { message: 'A verified account is required to delete an article.' };
    }
    setArticles((current) => current.filter((item) => item.id !== article.id));
    return { ok: true };
  }

  async function saveProfile(nextProfile) {
    setProfile(nextProfile); saveLocal('profile', nextProfile);
    if (supabase && currentUser && !currentUser.demo) {
      const { error: authError } = await supabase.auth.updateUser({ data: { full_name: nextProfile.name || currentUser.name } });
      const { error: profileError } = await supabase.from('profiles').upsert({ id: currentUser.id, full_name: nextProfile.name || currentUser.name, country: nextProfile.country || null, currency: nextProfile.currency || 'USD', experience: nextProfile.experience || 'Beginner', goal: nextProfile.goal || null, risk_level: nextProfile.riskLevel || 'Moderate', monthly_target: Number(nextProfile.monthlyTarget) || 0, notes: nextProfile.notes || null }, { onConflict: 'id' });
      const { error: financeError } = await supabase.from('user_financial_profiles').upsert({ user_id: currentUser.id, primary_goal: nextProfile.goal || null, risk_level: nextProfile.riskLevel || 'Moderate', monthly_savings_target: Number(nextProfile.monthlyTarget) || 0, notes: nextProfile.notes || null }, { onConflict: 'user_id' });
      if (authError || profileError || financeError) showToast('Some settings could not be saved. Review the database setup guide.', 'error');
      else showToast('Profile details saved to your account.', 'success');
    }
  }

  async function changeAvatar(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Choose a profile image smaller than 5 MB.', 'error'); return; }
    if (supabase && currentUser && !currentUser.demo) {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'; const path = `${currentUser.id}/avatar-${Date.now()}.${extension}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
      if (error) { showToast(`Avatar upload failed: ${error.message}`, 'error'); return; }
      const { data } = supabase.storage.from('avatars').getPublicUrl(path); const avatar = `${data.publicUrl}?v=${Date.now()}`;
      const { error: authError } = await supabase.auth.updateUser({ data: { avatar_url: avatar } });
      const { error: profileError } = await supabase.from('profiles').upsert({ id: currentUser.id, avatar_url: avatar }, { onConflict: 'id' });
      if (authError || profileError) { showToast('Image uploaded, but profile update needs a permissions check.', 'error'); return; }
      setCurrentUser((current) => ({ ...current, avatar })); showToast('Profile picture updated.', 'success'); return;
    }
    const avatar = await readFileAsDataURL(file); setCurrentUser((current) => ({ ...current, avatar })); saveLocal('demoUser', { ...currentUser, avatar }); showToast('Profile picture updated in preview mode.', 'success');
  }

  function changeMarketWatchlist(nextSymbols) {
    const next = [...new Set(nextSymbols)];
    const previous = activeWatchMarket;
    setActiveWatchMarket(next); saveLocal('marketWatchlist', next);
    if (supabase && currentUser && !currentUser.demo) {
      const toAdd = next.filter((symbol) => !previous.includes(symbol));
      const toRemove = previous.filter((symbol) => !next.includes(symbol));
      const operations = [];
      if (toAdd.length) operations.push(supabase.from('market_watchlist').upsert(toAdd.map((symbol) => ({ user_id: currentUser.id, symbol })), { onConflict: 'user_id,symbol' }));
      if (toRemove.length) operations.push(supabase.from('market_watchlist').delete().eq('user_id', currentUser.id).in('symbol', toRemove));
      Promise.all(operations).then((results) => { if (results.some((result) => result.error)) showToast('Market list is updated locally, but database saving failed.', 'error'); });
    }
  }

  function addHolding(holding) {
    const localId = `holding-${Date.now()}`;
    const item = { ...holding, id: localId, name: 'Personal entry' };
    setPortfolio((current) => [item, ...current]);
    if (supabase && currentUser && !currentUser.demo) {
      supabase.from('portfolio_holdings').insert({ user_id: currentUser.id, symbol: item.symbol, asset_type: item.type, current_value: item.value, cost_basis: item.cost, notes: item.name }).select('id').single().then(({ data, error }) => {
        if (error) { showToast('Portfolio note is visible locally, but database saving failed. Review RLS setup.', 'error'); return; }
        if (data?.id) setPortfolio((current) => current.map((row) => row.id === localId ? { ...row, id: data.id } : row));
      });
    }
  }

  function removeHolding(id) {
    setPortfolio((current) => current.filter((item) => item.id !== id));
    if (supabase && currentUser && !currentUser.demo && isUuid(id)) supabase.from('portfolio_holdings').delete().eq('id', id).then(({ error }) => error && showToast('Could not remove the database row. Check permissions.', 'error'));
  }

  async function shareArticle(article) {
    const url = `${window.location.origin}/?article=${encodeURIComponent(article.slug || article.id)}`;
    try { if (navigator.share) await navigator.share({ title: article.title, text: article.excerpt, url }); else { await navigator.clipboard.writeText(url); showToast('Article link copied.', 'success'); } }
    catch (error) { if (error.name !== 'AbortError') showToast('Copy the article URL from your browser address bar to share it.', 'info'); }
  }

  // Read an uploaded file in preview mode without sending it to an external service.
  function readFileAsDataURL(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Could not read the selected image.')); reader.readAsDataURL(file); }); }

  const calculator = calculatorList.find((item) => item.id === calculatorId) || null;
  const currentCategory = categories.find((item) => item.name === activeView);
  return (
    <div className="app-shell">
      <Header onHome={() => navigateCategory('Home')} onCategory={navigateCategory} onAuth={openAuth} onWorkspace={openWorkspace} onSearch={() => setSearchOpen(true)} user={currentUser} activeView={activeView}/>
      {workspaceOpen ? <div className="workspace-shell"><WorkspaceSidebar active={workspacePage} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((value) => !value)} onNavigate={navigateWorkspace} user={currentUser} mobileOpen={sidebarMobileOpen} onCloseMobile={() => setSidebarMobileOpen(false)}/><div className="workspace-stage"><button className="workspace-mobile-menu button button-soft button-small" onClick={() => setSidebarMobileOpen(true)}><Icon name="Menu" size={16}/> Menu</button><WorkspaceContent key={workspacePage} page={workspacePage} user={currentUser} articles={articles} watchlist={watchlist} marketWatchlist={activeWatchMarket} portfolio={portfolio} profile={profile} onProfileChange={saveProfile} onAvatarChange={changeAvatar} onAddHolding={addHolding} onRemoveHolding={removeHolding} onMarketWatchChange={changeMarketWatchlist} onToggleWatch={toggleArticleWatch} onOpenArticle={openArticle} onPublish={publishArticle} onDeleteArticle={deleteArticle} onCalculator={openCalculator} onAuth={openAuth} onCategory={navigateCategory} showToast={showToast} cryptoPrices={cryptoPrices} cryptoStatus={cryptoStatus} marketQuotes={marketQuotes} marketCatalog={marketCatalog} marketStatus={marketStatus} marketFetchedAt={marketFetchedAt}/></div>{sidebarMobileOpen && <button className="workspace-sidebar-scrim" onClick={() => setSidebarMobileOpen(false)} aria-label="Close sidebar"/>}</div>
      : selectedArticle ? <ArticleDetail key={selectedArticle.id} article={selectedArticle} onBack={() => navigateCategory('Home')} onCategory={navigateCategory} onToggleWatch={toggleArticleWatch} watched={watchlist.includes(selectedArticle.id)} onShare={shareArticle} user={currentUser} onAuth={openAuth} showToast={showToast} cryptoPrices={cryptoPrices} cryptoStatus={cryptoStatus} marketQuotes={marketQuotes} marketCatalog={marketCatalog} marketStatus={marketStatus} marketFetchedAt={marketFetchedAt}/>
      : activeView === 'News & Insights' ? <NewsInsightsPage articles={articles} onOpenArticle={openArticle} onCategory={navigateCategory} onToggleWatch={toggleArticleWatch} watchlist={watchlist}/>
      : activeView === 'Home' ? <HomePage articles={articles} onOpenArticle={openArticle} onCategory={navigateCategory} onWorkspace={openWorkspace} onCalculator={openCalculator} onAllCalculators={openCalculatorLibrary} onToggleWatch={toggleArticleWatch} watchlist={watchlist} cryptoPrices={cryptoPrices} cryptoStatus={cryptoStatus} marketQuotes={marketQuotes} marketCatalog={marketCatalog} marketStatus={marketStatus} marketFetchedAt={marketFetchedAt}/>
      : currentCategory ? <CategoryPage key={activeView} category={activeView} initialSubcategory={selectedSubcategory} articles={articles} onOpenArticle={openArticle} onCategory={navigateCategory} onToggleWatch={toggleArticleWatch} watchlist={watchlist} onWorkspace={openWorkspace} onCalculator={openCalculator} cryptoPrices={cryptoPrices} cryptoStatus={cryptoStatus}/>
      : <CategoryPage category="Stock Market" articles={articles} onOpenArticle={openArticle} onCategory={navigateCategory} onToggleWatch={toggleArticleWatch} watchlist={watchlist} onWorkspace={openWorkspace} onCalculator={openCalculator} cryptoPrices={cryptoPrices} cryptoStatus={cryptoStatus}/>}
      {authMode && <AuthModal key={authMode} mode={authMode} onClose={() => setAuthMode(null)} onModeChange={setAuthMode} onSubmit={handleAuthSubmit} onGoogle={handleGoogleSignIn} busy={authBusy} configured={isSupabaseConfigured}/>}
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} articles={articles} onOpenArticle={(article) => { setSearchOpen(false); openArticle(article); }} onCategory={(category) => { setSearchOpen(false); navigateCategory(category); }}/>} 
      {calculator && <CalculatorModal key={calculator.id} calculator={calculator} onClose={() => setCalculatorId(null)} showToast={showToast}/>}
      <Toast toast={toast} onClose={() => setToast(null)}/>
    </div>
  );
}
