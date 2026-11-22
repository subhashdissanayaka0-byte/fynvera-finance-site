// Central content file: edit article copy, market rows, and category names here.
export const categories = [
  { name: 'Stock Market', icon: 'ChartNoAxesCombined', color: 'cyan', subcategories: ['Market News', 'Stock Analysis', 'ETFs & Index Funds', 'Dividends', 'Trading Basics'] },
  { name: 'Investing', icon: 'TrendingUp', color: 'blue', subcategories: ['Beginner Investing', 'Long-Term Strategies', 'Portfolio Building', 'Value Investing', 'Risk Management'] },
  { name: 'Crypto', icon: 'Bitcoin', color: 'violet', subcategories: ['Bitcoin', 'Ethereum & Altcoins', 'Blockchain', 'DeFi & Web3', 'Crypto Safety'] },
  { name: 'Forex', icon: 'ArrowLeftRight', color: 'green', subcategories: ['Currency Pairs', 'Forex Fundamentals', 'Technical Analysis', 'Risk & Leverage', 'Macro & Central Banks'] },
  { name: 'Personal Finance', icon: 'Wallet', color: 'orange', subcategories: ['Budgeting', 'Saving', 'Credit & Debt', 'Retirement Planning', 'Taxes & Insurance'] },
  { name: 'Real Estate', icon: 'House', color: 'blue', subcategories: ['Buying a Home', 'Rental Property', 'REITs', 'Mortgages', 'Property Markets'] },
  { name: 'Commodities', icon: 'Coins', color: 'orange', subcategories: ['Gold & Silver', 'Oil & Energy', 'Agriculture', 'Commodity Funds', 'Supply & Demand'] },
  { name: 'Business & Economy', icon: 'Building2', color: 'violet', subcategories: ['Economic Data', 'Interest Rates', 'Inflation', 'Business Trends', 'Global Trade'] },
  { name: 'Education', icon: 'GraduationCap', color: 'green', subcategories: ['Finance Basics', 'Investing Glossary', 'How-To Guides', 'Money Psychology', 'Beginner Courses'] },
  { name: 'Regulatory Policy', icon: 'Scale', color: 'cyan', subcategories: ['Market Regulation', 'Tax Policy', 'Consumer Protection', 'Central Banks', 'Policy Updates'] }
];

// No demo or placeholder articles are preloaded. Public articles come from published Supabase records.
export const seedArticles = [];

// Instrument labels only. Market prices come from the live quote feed in App.jsx;
// never put invented/sample prices here because users may mistake them for real quotes.
export const markets = [
  { symbol: 'SPX', name: 'S&P 500', value: '—', change: '—', positive: false, color: '#5d91ff' },
  { symbol: 'NDX', name: 'NASDAQ 100', value: '—', change: '—', positive: false, color: '#9e8cff' },
  { symbol: 'DJI', name: 'DOW JONES', value: '—', change: '—', positive: false, color: '#42c6fb' },
  { symbol: 'AAPL', name: 'APPLE', value: '—', change: '—', positive: false, color: '#80a5bb' },
  { symbol: 'JPM', name: 'JPMORGAN CHASE', value: '—', change: '—', positive: false, color: '#5d91ff' },
  { symbol: 'EUR/USD', name: 'EUR / USD', value: '—', change: '—', positive: false, color: '#5d91ff' },
  { symbol: 'GBP/USD', name: 'GBP / USD', value: '—', change: '—', positive: false, color: '#42c6fb' },
  { symbol: 'USD/JPY', name: 'USD / JPY', value: '—', change: '—', positive: false, color: '#9e8cff' },
  { symbol: 'BTC', name: 'BITCOIN', value: '—', change: '—', positive: false, color: '#ffab3e' },
  { symbol: 'ETH', name: 'ETHEREUM', value: '—', change: '—', positive: false, color: '#7ea8ff' },
  { symbol: 'BNB', name: 'BNB', value: '—', change: '—', positive: false, color: '#ffc44d' },
  { symbol: 'SOL', name: 'SOLANA', value: '—', change: '—', positive: false, color: '#9e8cff' },
  { symbol: 'XRP', name: 'XRP', value: '—', change: '—', positive: false, color: '#8db3d8' },
  { symbol: 'ADA', name: 'CARDANO', value: '—', change: '—', positive: false, color: '#5d91ff' },
  { symbol: 'DOGE', name: 'DOGECOIN', value: '—', change: '—', positive: false, color: '#d8c46a' },
  { symbol: 'LINK', name: 'CHAINLINK', value: '—', change: '—', positive: false, color: '#6b9cff' },
  { symbol: 'TRX', name: 'TRON', value: '—', change: '—', positive: false, color: '#f46e7b' },
  { symbol: 'AVAX', name: 'AVALANCHE', value: '—', change: '—', positive: false, color: '#f08080' },
  { symbol: 'GOLD', name: 'GOLD / USD', value: '—', change: '—', positive: false, color: '#ffc44d' },
  { symbol: 'SILVER', name: 'SILVER / USD', value: '—', change: '—', positive: false, color: '#b7c8d8' },
  { symbol: 'WTI', name: 'WTI CRUDE OIL', value: '—', change: '—', positive: false, color: '#f08080' }
];

export const workspaceItems = [
  { label: 'Dashboard', icon: 'LayoutDashboard' },
  { label: 'Financial Intelligence', icon: 'Sparkles' },
  { label: 'Price Alerts', icon: 'Bell' },
  { label: 'Market News Intelligence', icon: 'Newspaper' },
  { label: 'Import & Export', icon: 'FileText' },
  { label: 'Dashboard Customization', icon: 'Settings2' },
  { label: 'Portfolio Analytics', icon: 'ChartNoAxesCombined' },
  { label: 'Economic Calendar', icon: 'CalendarDays' },
  { label: 'Advanced Watchlist', icon: 'Star' },
  { label: 'Subscription Manager', icon: 'CalendarClock' },
  { label: 'Finance Learning Center', icon: 'GraduationCap' },
  { label: 'Financial Games', icon: 'Gamepad2' },
  { label: 'Tax Estimator', icon: 'Calculator' },
  { label: 'Financial Achievements', icon: 'BadgeCheck' },
  { label: 'Investment Comparison', icon: 'Scale' },
  { label: 'FYNORIX Community', icon: 'MessageCircle' },
  { label: 'Pro Reports', icon: 'FileText' },
  { label: 'My Portfolio', icon: 'BriefcaseBusiness' },
  { label: 'Budget Planner', icon: 'Wallet' },
  { label: 'Transactions', icon: 'ArrowLeftRight' },
  { label: 'Savings Goals', icon: 'Target' },
  { label: 'Debt Tracker', icon: 'CreditCard' },
  { label: 'Bills & Subscriptions', icon: 'CalendarClock' },
  { label: 'Watchlist', icon: 'Star' },
  { label: 'News & Insights', icon: 'Newspaper' },
  { label: 'Markets', icon: 'ChartNoAxesCombined' },
  { label: 'Investing', icon: 'TrendingUp' },
  { label: 'Forex', icon: 'ArrowLeftRight' },
  { label: 'Personal Finance', icon: 'Wallet' },
  { label: 'Real Estate', icon: 'House' },
  { label: 'Commodities', icon: 'Coins' },
  { label: 'Education', icon: 'GraduationCap' },
  { label: 'Tools & Calculators', icon: 'Calculator' },
  { label: 'Regulatory Policy', icon: 'Scale' },
  { label: 'Settings', icon: 'Settings2' },
  { label: 'Author Profile', icon: 'BadgeCheck' },
  { label: 'Publish Article', icon: 'FilePlus2', subItem: true },
  { label: 'Log Out', icon: 'LogOut', special: true }
];

// Official FYNORIX destinations plus clearly marked platform-homepage demo links.
export const siteSocialLinks = {
  instagram: 'https://www.instagram.com/', // DEMO — official account coming soon
  x: 'https://x.com/',                     // DEMO — official account coming soon
  tiktok: 'https://www.tiktok.com/',       // DEMO — official account coming soon
  facebook: 'https://www.facebook.com/share/1CL171y9Nx/',
  telegram: 'https://t.me/+oPeIg0JwB4wwYTll'
};

export const calculatorList = [
  { id: 'compound', name: 'Compound Interest', icon: 'TrendingUp', description: 'Project growth on savings and investments', group: 'Investing' },
  { id: 'mortgage', name: 'Mortgage Calculator', icon: 'House', description: 'Estimate monthly home loan payments', group: 'Real Estate' },
  { id: 'retirement', name: 'Retirement Planner', icon: 'Umbrella', description: 'Estimate a future retirement balance', group: 'Personal Finance' },
  { id: 'currency', name: 'Currency Converter', icon: 'ArrowLeftRight', description: 'Convert currencies using a live reference rate when available', group: 'Forex' },
  { id: 'loan', name: 'Loan & Debt Payoff', icon: 'CreditCard', description: 'Estimate monthly debt repayments', group: 'Personal Finance' },
  { id: 'savings-goal', name: 'Savings Goal Planner', icon: 'PiggyBank', description: 'Estimate the monthly savings needed for a target', group: 'Personal Finance' },
  { id: 'inflation', name: 'Inflation Calculator', icon: 'ChartNoAxesColumnIncreasing', description: 'Estimate how inflation changes purchasing power', group: 'Personal Finance' },
  { id: 'stock-return', name: 'Investment Return', icon: 'ChartCandlestick', description: 'Calculate total return and percentage change', group: 'Investing' },
  { id: 'risk-reward', name: 'Risk / Reward Calculator', icon: 'Scale', description: 'Compare possible reward with planned risk', group: 'Investing' },
  { id: 'break-even', name: 'Break-even Calculator', icon: 'Target', description: 'Estimate the break-even price after fees', group: 'Investing' }
];
