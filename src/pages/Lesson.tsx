import { Link, useParams } from "react-router-dom";
import { DayCountsView, Loading, Page, ProgressBar, TranslationNotice } from "../components/common";
import { loadLesson, useAsync } from "../data";
import { useLang, type UIKey } from "../i18n";
import { useSettingsVersion } from "../settings";
import { dayCounts, isHidden, isNewWord, learnedCount, useProgress } from "../store";

const MODES: { mode: string; icon: string; title: UIKey; desc: UIKey }[] = [
  { mode: "learn", icon: "🃏", title: "learn", desc: "learnDesc" },
  { mode: "article", icon: "🎨", title: "article", desc: "articleDesc" },
  { mode: "plural", icon: "👥", title: "plural", desc: "pluralDesc" },
  { mode: "cloze", icon: "✍️", title: "cloze", desc: "clozeDesc" },
  { mode: "grammar", icon: "🧩", title: "grammar", desc: "grammarDesc" },
  { mode: "sentence", icon: "💬", title: "sentence", desc: "sentenceDesc" },
  { mode: "list", icon: "📋", title: "wordList", desc: "search" },
];

export default function LessonPage() {
  const { id = "" } = useParams();
  const { t, lang } = useLang();
  useProgress();
  useSettingsVersion();
  const lesson = useAsync(() => loadLesson(id), [id]);
  if (!lesson)
    return (
      <Page back="/">
        <Loading value={lesson} />
      </Page>
    );

  const words = lesson.words.filter((w) => !isHidden(w.id));
  const learned = learnedCount(id);
  const today = dayCounts(id, words.filter((w) => isNewWord(w.id)).length);
  const counts: Record<string, number> = {
    learn: words.length,
    article: words.filter((w) => w.article).length,
    plural: words.filter((w) => w.article && w.plural && !w.info?.includes("nur Plural")).length,
    cloze: words.filter((w) => w.cloze).length,
    grammar: lesson.grammar.length,
    // sentence cards only have Chinese prompts
    sentence: lang === "zh" ? (lesson.sentences?.length ?? 0) : 0,
    list: lesson.words.length,
  };

  return (
    <Page back="/">
      {lesson.modul && (
        <p className="crumb muted small">
          {lesson.course} · {lesson.modul}
        </p>
      )}
      <h1>{lesson.title}</h1>
      {lesson.words.length > 0 && (
        <>
          <p className="muted">
            {lesson.words.length} {t("words")} · {learned} {t("learned")}
          </p>
          <ProgressBar value={learned} max={lesson.words.length} />
          <TranslationNotice langs={lesson.langs} />
        </>
      )}
      <div className="modes">
        {MODES.filter((m) => counts[m.mode] > 0).map((m) => (
          <Link key={m.mode} to={`/lesson/${id}/${m.mode}`} className="mode">
            <span className="mode-icon">{m.icon}</span>
            <span className="mode-title">
              {t(m.title)}
              {m.mode === "learn" && <DayCountsView counts={today} />}
            </span>
            <span className="mode-desc muted">
              {m.mode === "list" ? `${counts.list} ${t("words")}` : m.mode === "sentence" || m.mode === "grammar" ? `${counts[m.mode]} · ${t(m.desc)}` : t(m.desc)}
            </span>
          </Link>
        ))}
      </div>
    </Page>
  );
}
