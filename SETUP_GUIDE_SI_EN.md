# Fynvera setup guide — සිංහල + English

## A. ZIP එක open කරලා run කරන විදිහ

1. ZIP file එක extract කරන්න.
2. Computer එකට Node.js 20+ install කරන්න: https://nodejs.org/
3. Extract කරපු `fynvera-finance-site` folder එක open කරන්න.
4. Folder එකේ address bar එකට `cmd` කියලා type කර Enter කරන්න (Windows) හෝ terminal එකෙන් folder එක open කරන්න.
5. පහත commands දෙක run කරන්න:

```bash
npm install
npm run dev
```

6. Terminal එකේ පෙන්වන `http://localhost:5173` link එක browser එකෙන් open කරන්න.
7. Free preview එකට API keys අවශ්‍ය නැහැ. Calculators සහ main UI එක test කරන්න පුළුවන්. Preview login එක real secure account එකක් නොවේ.

## B. GitHub එකට upload කරන විදිහ

1. https://github.com/ යන්න, account එකට sign in වෙන්න.
2. **New repository** තෝරලා `fynvera-finance-site` වගේ නමක් දෙන්න.
3. Repository එක empty විදිහට create කරන්න.
4. ZIP එක extract කරලා folder එක ඇතුළේ තිබෙන files/folders සියල්ල repository root එකට upload කරන්න. `package.json`, `index.html`, `src/`, `public/`, `supabase/` අනිවාර්යයි.
5. `node_modules` folder එක upload කරන්න එපා. `.env` file එකත් GitHub එකට upload කරන්න එපා.
6. Website එක public කරන්න, GitHub repository එක Vercel හෝ Netlify වැනි free static hosting service එකකට connect කරන්න.
7. Build command: `npm run build` · Output folder: `dist`.

> GitHub එකට code upload කිරීමෙන් පමණක් website එක public live වෙන්නේ නැහැ. Hosting service එකක deploy කරන්නත් ඕන.

## C. Supabase free login + email verification + database

Real email verification, Google sign-in, profile pictures, and cross-device user data සඳහා Supabase project එකක් configure කළ යුතුයි. Frontend එකට key values නැතිව real authentication/database request යවන්න බැහැ.

1. https://supabase.com/ වෙත ගිහින් account එකක් හදාගෙන New Project තෝරන්න.
2. Project create වුණාම Project Settings → API වෙත යන්න.
3. Project URL සහ **anon/public key** copy කරන්න. **service_role key එක copy කර frontend එකට දාන්න එපා.**
4. Project folder එකේ `.env.example` file එක copy කර `.env` ලෙස rename කරන්න.
5. `.env` file එක ඇතුළේ:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
VITE_SITE_URL=http://localhost:5173
```

6. Supabase Dashboard → SQL Editor → New query වෙත ගොස් `supabase/schema.sql` file එකේ content එක paste කර Run කරන්න. Tables සහ Row Level Security (RLS) policies හදනවා.
7. අලුත් community features සඳහා ඊළඟට `supabase/community_update.sql` file එකේ content එක වෙනම query එකක paste කර Run කරන්න. මේ migration එක existing tables drop/rename කරන්නේ නැහැ; author profiles, reactions, comments, follows සහ aggregate-count functions එකතු කරනවා.
8. Supabase → Storage වෙත ගිහින් `avatars` සහ `article-images` නමින් buckets දෙකක් හදන්න. මේ starter project එකේ public page එකේ photos පෙන්වන්න buckets public ලෙස සකස් කරලා, upload permissions user-owned folder එකට සීමා කරන policies schema එකේ තිබෙනවා.
9. Supabase → Authentication → URL Configuration වෙත ගිහින් Site URL එක `http://localhost:5173` ලෙස දාන්න. Production deploy කළාට පස්සේ Site URL සහ Redirect URLs වෙත public website domain එකත් add කරන්න.
10. Email sign-up confirmation සක්‍රියද කියලා Authentication → Providers / Email settings වලින් බලන්න. Email templates සහ SMTP rules සඳහා Supabase හි current instructions බලන්න.
11. Google login අවශ්‍ය නම් Google Cloud Console තුළ OAuth Client ID/secret create කර Supabase Authentication → Providers → Google තුළ configure කරන්න. Supabase පෙන්වන callback URL එක Google provider එකේ redirect URI ලෙසත් දාන්න. Supabase redirect URL allow list එකට localhost සහ live domain දෙකම ඇතුළත් කරන්න.
12. Local server එක stop කර `npm run dev` නැවත run කරන්න.
13. GitHub එකට push කළාට පස්සේ, hosting settings තුළ `VITE_SUPABASE_URL` සහ `VITE_SUPABASE_ANON_KEY` environment variables add කර redeploy කරන්න. `.env` GitHub එකට commit කරන්න එපා.

### Public reading, private workspace සහ community

- Visitors can read public articles without registering. The Dashboard/workspace is gated behind signup/sign-in.
- Sign-up with email may require email verification. Verify the email, then sign in; the workspace opens only after a real session is available in production.
- Likes/dislikes, cross-device comments, follow/unfollow and author profile data require Supabase setup and the `community_update.sql` migration. Article save uses the existing private `watchlist` table.
- Live crypto tickers use Binance public Spot streams for BTC, ETH, BNB, SOL, XRP, ADA, DOGE, LINK, TRX and AVAX in USDT. No Binance API key is used. Other market panels remain sample data. See [Binance's public market-data URLs](https://github.com/binance/binance-spot-api-docs/blob/master/faqs/market_data_only.md). The new tables use Supabase RLS policies and matching grants; see the [official RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security).
- Add your official social profile URLs in `src/data/content.js` under `siteSocialLinks`. Leave values empty until you have the real URLs; the footer hides blank social links. Author-specific social URLs can be saved in Workspace → Author Profile.
- The RAR archive used for this update did not include generated image files; do not delete or overwrite your already-uploaded `public/images` files on GitHub when merging the code changes.

## D. Images ඔබ generate කර folder එකට add කරන විදිහ

1. `public/images/IMAGE_PROMPTS_AND_SIZES.txt` open කරන්න.
2. එහි image ID එක, filename එක, exact pixel size එක සහ generation prompt එක සෑම image එකකටම තිබෙනවා.
3. Image එක generate කරලා ඒ filename එකෙන් `public/images/` folder එකට save කරන්න.
4. Example: `IMG-HERO-001` → `public/images/hero-finance-dashboard.jpg`.
5. Filename එක වෙනස් කරන්න නම් `src/App.jsx` තුළ එම `IMG-...` ID එක search කර source path එක update කරන්න.
6. Site එක images නැතිවත් blank/broken boxes වෙනුවට fallback design එකකින් වැඩ කරනවා.

## E. Daily articles publish කරන විදිහ

Workspace → News & Insights → Publish an article වෙත යන්න. Headline, short summary, category, subcategory, article body සහ SEO keywords දාන්න. Image upload කරන්න.

- Supabase configure කර login වී සිටිනවා නම් article සහ image database/storage වෙත publish වෙනවා.
- Preview mode එකේ නම් article එම browser එකේ පමණක් save වෙනවා. Visitor වෙන device එකකින් බලන්න ලැබෙන්නේ production database/storage configure කළාමයි.
- Original writing, reliable sources, author details and editorial disclaimer භාවිත කරන්න. Copied or low-value articles මත AdSense approval/revenue guarantee කළ නොහැක.

## F. Important safety checklist

- Passwords, bank logins, card numbers, private brokerage keys `notes` field එකට දාන්න එපා.
- Financial data සඳහා RLS enabled තබන්න; client එකේ service-role key කිසිවිටෙක භාවිත කරන්න එපා.
- Crypto ticker values use Binance public Spot data. Index, forex and commodity values remain examples, not live quotes. Binance public-market data access is separate from trading; do not add trading credentials.
- AdSense account approval, publisher ID, ad slot IDs, privacy policy/cookie consent, tax disclosures සහ ad policies පිළිබඳ `ADSENSE_SETUP.txt` කියවන්න.

### Enable article publishing only for your own editor account

The database is locked down so an ordinary registered user cannot publish public articles. After your own email account is confirmed:

1. Open Supabase → Authentication → Users and copy your account's UUID.
2. In SQL Editor run this command after replacing the sample UUID:

```sql
insert into public.article_editors (user_id)
values ('YOUR_AUTH_USER_UUID_HERE')
on conflict (user_id) do nothing;
```

3. Sign out and back in to the website. The News & Insights publisher will now have database and article-image upload permission for the allow-listed account.

Only add trusted editor UUIDs to this table. Do not create a public policy that lets users insert their own row into `article_editors`.
