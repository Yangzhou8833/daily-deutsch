/**
 * Mirrors local progress (store.ts) to Supabase.
 * Offline-first: answers are saved locally right away and uploaded in small batches;
 * on sign-in the server copy is merged in so several devices share one progress.
 */
import { changedAt, markUploaded, mergeRemote, pendingUpload, subscribe, type LogEvent, type RemoteCard } from "./store";
import { supabase } from "./supabase";
import type { DrillMode } from "./types";

const PAGE = 1000;
const CHUNK = 500;
const PULL_DAYS = 90;

let userId: string | null = null;
/** False until the database has the card_states.hidden column (added in schema v3). */
let hasHiddenColumn = true;
const missingHidden = (error: { message?: string } | null) => !!error?.message?.includes("hidden");
let flushing: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

async function pullAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

async function upload(uid: string) {
  const { cards, events } = pendingUpload();
  for (let i = 0; i < cards.length; i += CHUNK) {
    const part = cards.slice(i, i + CHUNK);
    const rows = part.map(([id, e]) => ({
      user_id: uid,
      word_id: id,
      lesson_id: e.lesson,
      card: e.card,
      ...(hasHiddenColumn ? { hidden: !!e.hidden } : {}),
      updated_at: new Date(changedAt(e) || Date.now()).toISOString(),
    }));
    let { error } = await supabase!.from("card_states").upsert(rows);
    if (missingHidden(error)) {
      hasHiddenColumn = false;
      ({ error } = await supabase!.from("card_states").upsert(rows.map(({ hidden: _, ...r }) => r)));
    }
    if (error) throw error;
    markUploaded(part, []);
  }
  for (let i = 0; i < events.length; i += CHUNK) {
    const part = events.slice(i, i + CHUNK);
    const { error } = await supabase!.from("review_events").upsert(
      part.map((e) => ({
        user_id: uid,
        word_id: e.w,
        lesson_id: e.l,
        mode: e.m,
        ok: e.ok,
        grade: e.g ?? null,
        created_at: new Date(e.t).toISOString(),
      })),
      { onConflict: "user_id,word_id,created_at", ignoreDuplicates: true },
    );
    if (error) throw error;
    markUploaded([], part);
  }
}

/** Upload pending changes now (one upload at a time). */
export function flush(): Promise<void> {
  if (!supabase || !userId) return Promise.resolve();
  const uid = userId;
  flushing ??= upload(uid)
    .catch((e) => console.warn("sync upload failed", e))
    .finally(() => (flushing = null));
  return flushing;
}

/** Download the server copy, merge it into local progress, then upload what is only local. */
export async function fullSync(uid: string) {
  if (!supabase) return;
  userId = uid;
  const since = new Date(Date.now() - PULL_DAYS * 864e5).toISOString();
  const [cards, events] = await Promise.all([
    pullAll<RemoteCard>(async (a, b) => {
      const res = await supabase!.from("card_states").select("word_id, lesson_id, card, hidden, updated_at").eq("user_id", uid).range(a, b);
      if (!missingHidden(res.error)) return res as { data: RemoteCard[] | null; error: unknown };
      hasHiddenColumn = false;
      const old = await supabase!.from("card_states").select("word_id, lesson_id, card, updated_at").eq("user_id", uid).range(a, b);
      return { data: (old.data ?? []).map((r) => ({ ...r, hidden: false }) as RemoteCard), error: old.error };
    }),
    pullAll<{ word_id: string; lesson_id: string; mode: DrillMode; ok: boolean; grade: number | null; created_at: string }>((a, b) =>
      supabase!
        .from("review_events")
        .select("word_id, lesson_id, mode, ok, grade, created_at")
        .eq("user_id", uid)
        .gte("created_at", since)
        .order("created_at")
        .range(a, b),
    ),
  ]);
  mergeRemote(
    cards,
    events.map(
      (e): LogEvent => ({ w: e.word_id, l: e.lesson_id, m: e.mode, ok: e.ok, g: (e.grade ?? undefined) as LogEvent["g"], t: Date.parse(e.created_at) }),
    ),
  );
  await flush();
}

export function stopSync() {
  userId = null;
  clearTimeout(timer);
}

// Batch uploads a few seconds after the last answer, and before the tab is hidden/closed.
subscribe(() => {
  if (!userId) return;
  clearTimeout(timer);
  timer = setTimeout(flush, 4000);
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flush();
});
