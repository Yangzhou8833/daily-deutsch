/** Client side of AI lesson generation: image prep, calling the Edge Function, merging results. */
import { loadIndex, loadLesson } from "./data";
import { supabase } from "./supabase";
import type { GrammarCard, Lang, Word } from "./types";

const MAX_SIDE = 1600; // px; plenty for printed text, keeps requests small
const PARALLEL = 3;

export interface ImagePart {
  media_type: "image/jpeg";
  data: string; // base64
  preview: string; // object URL for the thumbnail
}

/** Downscale a photo and re-encode it as JPEG. */
export async function prepareImage(file: File): Promise<ImagePart> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((ok) => canvas.toBlob((b) => ok(b!), "image/jpeg", 0.85));
  const data = await new Promise<string>((ok) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1]);
    r.readAsDataURL(blob);
  });
  return { media_type: "image/jpeg", data, preview: URL.createObjectURL(blob) };
}

/** Every headword already published, so Claude can skip what the class knows. */
export async function knownWords(): Promise<string[]> {
  const lessons = await Promise.all((await loadIndex()).map((l) => loadLesson(l.id).catch(() => null)));
  return [...new Set(lessons.flatMap((l) => l?.words.map((w) => w.word) ?? []))];
}

interface RawWord {
  word: string;
  article: string;
  plural: string;
  info: string;
  level: string;
  meaning: Partial<Record<Lang, string>>;
  example: string;
  example_tr: Partial<Record<Lang, string>>;
  cloze: string;
  answer: string;
}
interface RawResult {
  title_suggestion: string;
  note: string;
  words: RawWord[];
  grammar: { text: string; hint: Partial<Record<Lang, string>> }[];
}

export interface GenerateRequest {
  images: ImagePart[];
  text: string;
  level: string;
  title: string;
  instructions: string;
  known: string[];
}
export interface GenerateResult {
  title: string;
  notes: string[];
  words: Word[];
  grammar: GrammarCard[];
}

/** One Edge Function call; reports how many words have streamed in so far. */
async function callOnce(body: object, onWords: (n: number) => void): Promise<RawResult> {
  const { data } = await supabase!.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-cards`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_KEY,
      Authorization: `Bearer ${data.session?.access_token ?? ""}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error ?? err.message ?? `HTTP ${res.status}`);
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let text = "";
  let done = false;
  for (;;) {
    const { value, done: end } = await reader.read();
    if (end) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop()!;
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line);
      if (event.t === "delta") {
        text += event.text;
        onWords((text.match(/"word"\s*:/g) ?? []).length);
      } else if (event.t === "error") throw new Error(event.message);
      else if (event.t === "done") done = true;
    }
  }
  if (!done) throw new Error("The connection closed before the result was complete. Try again with fewer pages.");
  return JSON.parse(text) as RawResult;
}

const orNull = (s: string) => (s.trim() ? s.trim() : null);

function toWord(r: RawWord): Word {
  const cloze = r.cloze.includes("___") ? r.cloze : "";
  return {
    id: crypto.randomUUID(),
    word: r.word.trim(),
    article: (["der", "die", "das"].includes(r.article) ? r.article : null) as Word["article"],
    plural: orNull(r.plural),
    info: orNull(r.info),
    level: orNull(r.level),
    meaning: r.meaning,
    example: r.example.trim(),
    example_tr: r.example_tr,
    cloze: orNull(cloze),
    answer: cloze ? orNull(r.answer) : null,
  };
}

const wordKey = (w: Pick<Word, "word" | "article">) => `${w.article ?? ""} ${w.word}`.trim().toLowerCase();

/** Each image (and the pasted text) is its own request, run a few at a time, then merged in input order. */
export async function generateLesson(req: GenerateRequest, onProgress: (words: number, doneParts: number, parts: number) => void): Promise<GenerateResult> {
  const common = { level: req.level, title: req.title, instructions: req.instructions, known: req.known };
  const jobs: object[] = [
    ...req.images.map((img) => ({ ...common, images: [{ media_type: img.media_type, data: img.data }] })),
    ...(req.text.trim() ? [{ ...common, text: req.text }] : []),
  ];
  const counts = jobs.map(() => 0);
  let finished = 0;
  const report = () => onProgress(counts.reduce((a, b) => a + b, 0), finished, jobs.length);
  const results: RawResult[] = new Array(jobs.length);

  let next = 0;
  async function worker() {
    while (next < jobs.length) {
      const i = next++;
      results[i] = await callOnce(jobs[i], (n) => {
        counts[i] = n;
        report();
      });
      finished++;
      report();
    }
  }
  await Promise.all(Array.from({ length: Math.min(PARALLEL, jobs.length) }, worker));

  const seen = new Set(req.known.map((w) => w.toLowerCase()));
  const words: Word[] = [];
  for (const r of results)
    for (const raw of r.words) {
      const w = toWord(raw);
      if (!w.word || seen.has(wordKey(w)) || seen.has(w.word.toLowerCase())) continue;
      seen.add(wordKey(w));
      words.push(w);
    }
  return {
    title: results.find((r) => r.title_suggestion)?.title_suggestion ?? "",
    notes: results.map((r) => r.note).filter(Boolean),
    words,
    grammar: results.flatMap((r) => r.grammar.map((g) => ({ id: crypto.randomUUID(), text: g.text, hint: g.hint }))),
  };
}
