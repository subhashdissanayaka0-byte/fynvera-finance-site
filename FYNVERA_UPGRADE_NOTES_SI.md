# FYNVERA Upgrade Guide — සිංහල

මෙය දැනට තිබෙන FYNVERA website එකට එකතු කළ update එකයි. අලුත් වෙනම website එකක් නොවේ. `node_modules` හෝ private Supabase key කිසිවක් ZIP එකට ඇතුළත් කර නැහැ.

## මේ update එකේ වෙනස්කම්

- Article publish / edit code එක ඔබගේ සැබෑ Supabase `articles` columns (`user_id`, `summary`, `article_body`, `seo_keywords`) සමඟ ගැළපෙන ලෙස වෙනස් කළා.
- `Workspace → Author Profile → Publish Article` යටතේ article editor එකක් තියෙනවා. එයින් draft save කිරීම, publish කිරීම, edit කිරීම, delete කිරීම, News & Insights ද category එකකටද publish කරන්නේ කියා තේරීම, සහ image drag-and-drop කරන්න පුළුවන්.
- Article edit කළ පසු `EDITED` label එක පෙන්වන්න `updated_at` database trigger එකක් එකතු කළා.
- Like count පෙන්වනවා; dislike count එක UI එකේ පෙන්වන්නේ නැහැ. Like button එකට animation එකක් තියෙනවා.
- Comments වල reply, edit, delete එකතු කරලා තියෙනවා. Parent comment එක delete කළත් replies මැකෙන්නේ නැහැ.
- Bookmark, follow/unfollow, followers/following/likes received counts සඳහා unique indexes, RLS policies සහ count RPC functions එකතු කළා.
- Workspace left navigation එක scroll කළ හැකියි. Publish Article option එක Author Profile යටතේ indented sub-option එකක්.
- Crypto සඳහා Binance public Spot USDT pairs search / scroll / “Load more” තියෙනවා. API key එකක් අවශ්‍ය නැහැ.
- Stock, Indices, Forex සහ Commodities සඳහා free quote provider එකේ quote ලබාගත හැකි symbol catalogue එක load කරලා search / scroll / “Load more markets” එක් කළා. Quote unavailable හෝ market closed නම් හිතලා price එකක් දාන්නේ නැහැ.
- Home page Market Snapshot එකත් ඒ market feeds වලට බැඳී තිබෙනවා. News & Insights feed එක category articles වලින් වෙන් කරලා filters එකතු කළා.
- Finance calculators 10ක් තබාගෙන තිබෙනවා.
- SEO title, description, canonical, Open Graph සහ basic WebSite structured metadata update කළා.

## පළමුව කළ යුතු දේ

**1. Supabase backup එකක් ගන්න.** Live database එක වෙනස් කරන නිසා මෙය වැදගත්.

**2. අලුත් migration එක පමණක් run කරන්න.**

1. Supabase Dashboard → SQL Editor යන්න.
2. ZIP එක ඇතුළේ `supabase/fynvera_upgrade_migration.sql` file එක අරින්න.
3. සම්පූර්ණ SQL text එක copy කර SQL Editor එකට paste කරන්න. ` ```sql ` වැනි Markdown fences එකතු කරන්න එපා.
4. Run කරන්න.

**පැරණි `supabase/schema.sql` හෝ `supabase/community_update.sql` නැවත run කරන්න එපා.** ඒවා පැරණි/different column names සඳහා ලියූ files. අලුත් update එකට අවශ්‍ය SQL එක `fynvera_upgrade_migration.sql` පමණයි.

## Local test කිරීම

1. ZIP එක extract කරන්න.
2. ඔබගේ existing local project එකේ `.env` file එක තිබුණොත් ඒක delete/overwrite කරන්න එපා. එය ZIP එකට ඇතුළත් කර නැහැ.
3. Terminal එකෙන් project folder එකට ගොස් මෙවා run කරන්න:

   ```bash
   npm ci
   npm run dev
   ```

4. Production build එක test කරන්න:

   ```bash
   npm run build
   ```

5. Verified Supabase account එකෙන් login වෙලා පහත දේවල් එකින් එක test කරන්න: publish article, save draft, edit කර `EDITED` label එක බලන්න, test article එකක් delete කරන්න, like/dislike කරන්න, comment/reply/edit/delete කරන්න, bookmark/unbookmark කරන්න, වෙන author කෙනෙක් follow/unfollow කරන්න, Author Profile counters පරීක්ෂා කරන්න.

6. Local tests හරි නම්, වෙනස් කළ files ඔබගේ දැනට තිබෙන GitHub repository එකට upload/commit කරන්න. ඉන්පසු Vercel deploy එක සාර්ථකද බලන්න.

## Images ගැන වැදගත් සටහන

ඔබ upload කළ RAR file එකේ actual JPG image files තිබුණේ නැහැ; `public/images` තුළ README සහ image prompts පමණයි තිබුණේ. නමුත් connected GitHub repository එකේ `public/images/article-*.jpg` files තිබෙන බව පරීක්ෂා කළා. ඒ නිසා **GitHub එකට update එක දානකොට දැනට තිබෙන JPG images delete කරන්න එපා**. ඒවා `public/images` folder එකේම තබාගන්න. ZIP එකට ඒ binary images නැති නිසා මේ update ZIP එකෙන් පමණක් images නැවත ගොඩනැගෙන්නේ නැහැ.

## Market data ගැන සටහන

- Crypto prices: Binance public market feed. API key නැහැ. Binance official public market-data URLs වලට API key අවශ්‍ය නැත: https://github.com/binance/binance-spot-api-docs/blob/master/faqs/market_data_only.md
- Stocks / indices / Forex / metals / oil: biquote public market quotes. ඒවා සමහර විට broker/CFD reference prices විය හැකියි; සියලු exchange listings සඳහා official consolidated exchange price නොවේ. Free provider එකේ symbol එකක්/quote එකක් නොමැති නම් `No quote` පෙන්වයි. https://biquote.io/docs/
- Currency calculator එකේ rate එක daily reference rate එකක්; broker එකේ real-time deal price එකක් නොවේ.

## පරීක්ෂා කළ දේ හා නොකළ දේ

`App.jsx`, `main.jsx`, data සහ Supabase utility files වල JSX/module syntax checks pass වුණා. මේ runtime එකේ dependency install එක සම්පූර්ණ නොවූ නිසා full Vite production build එක මෙහි තහවුරු කළේ නැහැ. Live Supabase database එකට migration එක run කිරීම හෝ Vercel site එකෙන් interactions end-to-end test කිරීම මෙහිදී කළේ නැහැ. ඒ නිසා deploy කිරීමට පෙර ඔබගේ existing project එකේ ඉහත test steps කරන්න.

## Keys ආරක්ෂිතව තබන්න

`.env`, `.env.local`, Supabase `service_role` key හෝ private secrets GitHub/ZIP එකට දාන්න එපා. Vercel හි frontend එකට අවශ්‍ය public variables දෙක පමණක් භාවිත කරන්න: `VITE_SUPABASE_URL` සහ `VITE_SUPABASE_ANON_KEY`.
