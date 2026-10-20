/**
 * Demo mode (…/daily-deutsch/?demo, or #/demo which redirects there) for presenting the app:
 * a made-up learner with about three weeks of study history and a virtual class. Its data lives
 * under its own storage keys (demomode.ts), so the real progress is never touched, and nothing
 * is sent to the server while the demo runs.
 */
import { appUrl, isDemo, storageKey } from "./demomode";
import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from "ts-fsrs";
import { loadIndex, loadLesson } from "./data";
import type { DrillMode, Word } from "./types";

export { isDemo } from "./demomode";

/** The demo learner's data is generated once a day, so its streak and due cards stay current. */
const DAY_KEY = "dd:demo-day";
const dayKey = () => new Date().toLocaleDateString("sv");

export const DEMO_USER = "demo-me";
export const DEMO_CLASS = { id: "demo-class", name: "Deutschkurs A1.2 · Demo", code: "DEMO24", owner_id: "demo-teacher" };

/** Small seeded random generator, so the demo looks the same every time. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface DemoEntry {
  lesson: string;
  card: Card;
  u: number;
  hidden?: true;
}
interface DemoEvent {
  w: string;
  l: string;
  m: DrillMode;
  ok: boolean;
  g?: Grade;
  t: number;
  s: true;
}

const DAYS = 24; // history length
const GAPS = new Set([17, 10]); // days without study, so the streak is 10 days
const DAY = 864e5;

/** Simulate the learner with the real FSRS scheduler: new words each evening, every due review answered. */
function simulate(lessons: { id: string; words: Word[] }[]) {
  const random = rng(20261020);
  const f = fsrs(generatorParameters({ enable_fuzz: false, request_retention: 0.9 }));
  const grade = (good: number): Grade => {
    const x = random();
    return x < 1 - good ? Rating.Again : x < 1 - good + 0.12 ? Rating.Hard : x < 0.92 ? Rating.Good : Rating.Easy;
  };
  const pool = lessons.flatMap((l) => l.words.map((w) => ({ w, lesson: l.id })));
  const cards: Record<string, DemoEntry> = {};
  const log: DemoEvent[] = [];
  const now = Date.now();
  let next = 0;

  const answer = (id: string, lesson: string, t: number, good: number) => {
    const e = cards[id] ?? { lesson, card: createEmptyCard(new Date(t)), u: t };
    // learning steps come back within the same session until the card graduates
    for (let step = 0; step < 4; step++) {
      const g = step === 0 ? grade(good) : random() < 0.85 ? Rating.Good : Rating.Again;
      e.card = f.next(e.card, new Date(t), g).card;
      e.u = t;
      log.push({ w: id, l: lesson, m: "learn", ok: g !== Rating.Again, g, t, s: true });
      if (e.card.state === State.Review) break;
      t = Math.max(t + 30_000, e.card.due.getTime());
    }
    cards[id] = e;
    return t + 8_000 + random() * 15_000;
  };

  for (let d = DAYS; d >= 0; d--) {
    if (GAPS.has(d)) continue;
    const day = new Date(now - d * DAY);
    day.setHours(d === 0 ? 0 : 18, 0, 0, 0);
    let t = d === 0 ? Math.min(now - 40 * 60_000, day.getTime() + 8 * 3600_000) : day.getTime() + random() * 3 * 3600_000;
    const end = new Date(day);
    end.setHours(24, 0, 0, 0);
    // reviews first; today only a few, so the home page still shows work to do
    const due = Object.entries(cards)
      .filter(([, e]) => e.card.state !== State.New && e.card.due.getTime() < end.getTime())
      .sort((a, b) => a[1].card.due.getTime() - b[1].card.due.getTime());
    for (const [id, e] of d === 0 ? due.slice(0, 6) : due) t = answer(id, e.lesson, t, 0.88);
    const fresh = d === 0 ? 3 : 12 + Math.floor(random() * 7);
    for (let i = 0; i < fresh && next < pool.length; i++, next++) t = answer(pool[next].w.id, pool[next].lesson, t, 0.8);
    // a few drills (articles, plurals, cloze) on the words studied so far
    const drills: DrillMode[] = ["article", "plural", "cloze", "grammar"];
    for (let i = 0, n = 6 + Math.floor(random() * 12); i < n && next > 0; i++) {
      const it = pool[Math.floor(random() * next)];
      log.push({ w: it.w.id, l: it.lesson, m: drills[Math.floor(random() * drills.length)], ok: random() < 0.78, t, s: true });
      t += 10_000 + random() * 20_000;
    }
  }
  // the learner hid a few words they already knew
  for (const it of pool.slice(next, next + 3)) cards[it.w.id] = { lesson: it.lesson, card: createEmptyCard(), u: now - 2 * DAY, hidden: true };

  log.sort((a, b) => a.t - b.t);
  return { cards, log: log.filter((e) => e.t <= now) };
}

/** True when this demo page has no data for today yet (first visit, or a new day). */
export function demoNeedsData() {
  try {
    return isDemo && (localStorage.getItem(DAY_KEY) !== dayKey() || !localStorage.getItem(storageKey("dd:progress")));
  } catch {
    return false;
  }
}

let entering: Promise<void> | undefined;

/** Open the demo with a fresh learner. Runs once per page. */
export function enterDemo() {
  return (entering ??= start());
}

async function start() {
  if (!isDemo) {
    location.replace(appUrl(true)); // the demo page builds its data on load
    return;
  }
  const index = await loadIndex();
  const pick = ["a12-m1", "a12-m2"].filter((id) => index.some((l) => l.id === id));
  const ids = pick.length ? pick : index.filter((l) => l.words > 0).slice(0, 2).map((l) => l.id);
  const lessons = await Promise.all(ids.map(loadLesson));
  try {
    localStorage.setItem(storageKey("dd:progress"), JSON.stringify(simulate(lessons)));
    localStorage.removeItem(storageKey("dd:settings")); // default options
    localStorage.setItem(DAY_KEY, dayKey());
  } catch {
    /* storage unavailable: the demo cannot run */
  }
  location.replace(appUrl(true));
  location.reload();
}

/** Leave the demo: the normal address, with this device's real progress. */
export function exitDemo() {
  location.replace(appUrl(false));
}
