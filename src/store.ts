/**
 * Learning progress: FSRS card state per word + a review log.
 * localStorage is the source of truth for the UI; sync.ts mirrors it to Supabase when signed in.
 */
import { useSyncExternalStore } from "react";
import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from "ts-fsrs";
import { storageKey } from "./demomode";
import { extraNewToday, getSettings } from "./settings";
import type { DrillMode } from "./types";

export { Rating };
export type { Grade };

export interface Entry {
  lesson: string;
  card: Card;
  /** The learner chose not to study this word. */
  hidden?: true;
  /** Last change (review or hide/restore), epoch ms; newer wins when merging devices. */
  u?: number;
  /** Changed since the last upload. */
  dirty?: true;
}
export interface LogEvent {
  w: string; // word or grammar-card id
  l: string; // lesson id
  m: DrillMode;
  ok: boolean;
  g?: Grade;
  t: number; // epoch ms
  s?: true; // uploaded
}

const KEY = storageKey("dd:progress"); // the demo (?demo) has its own copy
export const dayKey = (t: number) => new Date(t).toLocaleDateString("sv"); // YYYY-MM-DD, local time
const MAX_LOG = 5000;
let fsrsFor: { retention: number; f: ReturnType<typeof fsrs> } | undefined;
/** FSRS scheduler for the retention chosen in the study options. */
function scheduler() {
  const retention = getSettings().retention;
  if (fsrsFor?.retention !== retention) fsrsFor = { retention, f: fsrs(generatorParameters({ enable_fuzz: true, request_retention: retention })) };
  return fsrsFor.f;
}

let cards: Record<string, Entry> = {};
let log: LogEvent[] = [];
let version = 0;
const listeners = new Set<() => void>();

/** JSON round-trips turn dates into strings. */
function reviveCard(card: Card): Card {
  card.due = new Date(card.due);
  if (card.last_review) card.last_review = new Date(card.last_review);
  return card;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as { cards: Record<string, Entry>; log: LogEvent[] };
    for (const e of Object.values(data.cards)) reviveCard(e.card);
    cards = data.cards;
    log = data.log ?? [];
  } catch {
    /* corrupt or unavailable storage: start fresh */
  }
}
load();

function save() {
  version++;
  try {
    localStorage.setItem(KEY, JSON.stringify({ cards, log }));
  } catch {
    /* quota or private mode: progress lives for this tab only */
  }
  listeners.forEach((l) => l());
}

export function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Re-render when progress changes. */
export function useProgress() {
  return useSyncExternalStore(subscribe, () => version);
}

export const getCard = (wordId: string): Card | undefined => cards[wordId]?.card;

export function previewDue(wordId: string, now = new Date()): Record<Grade, Date> {
  const prev = scheduler().repeat(getCard(wordId) ?? createEmptyCard(now), now);
  return {
    [Rating.Again]: prev[Rating.Again].card.due,
    [Rating.Hard]: prev[Rating.Hard].card.due,
    [Rating.Good]: prev[Rating.Good].card.due,
    [Rating.Easy]: prev[Rating.Easy].card.due,
  } as Record<Grade, Date>;
}

export function review(wordId: string, lesson: string, grade: Grade, now = new Date()): Card {
  const card = scheduler().next(getCard(wordId) ?? createEmptyCard(now), now, grade).card;
  cards[wordId] = { lesson, card, u: now.getTime(), dirty: true };
  pushLog({ w: wordId, l: lesson, m: "learn", ok: grade !== Rating.Again, g: grade, t: now.getTime() });
  return card;
}

export function logDrill(id: string, lesson: string, mode: DrillMode, ok: boolean) {
  pushLog({ w: id, l: lesson, m: mode, ok, t: Date.now() });
}

function pushLog(e: LogEvent) {
  log.push(e);
  if (log.length > MAX_LOG) log = log.slice(-MAX_LOG);
  save();
}

export const isHidden = (wordId: string) => !!cards[wordId]?.hidden;

/** Hide a word from flashcards and drills (or bring it back). Keeps its learning state. */
export function setHidden(wordId: string, lesson: string, hidden: boolean) {
  const prev = cards[wordId];
  const next: Entry = { lesson: prev?.lesson ?? lesson, card: prev?.card ?? createEmptyCard(), u: Date.now(), dirty: true };
  if (hidden) next.hidden = true;
  cards[wordId] = next;
  save();
}

// ---------------------------------------------------------------- Anki-style daily queues

/** Learning cards due within this window are shown now, like Anki's "learn ahead limit". */
export const LEARN_AHEAD_MS = 20 * 60 * 1000;

const endOfToday = () => {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d.getTime();
};

/** "learning": a short step (minutes) is due; "review": a review card is due today. */
function queueOf(e: Entry, now: number): "learning" | "review" | null {
  if (e.hidden) return null;
  const due = e.card.due.getTime();
  if (e.card.state === State.Learning || e.card.state === State.Relearning) return due <= now + LEARN_AHEAD_MS ? "learning" : null;
  if (e.card.state === State.Review) return due < endOfToday() ? "review" : null;
  return null;
}

/** Never studied (an entry may exist only because the word was hidden and restored). */
export const isNewWord = (wordId: string) => !cards[wordId] || cards[wordId].card.state === State.New;
export const queueOfWord = (wordId: string) => (cards[wordId] ? queueOf(cards[wordId], Date.now()) : null);

let todayMemo: { key: string; introduced: Set<string>; reviews: number } | undefined;
/** Words first studied today, and review answers given today (flashcards only). */
function today() {
  const day = dayKey(Date.now());
  const key = `${day}|${version}`;
  if (todayMemo?.key === key) return todayMemo;
  const before = new Set<string>();
  const answers = new Map<string, number>();
  for (const e of log) {
    if (e.m !== "learn") continue;
    if (dayKey(e.t) === day) answers.set(e.w, (answers.get(e.w) ?? 0) + 1);
    else before.add(e.w);
  }
  // reps guards against a trimmed log: a card with more reviews than today's answers is not new today
  const introduced = new Set([...answers].filter(([w, n]) => !before.has(w) && (cards[w]?.card.reps ?? 0) <= n).map(([w]) => w));
  let reviews = 0;
  for (const [w, n] of answers) if (!introduced.has(w)) reviews += n;
  todayMemo = { key, introduced, reviews };
  return todayMemo;
}

export const newStudiedToday = () => today().introduced.size;
export const reviewsDoneToday = () => today().reviews;
export const newLeftToday = () => Math.max(0, getSettings().newPerDay + extraNewToday() - newStudiedToday());
export const reviewsLeftToday = () => Math.max(0, getSettings().maxReviews - reviewsDoneToday());

/** Learning and review cards due now (uncapped), most overdue first. */
export function dueNow(lesson?: string): { learning: string[]; review: string[] } {
  const now = Date.now();
  const learning: [string, number][] = [];
  const review: [string, number][] = [];
  for (const [id, e] of Object.entries(cards)) {
    if (lesson && e.lesson !== lesson) continue;
    const q = queueOf(e, now);
    if (q) (q === "learning" ? learning : review).push([id, e.card.due.getTime()]);
  }
  const ids = (xs: [string, number][]) => xs.sort((a, b) => a[1] - b[1]).map(([id]) => id);
  return { learning: ids(learning), review: ids(review) };
}

/** Entries of a lesson that are no longer new words (studied) or hidden. */
export const studiedOrHidden = (lesson: string) => Object.values(cards).filter((e) => e.lesson === lesson && (e.hidden || e.card.state !== State.New)).length;

export interface DayCounts {
  new: number;
  learning: number;
  review: number;
}

/** Anki's three numbers: new words still allowed today, learning cards, reviews due (capped by today's limit). */
export function dayCounts(lesson?: string, unseenWords = 0): DayCounts {
  const due = dueNow(lesson);
  return {
    new: Math.min(unseenWords, newLeftToday()),
    learning: due.learning.length,
    review: Math.min(due.review.length, reviewsLeftToday()),
  };
}

/** Read-only views for the statistics page. */
export const allEntries = (): Readonly<Record<string, Entry>> => cards;
export const allLog = (): readonly LogEvent[] => log;

/** Lesson ids that progress entries point at. */
export const lessonIdsInUse = () => new Set(Object.values(cards).map((e) => e.lesson));

/**
 * After lessons are reorganised (A1.2 units merged into one lesson per Modul) an entry can point at a
 * lesson that no longer exists; move it to the lesson that now holds the word. Uploaded on the next sync.
 */
export function relocate(lessonIds: Set<string>, wordLesson: Map<string, string>) {
  let moved = 0;
  for (const [id, e] of Object.entries(cards)) {
    const to = wordLesson.get(id);
    if (to && !lessonIds.has(e.lesson)) {
      cards[id] = { ...e, lesson: to, dirty: true };
      moved++;
    }
  }
  if (moved) save();
}

export function learnedCount(lesson: string): number {
  return Object.values(cards).filter((e) => e.lesson === lesson && e.card.state !== State.New).length;
}

/** Consecutive days with at least one answer, ending today (or yesterday if nothing yet today). */
export function streak(): number {
  const days = new Set(log.map((e) => dayKey(e.t)));
  const d = new Date();
  if (!days.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(d.getTime()))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function answeredToday(): number {
  const today = dayKey(Date.now());
  return log.filter((e) => dayKey(e.t) === today).length;
}

// ---------------------------------------------------------------- sync support

export function pendingUpload() {
  return {
    cards: Object.entries(cards).filter(([, e]) => e.dirty),
    events: log.filter((e) => !e.s),
  };
}

/** `uploaded` are the entries from pendingUpload(); a card reviewed again meanwhile stays dirty. */
export function markUploaded(uploaded: [string, Entry][], events: LogEvent[]) {
  for (const [id, entry] of uploaded) if (cards[id] === entry) delete entry.dirty;
  for (const e of events) e.s = true;
  save();
}

const lastReview = (c: Card) => (c.last_review ? new Date(c.last_review).getTime() : 0);
/** When an entry last changed (older data has no `u`). */
export const changedAt = (e: Entry) => e.u ?? lastReview(e.card);

export interface RemoteCard {
  word_id: string;
  lesson_id: string;
  card: Card;
  hidden: boolean;
  updated_at: string;
}

/** Merge server data: the newer change wins; events are de-duplicated by word + time. */
export function mergeRemote(remoteCards: RemoteCard[], remoteEvents: LogEvent[]) {
  for (const r of remoteCards) {
    const local = cards[r.word_id];
    const remoteAt = Math.max(Date.parse(r.updated_at) || 0, lastReview(r.card));
    if (!local || remoteAt > changedAt(local)) {
      cards[r.word_id] = { lesson: r.lesson_id, card: reviveCard(r.card), u: remoteAt, ...(r.hidden ? { hidden: true as const } : {}) };
    }
  }
  const seen = new Set(log.map((e) => `${e.w}|${e.t}`));
  for (const e of remoteEvents) if (!seen.has(`${e.w}|${e.t}`)) log.push({ ...e, s: true });
  log.sort((a, b) => a.t - b.t);
  if (log.length > MAX_LOG) log = log.slice(-MAX_LOG);
  save();
}
