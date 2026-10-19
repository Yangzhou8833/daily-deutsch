export type Lang = "zh" | "en" | "tr" | "th" | "vi" | "fa";
export type Translated = Partial<Record<Lang, string>>;

export interface Word {
  id: string;
  word: string;
  article: "der" | "die" | "das" | null;
  plural: string | null;
  /** Grammar note in German terms (verb forms, comparison, "trennbar"…). */
  info: string | null;
  /** Grammar note that still needs translating. */
  info_tr?: Translated;
  level: string | null;
  meaning: Translated;
  example: string;
  example_tr: Translated;
  cloze: string | null;
  answer: string | null;
}

export interface GrammarCard {
  id: string;
  /** Anki cloze text: "Ich {{c1::hätte}} gern mehr Zeit." */
  text: string;
  hint: Translated;
}

/** Chinese → German sentence card (old decks; shown to Chinese-explanation users only). */
export interface Sentence {
  id: string;
  zh: string;
  de: string;
}

export interface LessonSummary {
  id: string;
  /** Unit title, e.g. "Möbel & Haushalt" or "Teil 2". */
  title: string;
  /** "A2", "A1.2"; editor lessons have none. */
  course?: string;
  /** Group inside the course, e.g. "Modul 1" (A2); A1.2 lessons are a whole Modul and have none. */
  modul?: string | null;
  order?: number;
  date: string;
  langs: Lang[];
  words: number;
  grammar: number;
  sentences?: number;
}

export interface Lesson extends Omit<LessonSummary, "words" | "grammar" | "sentences"> {
  words: Word[];
  grammar: GrammarCard[];
  sentences?: Sentence[];
}

export type DrillMode = "learn" | "article" | "plural" | "cloze" | "grammar" | "sentence";
