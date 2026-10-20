/**
 * Whether this page is the demo. The demo is part of the address (…/daily-deutsch/?demo), so the
 * normal link always opens the real app, and the demo keeps its data under its own storage keys.
 * No imports: store.ts and settings.ts read their keys from here before anything else runs.
 */
export const isDemo = new URLSearchParams(location.search).has("demo");

/** localStorage key for this mode: the demo never reads or writes the learner's real data. */
export const storageKey = (key: string) => (isDemo ? `${key}:demo` : key);

/** The app's address with or without the demo, at its home page. */
export const appUrl = (demo: boolean) => `${location.origin}${location.pathname}${demo ? "?demo" : ""}#/`;

// Earlier versions put the demo into the real keys (backed up as "<key>:before-demo") behind a
// "dd:demo" flag, which kept the normal link in the demo. Put the real data back.
try {
  if (localStorage.getItem("dd:demo") === "1") {
    for (const key of ["dd:progress", "dd:settings"]) {
      const real = localStorage.getItem(`${key}:before-demo`);
      if (real === null) localStorage.removeItem(key);
      else localStorage.setItem(key, real);
      localStorage.removeItem(`${key}:before-demo`);
    }
    localStorage.removeItem("dd:demo");
  }
} catch {
  /* storage unavailable */
}
