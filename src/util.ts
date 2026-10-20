let voices: SpeechSynthesisVoice[] = [];
const loadVoices = () => (voices = window.speechSynthesis.getVoices());
const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
// voices arrive asynchronously (often empty on the first call, especially on phones)
if (canSpeak) {
  loadVoices();
  window.speechSynthesis.addEventListener?.("voiceschanged", loadVoices);
}

/** A German voice: de-DE first, then any German one (Android reports "de_DE"). */
const germanVoice = () => {
  const lang = (v: SpeechSynthesisVoice) => v.lang.replace("_", "-").toLowerCase();
  return voices.find((v) => lang(v) === "de-de") ?? voices.find((v) => lang(v).startsWith("de"));
};

export type SpeakProblem = "unsupported" | "noVoice" | "failed";

/** Read German text aloud with the device's speech engine; `onProblem` hears why nothing played. */
export function speak(text: string, onProblem?: (p: SpeakProblem) => void) {
  // in-app browsers (WeChat, Instagram …) often have no speech engine at all
  if (!canSpeak) return onProblem?.("unsupported");
  const synth = window.speechSynthesis;
  if (!voices.length) loadVoices();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "de-DE";
  u.rate = 0.9;
  const voice = germanVoice();
  if (voice) u.voice = voice;
  let played = false;
  u.onstart = u.onend = () => (played = true);
  u.onerror = (e) => {
    if (e.error !== "interrupted" && e.error !== "canceled") onProblem?.("failed");
  };
  const start = () => {
    synth.resume(); // Chrome on Android can get stuck in "paused"
    synth.speak(u);
  };
  // cancel() directly before speak() makes some mobile browsers drop the new utterance, so only
  // stop something that is actually playing, and start the new one a moment later
  if (synth.speaking || synth.pending) {
    synth.cancel();
    setTimeout(start, 60);
  } else start();
  setTimeout(() => {
    if (!played && !synth.speaking) onProblem?.(voices.length > 0 && !voice ? "noVoice" : "failed");
  }, 2500);
}

export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Lenient answer check: trims, collapses spaces, ignores case and trailing punctuation (also "…"). Umlauts must match. */
export function sameAnswer(given: string, expected: string): boolean {
  const norm = (s: string) =>
    s
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[\s.,!?;:…]+$/, "")
      .toLowerCase();
  return norm(given) === norm(expected);
}

/** "in 10 min", "3 d" … for the flashcard buttons. */
export function shortInterval(due: Date, now = new Date()): string {
  const min = Math.max(1, Math.round((due.getTime() - now.getTime()) / 60000));
  if (min < 60) return `${min}m`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 31) return `${d}d`;
  const mo = Math.round(d / 30);
  return mo < 12 ? `${mo}mo` : `${(d / 365).toFixed(1)}y`;
}
