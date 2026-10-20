/**
 * Demo mode (#/demo) for presenting the app: a made-up learner with about three weeks of study
 * history and a virtual class. The real progress and options on this device are backed up and
 * restored on exit; nothing is sent to the server while the demo runs.
 */
import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from "ts-fsrs";
import { loadIndex, loadLesson } from "./data";
import type { DrillMode, Word } from "./types";

const FLAG = "dd:demo";
const KEYS = ["dd:progress", "dd:settings"]; // replaced by demo data, restored on exit
const backupKey = (k: string) => `${k}:before-demo`;

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

/** Fixed for the page's lifetime: entering or leaving the demo reloads the page. */
export const isDemo = read(FLAG) === "1";

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

let entering: Promise<void> | undefined;

/** Back up this device's progress, write the demo learner and reload into the demo. Runs once per page. */
export function enterDemo() {
  return (entering ??= start());
}

async function start() {
  const index = await loadIndex();
  const pick = ["a12-m1", "a12-m2"].filter((id) => index.some((l) => l.id === id));
  const ids = pick.length ? pick : index.filter((l) => l.words > 0).slice(0, 2).map((l) => l.id);
  const lessons = await Promise.all(ids.map(loadLesson));
  const data = simulate(lessons);
  try {
    // back up only real data: never a demo copy (already in the demo, or a second call)
    if (localStorage.getItem(FLAG) !== "1") for (const k of KEYS) {
      const v = localStorage.getItem(k);
      if (v === null) localStorage.removeItem(backupKey(k));
      else localStorage.setItem(backupKey(k), v);
    }
    localStorage.setItem("dd:progress", JSON.stringify(data));
    localStorage.removeItem("dd:settings"); // default options
    localStorage.setItem(FLAG, "1");
  } catch {
    /* storage unavailable: the demo cannot run */
  }
  location.replace(`${location.pathname}#/`);
  location.reload();
}

/** Restore this device's own progress and options. */
export function exitDemo() {
  try {
    for (const k of KEYS) {
      const v = localStorage.getItem(backupKey(k));
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
      localStorage.removeItem(backupKey(k));
    }
    localStorage.removeItem(FLAG);
  } catch {
    /* ignore */
  }
  location.replace(`${location.pathname}#/`);
  location.reload();
}
