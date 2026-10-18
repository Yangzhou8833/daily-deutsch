export type Lang = "zh" | "en" | "tr";
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

export interface LessonSummary {
  id: string;
  title: string;
  date: string;
  langs: Lang[];
  words: number;
  grammar: number;
}

export interface Lesson extends Omit<LessonSummary, "words" | "grammar"> {
  words: Word[];
  grammar: GrammarCard[];
}

export type DrillMode = "learn" | "article" | "plural" | "cloze" | "grammar";
