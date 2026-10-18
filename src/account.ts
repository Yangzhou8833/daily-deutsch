/** Signed-in user, profile and class. Everything is optional: without Supabase the app runs offline. */
import { useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import { setLang } from "./i18n";
import { supabase } from "./supabase";
import { flush, fullSync, stopSync } from "./sync";
import type { Lang } from "./types";

export interface Profile {
  display_name: string;
  native_lang: Lang;
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

let state: Account = { status: supabase ? "loading" : "off" };
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

async function loadProfileAndClass(userId: string) {
  const [{ data: profile }, { data: member }] = await Promise.all([
    supabase!.from("profiles").select("display_name, native_lang").eq("id", userId).maybeSingle(),
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
    set({ syncing: true, syncError: undefined });
    await fullSync(userId);
    set({ syncing: false });
  } catch (e) {
    set({ syncing: false, syncError: message(e) });
  }
}

if (supabase) {
  supabase.auth.getSession().then(({ data }) => onSession(data.session, false));
  // Supabase recommends not awaiting other calls inside this callback.
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT") setTimeout(() => onSession(session, event === "SIGNED_IN"));
  });
}

// ---------------------------------------------------------------- actions (return an error message or null)

async function run(fn: () => PromiseLike<{ error: unknown } | void>): Promise<string | null> {
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
  run(async () => {
    await flush();
    return supabase!.auth.signOut();
  });

export const updateProfile = (patch: Partial<Profile>) =>
  run(async () => {
    const { error } = await supabase!.from("profiles").update(patch).eq("id", state.userId!);
    if (!error) set({ profile: { ...state.profile!, ...patch } });
    return { error };
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

export async function leaderboard(): Promise<LeaderRow[]> {
  await flush(); // include my latest answers
  const { data, error } = await supabase!.rpc("class_leaderboard", { cid: state.klass!.id });
  if (error) throw error;
  return (data ?? []) as LeaderRow[];
}
