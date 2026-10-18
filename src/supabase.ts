import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_KEY as string | undefined;

/** null when the site is built without Supabase settings: everything still works offline. */
export const supabase = url && key ? createClient(url, key) : null;
