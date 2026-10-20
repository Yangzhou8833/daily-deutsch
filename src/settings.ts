/**
 * Study options, like an Anki deck's options: daily limits for new words and reviews and the
 * memory retention FSRS aims for. Saved on this device; account.ts mirrors them to the signed-in
 * user's metadata so every device uses the same limits.
 */
import { useSyncExternalStore } from "react";
import { storageKey } from "./demomode";

export interface StudySettings {
  /** New words introduced per day, across all lessons. */
  newPerDay: number;
  /** Review answers per day, across all lessons. */
  maxReviews: number;
  /** Share of reviews FSRS aims to have answered correctly (0.8–0.97). */
  retention: number;
}

export const DEFAULT_SETTINGS: StudySettings = { newPerDay: 20, maxReviews: 200, retention: 0.9 };
export const RETENTION_CHOICES = [0.8, 0.85, 0.9, 0.95];

const KEY = storageKey("dd:settings");
const listeners = new Set<() => void>();
const changeHooks = new Set<(s: StudySettings) => void>();

/** "Learn N more today": extra new words for one day only (Anki's custom study). */
interface Extra {
  day: string;
  n: number;
}

const dayKey = (t: number) => new Date(t).toLocaleDateString("sv"); // YYYY-MM-DD, local time

function clean(raw: Partial<StudySettings> | undefined): StudySettings {
  const num = (v: unknown, lo: number, hi: number, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : fallback;
  const r = raw?.retention;
  return {
    newPerDay: num(raw?.newPerDay, 0, 9999, DEFAULT_SETTINGS.newPerDay),
    maxReviews: num(raw?.maxReviews, 0, 99999, DEFAULT_SETTINGS.maxReviews),
    retention: typeof r === "number" && r >= 0.7 && r <= 0.99 ? r : DEFAULT_SETTINGS.retention,
  };
}

let settings: StudySettings = DEFAULT_SETTINGS;
let extra: Extra | undefined;
try {
  const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as { s?: Partial<StudySettings>; extra?: Extra } | null;
  settings = clean(saved?.s);
  extra = saved?.extra;
} catch {
  /* storage unavailable: defaults */
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ s: settings, extra }));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export const getSettings = () => settings;

/** Change options (from the options page): saved here and mirrored to the account. */
export function updateSettings(patch: Partial<StudySettings>) {
  settings = clean({ ...settings, ...patch });
  persist();
  changeHooks.forEach((h) => h(settings));
}

/** Options loaded from the account on sign-in replace the local ones without echoing back. */
export function applyRemoteSettings(raw: unknown) {
  if (!raw || typeof raw !== "object") return;
  settings = clean(raw as Partial<StudySettings>);
  persist();
}

export function onSettingsChange(hook: (s: StudySettings) => void) {
  changeHooks.add(hook);
}

/** Extra new words allowed today on top of the daily limit. */
export const extraNewToday = () => (extra?.day === dayKey(Date.now()) ? extra.n : 0);

export function addExtraNewToday(n: number) {
  extra = { day: dayKey(Date.now()), n: extraNewToday() + n };
  persist();
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

export function useSettings() {
  return useSyncExternalStore(subscribe, () => settings);
}

/** Re-render when today's extra allowance changes too. */
export function useSettingsVersion() {
  return useSyncExternalStore(subscribe, () => `${settings.newPerDay}|${settings.maxReviews}|${settings.retention}|${extraNewToday()}`);
}
