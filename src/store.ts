/**
 * Learning progress: FSRS card state per word + a review log.
 * localStorage is the source of truth for the UI; sync.ts mirrors it to Supabase when signed in.
 */
import { useSyncExternalStore } from "react";
import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from "ts-fsrs";
import type { DrillMode } from "./types";

export { Rating };
export type { Grade };

interface Entry {
  lesson: string;
  card: Card;
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

const KEY = "dd:progress";
const MAX_LOG = 5000;
const scheduler = fsrs(generatorParameters({ enable_fuzz: true, request_retention: 0.9 }));

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
  const prev = scheduler.repeat(getCard(wordId) ?? createEmptyCard(now), now);
  return {
    [Rating.Again]: prev[Rating.Again].card.due,
    [Rating.Hard]: prev[Rating.Hard].card.due,
    [Rating.Good]: prev[Rating.Good].card.due,
    [Rating.Easy]: prev[Rating.Easy].card.due,
  } as Record<Grade, Date>;
}

export function review(wordId: string, lesson: string, grade: Grade, now = new Date()): Card {
  const card = scheduler.next(getCard(wordId) ?? createEmptyCard(now), now, grade).card;
  cards[wordId] = { lesson, card, dirty: true };
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

export function dueIds(now = new Date(), lesson?: string): string[] {
  return Object.entries(cards)
    .filter(([, e]) => (!lesson || e.lesson === lesson) && e.card.due <= now)
    .sort((a, b) => a[1].card.due.getTime() - b[1].card.due.getTime())
    .map(([id]) => id);
}

export function dueLessons(now = new Date()): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of Object.values(cards)) if (e.card.due <= now) out[e.lesson] = (out[e.lesson] ?? 0) + 1;
  return out;
}

export function learnedCount(lesson: string): number {
  return Object.values(cards).filter((e) => e.lesson === lesson && e.card.state !== State.New).length;
}

const dayKey = (t: number) => new Date(t).toLocaleDateString("sv"); // YYYY-MM-DD, local time

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

/** Merge server data: newer card state wins; events are de-duplicated by word + time. */
export function mergeRemote(remoteCards: { word_id: string; lesson_id: string; card: Card }[], remoteEvents: LogEvent[]) {
  for (const r of remoteCards) {
    const local = cards[r.word_id];
    if (!local || lastReview(r.card) > lastReview(local.card)) {
      cards[r.word_id] = { lesson: r.lesson_id, card: reviveCard(r.card) };
    }
  }
  const seen = new Set(log.map((e) => `${e.w}|${e.t}`));
  for (const e of remoteEvents) if (!seen.has(`${e.w}|${e.t}`)) log.push({ ...e, s: true });
  log.sort((a, b) => a.t - b.t);
  if (log.length > MAX_LOG) log = log.slice(-MAX_LOG);
  save();
}
