import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { GrammarCard, Lang, Lesson, LessonSummary, Word } from "./types";

const base = import.meta.env.BASE_URL;
const cache = new Map<string, Promise<unknown>>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) cache.set(key, load());
  return cache.get(key) as Promise<T>;
}

function getJSON<T>(path: string): Promise<T> {
  return cached(path, () =>
    fetch(base + path).then((r) => {
      if (!r.ok) throw new Error(`${path}: ${r.status}`);
      return r.json();
    }),
  );
}

/** Row of the `lessons` table (lessons made in the web editor). */
export interface LessonRow {
  id: string;
  title: string;
  level: string | null;
  lesson_date: string;
  content: { words: Word[]; grammar: GrammarCard[] };
  langs: Lang[];
  words_count: number;
  grammar_count: number;
  published: boolean;
}

const staticIndex = () => getJSON<{ lessons: LessonSummary[] }>("data/index.json").then((d) => d.lessons);

/** Published editor lessons; empty when Supabase is not configured or unreachable. */
const dbIndex = () =>
  cached("db:index", async (): Promise<LessonSummary[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("lessons")
      .select("id, title, lesson_date, langs, words_count, grammar_count")
      .eq("published", true);
    if (error) return [];
    return data.map((r) => ({ id: r.id, title: r.title, date: r.lesson_date, langs: r.langs as Lang[], words: r.words_count, grammar: r.grammar_count }));
  });

/** Editor lessons first (newest first), then the static courses in their built order. */
export const loadIndex = () =>
  Promise.all([staticIndex(), dbIndex()]).then(([a, b]) => {
    const ids = new Set(a.map((l) => l.id));
    const fresh = b.filter((l) => !ids.has(l.id)).sort((x, y) => y.date.localeCompare(x.date));
    return [...fresh, ...a];
  });

export async function loadLesson(id: string): Promise<Lesson> {
  if ((await staticIndex()).some((l) => l.id === id)) return getJSON<Lesson>(`data/lessons/${id}.json`);
  return cached(`db:lesson:${id}`, async () => {
    const { data, error } = await supabase!.from("lessons").select("*").eq("id", id).single();
    if (error) throw error;
    const row = data as LessonRow;
    return { id: row.id, title: row.title, date: row.lesson_date, langs: row.langs, ...row.content };
  });
}

/** Forget cached editor lessons after the editor saves something. */
export function invalidateDbLessons() {
  for (const key of [...cache.keys()]) if (key.startsWith("db:")) cache.delete(key);
}

/** Minimal async hook: undefined while loading, null on error. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): T | null | undefined {
  const [value, setValue] = useState<T | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    setValue(undefined);
    fn().then(
      (v) => live && setValue(v),
      () => live && setValue(null),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}
