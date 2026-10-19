import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAccount } from "../account";
import { DayCountsLegend, DayCountsView, Loading, Page, ProgressBar } from "../components/common";
import { loadIndex, relocateProgress, useAsync } from "../data";
import { useLang } from "../i18n";
import { getSettings, useSettingsVersion } from "../settings";
import { dayCounts, learnedCount, newLeftToday, newStudiedToday, streak, studiedOrHidden, useProgress, type DayCounts } from "../store";
import type { LessonSummary } from "../types";

interface Group {
  name: string;
  lessons: LessonSummary[];
}

/** course → Modul → units, in index order; lessons made in the editor form their own group. */
function groupLessons(lessons: LessonSummary[]) {
  const courses = new Map<string, Map<string, LessonSummary[]>>();
  for (const l of lessons) {
    const course = l.course ?? "";
    if (!courses.has(course)) courses.set(course, new Map());
    const groups = courses.get(course)!;
    const key = l.modul ?? "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(l);
  }
  return [...courses].map(([course, groups]) => ({
    course,
    groups: [...groups].map(([name, ls]): Group => ({ name, lessons: ls })),
  }));
}

const lessonCounts = (l: LessonSummary) => dayCounts(l.id, Math.max(0, l.words - studiedOrHidden(l.id)));

/** Counts of several lessons; new words share one daily limit. */
function sumCounts(cs: DayCounts[]): DayCounts {
  const sum = (k: keyof DayCounts) => cs.reduce((n, c) => n + c[k], 0);
  return { new: Math.min(sum("new"), newLeftToday()), learning: sum("learning"), review: sum("review") };
}

const hasWork = (c: DayCounts) => c.new + c.learning + c.review > 0;

function LessonCard({ l, isNew }: { l: LessonSummary; isNew?: boolean }) {
  const { t } = useLang();
  const learned = learnedCount(l.id);
  return (
    <li>
      <Link to={`/lesson/${l.id}`} className="lesson-card">
        <div className="lesson-top">
          <span className="lesson-title">{l.title}</span>
          {isNew && <span className="pill">{t("newest")}</span>}
          {l.words > 0 && <DayCountsView counts={lessonCounts(l)} />}
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
  const progress = useProgress();
  const lessons = useAsync(loadIndex, []);
  // progress from before a reorganisation (or synced from another device) may name old lesson ids
  useEffect(() => {
    relocateProgress().catch(() => {});
  }, [progress]);
  useSettingsVersion();
  const total = dayCounts();
  const dueTotal = total.learning + total.review;
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
        <div className="stat">
          <div className="stat-num">
            {newStudiedToday()} <span className="stat-unit">/ {getSettings().newPerDay}</span>
          </div>
          <div className="stat-label">{t("newToday")}</div>
        </div>
      </section>
      <div className="row home-links">
        <Link to="/stats" className="btn">
          📊 {t("stats")}
        </Link>
        <Link to="/settings" className="btn">
          ⚙️ {t("options")}
        </Link>
      </div>
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
            {ci === 0 && <DayCountsLegend />}
            {groups.map((g) => {
              const groupCounts = sumCounts(g.lessons.filter((l) => l.words > 0).map(lessonCounts));
              const body = (
                <ul className="lessons">
                  {g.lessons.map((l) => (
                    <LessonCard key={l.id} l={l} isNew={l.id === newestId} />
                  ))}
                </ul>
              );
              // A1.2 (one lesson per Modul) and editor-made lessons have no Modul group: list them without a fold
              if (!g.name) return <div key="_">{body}</div>;
              return (
                <details key={g.name} className="lektion" open={ci === 0}>
                  <summary>
                    <span className="lektion-title">{g.name}</span>
                    <span className="muted small">
                      {g.lessons.length} {t("units")}
                    </span>
                    {hasWork(groupCounts) && <DayCountsView counts={groupCounts} />}
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
