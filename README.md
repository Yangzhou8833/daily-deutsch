# Daily Deutsch

A German vocabulary site for a language class: daily lessons, spaced repetition (FSRS), article / plural / fill-in / grammar drills, with explanations in Chinese, English and Turkish. Product plan: [PRODUCT.md](PRODUCT.md).

## Run locally

```bash
npm install
npm run dev
```

## Publishing a new lesson every day

1. Export the day's deck from Anki as `德语_<lesson>.apkg` into `D:\Anki` (note types `德语词汇 v2` / `德语语法填空 v2`)
2. (Optional) Add English/Turkish translations to `translations/<lesson>.json`
3. Regenerate the site data:

   ```bash
   npm run data
   ```

4. Commit and push; the site updates automatically and classmates keep using the same link

Lessons without English/Turkish translations show Chinese explanations plus a notice.

## Login, classes, leaderboard (Supabase)

Without Supabase settings the site works offline and hides login. To turn it on:

1. Create a project at [supabase.com](https://supabase.com) (region: Frankfurt)
2. **SQL Editor** → paste and run [`supabase/schema.sql`](supabase/schema.sql) (it's safe to run more than once)
3. **Authentication → Sign In / Providers → Email**: turn off **Confirm email** (the free email service only sends a few emails per hour)
4. Put the project URL and the **publishable** key in `.env.production`:

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_KEY=sb_publishable_...
   ```

   The publishable key is designed to be public; data is protected by Row Level Security in `schema.sql`. **Never** put the secret / service_role key in the frontend.

## Structure

```
scripts/ankiread.py     reads notes from .apkg; turns Chinese grammar labels into German terms
scripts/build_data.py   apkg + translations → public/data/*.json
translations/           per-lesson English/Turkish translations (keyed by Anki note guid)
public/data/            site data (generated)
src/store.ts            FSRS scheduling + learning log (localStorage, source of truth for the UI)
src/sync.ts             offline-first sync of progress to Supabase
src/account.ts          login, profile, class, leaderboard
supabase/schema.sql     tables, RLS policies, create_class / join_class / class_leaderboard
src/drills/             article / plural / fill-in / grammar drills
```
