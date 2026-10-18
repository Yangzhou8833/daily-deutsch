import { Link } from "react-router-dom";
import { Loading, Page, ProgressBar } from "../components/common";
import { loadIndex, useAsync } from "../data";
import { useLang } from "../i18n";
import { dueLessons, learnedCount, streak, useProgress } from "../store";

export default function Home() {
  const { t } = useLang();
  useProgress();
  const lessons = useAsync(loadIndex, []);
  const due = dueLessons();
  const dueTotal = Object.values(due).reduce((a, b) => a + b, 0);
  const days = streak();

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

      <h2>{t("lessons")}</h2>
      {!lessons ? (
        <Loading value={lessons} />
      ) : (
        <ul className="lessons">
          {lessons.map((l, i) => {
            const learned = learnedCount(l.id);
            return (
              <li key={l.id}>
                <Link to={`/lesson/${l.id}`} className="lesson-card">
                  <div className="lesson-top">
                    <span className="lesson-title">{l.title}</span>
                    {i === 0 && <span className="pill">{t("newest")}</span>}
                    {due[l.id] ? <span className="pill due">{due[l.id]}</span> : null}
                  </div>
                  <div className="lesson-meta muted">
                    {l.date} · {l.words} {t("words")} · {learned} {t("learned")}
                  </div>
                  <ProgressBar value={learned} max={l.words} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="muted center small">{t("progressLocal")}</p>
    </Page>
  );
}
