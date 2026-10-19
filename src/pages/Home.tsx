import { Link } from "react-router-dom";
import { useAccount } from "../account";
import { Loading, Page, ProgressBar } from "../components/common";
import { loadIndex, useAsync } from "../data";
import { useLang } from "../i18n";
import { dueLessons, learnedCount, streak, useProgress } from "../store";
import type { LessonSummary } from "../types";

interface Group {
  name: string;
  lessons: LessonSummary[];
}

/** course → Lektion → units, in index order; lessons made in the editor form their own group. */
function groupLessons(lessons: LessonSummary[]) {
  const courses = new Map<string, Map<string, LessonSummary[]>>();
  for (const l of lessons) {
    const course = l.course ?? "";
    if (!courses.has(course)) courses.set(course, new Map());
    const groups = courses.get(course)!;
    const key = l.lektion ?? "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(l);
  }
  return [...courses].map(([course, groups]) => ({
    course,
    groups: [...groups].map(([name, ls]): Group => ({ name, lessons: ls })),
  }));
}

function LessonCard({ l, due, isNew }: { l: LessonSummary; due?: number; isNew?: boolean }) {
  const { t } = useLang();
  const learned = learnedCount(l.id);
  return (
    <li>
      <Link to={`/lesson/${l.id}`} className="lesson-card">
        <div className="lesson-top">
          <span className="lesson-title">{l.title}</span>
          {isNew && <span className="pill">{t("newest")}</span>}
          {due ? <span className="pill due">{due}</span> : null}
        </div>
        <div className="lesson-meta muted">
          {l.words > 0 ? `${l.words} ${t("words")} · ${learned} ${t("learned")}` : `${l.grammar} ${t("grammar")}`}
        </div>
        {l.words > 0 && <ProgressBar value={learned} max={l.words} />}
      </Link>
    </li>
  );
}

export default function Home() {
  const { t } = useLang();
  useProgress();
  const lessons = useAsync(loadIndex, []);
  const due = dueLessons();
  const dueTotal = Object.values(due).reduce((a, b) => a + b, 0);
  const days = streak();
  const acc = useAccount();
  const newestId = lessons?.filter((l) => l.course).reduce((a, b) => (b.date > a.date ? b : a), lessons[0])?.id;

  return (
    <Page>
      <p className="tagline">{t("tagline")}</p>

      <section className="stats">
        <div className="stat">
          <div className="stat-num">{dueTotal}</div>
          <div className="stat-label">{t("dueToday")}</div>
        </div>
        <div className="stat">
          <div className="stat-num">
            {days} <span className="stat-unit">{t("days")}</span>
          </div>
          <div className="stat-label">🔥 {t("streak")}</div>
        </div>
      </section>
      {dueTotal > 0 ? (
        <Link to="/review" className="btn primary block">
          {t("reviewNow")} · {dueTotal}
        </Link>
      ) : (
        <p className="muted center">{t("nothingDue")}</p>
      )}

      {acc.status !== "off" && acc.status !== "loading" && (
        <Link to={acc.klass ? "/class" : "/account"} className="lesson-card class-card">
          <div className="lesson-top">
            <span className="lesson-title">🏆 {acc.klass ? `${t("leaderboard")} · ${acc.klass.name}` : t("leaderboard")}</span>
            <span className="muted">›</span>
          </div>
          {!acc.klass && <div className="muted small">{t("boardWhy")}</div>}
        </Link>
      )}

      {!lessons ? (
        <Loading value={lessons} />
      ) : (
        groupLessons(lessons).map(({ course, groups }, ci) => (
          <section key={course || "editor"} className="course">
            <h2>{course || t("lessons")}</h2>
            {groups.map((g) => {
              const groupDue = g.lessons.reduce((n, l) => n + (due[l.id] ?? 0), 0);
              const body = (
                <ul className="lessons">
                  {g.lessons.map((l) => (
                    <LessonCard key={l.id} l={l} due={due[l.id]} isNew={l.id === newestId} />
                  ))}
                </ul>
              );
              // editor-made lessons have no Lektion: list them without a fold
              if (!g.name) return <div key="_">{body}</div>;
              return (
                <details key={g.name} className="lektion" open={ci === 0}>
                  <summary>
                    <span className="lektion-title">{g.name}</span>
                    <span className="muted small">
                      {g.lessons.length} {t("units")}
                    </span>
                    {groupDue > 0 && <span className="pill due">{groupDue}</span>}
                  </summary>
                  {body}
                </details>
              );
            })}
          </section>
        ))
      )}
      <p className="muted center small">{acc.status === "in" ? t("progressSynced") : t("progressLocal")}</p>
    </Page>
  );
}
