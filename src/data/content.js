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

// Sample articles are clearly marked as editorial demo content and can be replaced in the editor.
export const seedArticles = [
  {
    id: 'seed-wall-street-rally', title: 'Wall Street Rallies as Tech Stocks Lead Market Higher',
    excerpt: 'Major U.S. indices closed higher on strong tech earnings, renewed optimism about interest rate cuts, and solid economic data.',
    category: 'Stock Market', subcategory: 'Market News', author: 'Sarah Mitchell', authorRole: 'Finance Writer',
    date: '2026-10-19', readTime: 5, imageId: 'IMG-ARTICLE-001', image: '/images/article-wall-street-rally.jpg',
    keywords: ['stock market news', 'technology stocks', 'S&P 500', 'market outlook'],
    body: [
      'Markets move on a mix of company earnings, interest-rate expectations and the economic data that shapes both. A strong session can lift sentiment, but investors should always distinguish short-term price moves from long-term business value.',
      'Technology shares remain an important part of broad market indices. Before investing in individual companies, compare revenue growth, profit margins, competitive position and valuation rather than relying on momentum alone.',
      'A diversified portfolio, a realistic time horizon and a clear risk plan can help investors navigate periods of volatility. The information in this article is educational and is not individualized investment advice.'
    ]
  },
  {
    id: 'seed-compound-interest', title: 'The Quiet Power of Compound Interest Over Time',
    excerpt: 'Learn how consistent contributions and time can work together to help your savings grow.',
    category: 'Personal Finance', subcategory: 'Saving', author: 'Daniel Brooks', authorRole: 'Personal Finance Editor',
    date: '2026-10-17', readTime: 6, imageId: 'IMG-ARTICLE-002', image: '/images/article-compound-interest.jpg',
    keywords: ['compound interest', 'savings calculator', 'long-term investing', 'wealth building'],
    body: [
      'Compound growth happens when returns begin to earn returns of their own. The effect is sensitive to time, contribution amount, fees and the rate of return that is actually achieved.',
      'A useful first step is to set an automatic contribution that fits your budget and to review expensive debt before taking investment risk. Keep emergency cash separate from money you can leave invested for longer periods.',
      'All calculator results are illustrations, not guarantees. Actual returns vary and investments can lose value.'
    ]
  },
  {
    id: 'seed-bitcoin-risk', title: 'A Practical Risk Checklist Before Buying Crypto',
    excerpt: 'A beginner-friendly checklist for understanding volatility, custody, and position sizing.',
    category: 'Crypto', subcategory: 'Crypto Safety', author: 'Ava Turner', authorRole: 'Digital Assets Analyst',
    date: '2026-10-15', readTime: 7, imageId: 'IMG-ARTICLE-003', image: '/images/article-crypto-risk.jpg',
    keywords: ['crypto investing', 'Bitcoin risk', 'digital asset security', 'portfolio risk'],
    body: [
      'Crypto assets can experience sharp price swings, technical failures and regulatory changes. Never assume a past rally means future gains are likely.',
      'Understand how custody works, enable strong account security, verify addresses carefully and avoid investing money needed for near-term living expenses. Be wary of guaranteed-return claims and unsolicited investment messages.',
      'Consider how a potential loss would affect your wider financial plan, and seek qualified advice when you are unsure about tax or legal obligations.'
    ]
  },
  {
    id: 'seed-forex-basics', title: 'Forex Basics: What Moves Currency Exchange Rates?',
    excerpt: 'Interest rates, inflation expectations and market sentiment all play a role in currency markets.',
    category: 'Forex', subcategory: 'Forex Fundamentals', author: 'James Carter', authorRole: 'Markets Contributor',
    date: '2026-10-12', readTime: 8, imageId: 'IMG-ARTICLE-004', image: '/images/article-forex-basics.jpg',
    keywords: ['forex for beginners', 'currency exchange rates', 'central banks', 'forex risk'],
    body: [
      'Exchange rates reflect the relative value of currencies and can react to economic releases, central-bank communication, geopolitical events and investor positioning.',
      'Leverage can magnify both gains and losses. Learn position sizing and stop-loss mechanics before using leveraged products, and check the rules that apply in your country.',
      'A strong process starts with a written plan, modest risk limits and a clear understanding of trading costs.'
    ]
  },
  {
    id: 'seed-investing-plan', title: 'A Simple Framework for Building a Long-Term Investment Plan',
    excerpt: 'Match your time horizon, risk capacity and savings habits before choosing investments.',
    category: 'Investing', subcategory: 'Long-Term Strategies', author: 'Sarah Mitchell', authorRole: 'Finance Writer',
    date: '2026-10-10', readTime: 6, imageId: 'IMG-ARTICLE-005', image: '/images/article-investing-plan.jpg',
    keywords: ['long-term investing', 'investment plan', 'diversification', 'portfolio building'],
    body: ['Begin with your goals and the date you expect to need the money. Cash for near-term bills generally belongs in a different place from money intended for long-term investing.', 'Diversification spreads exposure across different assets, but it does not remove market risk or guarantee a positive return. Consider fees, taxes and how you would respond to a market decline.', 'Write down your contribution habit and review schedule before selecting products. A repeatable process is usually more useful than reacting to every daily headline.']
  },
  {
    id: 'seed-real-estate', title: 'What to Compare Before Buying Your First Property',
    excerpt: 'Look beyond the advertised price to financing, running costs, repairs and how long you plan to stay.',
    category: 'Real Estate', subcategory: 'Buying a Home', author: 'Daniel Brooks', authorRole: 'Personal Finance Editor',
    date: '2026-10-08', readTime: 7, imageId: 'IMG-ARTICLE-006', image: '/images/article-real-estate.jpg',
    keywords: ['buying a home', 'mortgage planning', 'property costs', 'real estate finance'],
    body: ['A property budget needs to include more than the listing price. Include closing costs, insurance, taxes, maintenance, utilities and a reserve for unexpected repairs.', 'Compare loan terms and total borrowing costs, not only the monthly payment. An affordable payment should still leave room for emergency savings and other financial priorities.', 'Property markets are local and can move in either direction. Inspect the property, review relevant legal documents and seek qualified local advice before committing.']
  },
  {
    id: 'seed-commodities', title: 'Why Gold and Other Commodities Move Differently',
    excerpt: 'Supply, demand, inventory, currency moves and investor positioning can all influence commodity prices.',
    category: 'Commodities', subcategory: 'Gold & Silver', author: 'Ava Turner', authorRole: 'Markets Analyst',
    date: '2026-10-06', readTime: 5, imageId: 'IMG-ARTICLE-007', image: '/images/article-commodities.jpg',
    keywords: ['gold price drivers', 'commodities investing', 'supply and demand', 'portfolio diversification'],
    body: ['Commodities are influenced by physical supply and demand, inventories, transport constraints, weather, geopolitical events and changes in the currency used to quote prices.', 'A commodity may behave differently from a company share because it does not produce corporate earnings or dividends. Funds and futures also bring product-specific costs and risks.', 'Before investing, understand the structure of the instrument you are buying and whether it fits your broader objectives. Historical correlations can change.']
  },
  {
    id: 'seed-inflation', title: 'Inflation Explained: How to Read the Bigger Picture',
    excerpt: 'Understand price changes, purchasing power and why central banks pay close attention to inflation.',
    category: 'Business & Economy', subcategory: 'Inflation', author: 'James Carter', authorRole: 'Markets Contributor',
    date: '2026-10-04', readTime: 6, imageId: 'IMG-ARTICLE-008', image: '/images/article-inflation.jpg',
    keywords: ['inflation explained', 'cost of living', 'interest rates', 'economic indicators'],
    body: ['Inflation describes the pace at which a broad basket of prices changes over time. It is not the same as the price of one item, and household experiences differ according to spending patterns.', 'Economists compare headline measures, core measures and wage growth to understand how broad or persistent price pressure may be. Data is revised and should be read with context.', 'For personal planning, revisit spending categories, keep goals realistic and avoid making major investment decisions from a single data release.']
  },
  {
    id: 'seed-finance-glossary', title: 'Seven Investing Terms Worth Learning First',
    excerpt: 'A plain-English introduction to diversification, volatility, liquidity, fees and other core concepts.',
    category: 'Education', subcategory: 'Investing Glossary', author: 'Sarah Mitchell', authorRole: 'Finance Writer',
    date: '2026-10-02', readTime: 4, imageId: 'IMG-ARTICLE-009', image: '/images/article-finance-glossary.jpg',
    keywords: ['investing glossary', 'financial literacy', 'investment basics', 'beginner guide'],
    body: ['Diversification means spreading investments rather than depending on one holding. Volatility describes how much prices fluctuate, while liquidity describes how easily an asset can be bought or sold without greatly affecting its price.', 'An expense ratio is a recurring fund cost. A benchmark is a reference used to compare performance. Asset allocation describes the mix of asset types in a portfolio.', 'Learn each term in context and check the product documents before investing. Simple language should make a decision clearer, not hide important risks.']
  },
  {
    id: 'seed-regulation', title: 'How to Check Whether a Financial Provider Is Regulated',
    excerpt: 'Use official regulator registers and verify contact details before sharing money or personal information.',
    category: 'Regulatory Policy', subcategory: 'Consumer Protection', author: 'Ava Turner', authorRole: 'Markets Analyst',
    date: '2026-09-29', readTime: 5, imageId: 'IMG-ARTICLE-010', image: '/images/article-regulation.jpg',
    keywords: ['financial regulation', 'consumer protection', 'investment scams', 'verify a broker'],
    body: ['Financial regulation depends on the country, provider type and service being offered. A company name or logo on a website does not prove that the provider is authorized.', 'Use the official regulator website to search the firm and verify its exact domain, contact information and permitted activities. Fraudsters may impersonate a genuine authorized company.', 'Be cautious of guaranteed returns, pressure to act quickly or requests to send funds to a personal account. If something feels wrong, pause and contact the relevant regulator using independently verified details.']
  }
];

// Demonstration market values are sample UI content, not a live price feed.
export const markets = [
  { symbol: 'SPX', name: 'S&P 500', value: '5,812.44', change: '+1.24%', positive: true, color: '#5d91ff' },
  { symbol: 'NDX', name: 'NASDAQ', value: '20,148.52', change: '+1.56%', positive: true, color: '#9e8cff' },
  { symbol: 'DJI', name: 'DOW JONES', value: '43,239.98', change: '+0.98%', positive: true, color: '#42c6fb' },
  { symbol: 'BTC', name: 'BITCOIN', value: '$91,432.17', change: '+2.36%', positive: true, color: '#ffab3e' },
  { symbol: 'ETH', name: 'ETHEREUM', value: '$3,067.45', change: '+1.82%', positive: true, color: '#7ea8ff' },
  { symbol: 'GLD', name: 'GOLD', value: '$2,334.60', change: '+0.71%', positive: true, color: '#ffc44d' }
];

export const workspaceItems = [
  { label: 'Dashboard', icon: 'LayoutDashboard' },
  { label: 'My Portfolio', icon: 'BriefcaseBusiness' },
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
  { label: 'Log Out', icon: 'LogOut', special: true }
];

export const calculatorList = [
  { id: 'compound', name: 'Compound Interest', icon: 'TrendingUp', description: 'Project growth on savings and investments', group: 'Investing' },
  { id: 'mortgage', name: 'Mortgage Calculator', icon: 'House', description: 'Estimate monthly home loan payments', group: 'Real Estate' },
  { id: 'retirement', name: 'Retirement Planner', icon: 'Umbrella', description: 'Estimate a future retirement balance', group: 'Personal Finance' },
  { id: 'currency', name: 'Currency Converter', icon: 'ArrowLeftRight', description: 'Convert currencies with editable sample rates', group: 'Forex' },
  { id: 'loan', name: 'Loan & Debt Payoff', icon: 'CreditCard', description: 'Estimate monthly debt repayments', group: 'Personal Finance' }
];
