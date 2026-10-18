import { Link, useParams } from "react-router-dom";
import { Loading, Page, ProgressBar, TranslationNotice } from "../components/common";
import { loadLesson, useAsync } from "../data";
import { useLang, type UIKey } from "../i18n";
import { dueIds, learnedCount, useProgress } from "../store";

const MODES: { mode: string; icon: string; title: UIKey; desc: UIKey }[] = [
  { mode: "learn", icon: "🃏", title: "learn", desc: "learnDesc" },
  { mode: "article", icon: "🎨", title: "article", desc: "articleDesc" },
  { mode: "plural", icon: "👥", title: "plural", desc: "pluralDesc" },
  { mode: "cloze", icon: "✍️", title: "cloze", desc: "clozeDesc" },
  { mode: "grammar", icon: "🧩", title: "grammar", desc: "grammarDesc" },
  { mode: "list", icon: "📋", title: "wordList", desc: "search" },
];

export default function LessonPage() {
  const { id = "" } = useParams();
  const { t } = useLang();
  useProgress();
  const lesson = useAsync(() => loadLesson(id), [id]);
  if (!lesson) return <Page back="/"><Loading value={lesson} /></Page>;

  const learned = learnedCount(id);
  const due = dueIds(new Date(), id).length;
  const nouns = lesson.words.filter((w) => w.article).length;
  const counts: Record<string, number> = {
    learn: due,
    article: nouns,
    plural: lesson.words.filter((w) => w.plural).length,
    cloze: lesson.words.filter((w) => w.cloze).length,
    grammar: lesson.grammar.length,
    list: lesson.words.length,
  };

  return (
    <Page back="/">
      <h1>{lesson.title}</h1>
      <p className="muted">
        {lesson.date} · {lesson.words.length} {t("words")} · {learned} {t("learned")}
      </p>
      <ProgressBar value={learned} max={lesson.words.length} />
      <TranslationNotice langs={lesson.langs} />
      <div className="modes">
        {MODES.map((m) => (
          <Link key={m.mode} to={`/lesson/${id}/${m.mode}`} className={`mode ${counts[m.mode] === 0 && m.mode !== "learn" ? "disabled" : ""}`}>
            <span className="mode-icon">{m.icon}</span>
            <span className="mode-title">
              {t(m.title)}
              {m.mode === "learn" && due > 0 && <span className="pill due">{due}</span>}
            </span>
            <span className="mode-desc muted">{m.mode === "list" ? `${counts.list} ${t("words")}` : t(m.desc)}</span>
          </Link>
        ))}
      </div>
    </Page>
  );
}
