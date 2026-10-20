/** Signed-in user, profile and class. Everything is optional: without Supabase the app runs offline. */
import { useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import { DEMO_CLASS, DEMO_USER, exitDemo, isDemo } from "./demo";
import { getLang, setLang } from "./i18n";
import { applyRemoteSettings, getSettings, onSettingsChange } from "./settings";
import { supabase } from "./supabase";
import { State } from "ts-fsrs";
import { allEntries, allLog, streak } from "./store";
import { flush, fullSync, stopSync } from "./sync";
import type { Lang } from "./types";

export interface Profile {
  display_name: string;
  native_lang: Lang;
  /** May generate and publish lessons (set in the database, not from the app). */
  is_editor?: boolean;
}
export interface ClassInfo {
  id: string;
  name: string;
  code: string;
  owner_id: string;
}
export interface Account {
  /** off = site built without Supabase; loading = checking the session. */
  status: "off" | "loading" | "out" | "in";
  userId?: string;
  email?: string;
  profile?: Profile;
  klass?: ClassInfo | null;
  syncing?: boolean;
  syncError?: string;
}
export interface LeaderRow {
  user_id: string;
  display_name: string;
  role: "owner" | "member";
  week_answers: number;
  week_correct: number;
  streak: number;
  words_learned: number;
}

// demo mode: a signed-in learner in a virtual class, entirely local (no session, no sync)
let state: Account = isDemo
  ? { status: "in", userId: DEMO_USER, email: "demo@daily-deutsch.app", profile: { display_name: "Demo", native_lang: getLang() }, klass: DEMO_CLASS }
  : { status: supabase ? "loading" : "off" };
const listeners = new Set<() => void>();
function set(patch: Partial<Account>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useAccount(): Account {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}

const message = (e: unknown) => (e && typeof e === "object" && "message" in e ? String(e.message) : String(e));

/** The profile; without is_editor if the database predates that column (schema v2), instead of failing. */
async function loadProfile(userId: string) {
  const full = await supabase!.from("profiles").select("display_name, native_lang, is_editor").eq("id", userId).maybeSingle();
  if (!full.error?.message?.includes("is_editor")) return full;
  return supabase!.from("profiles").select("display_name, native_lang").eq("id", userId).maybeSingle();
}

async function loadProfileAndClass(userId: string) {
  const [{ data: profile }, { data: member }] = await Promise.all([
    loadProfile(userId),
    supabase!.from("class_members").select("classes(id, name, code, owner_id)").eq("user_id", userId).order("joined_at").limit(1).maybeSingle(),
  ]);
  const klass = (member?.classes ?? null) as ClassInfo | null;
  set({ profile: (profile ?? undefined) as Profile | undefined, klass });
  return profile as Profile | null;
}

async function onSession(session: Session | null, signedInNow: boolean) {
  if (!session) {
    stopSync();
    set({ status: "out", userId: undefined, email: undefined, profile: undefined, klass: undefined });
    return;
  }
  const userId = session.user.id;
  if (state.status === "in" && state.userId === userId) return; // token refresh etc.
  set({ status: "in", userId, email: session.user.email });
  try {
    const profile = await loadProfileAndClass(userId);
    if (signedInNow && profile) setLang(profile.native_lang);
    // study options live in the user's metadata; getUser() returns the current copy, not the cached session
    const { data } = await supabase!.auth.getUser();
    const study = data.user?.user_metadata?.study;
    if (study) applyRemoteSettings(study);
    else await supabase!.auth.updateUser({ data: { study: getSettings() } }); // first sign-in: keep this device's options
    set({ syncing: true, syncError: undefined });
    await fullSync(userId);
    set({ syncing: false });
  } catch (e) {
    set({ syncing: false, syncError: message(e) });
  }
}

// options changed on this device go to the account, so the other devices pick them up on their next sign-in check
onSettingsChange((study) => {
  if (state.status === "in" && !isDemo) supabase!.auth.updateUser({ data: { study } });
});

if (supabase && !isDemo) {
  supabase.auth.getSession().then(({ data }) => onSession(data.session, false));
  // Supabase recommends not awaiting other calls inside this callback.
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT") setTimeout(() => onSession(session, event === "SIGNED_IN"));
  });
}

// ---------------------------------------------------------------- actions (return an error message or null)

const DEMO_BLOCKED = "Demo · 演示模式下不可用 / not available in the demo";

async function run(fn: () => PromiseLike<{ error: unknown } | void>): Promise<string | null> {
  if (isDemo) return DEMO_BLOCKED;
  try {
    const res = await fn();
    return res && res.error ? message(res.error) : null;
  } catch (e) {
    return message(e);
  }
}

export const signUp = (email: string, password: string, displayName: string, lang: Lang) =>
  run(async () => {
    const { data, error } = await supabase!.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName.trim(), native_lang: lang } },
    });
    if (error) return { error };
    // With "Confirm email" switched on in Supabase there is no session yet.
    if (!data.session) return { error: "CONFIRM_EMAIL" };
  });

export const signIn = (email: string, password: string) => run(() => supabase!.auth.signInWithPassword({ email, password }));

export const signOut = () =>
  isDemo
    ? Promise.resolve(exitDemo()).then(() => null)
    : run(async () => {
        await flush();
        return supabase!.auth.signOut();
      });

export const updateProfile = (patch: Partial<Pick<Profile, "display_name" | "native_lang">>) =>
  run(async () => {
    // .select() returns the updated row, so "saved" is only shown when a row really changed
    const { data, error } = await supabase!.from("profiles").update(patch).eq("id", state.userId!).select("display_name, native_lang");
    if (error) return { error };
    if (!data?.length) return { error: "Profile not found – please sign out and in again." };
    set({ profile: { ...state.profile, ...data[0] } as Profile });
    return { error: null };
  });

export const createClass = (name: string) =>
  run(async () => {
    const { data, error } = await supabase!.rpc("create_class", { class_name: name }).single();
    if (!error) set({ klass: data as ClassInfo });
    return { error };
  });

export const joinClass = (code: string) =>
  run(async () => {
    const { data, error } = await supabase!.rpc("join_class", { class_code: code }).single();
    if (!error) set({ klass: data as ClassInfo });
    return { error };
  });

export const leaveClass = () =>
  run(async () => {
    const { error } = await supabase!.from("class_members").delete().eq("class_id", state.klass!.id).eq("user_id", state.userId!);
    if (!error) set({ klass: null });
    return { error };
  });

export const removeMember = (userId: string) =>
  run(() => supabase!.from("class_members").delete().eq("class_id", state.klass!.id).eq("user_id", userId));

/** Virtual classmates around the demo learner's own (local) numbers. */
function demoLeaderboard(): LeaderRow[] {
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const week = allLog().filter((e) => e.t >= monday.getTime());
  const learned = Object.values(allEntries()).filter((e) => !e.hidden && e.card.state !== State.New).length;
  const me: LeaderRow = {
    user_id: DEMO_USER,
    display_name: "Demo",
    role: "member",
    week_answers: week.length,
    week_correct: week.filter((e) => e.ok).length,
    streak: streak(),
    words_learned: learned,
  };
  const base = Math.max(40, me.week_answers);
  const mates: [string, number, number, number, number][] = [
    // name, share of my weekly answers, accuracy, streak, share of my learned words
    ["Ayşe", 1.32, 0.86, 16, 1.25],
    ["Minh", 1.08, 0.91, 12, 1.1],
    ["Sara", 0.86, 0.79, 6, 0.95],
    ["Arash", 0.71, 0.83, 9, 0.82],
    ["Nok", 0.55, 0.88, 4, 0.7],
    ["Li Wei", 0.42, 0.75, 2, 0.6],
    ["Elena", 0.18, 0.7, 0, 0.45],
    ["Frau Weber", 0.05, 1, 1, 0.1],
  ];
  const rows = mates.map(([name, a, acc, st, w], i): LeaderRow => {
    const answers = Math.round(base * a);
    return {
      user_id: i === mates.length - 1 ? DEMO_CLASS.owner_id : `demo-${i}`,
      display_name: name,
      role: i === mates.length - 1 ? "owner" : "member",
      week_answers: answers,
      week_correct: Math.round(answers * acc),
      streak: st,
      words_learned: Math.round(Math.max(30, learned) * w),
    };
  });
  return [...rows, me].sort((a, b) => b.week_answers - a.week_answers || b.streak - a.streak);
}

export async function leaderboard(): Promise<LeaderRow[]> {
  if (isDemo) return demoLeaderboard();
  await flush(); // include my latest answers
  const { data, error } = await supabase!.rpc("class_leaderboard", { cid: state.klass!.id });
  if (error) throw error;
  return (data ?? []) as LeaderRow[];
}
