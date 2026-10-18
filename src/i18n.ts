import { useSyncExternalStore } from "react";
import type { Lang, Translated } from "./types";

export const LANGS: { code: Lang; label: string }[] = [
  { code: "zh", label: "中文" },
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
];

const UI = {
  tagline: { zh: "跟着课程，每天背德语", en: "German vocab that follows your class", tr: "Derse paralel günlük Almanca kelime" },
  dueToday: { zh: "今日待复习", en: "Due today", tr: "Bugün tekrar" },
  reviewNow: { zh: "开始复习", en: "Review now", tr: "Tekrar et" },
  nothingDue: { zh: "今天没有要复习的，去学新课吧", en: "Nothing due — start a new lesson", tr: "Tekrar yok — yeni bir derse başla" },
  streak: { zh: "连续打卡", en: "Day streak", tr: "Gün serisi" },
  days: { zh: "天", en: "days", tr: "gün" },
  lessons: { zh: "课程", en: "Lessons", tr: "Dersler" },
  newest: { zh: "最新", en: "New", tr: "Yeni" },
  words: { zh: "词", en: "words", tr: "kelime" },
  learned: { zh: "已学", en: "learned", tr: "öğrenildi" },
  back: { zh: "返回", en: "Back", tr: "Geri" },
  loading: { zh: "加载中…", en: "Loading…", tr: "Yükleniyor…" },
  loadError: { zh: "加载失败，请刷新", en: "Couldn't load — please refresh", tr: "Yüklenemedi — lütfen yenile" },
  noTranslation: { zh: "该课暂无此语言翻译，先显示中文", en: "No translation in your language yet — showing Chinese", tr: "Henüz Türkçe çeviri yok — Çince gösteriliyor" },
  // modes
  learn: { zh: "背单词", en: "Flashcards", tr: "Kartlar" },
  learnDesc: { zh: "间隔重复，记不住的会更常出现", en: "Spaced repetition — hard words come back sooner", tr: "Aralıklı tekrar — zor kelimeler daha sık gelir" },
  article: { zh: "der / die / das", en: "der / die / das", tr: "der / die / das" },
  articleDesc: { zh: "名词词性练习", en: "Practise noun genders", tr: "İsimlerin artikelini çalış" },
  plural: { zh: "复数", en: "Plural", tr: "Çoğul" },
  pluralDesc: { zh: "选出正确的复数形式", en: "Pick the right plural form", tr: "Doğru çoğul hâlini seç" },
  cloze: { zh: "例句填空", en: "Fill the gap", tr: "Boşluk doldurma" },
  clozeDesc: { zh: "在例句里拼写出单词", en: "Type the word into the sentence", tr: "Kelimeyi cümleye yaz" },
  grammar: { zh: "语法填空", en: "Grammar", tr: "Dilbilgisi" },
  grammarDesc: { zh: "本课语法点", en: "This lesson's grammar points", tr: "Bu dersin dilbilgisi konuları" },
  wordList: { zh: "单词表", en: "Word list", tr: "Kelime listesi" },
  search: { zh: "搜索…", en: "Search…", tr: "Ara…" },
  // flashcards
  showAnswer: { zh: "看答案", en: "Show answer", tr: "Cevabı göster" },
  again: { zh: "忘了", en: "Again", tr: "Tekrar" },
  hard: { zh: "模糊", en: "Hard", tr: "Zor" },
  good: { zh: "记得", en: "Good", tr: "İyi" },
  easy: { zh: "简单", en: "Easy", tr: "Kolay" },
  left: { zh: "剩余", en: "left", tr: "kaldı" },
  noPlural: { zh: "无复数", en: "no plural", tr: "çoğulu yok" },
  // drills
  check: { zh: "检查", en: "Check", tr: "Kontrol et" },
  next: { zh: "下一个", en: "Next", tr: "Sonraki" },
  reveal: { zh: "不会，看答案", en: "Show me", tr: "Göster" },
  correct: { zh: "正确！", en: "Correct!", tr: "Doğru!" },
  wrong: { zh: "答案是", en: "The answer is", tr: "Doğru cevap" },
  hintFirst: { zh: "提示", en: "Hint", tr: "İpucu" },
  done: { zh: "完成！", en: "Done!", tr: "Bitti!" },
  score: { zh: "答对", en: "Correct", tr: "Doğru" },
  again2: { zh: "再来一轮", en: "One more round", tr: "Bir tur daha" },
  toLesson: { zh: "回到课程", en: "Back to lesson", tr: "Derse dön" },
  nothingHere: { zh: "这一课没有这类题目", en: "No items of this type in this lesson", tr: "Bu derste bu tür alıştırma yok" },
  allCaughtUp: { zh: "这一课今天的卡片都完成了 🎉", en: "All cards for today are done 🎉", tr: "Bugünkü kartların hepsi bitti 🎉" },
  learnMore: { zh: "再学 10 个新词", en: "Learn 10 more", tr: "10 yeni kelime daha" },
  progressLocal: { zh: "进度保存在本设备上", en: "Progress is saved on this device", tr: "İlerleme bu cihazda kaydedilir" },
} satisfies Record<string, Record<Lang, string>>;

export type UIKey = keyof typeof UI;

// --- language setting (persisted per device) ---
const KEY = "dd:lang";
const listeners = new Set<() => void>();

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "zh" || saved === "en" || saved === "tr") return saved;
  } catch {
    /* storage unavailable */
  }
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith("zh")) return "zh";
  if (nav.startsWith("tr")) return "tr";
  return "en";
}

let current: Lang = detect();

export function setLang(lang: Lang) {
  current = lang;
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* ignore */
  }
  document.documentElement.lang = lang;
  listeners.forEach((l) => l());
}

export function useLang() {
  const lang = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
  const t = (key: UIKey) => UI[key][lang];
  /** Pick a translated field: chosen language → English → Chinese. */
  const pick = (field: Translated | undefined) => (field ? (field[lang] ?? field.en ?? field.zh ?? "") : "");
  return { lang, t, pick };
}
