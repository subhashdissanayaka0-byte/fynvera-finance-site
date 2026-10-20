# Fynvera — Finance & Investing Website

A responsive finance publishing website and personal planning workspace built with **React + Vite**. The interface follows the supplied Fynvera reference: deep navy surfaces, bright cyan/blue accents, white headings, animated cards, and a mobile-friendly layout.

## Included

- Responsive public homepage and finance topic pages.
- **10 main categories**, each with **5 subcategories**.
- Article cards, reader view, author details, search, bookmarks and share action.
- A News & Insights publishing editor with category selection, SEO keyword fields, and image upload.
- **Five working browser calculators**: compound interest, mortgage, retirement savings, currency conversion (sample rates), and loan repayments.
- Workspace with collapsible desktop sidebar and mobile drawer: Dashboard, My Portfolio, Watchlist, News & Insights, Markets, Investing, Forex, Personal Finance, Real Estate, Commodities, Education, Tools & Calculators, Regulatory Policy, Settings, Author Profile, Log Out. Existing sections are retained.
- Email/password sign-in, sign-up, email verification flow and Google OAuth integration when Supabase is configured.
- Profile picture upload, profile editing, financial planning preferences, manual portfolio notes and saved articles.
- Optional Supabase database + private Row Level Security (RLS) schema, plus additive author/reaction/comment/follow tables in `supabase/community_update.sql`.
- Public articles remain readable without an account; workspace, saved articles and engagement actions require a real account in production.
- Binance public Spot market prices stream for BTC, ETH, BNB, SOL, XRP, ADA, DOGE, LINK, TRX and AVAX quoted in USDT; no Binance API key is required.
- Free preview mode with local browser storage when API credentials are not configured.
- SEO metadata, share metadata, a starter sitemap and robots file.
- Starter About, Privacy, Terms, Editorial Policy, Financial Disclaimer and Contact pages (marked with owner-edit placeholders; update them before public launch).
- Named image placeholders and a ready-to-use image prompt/size guide in `public/images/IMAGE_PROMPTS_AND_SIZES.txt`.
- AdSense placement markers and setup notes.

## 1. Run it locally

Install Node.js 20 or newer from https://nodejs.org/ . Open a terminal in this folder and run:

```bash
npm install
npm run dev
```

Vite will print a local URL, commonly `http://localhost:5173`. Open it in your browser. You can test the design and calculators immediately without a key or paid account.

To test the production build:

```bash
npm run build
npm run preview
```

## 2. Use preview mode with no API keys

Leave `.env` uncreated or leave the two Supabase values empty. The UI, animations, sample articles, calculators, manual portfolio notes and browser-only article publishing are usable for preview.

**Important:** preview sign-in is simulated. It is not secure authentication, it does not verify email addresses, and localStorage is not a production database. Preview-published articles are only stored in the current browser and are not automatically visible to visitors on another device.

## 3. Enable free real accounts and the database

Follow `SETUP_GUIDE_SI_EN.md`. Create a free Supabase project, paste its URL and public anon key into a local `.env` file (copy `.env.example`), run `supabase/schema.sql` first and then `supabase/community_update.sql`, create the two storage buckets, and enable Google OAuth if desired.

Only use the **public anon key** in the browser. Never use a service-role key in this project or commit `.env` to GitHub. Supabase free-plan limits and availability can change; check the current plan in Supabase before launch.

## 4. Add generated images

Open `public/images/IMAGE_PROMPTS_AND_SIZES.txt`. It lists filenames, image IDs, exact sizes and image-generation prompts. Add your images to `public/images/` using the exact filename so the slot automatically displays the image. Until then, designed abstract fallback illustrations are shown instead of broken blank boxes.

For new articles, use Workspace → News & Insights → Publish an article. In a configured Supabase project, the image upload goes to the `article-images` bucket; in preview mode it stays in your browser.

## 5. AdSense

See `ADSENSE_SETUP.txt`. The site includes clearly marked responsive ad positions, not working ads. Actual Google ads require an approved AdSense account, your publisher ID and an ad slot ID, and any required consent/disclosure setup for your target audience. Approval and revenue are not guaranteed.

## 6. GitHub upload and free hosting

1. Create a new **empty** GitHub repository.
2. Extract this ZIP and upload the project files/folders (including `src`, `public`, `supabase`, `package.json`, and `index.html`) to the repository root.
3. For local use, download/clone the repository, then run `npm install` and `npm run dev`.
4. To publish publicly, use a free static frontend host such as Vercel or Netlify and connect your GitHub repository. Set the build command to `npm run build` and output directory to `dist`.
5. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the host's environment variables when enabling real accounts. Trigger a new deployment after saving them.

For OAuth, add the deployed domain to Supabase Authentication → URL Configuration → Redirect URLs. Configure the Google OAuth client in the Google Cloud Console and enable Google in Supabase Authentication → Providers.

## Financial and data note

Crypto ticker values use Binance public Spot market data (USDT pairs) when the user's connection and Binance endpoints are reachable. Indices, forex pairs and gold remain labelled sample data; they are not live quotes. WebSocket reconnects automatically when possible, and the 24-hour REST snapshot provides a fallback. See [Binance Market Data Only URLs](https://github.com/binance/binance-spot-api-docs/blob/master/faqs/market_data_only.md) and [Spot WebSocket Streams](https://github.com/binance/binance-spot-api-docs/blob/master/web-socket-streams.md). Supabase's [RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security) explains the access model used by the migration. The website is educational, not personalized investment, tax, legal or financial advice. Do not collect or store bank passwords, payment-card details or broker credentials. Review the website's privacy policy, cookie/consent obligations, disclosure pages, original editorial content and AdSense policies before accepting visitors or applying for monetization. Replace every bracketed placeholder on the static legal pages before launch.

## Main files

- `src/App.jsx` — main experience, UI state, authentication flow and article publishing.
- `src/styles.css` — theme, animations, responsive layouts and UI details.
- `src/data/content.js` — categories, subcategories, demo articles, markets, calculators and social profile URL placeholders.
- `supabase/community_update.sql` — additive schema for author profiles, article reactions/comments, follows and safe aggregate counts.
- `src/lib/supabase.js` — optional Supabase client.
- `src/lib/storage.js` — safe browser preview storage.
- `supabase/schema.sql` — data tables, RLS policies and storage upload policies.
- `SETUP_GUIDE_SI_EN.md` — step-by-step setup in Sinhala and English.
