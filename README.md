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

## Structure

```
scripts/ankiread.py     reads notes from .apkg; turns Chinese grammar labels into German terms
scripts/build_data.py   apkg + translations → public/data/*.json
translations/           per-lesson English/Turkish translations (keyed by Anki note guid)
public/data/            site data (generated)
src/store.ts            FSRS scheduling + learning log (localStorage for now; Supabase sync next)
src/drills/             article / plural / fill-in / grammar drills
```
