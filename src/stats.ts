/** Numbers for the statistics page, computed from local progress (cards + answer log). */
import { State } from "ts-fsrs";
import { allEntries, allLog, dayKey, type LogEvent } from "./store";

const DAY = 864e5;
export const FORECAST_DAYS = 30;
export const CALENDAR_WEEKS = 18;
const MATURE_DAYS = 21; // Anki: an interval of 21 days or more is "mature"

const midnight = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
/** Whole calendar days from `from` to `to` (local time, DST-safe). */
const daysBetween = (from: number, to: number) => Math.round((midnight(to) - midnight(from)) / DAY);

export interface Stats {
  today: { cards: number; answers: number; correct: number | null; exercises: number; exercisesCorrect: number | null };
  /** forecast[i]: cards due i days from today (overdue cards count for today). */
  forecast: { day: number; count: number }[];
  /** One cell per day, oldest first, starting on a Monday. */
  calendar: { day: number; count: number }[];
  activeDays: number;
  states: { new: number; learning: number; young: number; mature: number; hidden: number };
  retention: { rate: number | null; reviews: number };
}

/**
 * @param lessonWords word count per lesson id (from the index)
 * @param lesson only this lesson, or every lesson when undefined
 */
export function computeStats(lessonWords: Map<string, number>, lesson?: string): Stats {
  const entries = allEntries();
  const log = allLog();
  const now = Date.now();
  // an event's lesson id can predate a reorganisation; the card's current lesson is the reliable one
  const lessonOf = (e: LogEvent) => entries[e.w]?.lesson ?? e.l;
  const events = lesson ? log.filter((e) => lessonOf(e) === lesson) : log;
  const scoped = Object.entries(entries).filter(([, e]) => !lesson || e.lesson === lesson);

  // today
  const todayKey = dayKey(now);
  const todays = events.filter((e) => dayKey(e.t) === todayKey);
  const learn = todays.filter((e) => e.m === "learn");
  const drills = todays.filter((e) => e.m !== "learn");
  const share = (xs: LogEvent[]) => (xs.length ? xs.filter((e) => e.ok).length / xs.length : null);
  const today = {
    cards: new Set(learn.map((e) => e.w)).size,
    answers: learn.length,
    correct: share(learn),
    exercises: drills.length,
    exercisesCorrect: share(drills),
  };

  // forecast
  const dayAt = (i: number) => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i); // by calendar, so DST changes don't shift the days
    return d.getTime();
  };
  const forecast = Array.from({ length: FORECAST_DAYS }, (_, i) => ({ day: dayAt(i), count: 0 }));
  for (const [, e] of scoped) {
    if (e.hidden || e.card.state === State.New) continue;
    const i = Math.max(0, daysBetween(now, e.card.due.getTime()));
    if (i < FORECAST_DAYS) forecast[i].count++;
  }

  // calendar: whole weeks (Monday first) ending with the current week
  const perDay = new Map<string, number>();
  for (const e of events) perDay.set(dayKey(e.t), (perDay.get(dayKey(e.t)) ?? 0) + 1);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - (CALENDAR_WEEKS - 1) * 7);
  const calendar: { day: number; count: number }[] = [];
  for (const d = new Date(start); d.getTime() <= now; d.setDate(d.getDate() + 1)) {
    calendar.push({ day: d.getTime(), count: perDay.get(dayKey(d.getTime())) ?? 0 });
  }
  const activeDays = calendar.filter((c) => c.count > 0).length;

  // card states
  const states = { new: 0, learning: 0, young: 0, mature: 0, hidden: 0 };
  for (const [, e] of scoped) {
    if (e.hidden) states.hidden++;
    else if (e.card.state === State.Learning || e.card.state === State.Relearning) states.learning++;
    else if (e.card.state === State.Review) states[e.card.scheduled_days >= MATURE_DAYS ? "mature" : "young"]++;
  }
  const words = lesson ? (lessonWords.get(lesson) ?? 0) : [...lessonWords.values()].reduce((a, b) => a + b, 0);
  states.new = Math.max(0, words - states.hidden - states.learning - states.young - states.mature);

  // retention: flashcard answers of the last 30 days, not counting a word's first day
  const firstDay = new Map<string, string>();
  for (const e of log) if (e.m === "learn" && !firstDay.has(e.w)) firstDay.set(e.w, dayKey(e.t));
  const reviews = events.filter((e) => e.m === "learn" && e.t > now - 30 * DAY && firstDay.get(e.w) !== dayKey(e.t));
  const retention = { rate: share(reviews), reviews: reviews.length };

  return { today, forecast, calendar, activeDays, states, retention };
}
