import { useMemo, useState } from "react";
import { Loading, Page } from "../components/common";
import { loadIndex, useAsync } from "../data";
import { useLang, type UiLang } from "../i18n";
import { CALENDAR_WEEKS, computeStats, type Stats } from "../stats";
import { useProgress } from "../store";
import type { LessonSummary } from "../types";

const LOCALE: Record<UiLang, string> = { de: "de-DE", zh: "zh-CN", en: "en-GB", tr: "tr-TR" };
const pct = (x: number | null) => (x === null ? "–" : `${Math.round(x * 100)}%`);

/** Hover / tap readout shared by a chart's marks. */
function useReadout() {
  const [text, setText] = useState<string | null>(null);
  const bind = (label: string) => ({
    onPointerEnter: () => setText(label),
    onFocus: () => setText(label),
    onClick: () => setText(label),
    tabIndex: 0,
    "aria-label": label,
  });
  return { text, bind, clear: () => setText(null) };
}

/** Bar with rounded top corners, square at the baseline. */
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

function Forecast({ data, fmt }: { data: Stats["forecast"]; fmt: (t: number) => string }) {
  const { t } = useLang();
  const r = useReadout();
  const W = 330;
  const H = 120;
  const max = Math.max(1, ...data.map((d) => d.count));
  const slot = W / data.length;
  const total7 = data.slice(0, 7).reduce((n, d) => n + d.count, 0);
  return (
    <section className="card-section">
      <h3>{t("forecast")}</h3>
      <p className="readout muted small">{r.text ?? `${t("statsToday")}: ${data[0].count} · 7 d: ${total7} ${t("cardsUnit")}`}</p>
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="chart" role="img" aria-label={t("forecast")} onPointerLeave={r.clear}>
        <line x1={0} x2={W} y1={H} y2={H} className="axis" />
        <text x={0} y={10} className="tick">
          {max}
        </text>
        {data.map((d, i) => {
          const h = (d.count / max) * (H - 16);
          const label = `${i === 0 ? t("statsToday") : fmt(d.day)} · ${d.count} ${t("cardsUnit")}`;
          return (
            <g key={d.day} {...r.bind(label)} className="hit">
              <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
              {d.count > 0 && <path d={barPath(i * slot + 1, H - h, slot - 2, h)} className="bar" />}
            </g>
          );
        })}
        {[0, 7, 14, 21, 28].map((i) => (
          <text key={i} x={i * slot + slot / 2} y={H + 14} className="tick" textAnchor={i === 0 ? "start" : "middle"}>
            {i === 0 ? t("statsToday") : fmt(data[i].day)}
          </text>
        ))}
      </svg>
      <details className="table-view">
        <summary className="muted small">{t("showTable")}</summary>
        <table>
          <thead>
            <tr>
              <th>{t("dateCol")}</th>
              <th>{t("cardsUnit")}</th>
            </tr>
          </thead>
          <tbody>
            {data
              .filter((d) => d.count > 0)
              .map((d) => (
                <tr key={d.day}>
                  <td>{fmt(d.day)}</td>
                  <td>{d.count}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

function Calendar({ data, activeDays, fmt }: { data: Stats["calendar"]; activeDays: number; fmt: (t: number) => string }) {
  const { t } = useLang();
  const r = useReadout();
  const max = Math.max(1, ...data.map((d) => d.count));
  const level = (n: number) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)));
  const C = 13; // cell + gap
  const W = CALENDAR_WEEKS * C;
  return (
    <section className="card-section">
      <h3>{t("calendar")}</h3>
      <p className="readout muted small">{r.text ?? `${t("activeDays")}: ${activeDays}`}</p>
      <svg viewBox={`0 0 ${W} ${7 * C}`} className="chart heat" role="img" aria-label={t("calendar")} onPointerLeave={r.clear}>
        {data.map((d, i) => (
          <rect
            key={d.day}
            x={Math.floor(i / 7) * C}
            y={(i % 7) * C}
            width={C - 2}
            height={C - 2}
            rx={2}
            className={`lvl-${level(d.count)} hit`}
            {...r.bind(`${fmt(d.day)} · ${d.count} ${t("answersUnit")}`)}
          />
        ))}
      </svg>
      <p className="heat-legend muted small">
        0{" "}
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className={`swatch lvl-${l}`} />
        ))}{" "}
        {max}
      </p>
    </section>
  );
}

function States({ s }: { s: Stats["states"] }) {
  const { t } = useLang();
  const parts = [
    { key: "new", label: t("stateNew"), n: s.new },
    { key: "learning", label: t("stateLearning"), n: s.learning },
    { key: "young", label: t("stateYoung"), n: s.young },
    { key: "mature", label: t("stateMature"), n: s.mature },
  ] as const;
  const total = parts.reduce((n, p) => n + p.n, 0);
  return (
    <section className="card-section">
      <h3>{t("cardStates")}</h3>
      {total === 0 ? (
        <p className="muted small">{t("noData")}</p>
      ) : (
        <div className="stack" role="img" aria-label={parts.map((p) => `${p.label} ${p.n}`).join(", ")}>
          {parts
            .filter((p) => p.n > 0)
            .map((p) => (
              <span key={p.key} className={`seg st-${p.key}`} style={{ flexGrow: p.n }} title={`${p.label}: ${p.n}`} />
            ))}
        </div>
      )}
      <ul className="legend">
        {parts.map((p) => (
          <li key={p.key}>
            <span className={`swatch st-${p.key}`} /> {p.label} <b>{p.n}</b>
            <span className="muted"> · {total ? Math.round((p.n / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
      <p className="muted small">
        {t("statesHint")}
        {s.hidden > 0 && ` · ${t("hiddenWords")}: ${s.hidden}`}
      </p>
    </section>
  );
}

export default function StatsPage() {
  const { t, uiLang } = useLang();
  const progress = useProgress();
  const index = useAsync(loadIndex, []);
  const [lesson, setLesson] = useState("");
  const lessons = useMemo(() => (index ?? []).filter((l) => l.words > 0), [index]);
  const stats = useMemo(
    () => (index ? computeStats(new Map(lessons.map((l) => [l.id, l.words])), lesson || undefined) : null),
    // progress: recompute after every answer or sync
    [index, lessons, lesson, progress],
  );
  const fmt = (d: number) => new Date(d).toLocaleDateString(LOCALE[uiLang], { month: "numeric", day: "numeric" });
  const name = (l: LessonSummary) => [l.course, l.modul, l.title].filter(Boolean).join(" · ");

  return (
    <Page back="/" title={t("stats")}>
      {!index || !stats ? (
        <Loading value={index} />
      ) : (
        <>
          <select className="block-select" value={lesson} onChange={(e) => setLesson(e.target.value)} aria-label={t("lessons")}>
            <option value="">{t("allLessons")}</option>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {name(l)}
              </option>
            ))}
          </select>

          <section className="stats">
            <div className="stat">
              <div className="stat-num">{stats.today.cards}</div>
              <div className="stat-label">{t("cardsStudied")}</div>
            </div>
            <div className="stat">
              <div className="stat-num">{pct(stats.today.correct)}</div>
              <div className="stat-label">{t("correctRate")}</div>
            </div>
            <div className="stat">
              <div className="stat-num">{stats.today.exercises}</div>
              <div className="stat-label">
                {t("exercises")}
                {stats.today.exercisesCorrect !== null && ` · ${pct(stats.today.exercisesCorrect)}`}
              </div>
            </div>
          </section>

          <Forecast data={stats.forecast} fmt={fmt} />
          <Calendar data={stats.calendar} activeDays={stats.activeDays} fmt={fmt} />
          <States s={stats.states} />

          <section className="card-section">
            <h3>{t("retentionRate")}</h3>
            <div className="hero-num">{pct(stats.retention.rate)}</div>
            <p className="muted small">
              {t("retentionRateHint")} · {stats.retention.reviews} {t("answersUnit")}
            </p>
          </section>
        </>
      )}
    </Page>
  );
}
