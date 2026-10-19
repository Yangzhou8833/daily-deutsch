export function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "de-DE";
  u.rate = 0.9;
  const voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith("de"));
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
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
