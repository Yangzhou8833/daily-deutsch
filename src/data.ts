import { useEffect, useState } from "react";
import type { Lesson, LessonSummary } from "./types";

const base = import.meta.env.BASE_URL;
const cache = new Map<string, Promise<unknown>>();

function getJSON<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(base + path).then((r) => {
        if (!r.ok) throw new Error(`${path}: ${r.status}`);
        return r.json();
      }),
    );
  }
  return cache.get(path) as Promise<T>;
}

export const loadIndex = () => getJSON<{ lessons: LessonSummary[] }>("data/index.json").then((d) => d.lessons);
export const loadLesson = (id: string) => getJSON<Lesson>(`data/lessons/${id}.json`);

/** Minimal async hook: undefined while loading, throws nothing (errors become null). */
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
