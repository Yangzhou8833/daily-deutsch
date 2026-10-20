import { useSyncExternalStore } from "react";
import type { Lang, Translated } from "./types";

/** Languages for word explanations (must exist in the lesson data). */
export const LANGS: { code: Lang; label: string }[] = [
  { code: "zh", label: "中文" },
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
  { code: "th", label: "ไทย" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "fa", label: "فارسی" },
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
  noTranslationEn: { de: "Noch keine Übersetzung in deiner Sprache — Englisch wird angezeigt", zh: "该课暂无此语言翻译，先显示英文", en: "No translation in your language yet — showing English", tr: "Henüz bu dilde çeviri yok — İngilizce gösteriliyor" },
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
  learnMore: { de: "Heute 10 mehr lernen", zh: "今天再多学 10 个", en: "Learn 10 more today", tr: "Bugün 10 tane daha öğren" },
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
  sentence: { de: "Sätze übersetzen", zh: "句子翻译", en: "Translate sentences", tr: "Cümle çevirisi" },
  sentenceDesc: { de: "Chinesisch → Deutsch", zh: "看中文，说出德语", en: "Chinese → German", tr: "Çince → Almanca" },
  sayIt: { de: "Sag den Satz auf Deutsch, dann prüfe", zh: "先在心里说出德语，再看答案", en: "Say it in German, then check", tr: "Almanca söyle, sonra kontrol et" },
  knewIt: { de: "Gewusst", zh: "会了", en: "Got it", tr: "Bildim" },
  notYet: { de: "Noch nicht", zh: "还不会", en: "Not yet", tr: "Henüz değil" },
  hideWord: { de: "Dieses Wort nicht lernen", zh: "不背这个词", en: "Don't learn this word", tr: "Bu kelimeyi öğrenme" },
  hiddenWords: { de: "Ausgeblendete Wörter", zh: "已隐藏的词", en: "Hidden words", tr: "Gizlenen kelimeler" },
  restore: { de: "Wiederherstellen", zh: "恢复", en: "Restore", tr: "Geri al" },
  hidden: { de: "ausgeblendet", zh: "已隐藏", en: "hidden", tr: "gizli" },
  undo: { de: "Rückgängig", zh: "撤销", en: "Undo", tr: "Geri al" },
  wordHidden: { de: "Wort ausgeblendet", zh: "已隐藏这个词", en: "Word hidden", tr: "Kelime gizlendi" },
  units: { de: "Einheiten", zh: "个单元", en: "units", tr: "ünite" },
  uiLang: { de: "Oberfläche", zh: "界面语言", en: "Interface", tr: "Arayüz" },
  weekStarts: { de: "Startet jeden Montag neu", zh: "每周一重新计算", en: "Resets every Monday", tr: "Her pazartesi sıfırlanır" },
  countNew: { de: "Neu", zh: "新", en: "New", tr: "Yeni" },
  countLearning: { de: "Lernen", zh: "学习中", en: "Learning", tr: "Öğreniliyor" },
  countReview: { de: "Fällig", zh: "待复习", en: "Due", tr: "Tekrar" },
  newToday: { de: "Neue Wörter heute", zh: "今日新词", en: "New words today", tr: "Bugün yeni kelime" },
  stats: { de: "Statistik", zh: "统计", en: "Statistics", tr: "İstatistik" },
  options: { de: "Lernoptionen", zh: "学习设置", en: "Study options", tr: "Çalışma ayarları" },
  newPerDay: { de: "Neue Wörter pro Tag", zh: "每日新词上限", en: "New words per day", tr: "Günlük yeni kelime" },
  newPerDayHint: { de: "Wie viele neue Wörter du pro Tag anfängst – über alle Lektionen zusammen.", zh: "所有课程加起来，每天最多开始学多少个新词。", en: "How many new words you start each day, across all lessons.", tr: "Tüm derslerde toplam, günde kaç yeni kelimeye başlayacağın." },
  maxReviews: { de: "Maximale Wiederholungen pro Tag", zh: "每日复习上限", en: "Maximum reviews per day", tr: "Günlük en fazla tekrar" },
  maxReviewsHint: { de: "Fällige Karten über diesem Limit warten bis morgen.", zh: "超过上限的到期卡片会留到第二天。", en: "Due cards above this limit wait until tomorrow.", tr: "Bu sınırın üstündeki kartlar yarına kalır." },
  retention: { de: "Gewünschte Erinnerungsrate", zh: "目标记忆保持率", en: "Desired retention", tr: "Hedef hatırlama oranı" },
  retentionHint: { de: "Höher heißt: öfter wiederholen, dafür seltener vergessen. Standard: 90 %.", zh: "越高复习越频繁，但忘得越少。默认 90%。", en: "Higher means more reviews but less forgetting. Default: 90%.", tr: "Daha yüksek: daha sık tekrar, daha az unutma. Varsayılan: %90." },
  settingsSynced: { de: "Mit deinem Konto auf allen Geräten synchronisiert", zh: "已与账号同步，所有设备通用", en: "Synced with your account on all devices", tr: "Hesabınla tüm cihazlarda senkronize" },
  settingsLocal: { de: "Auf diesem Gerät gespeichert – melde dich an, um sie zu synchronisieren", zh: "保存在本设备上，登录后可多设备同步", en: "Saved on this device – sign in to sync them", tr: "Bu cihazda kayıtlı – senkronize etmek için giriş yap" },
  resetDefaults: { de: "Standardwerte", zh: "恢复默认", en: "Reset to defaults", tr: "Varsayılanlara dön" },
  newLimitReached: { de: "Tageslimit für neue Wörter erreicht", zh: "今天的新词已达上限", en: "Daily limit for new words reached", tr: "Günlük yeni kelime sınırına ulaşıldı" },
  statsToday: { de: "Heute", zh: "今天", en: "Today", tr: "Bugün" },
  cardsStudied: { de: "Karten gelernt", zh: "学习卡片", en: "Cards studied", tr: "Çalışılan kart" },
  correctRate: { de: "Richtig", zh: "正确率", en: "Correct", tr: "Doğru" },
  exercises: { de: "Übungsaufgaben", zh: "练习题", en: "Exercises", tr: "Alıştırma" },
  forecast: { de: "Fällig in den nächsten 30 Tagen", zh: "未来 30 天到期", en: "Due in the next 30 days", tr: "Önümüzdeki 30 günde tekrar" },
  calendar: { de: "Lernkalender", zh: "学习日历", en: "Study calendar", tr: "Çalışma takvimi" },
  activeDays: { de: "Lerntage", zh: "学习天数", en: "Days studied", tr: "Çalışılan gün" },
  cardStates: { de: "Kartenstatus", zh: "卡片状态", en: "Card states", tr: "Kart durumu" },
  stateNew: { de: "Neu", zh: "新词", en: "New", tr: "Yeni" },
  stateLearning: { de: "Lernen", zh: "学习中", en: "Learning", tr: "Öğreniliyor" },
  stateYoung: { de: "Jung", zh: "较熟", en: "Young", tr: "Genç" },
  stateMature: { de: "Ausgereift", zh: "熟练", en: "Mature", tr: "Olgun" },
  statesHint: { de: "Jung: Intervall unter 21 Tagen · Ausgereift: ab 21 Tagen", zh: "较熟：复习间隔不到 21 天 · 熟练：21 天及以上", en: "Young: interval under 21 days · Mature: 21 days or more", tr: "Genç: aralık 21 günden az · Olgun: 21 gün ve üzeri" },
  retentionRate: { de: "Erinnerungsrate (30 Tage)", zh: "记忆保持率（近 30 天）", en: "Retention (last 30 days)", tr: "Hatırlama oranı (son 30 gün)" },
  retentionRateHint: { de: "Anteil der Wiederholungen, bei denen du nicht „Nochmal“ gewählt hast", zh: "复习时没有选「忘了」的比例", en: "Share of reviews not answered “Again”", tr: "“Tekrar” denmeyen tekrarların oranı" },
  allLessons: { de: "Alle Lektionen", zh: "全部课程", en: "All lessons", tr: "Tüm dersler" },
  noData: { de: "Noch keine Daten", zh: "还没有数据", en: "No data yet", tr: "Henüz veri yok" },
  cardsUnit: { de: "Karten", zh: "张卡", en: "cards", tr: "kart" },
  answersUnit: { de: "Antworten", zh: "次作答", en: "answers", tr: "cevap" },
  showTable: { de: "Als Tabelle", zh: "表格", en: "Table", tr: "Tablo" },
  dateCol: { de: "Datum", zh: "日期", en: "Date", tr: "Tarih" },
  speechUnsupported: { de: "Dieser Browser kann nicht vorlesen. Öffne die Seite in Safari oder Chrome – Browser in Apps wie WeChat können es meist nicht.", zh: "这个浏览器不支持朗读。请用手机自带的 Safari 或 Chrome 打开（微信等 App 里的浏览器通常不行）。", en: "This browser can't read aloud. Open the page in Safari or Chrome – browsers inside apps like WeChat usually can't.", tr: "Bu tarayıcı sesli okuyamıyor. Sayfayı Safari veya Chrome'da aç – WeChat gibi uygulamaların içindeki tarayıcılar genelde okuyamaz." },
  speechNoVoice: { de: "Auf dem Handy fehlt eine deutsche Stimme. Lade sie in den Systemeinstellungen unter „Text-in-Sprache“ herunter.", zh: "手机上没有德语语音。请在系统设置的「文字转语音」里下载德语语音包。", en: "Your phone has no German voice. Download one in the system settings under “Text-to-speech”.", tr: "Telefonda Almanca ses yok. Sistem ayarlarında “Metin okuma” bölümünden Almanca sesi indir." },
  speechFailed: { de: "Die Aussprache konnte nicht abgespielt werden. Ist das Handy stumm geschaltet? Sonst probiere Safari oder Chrome.", zh: "没能播放发音。请检查手机是否静音；如果还不行，换用 Safari 或 Chrome 打开。", en: "The pronunciation couldn't play. Is your phone muted? Otherwise try Safari or Chrome.", tr: "Telaffuz çalınamadı. Telefon sessizde mi? Değilse Safari veya Chrome'u dene." },
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

const MEANING_LANGS: Lang[] = ["zh", "en", "tr", "th", "vi", "fa"];
const navMeaning = MEANING_LANGS.find((l) => nav.startsWith(l));
const navUi = (["zh", "tr", "de"] as const).find((l) => nav.startsWith(l));
let meaning: Lang = saved("dd:lang", MEANING_LANGS, navMeaning ?? "en");
let ui: UiLang = saved("dd:ui", ["de", "en", "zh", "tr"], navUi ?? "en");
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
