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
  progressSynced: { zh: "进度已同步到你的账号", en: "Progress is synced to your account", tr: "İlerleme hesabına senkronize edilir" },
  // account
  account: { zh: "账号", en: "Account", tr: "Hesap" },
  signIn: { zh: "登录", en: "Sign in", tr: "Giriş yap" },
  signUp: { zh: "注册", en: "Sign up", tr: "Kayıt ol" },
  email: { zh: "邮箱", en: "Email", tr: "E-posta" },
  password: { zh: "密码（至少 6 位）", en: "Password (at least 6 characters)", tr: "Şifre (en az 6 karakter)" },
  displayName: { zh: "昵称（排行榜上显示）", en: "Name (shown on the leaderboard)", tr: "İsim (sıralamada görünür)" },
  haveAccount: { zh: "已有账号？登录", en: "Have an account? Sign in", tr: "Hesabın var mı? Giriş yap" },
  noAccount: { zh: "没有账号？注册", en: "New here? Sign up", tr: "Yeni misin? Kayıt ol" },
  loginWhy: {
    zh: "登录后进度在手机和电脑之间同步，还能加入班级排行榜。不登录也可以照常使用。",
    en: "Sign in to sync your progress across devices and join your class leaderboard. You can also keep using the site without an account.",
    tr: "Giriş yaparak ilerlemeni cihazlar arasında senkronize et ve sınıf sıralamasına katıl. Hesapsız da kullanmaya devam edebilirsin.",
  },
  signOut: { zh: "退出登录", en: "Sign out", tr: "Çıkış yap" },
  syncing: { zh: "同步中…", en: "Syncing…", tr: "Senkronize ediliyor…" },
  synced: { zh: "进度已同步", en: "Progress synced", tr: "İlerleme senkronize" },
  syncFailed: { zh: "同步失败，之后会自动重试", en: "Sync failed — it will retry automatically", tr: "Senkronizasyon başarısız — otomatik tekrar denenecek" },
  profile: { zh: "个人资料", en: "Profile", tr: "Profil" },
  nativeLang: { zh: "解释语言", en: "Explanation language", tr: "Açıklama dili" },
  save: { zh: "保存", en: "Save", tr: "Kaydet" },
  saved: { zh: "已保存", en: "Saved", tr: "Kaydedildi" },
  confirmEmail: {
    zh: "请到邮箱点击确认链接，然后回来登录",
    en: "Check your inbox, click the confirmation link, then sign in",
    tr: "E-postanı kontrol et, onay bağlantısına tıkla, sonra giriş yap",
  },
  // class
  myClass: { zh: "我的班级", en: "My class", tr: "Sınıfım" },
  joinClass: { zh: "加入班级", en: "Join a class", tr: "Sınıfa katıl" },
  classCode: { zh: "班级码", en: "Class code", tr: "Sınıf kodu" },
  join: { zh: "加入", en: "Join", tr: "Katıl" },
  createClass: { zh: "创建班级（组织者）", en: "Create a class (organiser)", tr: "Sınıf oluştur (düzenleyen)" },
  className: { zh: "班级名称，例如 A2 Abendkurs", en: "Class name, e.g. A2 Abendkurs", tr: "Sınıf adı, ör. A2 Abendkurs" },
  create: { zh: "创建", en: "Create", tr: "Oluştur" },
  inviteLink: { zh: "邀请链接", en: "Invite link", tr: "Davet bağlantısı" },
  inviteHint: {
    zh: "发到班级群：同学点开、登录后自动加入",
    en: "Share it in your class chat — classmates join automatically after signing in",
    tr: "Sınıf grubunda paylaş — arkadaşların giriş yapınca otomatik katılır",
  },
  copy: { zh: "复制", en: "Copy", tr: "Kopyala" },
  copied: { zh: "已复制", en: "Copied", tr: "Kopyalandı" },
  leaveClass: { zh: "退出班级", en: "Leave class", tr: "Sınıftan ayrıl" },
  confirmLeave: { zh: "确定退出这个班级？", en: "Leave this class?", tr: "Bu sınıftan ayrılmak istiyor musun?" },
  invalidCode: { zh: "班级码无效", en: "Invalid class code", tr: "Geçersiz sınıf kodu" },
  invited: { zh: "你被邀请加入一个班级", en: "You've been invited to a class", tr: "Bir sınıfa davet edildin" },
  signInToJoin: {
    zh: "先登录或注册，之后会自动加入",
    en: "Sign in or sign up first — you'll join automatically",
    tr: "Önce giriş yap veya kayıt ol — otomatik katılacaksın",
  },
  leaderboard: { zh: "班级排行", en: "Class leaderboard", tr: "Sınıf sıralaması" },
  boardWhy: {
    zh: "登录并加入班级，和同学一起打卡",
    en: "Sign in and join your class to keep a streak together",
    tr: "Giriş yap, sınıfına katıl ve arkadaşlarınla seri yap",
  },
  thisWeek: { zh: "本周答题", en: "this week", tr: "bu hafta" },
  accuracy: { zh: "正确率", en: "correct", tr: "doğru" },
  learnedWords: { zh: "已学词", en: "learned", tr: "öğrenilen" },
  you: { zh: "我", en: "you", tr: "sen" },
  owner: { zh: "组织者", en: "organiser", tr: "düzenleyen" },
  remove: { zh: "移除", en: "Remove", tr: "Çıkar" },
  confirmRemove: { zh: "确定把 {name} 移出班级？", en: "Remove {name} from the class?", tr: "{name} sınıftan çıkarılsın mı?" },
  members: { zh: "名成员", en: "members", tr: "üye" },
  weekStarts: { zh: "每周一重新计算", en: "Resets every Monday", tr: "Her pazartesi sıfırlanır" },
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
