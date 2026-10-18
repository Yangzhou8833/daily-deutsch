# Daily Deutsch: product plan

A German vocabulary site for a mixed-nationality language class. Each day's lesson becomes cards, and classmates review them in their own language through **one permanent link**.

## Users

| Role | Description |
|---|---|
| Admin (me) | Publishes each day's words, manages the class, sees class stats |
| Classmate | A2 level, varied native languages (Chinese / English / Turkish…), mostly on phones |

## Core loop

1. After class, the admin publishes the day's words (v1: export from Anki → script → site; v2: AI admin panel)
2. Classmates open the same link; the newest lesson is at the top
3. Spaced repetition (FSRS) decides what each person reviews today
4. Review data flows back → class-wide trouble words → automatic review cards

## Decisions made

- **Content source**: v1 keeps the Anki export (`德语词汇 v2` / `德语语法填空 v2` note types); v2 adds the AI admin panel
- **Login**: optional. Without login you can review right away, with progress saved locally; after logging in, progress syncs across devices
- **Class code**: logged-in users enter a class code to join a class; leaderboards and stats are per class; the admin manages members
- **Languages**: Chinese / English / Turkish, extensible: when a classmate has another native language, AI fills in that language in bulk
- **Grammar labels**: standardized as German grammar terms (trennbar, Adverb, keine Steigerung…), shown in every language

## v1 features

1. **Lesson list**: one link, all lessons, newest on top, progress per lesson
2. **Spaced repetition**: card flipping + FSRS scheduling, with a daily "to review" queue
3. **Exercises**: der/die/das articles, plural forms, example-sentence fill-in, grammar fill-in
4. **AI sentence correction**: write a sentence with the word; AI checks it and explains in your native language (Claude API via a server-side function, with a daily per-person limit)
5. **Streaks + class leaderboard**: consecutive days, words reviewed this week
6. **Class trouble words**: admin sees the words the whole class misses most

## v2

- **AI admin panel**: photo of the textbook / pasted text → AI extracts words and generates articles, plurals, example sentences, fill-ins and multilingual explanations → admin reviews → publish (also exports .apkg)
- Class trouble words automatically become review lessons
- Add new languages with one click

## Tech plan

- Frontend: static site / PWA (installable to the phone home screen)
- Backend: Supabase (Auth + Postgres + Row Level Security + Edge Functions)
- AI: Claude API (translation, sentence correction, card generation), called only server-side, so the key is never exposed
- Deployment: GitHub Pages or Vercel, free

## Data model (draft)

- `classes` (id, name, code, owner_id)
- `members` (user_id, class_id, display_name, native_lang, role)
- `lessons` (id, title, published_at, content jsonb)
- `card_state` (user_id, word_id, due, stability, difficulty, reps, lapses): FSRS state, used for sync
- `reviews` (user_id, word_id, mode, grade, reviewed_at): event log, the source for streaks / leaderboard / trouble words
- `sentence_checks` (user_id, word_id, sentence, ok, feedback, created_at)

## Metrics (for the resume)

Weekly active classmates, 7-day retention, average words reviewed per person per day, AI corrections used
