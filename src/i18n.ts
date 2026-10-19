import { useSyncExternalStore } from "react";
import type { Lang, Translated } from "./types";

/** Languages for word explanations (must exist in the lesson data). */
export const LANGS: { code: Lang; label: string }[] = [
  { code: "zh", label: "中文" },
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
];

/** Languages for the interface itself. */
export type UiLang = "de" | "en" | "zh" | "tr";
export const UI_LANGS: { code: UiLang; label: string }[] = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "tr", label: "Türkçe" },
];

const UI = {
  tagline: { de: "Deutsch-Vokabeln passend zu deinem Kurs", zh: "跟着课程，每天背德语", en: "German vocab that follows your class", tr: "Derse paralel günlük Almanca kelime" },
  dueToday: { de: "Heute fällig", zh: "今日待复习", en: "Due today", tr: "Bugün tekrar" },
  reviewNow: { de: "Jetzt wiederholen", zh: "开始复习", en: "Review now", tr: "Tekrar et" },
  nothingDue: { de: "Nichts fällig — fang eine neue Lektion an", zh: "今天没有要复习的，去学新课吧", en: "Nothing due — start a new lesson", tr: "Tekrar yok — yeni bir derse başla" },
  streak: { de: "Tage in Folge", zh: "连续打卡", en: "Day streak", tr: "Gün serisi" },
  days: { de: "Tage", zh: "天", en: "days", tr: "gün" },
  lessons: { de: "Lektionen", zh: "课程", en: "Lessons", tr: "Dersler" },
  newest: { de: "Neu", zh: "最新", en: "New", tr: "Yeni" },
  words: { de: "Wörter", zh: "词", en: "words", tr: "kelime" },
  learned: { de: "gelernt", zh: "已学", en: "learned", tr: "öğrenildi" },
  back: { de: "Zurück", zh: "返回", en: "Back", tr: "Geri" },
  loading: { de: "Lädt…", zh: "加载中…", en: "Loading…", tr: "Yükleniyor…" },
  loadError: { de: "Laden fehlgeschlagen — bitte neu laden", zh: "加载失败，请刷新", en: "Couldn't load — please refresh", tr: "Yüklenemedi — lütfen yenile" },
  noTranslation: { de: "Noch keine Übersetzung in deiner Sprache — Chinesisch wird angezeigt", zh: "该课暂无此语言翻译，先显示中文", en: "No translation in your language yet — showing Chinese", tr: "Henüz Türkçe çeviri yok — Çince gösteriliyor" },
  // modes
  learn: { de: "Karteikarten", zh: "背单词", en: "Flashcards", tr: "Kartlar" },
  learnDesc: { de: "Wiederholung mit Abstand — schwere Wörter kommen öfter", zh: "间隔重复，记不住的会更常出现", en: "Spaced repetition — hard words come back sooner", tr: "Aralıklı tekrar — zor kelimeler daha sık gelir" },
  article: { de: "der / die / das", zh: "der / die / das", en: "der / die / das", tr: "der / die / das" },
  articleDesc: { de: "Artikel der Nomen üben", zh: "名词词性练习", en: "Practise noun genders", tr: "İsimlerin artikelini çalış" },
  plural: { de: "Plural", zh: "复数", en: "Plural", tr: "Çoğul" },
  pluralDesc: { de: "Wähle die richtige Pluralform", zh: "选出正确的复数形式", en: "Pick the right plural form", tr: "Doğru çoğul hâlini seç" },
  cloze: { de: "Lückentext", zh: "例句填空", en: "Fill the gap", tr: "Boşluk doldurma" },
  clozeDesc: { de: "Schreib das Wort in den Satz", zh: "在例句里拼写出单词", en: "Type the word into the sentence", tr: "Kelimeyi cümleye yaz" },
  grammar: { de: "Grammatik", zh: "语法填空", en: "Grammar", tr: "Dilbilgisi" },
  grammarDesc: { de: "Grammatik dieser Lektion", zh: "本课语法点", en: "This lesson's grammar points", tr: "Bu dersin dilbilgisi konuları" },
  wordList: { de: "Wortliste", zh: "单词表", en: "Word list", tr: "Kelime listesi" },
  search: { de: "Suchen…", zh: "搜索…", en: "Search…", tr: "Ara…" },
  // flashcards
  showAnswer: { de: "Antwort zeigen", zh: "看答案", en: "Show answer", tr: "Cevabı göster" },
  again: { de: "Nochmal", zh: "忘了", en: "Again", tr: "Tekrar" },
  hard: { de: "Schwer", zh: "模糊", en: "Hard", tr: "Zor" },
  good: { de: "Gut", zh: "记得", en: "Good", tr: "İyi" },
  easy: { de: "Leicht", zh: "简单", en: "Easy", tr: "Kolay" },
  left: { de: "übrig", zh: "剩余", en: "left", tr: "kaldı" },
  noPlural: { de: "kein Plural", zh: "无复数", en: "no plural", tr: "çoğulu yok" },
  // drills
  check: { de: "Prüfen", zh: "检查", en: "Check", tr: "Kontrol et" },
  next: { de: "Weiter", zh: "下一个", en: "Next", tr: "Sonraki" },
  reveal: { de: "Lösung zeigen", zh: "不会，看答案", en: "Show me", tr: "Göster" },
  correct: { de: "Richtig!", zh: "正确！", en: "Correct!", tr: "Doğru!" },
  wrong: { de: "Lösung", zh: "答案是", en: "The answer is", tr: "Doğru cevap" },
  hintFirst: { de: "Tipp", zh: "提示", en: "Hint", tr: "İpucu" },
  done: { de: "Fertig!", zh: "完成！", en: "Done!", tr: "Bitti!" },
  score: { de: "Richtig", zh: "答对", en: "Correct", tr: "Doğru" },
  again2: { de: "Noch eine Runde", zh: "再来一轮", en: "One more round", tr: "Bir tur daha" },
  toLesson: { de: "Zur Lektion", zh: "回到课程", en: "Back to lesson", tr: "Derse dön" },
  nothingHere: { de: "Keine Übungen dieser Art in dieser Lektion", zh: "这一课没有这类题目", en: "No items of this type in this lesson", tr: "Bu derste bu tür alıştırma yok" },
  allCaughtUp: { de: "Alle Karten für heute erledigt 🎉", zh: "这一课今天的卡片都完成了 🎉", en: "All cards for today are done 🎉", tr: "Bugünkü kartların hepsi bitti 🎉" },
  learnMore: { de: "10 neue Wörter lernen", zh: "再学 10 个新词", en: "Learn 10 more", tr: "10 yeni kelime daha" },
  progressLocal: { de: "Dein Fortschritt wird auf diesem Gerät gespeichert", zh: "进度保存在本设备上", en: "Progress is saved on this device", tr: "İlerleme bu cihazda kaydedilir" },
  progressSynced: { de: "Dein Fortschritt wird mit deinem Konto synchronisiert", zh: "进度已同步到你的账号", en: "Progress is synced to your account", tr: "İlerleme hesabına senkronize edilir" },
  // account
  account: { de: "Konto", zh: "账号", en: "Account", tr: "Hesap" },
  signIn: { de: "Anmelden", zh: "登录", en: "Sign in", tr: "Giriş yap" },
  signUp: { de: "Registrieren", zh: "注册", en: "Sign up", tr: "Kayıt ol" },
  email: { de: "E-Mail", zh: "邮箱", en: "Email", tr: "E-posta" },
  password: { de: "Passwort (mindestens 6 Zeichen)", zh: "密码（至少 6 位）", en: "Password (at least 6 characters)", tr: "Şifre (en az 6 karakter)" },
  displayName: { de: "Name (wird in der Rangliste gezeigt)", zh: "昵称（排行榜上显示）", en: "Name (shown on the leaderboard)", tr: "İsim (sıralamada görünür)" },
  haveAccount: { de: "Schon ein Konto? Anmelden", zh: "已有账号？登录", en: "Have an account? Sign in", tr: "Hesabın var mı? Giriş yap" },
  noAccount: { de: "Neu hier? Registrieren", zh: "没有账号？注册", en: "New here? Sign up", tr: "Yeni misin? Kayıt ol" },
  loginWhy: {
    de: "Melde dich an, um deinen Fortschritt auf allen Geräten zu synchronisieren und der Rangliste deines Kurses beizutreten. Ohne Konto geht es auch.",
    zh: "登录后进度在手机和电脑之间同步，还能加入班级排行榜。不登录也可以照常使用。",
    en: "Sign in to sync your progress across devices and join your class leaderboard. You can also keep using the site without an account.",
    tr: "Giriş yaparak ilerlemeni cihazlar arasında senkronize et ve sınıf sıralamasına katıl. Hesapsız da kullanmaya devam edebilirsin.",
  },
  signOut: { de: "Abmelden", zh: "退出登录", en: "Sign out", tr: "Çıkış yap" },
  syncing: { de: "Synchronisiert…", zh: "同步中…", en: "Syncing…", tr: "Senkronize ediliyor…" },
  synced: { de: "Fortschritt synchronisiert", zh: "进度已同步", en: "Progress synced", tr: "İlerleme senkronize" },
  syncFailed: { de: "Synchronisierung fehlgeschlagen — wird automatisch wiederholt", zh: "同步失败，之后会自动重试", en: "Sync failed — it will retry automatically", tr: "Senkronizasyon başarısız — otomatik tekrar denenecek" },
  profile: { de: "Profil", zh: "个人资料", en: "Profile", tr: "Profil" },
  nativeLang: { de: "Erklärungssprache", zh: "解释语言", en: "Explanation language", tr: "Açıklama dili" },
  save: { de: "Speichern", zh: "保存", en: "Save", tr: "Kaydet" },
  saved: { de: "Gespeichert", zh: "已保存", en: "Saved", tr: "Kaydedildi" },
  confirmEmail: {
    de: "Schau in dein Postfach, klick auf den Bestätigungslink und melde dich dann an",
    zh: "请到邮箱点击确认链接，然后回来登录",
    en: "Check your inbox, click the confirmation link, then sign in",
    tr: "E-postanı kontrol et, onay bağlantısına tıkla, sonra giriş yap",
  },
  // class
  myClass: { de: "Mein Kurs", zh: "我的班级", en: "My class", tr: "Sınıfım" },
  joinClass: { de: "Einem Kurs beitreten", zh: "加入班级", en: "Join a class", tr: "Sınıfa katıl" },
  classCode: { de: "Kurscode", zh: "班级码", en: "Class code", tr: "Sınıf kodu" },
  join: { de: "Beitreten", zh: "加入", en: "Join", tr: "Katıl" },
  createClass: { de: "Kurs erstellen (Organisator)", zh: "创建班级（组织者）", en: "Create a class (organiser)", tr: "Sınıf oluştur (düzenleyen)" },
  className: { de: "Kursname, z. B. A2 Abendkurs", zh: "班级名称，例如 A2 Abendkurs", en: "Class name, e.g. A2 Abendkurs", tr: "Sınıf adı, ör. A2 Abendkurs" },
  create: { de: "Erstellen", zh: "创建", en: "Create", tr: "Oluştur" },
  inviteLink: { de: "Einladungslink", zh: "邀请链接", en: "Invite link", tr: "Davet bağlantısı" },
  inviteHint: {
    de: "Teile ihn in eurer Kursgruppe — nach der Anmeldung tritt man automatisch bei",
    zh: "发到班级群：同学点开、登录后自动加入",
    en: "Share it in your class chat — classmates join automatically after signing in",
    tr: "Sınıf grubunda paylaş — arkadaşların giriş yapınca otomatik katılır",
  },
  copy: { de: "Kopieren", zh: "复制", en: "Copy", tr: "Kopyala" },
  copied: { de: "Kopiert", zh: "已复制", en: "Copied", tr: "Kopyalandı" },
  leaveClass: { de: "Kurs verlassen", zh: "退出班级", en: "Leave class", tr: "Sınıftan ayrıl" },
  confirmLeave: { de: "Diesen Kurs verlassen?", zh: "确定退出这个班级？", en: "Leave this class?", tr: "Bu sınıftan ayrılmak istiyor musun?" },
  invalidCode: { de: "Ungültiger Kurscode", zh: "班级码无效", en: "Invalid class code", tr: "Geçersiz sınıf kodu" },
  invited: { de: "Du wurdest zu einem Kurs eingeladen", zh: "你被邀请加入一个班级", en: "You've been invited to a class", tr: "Bir sınıfa davet edildin" },
  signInToJoin: {
    de: "Melde dich zuerst an oder registriere dich — dann trittst du automatisch bei",
    zh: "先登录或注册，之后会自动加入",
    en: "Sign in or sign up first — you'll join automatically",
    tr: "Önce giriş yap veya kayıt ol — otomatik katılacaksın",
  },
  leaderboard: { de: "Kurs-Rangliste", zh: "班级排行", en: "Class leaderboard", tr: "Sınıf sıralaması" },
  boardWhy: {
    de: "Melde dich an und tritt deinem Kurs bei, um gemeinsam dranzubleiben",
    zh: "登录并加入班级，和同学一起打卡",
    en: "Sign in and join your class to keep a streak together",
    tr: "Giriş yap, sınıfına katıl ve arkadaşlarınla seri yap",
  },
  thisWeek: { de: "diese Woche", zh: "本周答题", en: "this week", tr: "bu hafta" },
  accuracy: { de: "richtig", zh: "正确率", en: "correct", tr: "doğru" },
  learnedWords: { de: "gelernt", zh: "已学词", en: "learned", tr: "öğrenilen" },
  you: { de: "du", zh: "我", en: "you", tr: "sen" },
  owner: { de: "Organisator", zh: "组织者", en: "organiser", tr: "düzenleyen" },
  remove: { de: "Entfernen", zh: "移除", en: "Remove", tr: "Çıkar" },
  confirmRemove: { de: "{name} aus dem Kurs entfernen?", zh: "确定把 {name} 移出班级？", en: "Remove {name} from the class?", tr: "{name} sınıftan çıkarılsın mı?" },
  members: { de: "Mitglieder", zh: "名成员", en: "members", tr: "üye" },
  editor: { de: "Lektionen erstellen (KI)", zh: "课程管理（AI 生成）", en: "Lesson editor (AI)", tr: "Ders editörü (YZ)" },
  uiLang: { de: "Oberfläche", zh: "界面语言", en: "Interface", tr: "Arayüz" },
  weekStarts: { de: "Startet jeden Montag neu", zh: "每周一重新计算", en: "Resets every Monday", tr: "Her pazartesi sıfırlanır" },
} satisfies Record<string, Record<UiLang, string>>;

export type UIKey = keyof typeof UI;

// --- language settings (persisted per device) ---
const listeners = new Set<() => void>();
const nav = navigator.language.toLowerCase();

function saved<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key) as T | null;
    if (v && allowed.includes(v)) return v;
  } catch {
    /* storage unavailable */
  }
  return fallback;
}
function persist(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

const navLang = (["zh", "tr", "de"] as const).find((l) => nav.startsWith(l));
let meaning: Lang = saved("dd:lang", ["zh", "en", "tr"], navLang === "zh" || navLang === "tr" ? navLang : "en");
let ui: UiLang = saved("dd:ui", ["de", "en", "zh", "tr"], navLang ?? "en");
document.documentElement.lang = ui;

/** Explanation language for meanings and example translations. */
export function setLang(lang: Lang) {
  meaning = lang;
  persist("dd:lang", lang);
}

export function setUiLang(lang: UiLang) {
  ui = lang;
  document.documentElement.lang = lang;
  persist("dd:ui", lang);
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

export function useLang() {
  const lang = useSyncExternalStore(subscribe, () => meaning);
  const uiLang = useSyncExternalStore(subscribe, () => ui);
  const t = (key: UIKey) => UI[key][uiLang];
  /** Pick a translated field: explanation language → English → Chinese. */
  const pick = (field: Translated | undefined) => (field ? (field[lang] ?? field.en ?? field.zh ?? "") : "");
  return { lang, uiLang, t, pick };
}
