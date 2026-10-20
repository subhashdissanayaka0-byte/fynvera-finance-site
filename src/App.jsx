// Main application: navigation, articles, workspace, calculators, demo mode and optional Supabase integration.
import React, { useEffect, useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { categories, calculatorList, markets, seedArticles, workspaceItems } from './data/content.js';
import { isSupabaseConfigured, supabase } from './lib/supabase.js';
import { loadLocal, saveLocal } from './lib/storage.js';

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
  const mainLinks = [
    { label: 'Home', action: onHome },
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
                {hasSubcategories && isOpen && <div className="nav-dropdown">
                  <button className="nav-dropdown-all" onClick={() => { onCategory(item.label); setOpenDropdown(null); setMobileOpen(false); }}>All {item.label}<Icon name="ArrowUpRight" size={14} /></button>
                  {category.subcategories.map((subcategory) => <button key={subcategory} onClick={() => { onCategory(item.label, subcategory); setOpenDropdown(null); setMobileOpen(false); }}>{subcategory}<Icon name="ChevronRight" size={14} /></button>)}
                </div>}
              </div>
            );
          })}
          <div className={`more-nav-wrap ${openDropdown === 'More' ? 'more-nav-open' : ''}`}>
            <button className="nav-link" onClick={() => setOpenDropdown((current) => current === 'More' ? null : 'More')} aria-expanded={openDropdown === 'More'}>More <Icon name="ChevronDown" size={13} /></button>
            {openDropdown === 'More' && <div className="nav-dropdown">{categories.filter((item) => !mainLinks.some((nav) => nav.label === item.name)).map((item) => <button key={item.name} onClick={() => { onCategory(item.name); setOpenDropdown(null); setMobileOpen(false); }}>{item.name}<Icon name="ArrowUpRight" size={14} /></button>)}</div>}
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

function MarketPanel({ compact = false, onOpenMarkets }) {
  const [tab, setTab] = useState('Indices');
  const rows = tab === 'Crypto' ? markets.filter((item) => ['BTC', 'ETH'].includes(item.symbol)) : tab === 'Commodities' ? markets.filter((item) => item.symbol === 'GLD') : tab === 'Forex' ? [
    { symbol: 'EUR/USD', name: 'EUR / USD', value: '1.0842', change: '+0.18%', positive: true, color: '#5d91ff' },
    { symbol: 'GBP/USD', name: 'GBP / USD', value: '1.2941', change: '+0.22%', positive: true, color: '#42c6fb' },
    { symbol: 'USD/JPY', name: 'USD / JPY', value: '149.20', change: '-0.12%', positive: false, color: '#9e8cff' }
  ] : markets;
  return (
    <section className={`panel market-panel ${compact ? 'market-panel-compact' : ''}`}>
      <div className="panel-heading"><div className="heading-icon"><Icon name="ChartNoAxesColumnIncreasing" size={20} /></div><h3>Market Overview</h3><button className="text-link text-link-small" onClick={onOpenMarkets}>View All <Icon name="ArrowRight" size={14} /></button></div>
      <div className="market-tabs" role="tablist" aria-label="Market type">
        {['Indices', 'Forex', 'Crypto', 'Commodities'].map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? 'market-tab-active' : ''} onClick={() => setTab(item)}>{item}</button>)}
      </div>
      <div className="market-rows">
        {rows.map((item) => <div className="market-row" key={item.symbol}>
          <span className="market-symbol" style={{ '--symbol-color': item.color }}>{item.symbol.slice(0, 1)}</span>
          <span className="market-name">{item.name}</span><strong>{item.value}</strong>
          <span className={`market-change ${item.positive ? 'positive' : 'negative'}`}><Icon name={item.positive ? 'TrendingUp' : 'TrendingDown'} size={14} />{item.change}</span>
        </div>)}
      </div>
      <div className="sample-data-note"><Icon name="Info" size={12} /> Sample values for preview — not live market data</div>
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
        <div className="article-meta"><span>{article.subcategory || article.category}</span><span className="meta-dot" /><span>{formatDate(article.date)}</span><span className="meta-dot" /><span>{article.readTime || 5} min read</span></div>
        <button className="article-title-button" onClick={() => onOpen(article)}><h3>{article.title}</h3></button>
        <p>{article.excerpt}</p>
        <div className="article-card-footer"><span className="author-mini"><span className="author-initial">{(article.author || 'F').slice(0, 1)}</span>{article.author || 'Fynvera Editorial'}</span><div className="article-actions"><button className={`icon-button ${watched ? 'icon-button-on' : ''}`} onClick={() => onToggleWatch(article)} aria-label={watched ? 'Remove from reading list' : 'Save article'}><Icon name={watched ? 'BookmarkCheck' : 'Bookmark'} size={16} /></button><button className="icon-button" onClick={() => onOpen(article)} aria-label="Read article"><Icon name="ArrowUpRight" size={17} /></button></div></div>
      </div>
    </article>
  );
}

function ArticleDetail({ article, onBack, onCategory, onToggleWatch, watched, onShare }) {
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
          <div className="article-byline"><div className="author-avatar">{(article.author || 'F').slice(0, 1)}</div><div><strong>{article.author || 'Fynvera Editorial'}</strong><small>{article.authorRole || 'Finance Contributor'}</small></div><span className="byline-separator" /><span><Icon name="CalendarDays" size={15} />{formatDate(article.date)}</span><span><Icon name="Clock3" size={15} />{article.readTime || 5} min read</span></div>
          <div className="article-detail-image"><ImageSlot id={article.imageId || 'IMG-ARTICLE-CUSTOM'} src={article.image} alt={article.title} /></div>
          <div className="article-toolbar"><span><Icon name="BookOpenText" size={16} /> Reading guide</span><div><button className={`button button-soft button-small ${watched ? 'button-soft-active' : ''}`} onClick={() => onToggleWatch(article)}><Icon name={watched ? 'BookmarkCheck' : 'Bookmark'} size={15} />{watched ? 'Saved' : 'Save article'}</button><button className="button button-soft button-small" onClick={() => onShare(article)}><Icon name="Share2" size={15} />Share</button></div></div>
          <div className="article-body-copy">{articleText.map((paragraph, index) => <React.Fragment key={`${article.id}-${index}`}><p>{paragraph}</p>{index === 1 && <AdSlot id="ADSLOT-ARTICLE-001" format="article"/>}</React.Fragment>)}<div className="disclaimer-block"><Icon name="ShieldCheck" size={19} /><p><strong>Important note</strong><br />This content is for general education only. It is not personal financial, investment, tax or legal advice. Market values and examples may be illustrative.</p></div></div>
          <div className="keyword-tags">{(article.keywords || []).map((keyword) => <button key={keyword} onClick={() => onCategory(article.category)}>#{keyword.replaceAll(' ', '')}</button>)}</div>
        </article>
        <aside className="article-aside"><MarketPanel compact onOpenMarkets={() => onCategory('Stock Market')} /><div className="panel author-panel"><div className="author-avatar author-avatar-large">{(article.author || 'F').slice(0, 1)}</div><div><h3>{article.author || 'Fynvera Editorial'}</h3><p>{article.authorRole || 'Finance Contributor'}</p></div><p>Clear, practical finance insights to help you make more informed money decisions.</p><button className="button button-outline button-block" onClick={() => onCategory(article.category)}>More in {article.category}<Icon name="ArrowRight" size={15} /></button></div><div className="panel article-aside-tags"><h3><Icon name="Tags" size={17} /> In this article</h3>{(article.keywords || []).slice(0, 5).map((keyword) => <button key={keyword} onClick={() => onCategory(article.category)}>{keyword}</button>)}</div></aside>
      </div>
    </main>
  );
}

function HomePage({ articles, onOpenArticle, onCategory, onWorkspace, onCalculator, onAllCalculators, onToggleWatch, watchlist }) {
  const feature = articles[0] || seedArticles[0];
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

      <div className="market-ticker"><div className="ticker-label"><span className="live-dot" /> MARKET SNAPSHOT</div><div className="ticker-items">{markets.slice(0, 5).map((item) => <div key={item.symbol} className="ticker-item"><span>{item.name}</span><strong>{item.value}</strong><em className={item.positive ? 'positive' : 'negative'}>{item.change}</em></div>)}</div><span className="ticker-demo">DEMO DATA</span></div>
      <AdSlot id="ADSLOT-HOME-001" format="wide"/>

      <section className="home-feature-section section-gap">
        <div className="feature-story-wrap">
          <div className="section-title-row"><div><div className="eyebrow"><span /> THE LATEST</div><h2>Ideas for your next move</h2><p>Market context and money guidance, without the noise.</p></div><button className="text-link" onClick={() => onCategory('Stock Market')}>All insights <Icon name="ArrowRight" size={16} /></button></div>
          <div className="feature-story-card"><button className="feature-image-button" onClick={() => onOpenArticle(feature)}><ImageSlot id={feature.imageId || 'IMG-ARTICLE-001'} src={feature.image} alt={feature.title} className="feature-story-image" /></button><div className="feature-story-info"><div className="article-meta"><span>{feature.category}</span><span className="meta-dot" /><span>{formatDate(feature.date)}</span><span className="meta-dot" /><span>{feature.readTime || 5} min read</span></div><button className="article-title-button" onClick={() => onOpenArticle(feature)}><h3>{feature.title}</h3></button><p>{feature.excerpt}</p><div className="feature-story-bottom"><span className="author-mini"><span className="author-initial">{(feature.author || 'F').slice(0, 1)}</span>By {feature.author || 'Fynvera Editorial'}</span><button className="circle-arrow" onClick={() => onOpenArticle(feature)} aria-label="Read featured article"><Icon name="ArrowUpRight" size={20} /></button></div></div></div>
          <div className="latest-card-grid">{articles.slice(1, 4).map((article) => <ArticleCard key={article.id} article={article} onOpen={onOpenArticle} onToggleWatch={onToggleWatch} watched={watchlist.includes(article.id)} />)}</div>
        </div>
        <aside className="home-sidebar"><MarketPanel onOpenMarkets={() => onCategory('Stock Market')} /><div className="panel trade-cta"><div className="trade-cta-copy"><span className="eyebrow">PLAN WITH PURPOSE</span><h3>Your money journey, all in one place.</h3><p>Track ideas, organize your goals and learn as you go.</p><button className="button button-primary" onClick={onWorkspace}>Explore Workspace <Icon name="ArrowRight" size={16} /></button></div><div className="trade-art"><div className="phone-art"><div className="phone-speaker"/><div className="phone-screen-label">TOTAL VALUE</div><strong>$24,580</strong><svg viewBox="0 0 120 70"><path d="M2 58 L18 48 L29 52 L43 34 L53 40 L68 19 L79 25 L98 12 L118 5" fill="none" stroke="#26d6e7" strokeWidth="2.7"/><path d="M2 58 L18 48 L29 52 L43 34 L53 40 L68 19 L79 25 L98 12 L118 5 L118 70 L2 70 Z" fill="#26d6e7" opacity=".14"/></svg></div></div></div><div className="panel calculator-promo"><div className="panel-heading"><div className="heading-icon"><Icon name="Calculator" size={20} /></div><h3>Tools that make sense</h3><button className="text-link text-link-small" onClick={onAllCalculators}>View all <Icon name="ArrowRight" size={14} /></button></div><div className="calculator-mini-grid">{calculatorList.slice(0, 4).map((calc) => <button key={calc.id} className="calculator-mini" onClick={() => onCalculator(calc.id)}><span><Icon name={calc.icon} size={18} /></span><strong>{calc.name}</strong><small>{calc.description}</small></button>)}</div></div></aside>
      </section>

      <section className="category-section section-gap"><SectionTitle eyebrow="EXPLORE YOUR INTERESTS" title="One home for every money topic" description="Start with a subject you care about. Learn the basics, then go deeper." actionLabel="Browse all topics" onAction={() => onCategory('Education')} /><div className="category-grid">{categories.slice(0, 8).map((category) => <button key={category.name} className={`category-tile tone-${category.color}`} onClick={() => onCategory(category.name)}><span className="category-tile-icon"><Icon name={category.icon} size={21} /></span><strong>{category.name}</strong><small>{category.subcategories.slice(0, 2).join(' · ')}</small><span className="category-arrow"><Icon name="ArrowUpRight" size={16} /></span></button>)}</div></section>
      <AdSlot id="ADSLOT-HOME-002" format="wide"/>

      <section className="workspace-banner section-gap"><div className="workspace-banner-orbit"/><div className="workspace-banner-copy"><div className="eyebrow"><span /> YOUR PRIVATE FINANCE SPACE</div><h2>A clearer picture of your financial life.</h2><p>Bring your watchlist, portfolio notes, money goals and saved reads into one personal workspace.</p><div className="workspace-banner-actions"><button className="button button-primary button-large" onClick={onWorkspace}>Open your workspace <Icon name="ArrowRight" size={17} /></button><span><Icon name="LockKeyhole" size={15} /> Private by design when connected to your account</span></div></div><div className="workspace-preview-card"><div className="preview-card-head"><span>MY OVERVIEW</span><span className="preview-status"><i/> DEMO</span></div><div className="preview-total"><small>Portfolio tracker</small><strong>$18,420.00</strong><span className="positive"><Icon name="TrendingUp" size={14}/> +6.4% <em>illustrative</em></span></div><div className="preview-bars"><i style={{ height: '38%' }}/><i style={{ height: '56%' }}/><i style={{ height: '48%' }}/><i style={{ height: '72%' }}/><i style={{ height: '64%' }}/><i style={{ height: '87%' }}/><i style={{ height: '76%' }}/><i style={{ height: '100%' }}/></div><div className="preview-card-foot"><span><i className="preview-dot preview-dot-blue"/> Investments</span><span><i className="preview-dot preview-dot-cyan"/> Savings goals</span></div></div></section>
      <footer className="site-footer"><div className="footer-main"><Brand onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}/><p>Financial knowledge for a more confident future.</p><div className="footer-socials"><span>Global audience · English edition</span></div></div><div className="footer-links"><div><strong>Explore</strong>{['Stock Market', 'Investing', 'Crypto', 'Forex'].map((item) => <button key={item} onClick={() => onCategory(item)}>{item}</button>)}</div><div><strong>Money</strong>{['Personal Finance', 'Real Estate', 'Commodities', 'Education'].map((item) => <button key={item} onClick={() => onCategory(item)}>{item}</button>)}</div><div><strong>Tools</strong><button onClick={onCalculator}>Financial calculators</button><button onClick={onWorkspace}>Your workspace</button><button onClick={() => onCategory('Regulatory Policy')}>Policy & disclosures</button></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Fynvera. Educational content only.</span><nav className="footer-legal-links" aria-label="Legal links"><a href="/about.html">About</a><a href="/privacy-policy.html">Privacy</a><a href="/terms-of-use.html">Terms</a><a href="/editorial-policy.html">Editorial Policy</a><a href="/financial-disclaimer.html">Disclaimer</a><a href="/contact.html">Contact</a></nav></div></footer>
    </main>
  );
}

function CategoryPage({ category, initialSubcategory = 'All', articles, onOpenArticle, onCategory, onToggleWatch, watchlist, onWorkspace, onCalculator }) {
  const selected = categories.find((item) => item.name === category) || categories[0];
  const [selectedSub, setSelectedSub] = useState(initialSubcategory);
  useEffect(() => setSelectedSub(initialSubcategory || 'All'), [category, initialSubcategory]);
  const list = articles.filter((article) => article.category === selected.name && (selectedSub === 'All' || article.subcategory === selectedSub));
  const displayList = list.length ? list : articles.filter((article) => ['Stock Market', 'Personal Finance', 'Crypto', 'Forex'].includes(article.category)).slice(0, 3);
  return (
    <main className="page-wrap category-page fade-in">
      <div className={`category-hero tone-${selected.color}`}><div className="category-hero-copy"><div className="breadcrumbs"><button onClick={() => onCategory('Home')}>Home</button><Icon name="ChevronRight" size={13}/><span>{selected.name}</span></div><span className="category-label">FYNVERA TOPICS</span><h1>{selected.name}<br/><span>made clearer.</span></h1><p>Understand the trends, concepts and practical decisions shaping {selected.name.toLowerCase()} with useful guides and approachable analysis.</p><div className="category-hero-actions"><button className="button button-primary" onClick={() => onCalculator()}>Explore calculators <Icon name="ArrowRight" size={16}/></button><button className="button button-ghost" onClick={onWorkspace}>Open workspace</button></div></div><div className="category-hero-art"><div className="category-art-ring ring-a"/><div className="category-art-ring ring-b"/><div className="category-art-icon"><Icon name={selected.icon} size={58}/></div><div className="category-art-chip chip-a"><Icon name="ShieldCheck" size={15}/> Learn with context</div><div className="category-art-chip chip-b"><Icon name="ChartNoAxesCombined" size={15}/> Make informed choices</div></div></div>
      <div className="subcategory-row"><strong>Explore {selected.name}</strong><div className="subcategory-chips"><button className={selectedSub === 'All' ? 'subcategory-active' : ''} onClick={() => setSelectedSub('All')}>All topics</button>{selected.subcategories.map((sub) => <button key={sub} className={selectedSub === sub ? 'subcategory-active' : ''} onClick={() => setSelectedSub(sub)}>{sub}</button>)}</div></div>
      <div className="category-content-grid"><div><SectionTitle eyebrow="CURATED FOR YOU" title={selectedSub === 'All' ? `Latest in ${selected.name}` : selectedSub} description="Practical context and useful next steps for your learning journey."/><div className="category-articles-grid">{displayList.map((article) => <ArticleCard key={article.id} article={article} onOpen={onOpenArticle} onToggleWatch={onToggleWatch} watched={watchlist.includes(article.id)}/>)}</div><div className="editorial-note"><Icon name="Info" size={17}/><span>New articles can be published from <strong>Workspace → News & Insights</strong>. Sample articles are provided as editable starter content.</span></div></div><aside className="category-aside"><MarketPanel onOpenMarkets={() => onCategory('Stock Market')}/><div className="panel topic-list-panel"><h3><Icon name="Layers3" size={17}/> {selected.name} topics</h3>{selected.subcategories.map((sub, index) => <button key={sub} onClick={() => setSelectedSub(sub)}><span className="topic-number">0{index + 1}</span><span>{sub}</span><Icon name="ArrowUpRight" size={15}/></button>)}</div><div className="panel learn-cta"><Icon name="GraduationCap" size={23}/><h3>Learn a little every day.</h3><p>Save articles you want to revisit and build your own reading list.</p><button className="button button-outline button-block" onClick={onWorkspace}>Open reading list <Icon name="ArrowRight" size={15}/></button></div></aside></div>
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
        <div className="auth-divider"><span/>or continue with<span/></div><button className="button button-google button-block" onClick={onGoogle}><Icon name="Chrome" size={18}/>{configured ? 'Continue with Google' : 'Try Google sign-in (preview)'}</button>
        {!configured && <p className="preview-warning"><Icon name="Info" size={14}/> Preview mode: accounts are simulated until you connect Supabase.</p>}
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
  const [values, setValues] = useState({ principal: '10000', monthly: '300', rate: '7', years: '10', amount: '250000', down: '50000', mortgageRate: '6.5', term: '30', age: '30', retireAge: '65', monthlySave: '400', amountToConvert: '100', fromCurrency: 'USD', toCurrency: 'EUR', loanAmount: '12000', loanRate: '9.5', loanTerm: '36' });
  const update = (key, value) => setValues((current) => ({ ...current, [key]: value }));
  const number = (key) => Math.max(0, Number(values[key]) || 0);
  const money = (value, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);
  const calculated = useMemo(() => {
    if (!calculator || calculator.id === 'currency') {
      const rates = { USD: 1, EUR: 0.92, GBP: 0.78, LKR: 300, JPY: 149.5, AUD: 1.52, CAD: 1.36 };
      return { result: number('amountToConvert') * (rates[values.toCurrency] || 1) / (rates[values.fromCurrency] || 1), label: 'Estimated converted amount', note: 'Illustrative rates only. Enter current rates before making a real transfer.' };
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
      </div><div className="calculator-result-card"><span className="result-label"><Icon name="Sparkles" size={15}/>{calculated.label}</span><strong>{money(calculated.result, calculator.id === 'currency' ? values.toCurrency : 'USD')}</strong><p>{calculated.note}</p><div className="result-foot"><Icon name="ShieldCheck" size={15}/> Free · Private preview · No financial account connection</div></div></div>
      <div className="calculator-modal-footer"><span><Icon name="Info" size={14}/> Estimates are educational, not financial advice.</span><button className="button button-primary" onClick={() => { showToast('Your calculator inputs are ready to save in Workspace settings.', 'success'); onClose(); }}>Done <Icon name="Check" size={16}/></button></div></section></div>
  );
}

function WorkspaceSidebar({ active, collapsed, onToggle, onNavigate, user, mobileOpen, onCloseMobile }) {
  return (
    <aside className={`workspace-sidebar ${collapsed ? 'workspace-sidebar-collapsed' : ''} ${mobileOpen ? 'workspace-sidebar-mobile-open' : ''}`}>
      <div className="workspace-brand-row"><Brand onClick={() => onNavigate('Dashboard')}/><button className="icon-button sidebar-collapse" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Minimize sidebar'}><Icon name={collapsed ? 'PanelLeftOpen' : 'PanelLeftClose'} size={18}/></button><button className="icon-button sidebar-mobile-close" onClick={onCloseMobile} aria-label="Close workspace navigation"><Icon name="X" size={18}/></button></div>
      <div className="workspace-user-mini"><span className="avatar avatar-medium">{user?.avatar ? <img src={user.avatar} alt=""/> : (user?.name || user?.email || 'U').slice(0, 1).toUpperCase()}</span><div><strong>{user?.name || 'Your workspace'}</strong><small>{user?.email || 'Preview account'}</small></div><span className="user-status-dot"/></div>
      <div className="sidebar-section-label">WORKSPACE</div>
      <nav className="workspace-nav" aria-label="Workspace navigation">{workspaceItems.map((item) => <button key={item.label} title={collapsed ? item.label : undefined} className={`workspace-nav-link ${active === item.label ? 'workspace-nav-active' : ''} ${item.special ? 'workspace-nav-logout' : ''}`} onClick={() => { onNavigate(item.label); onCloseMobile(); }}><Icon name={item.icon} size={19}/><span>{item.label}</span>{active === item.label && <i className="nav-active-indicator"/>}</button>)}</nav>
      <div className="sidebar-bottom-card"><div className="sidebar-bottom-icon"><Icon name="Sparkles" size={17}/></div><strong>Small steps add up.</strong><p>Learn a new money concept this week.</p><button onClick={() => onNavigate('Education')}>Explore learning <Icon name="ArrowRight" size={14}/></button></div>
      <div className="sidebar-footer"><span className="privacy-dot"/> {collapsed ? 'Private' : 'Your space, your pace'}</div>
    </aside>
  );
}

function WorkspaceContent({ page, user, articles, watchlist, marketWatchlist, portfolio, profile, onProfileChange, onAvatarChange, onAddHolding, onRemoveHolding, onMarketWatchChange, onToggleWatch, onOpenArticle, onPublish, onCalculator, onAuth, onCategory, showToast }) {
  const [editor, setEditor] = useState(false);
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('Investing');
  const [subcategory, setSubcategory] = useState(categories.find((item) => item.name === 'Investing').subcategories[0]);
  const [body, setBody] = useState('');
  const [keywords, setKeywords] = useState('investing, finance, money');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [holdingSymbol, setHoldingSymbol] = useState('VOO');
  const [holdingType, setHoldingType] = useState('ETF');
  const [holdingAmount, setHoldingAmount] = useState('1500');
  const [holdingCost, setHoldingCost] = useState('1400');
  const [saving, setSaving] = useState(false);
  const [profileDraft, setProfileDraft] = useState(profile);
  const [riskLevel, setRiskLevel] = useState(profile.riskLevel || 'Moderate');
  useEffect(() => { setProfileDraft(profile); setRiskLevel(profile.riskLevel || 'Moderate'); }, [profile]);
  useEffect(() => { const cat = categories.find((item) => item.name === category); if (cat && !cat.subcategories.includes(subcategory)) setSubcategory(cat.subcategories[0]); }, [category, subcategory]);
  const resetEditor = () => { setEditor(false); setTitle(''); setExcerpt(''); setBody(''); setKeywords('investing, finance, money'); setImageFile(null); setImagePreview(''); };
  const changeImage = (file) => {
    if (file && file.size > 5 * 1024 * 1024) { showToast('Please choose an article image smaller than 5 MB.', 'error'); setImageFile(null); setImagePreview(''); return; }
    setImageFile(file || null);
    if (!file) { setImagePreview(''); return; }
    const reader = new FileReader(); reader.onload = () => setImagePreview(String(reader.result)); reader.readAsDataURL(file);
  };
  const submitArticle = async (event) => { event.preventDefault(); if (!title.trim() || !excerpt.trim() || !body.trim()) { showToast('Add a headline, summary and article body first.', 'error'); return; } setSaving(true); const result = await onPublish({ title, excerpt, category, subcategory, body: body.split('\n\n').filter(Boolean), keywords: keywords.split(',').map((item) => item.trim()).filter(Boolean), imageFile, imagePreview }); setSaving(false); if (result?.ok) { resetEditor(); showToast(result.message || 'Article published.', 'success'); } else if (result?.message) showToast(result.message, 'error'); };
  const updateProfileField = (key, value) => setProfileDraft((current) => ({ ...current, [key]: value }));
  const saveCurrentProfile = () => { onProfileChange({ ...profileDraft, riskLevel }); showToast('Profile preferences saved.', 'success'); };
  const portfolioValue = portfolio.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const latestItems = articles.slice(0, 3);

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
      {page === 'Watchlist' && <><div className="workspace-welcome"><div><div className="eyebrow"><span/> KEEP AN EYE ON WHAT MATTERS</div><h1>Your Watchlist</h1><p>Save articles and track example markets worth following.</p></div><button className="button button-primary" onClick={() => onCategory('Stock Market')}><Icon name="Plus" size={16}/> Discover more</button></div><div className="watchlist-market-grid">{markets.map((item) => { const saved = marketWatchlist.includes(item.symbol); return <div key={item.symbol} className="watchlist-market-card"><div className="watch-market-top"><span className="market-symbol" style={{ '--symbol-color': item.color }}>{item.symbol.slice(0, 1)}</span><button className={`icon-button ${saved ? 'icon-button-on' : ''}`} onClick={() => { const next = saved ? marketWatchlist.filter((symbol) => symbol !== item.symbol) : [...marketWatchlist, item.symbol]; onMarketWatchChange(next); showToast(saved ? `${item.name} removed from watchlist.` : `${item.name} added to watchlist.`, 'success'); }}>{saved ? <Icon name="Star" size={17} fill="currentColor"/> : <Icon name="Star" size={17}/>}</button></div><strong>{item.name}</strong><div className="watch-market-value">{item.value}</div><span className={`market-change ${item.positive ? 'positive' : 'negative'}`}><Icon name={item.positive ? 'TrendingUp' : 'TrendingDown'} size={14}/>{item.change}</span><div className="tiny-sparkline"><svg viewBox="0 0 180 42"><path d="M0 35 L18 30 L34 34 L48 20 L63 25 L81 16 L96 20 L112 9 L130 16 L148 6 L180 4" fill="none" stroke={item.color} strokeWidth="2.5" strokeLinecap="round"/></svg></div><small>Sample data · Not real-time</small></div>; })}</div><section className="workspace-latest-section"><SectionTitle eyebrow="SAVED ARTICLES" title="Read again when you're ready"/><div className="workspace-article-grid">{articles.filter((article) => watchlist.includes(article.id)).map((article) => <ArticleCard key={article.id} article={article} onOpen={onOpenArticle} onToggleWatch={onToggleWatch} watched/>)}</div>{!articles.some((article) => watchlist.includes(article.id)) && <div className="empty-state"><Icon name="Bookmark" size={26}/><strong>Your reading list is waiting.</strong><span>Save an article using its bookmark icon and it will appear here.</span><button className="button button-outline" onClick={() => onNavigateSafe('News & Insights')}>Explore insights</button></div>}</section></>}
      {page === 'News & Insights' && <><div className="workspace-welcome"><div><div className="eyebrow"><span/> EDITORIAL DESK</div><h1>News & Insights</h1><p>Manage articles, prepare daily posts and share financial education with a global audience.</p></div><button className="button button-primary" onClick={() => setEditor((value) => !value)}><Icon name={editor ? 'X' : 'Plus'} size={16}/>{editor ? 'Close editor' : 'Publish an article'}</button></div>{editor && <section className="panel article-editor-panel"><div className="editor-panel-heading"><div><span className="eyebrow"><span/> NEW STORY</span><h2>Create an insight</h2><p>Write your article and add an image you generated for this post.</p></div><div className="editor-image-preview">{imagePreview ? <img src={imagePreview} alt="Article preview"/> : <><Icon name="ImagePlus" size={25}/><span>IMG-ARTICLE-CUSTOM</span></>}</div></div><form className="article-editor-form" onSubmit={submitArticle}><div className="editor-form-main"><label className="field-label">Article headline<input className="plain-field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Write a clear, useful headline" maxLength={120} required/></label><label className="field-label">Short summary<textarea className="plain-field" value={excerpt} onChange={(event) => setExcerpt(event.target.value)} placeholder="What will readers learn? (140–220 characters works well)" rows={3} required/></label><div className="editor-form-two"><label className="field-label">Category<select className="select-field" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item.name}>{item.name}</option>)}</select></label><label className="field-label">Subcategory<select className="select-field" value={subcategory} onChange={(event) => setSubcategory(event.target.value)}>{(categories.find((item) => item.name === category)?.subcategories || []).map((item) => <option key={item}>{item}</option>)}</select></label></div><label className="field-label">Article body<textarea className="plain-field article-body-input" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write your article here. Separate paragraphs with a blank line. Explain concepts clearly and cite reliable sources when needed." rows={10} required/></label><label className="field-label">SEO keywords <small>(comma separated)</small><input className="plain-field" value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="investing, finance news, wealth building"/></label></div><div className="editor-form-aside"><label className="image-upload-zone"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => changeImage(event.target.files?.[0])}/><Icon name="CloudUpload" size={26}/><strong>{imageFile ? imageFile.name : 'Add article image'}</strong><span>PNG, JPG or WebP · 5 MB recommended</span><small>Upload your own generated image. It is stored locally in preview mode, or in Supabase Storage when configured.</small></label><div className="seo-preview"><div className="seo-preview-label"><Icon name="Search" size={15}/> SEARCH PREVIEW</div><strong>{title || 'Your article headline'} | Fynvera</strong><span>fynvera.example › insights › {slugify(title) || 'your-article'}</span><p>{excerpt || 'Add a useful article description for search results and social previews.'}</p><small>Tip: use your main keyword naturally in the headline, intro and subheadings.</small></div><div className="editor-checklist"><strong><Icon name="ClipboardCheck" size={16}/> Before publishing</strong><span><Icon name="CheckCircle2" size={14}/> Clear title and summary</span><span><Icon name="CheckCircle2" size={14}/> Helpful, original content</span><span><Icon name="CheckCircle2" size={14}/> Relevant image and alt text</span><span><Icon name="CheckCircle2" size={14}/> Educational disclaimer</span></div></div><div className="editor-actions"><button type="button" className="button button-outline" onClick={resetEditor}>Cancel</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? <Icon name="LoaderCircle" className="spin" size={16}/> : <Icon name="Send" size={16}/>} {saving ? 'Publishing…' : 'Publish article'} <Icon name="ArrowRight" size={16}/></button></div></form></section>}<div className="editorial-toolbar"><div><strong>{articles.length} articles</strong><span>Manage your current library</span></div><div><button className="button button-soft button-small" onClick={() => showToast('Drafts are stored when you publish in the configured database. This demo editor does not save separate drafts yet.', 'info')}><Icon name="FileEdit" size={15}/> Draft workflow</button></div></div><div className="manage-article-list">{articles.map((article) => <div className="manage-article-row" key={article.id}><ImageSlot id={article.imageId || 'IMG-ARTICLE-CUSTOM'} src={article.image} alt={article.title} compact/><div className="manage-article-copy"><span className="article-status"><i/> PUBLISHED · {article.category}</span><button onClick={() => onOpenArticle(article)}><strong>{article.title}</strong></button><small>{formatDate(article.date)} · {article.readTime || 5} min read · by {article.author || user?.name || 'Fynvera Editorial'}</small></div><button className="button button-soft button-small" onClick={() => onOpenArticle(article)}>Preview <Icon name="ArrowUpRight" size={14}/></button></div>)}</div></>}
      {page === 'Markets' && <><div className="workspace-welcome"><div><div className="eyebrow"><span/> MARKET MONITOR</div><h1>Markets</h1><p>Keep an eye on sample index, currency and digital asset data before doing your own research.</p></div><span className="data-pill"><i/> SAMPLE QUOTES</span></div><MarketPanel onOpenMarkets={() => showToast('These example quotes are illustrative; connect a licensed live data provider only when you are ready.', 'info')}/><div className="market-explainer-grid"><div className="panel"><Icon name="BookOpenText" size={22}/><h3>Understand the numbers</h3><p>Price, percentage change, market cap and volume describe different parts of a market. Compare like with like before drawing conclusions.</p></div><div className="panel"><Icon name="ShieldCheck" size={22}/><h3>Know the risks</h3><p>Markets can gap, quotes can be delayed and currency movements can change investment results. This starter site intentionally uses sample data.</p></div><div className="panel"><Icon name="Search" size={22}/><h3>Do your own research</h3><p>Use issuer filings, official economic releases and regulated sources to validate important financial information.</p></div></div></>}
      {page === 'Tools & Calculators' && <><div className="workspace-welcome"><div><div className="eyebrow"><span/> FREE FINANCIAL TOOLS</div><h1>Tools & Calculators</h1><p>Try scenarios with five helpful calculators. Change the assumptions to learn how the result moves.</p></div><span className="data-pill"><Icon name="Zap" size={14}/> NO API REQUIRED</span></div><div className="all-calculators-grid">{calculatorList.map((calculator) => <button key={calculator.id} className="large-calculator-card" onClick={() => onCalculator(calculator.id)}><span className="large-calculator-icon"><Icon name={calculator.icon} size={23}/></span><strong>{calculator.name}</strong><p>{calculator.description}</p><span className="calculator-open-link">Open calculator <Icon name="ArrowUpRight" size={15}/></span></button>)}</div><div className="calculator-disclaimer"><Icon name="Info" size={17}/><span>Outputs are estimates based on the values you enter. Currency exchange rates are editable examples, not live quotes. No calculators connect to a financial institution.</span></div></>}
      {page === 'Settings' && <><div className="workspace-welcome"><div><div className="eyebrow"><span/> MAKE IT YOURS</div><h1>Account settings</h1><p>Update your display profile, financial preferences and personal planning details.</p></div><span className="data-pill"><Icon name="LockKeyhole" size={14}/> {isSupabaseConfigured ? 'ACCOUNT CONNECTED' : 'LOCAL PREVIEW'}</span></div><div className="settings-layout"><section className="panel settings-profile-panel"><div className="panel-heading"><div><h3>Profile information</h3><p>Choose how your workspace looks to you.</p></div><span className="heading-icon"><Icon name="UserRound" size={19}/></span></div><div className="profile-avatar-editor"><span className="avatar avatar-large">{user?.avatar ? <img src={user.avatar} alt="Profile"/> : (profileDraft.name || user?.email || 'U').slice(0, 1).toUpperCase()}</span><div><strong>{profileDraft.name || user?.name || 'Fynvera member'}</strong><small>{user?.email || 'Preview user'}</small><label className="button button-soft button-small avatar-upload-button"><Icon name="Camera" size={14}/> Change profile picture<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { if (event.target.files?.[0]) onAvatarChange(event.target.files[0]); }}/></label></div></div><div className="settings-form-grid"><label className="field-label">Display name<input className="plain-field" value={profileDraft.name || ''} onChange={(event) => updateProfileField('name', event.target.value)} placeholder="Your name"/></label><label className="field-label">Location / country<input className="plain-field" value={profileDraft.country || ''} onChange={(event) => updateProfileField('country', event.target.value)} placeholder="Country (optional)"/></label><label className="field-label">Preferred currency<select className="select-field" value={profileDraft.currency || 'USD'} onChange={(event) => updateProfileField('currency', event.target.value)}>{['USD', 'EUR', 'GBP', 'LKR', 'AUD', 'CAD', 'INR', 'JPY'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="field-label">Financial knowledge<select className="select-field" value={profileDraft.experience || 'Beginner'} onChange={(event) => updateProfileField('experience', event.target.value)}>{['Beginner', 'Intermediate', 'Advanced'].map((item) => <option key={item}>{item}</option>)}</select></label></div><button className="button button-primary" onClick={saveCurrentProfile}><Icon name="Save" size={16}/> Save profile</button></section><section className="panel finance-preferences-panel"><div className="panel-heading"><div><h3>Financial planning preferences</h3><p>Optional planning details, stored locally until backend is configured.</p></div><span className="heading-icon"><Icon name="Target" size={19}/></span></div><label className="field-label">Main financial goal<select className="select-field" value={profileDraft.goal || 'Build long-term wealth'} onChange={(event) => updateProfileField('goal', event.target.value)}>{['Build long-term wealth', 'Grow savings', 'Pay down debt', 'Plan for retirement', 'Buy a home', 'Learn how to invest'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="field-label">Risk comfort level<select className="select-field" value={riskLevel} onChange={(event) => setRiskLevel(event.target.value)}>{['Conservative', 'Moderate', 'Growth-oriented'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="field-label">Monthly savings target<input className="plain-field" type="number" min="0" value={profileDraft.monthlyTarget || ''} onChange={(event) => updateProfileField('monthlyTarget', event.target.value)} placeholder="e.g. 250"/></label><label className="field-label">Planning notes<textarea className="plain-field" rows={4} value={profileDraft.notes || ''} onChange={(event) => updateProfileField('notes', event.target.value)} placeholder="Goals, milestones or questions to discuss with an adviser"/></label><button className="button button-outline" onClick={saveCurrentProfile}><Icon name="Save" size={16}/> Save planning preferences</button><div className="settings-security-note"><Icon name="ShieldCheck" size={18}/><span><strong>Privacy tip</strong> Never store passwords, card numbers or bank login details in notes. Use the official website of your financial institution for account access.</span></div></section></div><section className="panel connected-services-panel"><Icon name="Database" size={20}/><div><h3>Account and database connection</h3><p>{isSupabaseConfigured ? 'Supabase credentials were detected. Verify Authentication, Storage buckets and Row Level Security policies in your project.' : 'No API key is needed for the preview. To enable verified email, Google sign-in, persistent accounts and cross-device data, use the free Supabase starter setup included in README.md.'}</p></div><button className="button button-soft" onClick={() => showToast(isSupabaseConfigured ? 'Supabase environment variables are present. See SETUP_GUIDE.md to validate policies.' : 'Open SETUP_GUIDE.md in the project ZIP for the free Supabase setup, including Google OAuth.', 'info')}>Setup guide <Icon name="ArrowUpRight" size={15}/></button></section></>}
      {['Investing', 'Forex', 'Personal Finance', 'Real Estate', 'Commodities', 'Education', 'Regulatory Policy'].includes(page) && <CategoryWorkspace page={page} articles={articles} onCategory={onCategory} onOpenArticle={onOpenArticle} onCalculator={onCalculator} onToggleWatch={onToggleWatch} watchlist={watchlist}/>}
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
  const matching = articles.filter((article) => article.category === page);
  const fallback = matching.length ? matching : articles.slice(0, 3);
  const meta = categories.find((item) => item.name === page) || categories[1];
  return <><div className="workspace-welcome"><div><div className="eyebrow"><span/> LEARN & EXPLORE</div><h1>{page}</h1><p>Browse curated guides, explore important concepts and keep your next steps practical.</p></div><button className="button button-primary" onClick={() => onCalculator()}><Icon name="Calculator" size={16}/> Use a calculator</button></div><div className="workspace-topic-chips">{meta.subcategories.map((sub) => <button key={sub} onClick={() => onCategory(page)}>{sub}<Icon name="ArrowUpRight" size={14}/></button>)}</div><div className="workspace-article-grid">{fallback.map((article) => <ArticleCard key={article.id} article={article} onOpen={onOpenArticle} onToggleWatch={onToggleWatch} watched={watchlist.includes(article.id)}/>)}</div><div className="panel category-workspace-disclaimer"><Icon name="BookOpenText" size={18}/><div><strong>Keep learning, one concept at a time</strong><p>Some categories may not have published sample articles yet. Use News & Insights to publish original content with images and relevant keywords.</p></div></div></>;
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
  const [currentUser, setCurrentUser] = useState(() => loadLocal('demoUser', null));
  const [articles, setArticles] = useState(() => loadLocal('articles', seedArticles));
  const [watchlist, setWatchlist] = useState(() => loadLocal('articleWatchlist', []));
  // Start with an empty portfolio: users should not mistake illustrative figures for their own finances.
  const [portfolio, setPortfolio] = useState(() => loadLocal('portfolio', []));
  const [profile, setProfile] = useState(() => loadLocal('profile', { name: '', country: '', currency: 'USD', experience: 'Beginner', goal: 'Build long-term wealth', riskLevel: 'Moderate', monthlyTarget: '', notes: '' }));
  const [activeWatchMarket, setActiveWatchMarket] = useState(() => loadLocal('marketWatchlist', ['SPX', 'BTC']));

  const showToast = (message, type = 'info') => { setToast({ message, type, id: Date.now() }); window.setTimeout(() => setToast((value) => value?.message === message ? null : value), 3800); };
  const navigateCategory = (name, subcategory = 'All') => { setSelectedArticle(null); setWorkspaceOpen(false); setSelectedSubcategory(subcategory || 'All'); setActiveView(name === 'Home' ? 'Home' : name); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openWorkspace = () => { setWorkspaceOpen(true); setWorkspacePage('Dashboard'); setSelectedArticle(null); setActiveView('Workspace'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openCalculatorLibrary = () => { setWorkspaceOpen(true); setWorkspacePage('Tools & Calculators'); setSelectedArticle(null); setActiveView('Workspace'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const navigateWorkspace = (page) => {
    if (page === 'Log Out') { setWorkspacePage('Log Out'); return; }
    setWorkspacePage(page); setWorkspaceOpen(true); setSelectedArticle(null); setActiveView('Workspace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openArticle = (article) => { setSelectedArticle(article); setWorkspaceOpen(false); setActiveView('Article'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openCalculator = (id) => { setCalculatorId(id || calculatorList[0].id); };
  const openAuth = (mode) => { if (mode === 'logout') { handleLogout(); return; } setAuthMode(mode); };

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
      if (!session?.user) return;
      const authUser = session.user;
      const nextUser = { id: authUser.id, email: authUser.email, name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0], avatar: authUser.user_metadata?.avatar_url || '', demo: false };
      setCurrentUser(nextUser); saveLocal('demoUser', nextUser);
    });
    return () => { isMounted = false; listener.subscription.unsubscribe(); };
  }, []);

  // Fetch database articles after Supabase is connected; local starter articles remain available as fallbacks.
  useEffect(() => {
    if (!supabase) return;
    let isMounted = true;
    supabase.from('articles').select('id,title,slug,excerpt,category,subcategory,author,author_role,image_url,body,keywords,published_at,read_time').eq('status', 'published').order('published_at', { ascending: false }).limit(100).then(({ data, error }) => {
      if (error || !data?.length || !isMounted) return;
      const databaseArticles = data.map((row) => ({ id: row.id, title: row.title, slug: row.slug, excerpt: row.excerpt, category: row.category, subcategory: row.subcategory, author: row.author || 'Fynvera Editorial', authorRole: row.author_role || 'Finance Contributor', image: row.image_url || '', imageId: 'IMG-ARTICLE-CUSTOM', body: Array.isArray(row.body) ? row.body : [String(row.body || '')], keywords: row.keywords || [], date: row.published_at?.slice(0, 10), readTime: row.read_time || 5 }));
      setArticles((current) => [...databaseArticles, ...current.filter((article) => String(article.id).startsWith('seed-') || String(article.id).startsWith('demo-'))]);
    });
    return () => { isMounted = false; };
  }, []);

  // Load this signed-in user's private records from Supabase (RLS limits each query to that owner).
  useEffect(() => {
    if (!supabase || !currentUser || currentUser.demo) return undefined;
    let isMounted = true;
    Promise.all([
      supabase.from('portfolio_holdings').select('id,symbol,asset_type,current_value,cost_basis,notes').order('created_at', { ascending: false }),
      supabase.from('watchlist').select('article_id').order('created_at', { ascending: false }),
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
            setCurrentUser(user); saveLocal('demoUser', user); setProfile((current) => ({ ...current, name })); setAuthMode(null); openWorkspace(); showToast('Account created successfully.', 'success');
            return { ok: true };
          }
          return { message: 'Check your inbox to verify your email, then return here to sign in.' };
        }
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          const user = { id: data.user.id, email: data.user.email, name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0], avatar: data.user.user_metadata?.avatar_url || '', demo: false };
          setCurrentUser(user); saveLocal('demoUser', user); setAuthMode(null); openWorkspace(); showToast('Welcome back to Fynvera.', 'success');
        }
        return { ok: true };
      }
      // Demo mode never persists or validates the password. It previews the interface only, not real authentication.
      const user = { id: `demo-${Date.now()}`, email, name: name.trim() || email.split('@')[0], avatar: '', demo: true };
      setCurrentUser(user); saveLocal('demoUser', user); setProfile((current) => ({ ...current, name: user.name })); setAuthMode(null); openWorkspace();
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
    const user = { id: `demo-google-${Date.now()}`, email: 'google-preview@fynvera.local', name: 'Google Preview User', avatar: '', demo: true };
    setCurrentUser(user); saveLocal('demoUser', user); setProfile((current) => ({ ...current, name: user.name })); setAuthMode(null); openWorkspace();
    showToast('Google button preview only. Connect Supabase to enable real Google OAuth.', 'info');
  }

  async function handleLogout() {
    if (supabase) { const { error } = await supabase.auth.signOut(); if (error) showToast(error.message, 'error'); }
    setCurrentUser(null); saveLocal('demoUser', null); setAuthMode(null); setWorkspaceOpen(false); setWorkspacePage('Dashboard'); setActiveView('Home'); setSelectedArticle(null); showToast('You have left the workspace.', 'success');
  }

  function toggleArticleWatch(article) {
    setWatchlist((current) => {
      const exists = current.includes(article.id); const next = exists ? current.filter((id) => id !== article.id) : [...current, article.id];
      showToast(exists ? 'Removed from your reading list.' : 'Saved to your reading list.', 'success'); return next;
    });
    if (supabase && currentUser && !currentUser.demo && isUuid(article.id)) {
      // Only database-backed article IDs are UUIDs; seed/demo IDs stay in the local reading list.
      const exists = watchlist.includes(article.id);
      if (exists) supabase.from('watchlist').delete().eq('user_id', currentUser.id).eq('article_id', article.id).then(({ error }) => error && console.warn(error));
      else supabase.from('watchlist').upsert({ user_id: currentUser.id, article_id: article.id }, { onConflict: 'user_id,article_id' }).then(({ error }) => error && console.warn(error));
    }
  }

  async function publishArticle(form) {
    if (!currentUser) { setAuthMode('signup'); return { message: 'Create a free account to start publishing from your workspace.' }; }
    let imageUrl = form.imagePreview || '';
    const articleSlug = `${slugify(form.title)}-${Date.now().toString().slice(-5)}`;
    if (supabase && !currentUser.demo) {
      try {
        if (form.imageFile) {
          const file = form.imageFile; const safeName = `${currentUser.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
          const { error: uploadError } = await supabase.storage.from('article-images').upload(safeName, file, { upsert: true, contentType: file.type });
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage.from('article-images').getPublicUrl(safeName); imageUrl = urlData.publicUrl;
        }
        const newArticle = { author_id: currentUser.id, title: form.title.trim(), slug: articleSlug, excerpt: form.excerpt.trim(), category: form.category, subcategory: form.subcategory, author: currentUser.name, author_role: 'Fynvera Contributor', image_url: imageUrl, body: form.body, keywords: form.keywords, read_time: Math.max(1, Math.ceil(form.body.join(' ').split(/\s+/).length / 220)), status: 'published' };
        const { data, error } = await supabase.from('articles').insert(newArticle).select().single();
        if (error) throw error;
        setArticles((current) => [{ ...form, id: data.id, author: data.author, authorRole: data.author_role, image: imageUrl, imageId: 'IMG-ARTICLE-CUSTOM', date: data.published_at?.slice(0, 10) || new Date().toISOString().slice(0, 10), readTime: data.read_time, slug: articleSlug }, ...current]);
        return { ok: true, message: 'Article published to the connected database.' };
      } catch (error) { return { message: `${error.message} Check the article_editors allow-list, articles table, and article-images bucket policies.` }; }
    }
    // Demo publication is stored in this browser only. Image previews use Data URLs for the same reason.
    if (form.imageFile && !imageUrl) imageUrl = await readFileAsDataURL(form.imageFile);
    const item = { id: `demo-${Date.now()}`, title: form.title.trim(), excerpt: form.excerpt.trim(), category: form.category, subcategory: form.subcategory, author: currentUser.name || 'Fynvera Contributor', authorRole: 'Fynvera Contributor', date: new Date().toISOString().slice(0, 10), readTime: Math.max(1, Math.ceil(form.body.join(' ').split(/\s+/).length / 220)), image: imageUrl, imageId: 'IMG-ARTICLE-CUSTOM', keywords: form.keywords, body: form.body, slug: articleSlug };
    setArticles((current) => [item, ...current]);
    return { ok: true, message: 'Article published in this browser preview. Connect Supabase for public, cross-device publishing.' };
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
      {workspaceOpen ? <div className="workspace-shell"><WorkspaceSidebar active={workspacePage} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((value) => !value)} onNavigate={navigateWorkspace} user={currentUser} mobileOpen={sidebarMobileOpen} onCloseMobile={() => setSidebarMobileOpen(false)}/><div className="workspace-stage"><button className="workspace-mobile-menu button button-soft button-small" onClick={() => setSidebarMobileOpen(true)}><Icon name="Menu" size={16}/> Menu</button><WorkspaceContent key={workspacePage} page={workspacePage} user={currentUser} articles={articles} watchlist={watchlist} marketWatchlist={activeWatchMarket} portfolio={portfolio} profile={profile} onProfileChange={saveProfile} onAvatarChange={changeAvatar} onAddHolding={addHolding} onRemoveHolding={removeHolding} onMarketWatchChange={changeMarketWatchlist} onToggleWatch={toggleArticleWatch} onOpenArticle={openArticle} onPublish={publishArticle} onCalculator={openCalculator} onAuth={openAuth} onCategory={navigateCategory} showToast={showToast}/></div>{sidebarMobileOpen && <button className="workspace-sidebar-scrim" onClick={() => setSidebarMobileOpen(false)} aria-label="Close sidebar"/>}</div>
      : selectedArticle ? <ArticleDetail article={selectedArticle} onBack={() => navigateCategory('Home')} onCategory={navigateCategory} onToggleWatch={toggleArticleWatch} watched={watchlist.includes(selectedArticle.id)} onShare={shareArticle}/>
      : activeView === 'Home' ? <HomePage articles={articles} onOpenArticle={openArticle} onCategory={navigateCategory} onWorkspace={openWorkspace} onCalculator={openCalculator} onAllCalculators={openCalculatorLibrary} onToggleWatch={toggleArticleWatch} watchlist={watchlist}/>
      : currentCategory ? <CategoryPage key={activeView} category={activeView} initialSubcategory={selectedSubcategory} articles={articles} onOpenArticle={openArticle} onCategory={navigateCategory} onToggleWatch={toggleArticleWatch} watchlist={watchlist} onWorkspace={openWorkspace} onCalculator={openCalculator}/>
      : <CategoryPage category="Stock Market" articles={articles} onOpenArticle={openArticle} onCategory={navigateCategory} onToggleWatch={toggleArticleWatch} watchlist={watchlist} onWorkspace={openWorkspace} onCalculator={openCalculator}/>}
      {authMode && <AuthModal key={authMode} mode={authMode} onClose={() => setAuthMode(null)} onModeChange={setAuthMode} onSubmit={handleAuthSubmit} onGoogle={handleGoogleSignIn} busy={authBusy} configured={isSupabaseConfigured}/>}
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} articles={articles} onOpenArticle={(article) => { setSearchOpen(false); openArticle(article); }} onCategory={(category) => { setSearchOpen(false); navigateCategory(category); }}/>} 
      {calculator && <CalculatorModal key={calculator.id} calculator={calculator} onClose={() => setCalculatorId(null)} showToast={showToast}/>}
      <Toast toast={toast} onClose={() => setToast(null)}/>
    </div>
  );
}
