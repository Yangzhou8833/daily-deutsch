import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Example, GrammarLine, Headword } from "../components/common";
import { useLang, type UIKey } from "../i18n";
import { dueIds, getCard, previewDue, Rating, review, type Grade } from "../store";
import type { Word } from "../types";
import { shortInterval } from "../util";

const NEW_PER_SESSION = 10;
const LEARN_AHEAD_MS = 20 * 60 * 1000; // re-show cards due again within the session
const GRADES: { grade: Grade; key: UIKey; cls: string }[] = [
  { grade: Rating.Again, key: "again", cls: "again" },
  { grade: Rating.Hard, key: "hard", cls: "hard" },
  { grade: Rating.Good, key: "good", cls: "good" },
  { grade: Rating.Easy, key: "easy", cls: "easy" },
];

interface Item {
  word: Word;
  lesson: string;
}

/** Due cards first, then up to `newCount` unseen words from `pool`. */
function buildQueue(pool: Item[], newCount: number): Item[] {
  const byId = new Map(pool.map((i) => [i.word.id, i]));
  const due = dueIds().flatMap((id) => byId.get(id) ?? []);
  const fresh = pool.filter((i) => !getCard(i.word.id)).slice(0, newCount);
  return [...due, ...fresh];
}

export default function Learn({ pool, backTo, allowNew = true }: { pool: Item[]; backTo: string; allowNew?: boolean }) {
  const { t, pick } = useLang();
  const [queue, setQueue] = useState(() => buildQueue(pool, allowNew ? NEW_PER_SESSION : 0));
  const [shown, setShown] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const current = queue[0];
  const intervals = useMemo(() => (current ? previewDue(current.word.id) : null), [current]);

  if (!current) {
    const unseen = pool.some((i) => !getCard(i.word.id));
    return (
      <div className="done">
        <div className="done-emoji">🎉</div>
        <p>{t("allCaughtUp")}</p>
        {allowNew && unseen && (
          <button className="btn primary" onClick={() => setQueue(buildQueue(pool, NEW_PER_SESSION))}>
            {t("learnMore")}
          </button>
        )}
        <Link to={backTo} className="btn">
          {t("back")}
        </Link>
      </div>
    );
  }

  const grade = (g: Grade) => {
    const card = review(current.word.id, current.lesson, g);
    const rest = queue.slice(1);
    setQueue(card.due.getTime() - Date.now() < LEARN_AHEAD_MS ? [...rest, current] : rest);
    setDoneCount((n) => n + 1);
    setShown(false);
  };

  const w = current.word;
  return (
    <div className="study">
      <div className="study-count muted">
        {queue.length} {t("left")} · ✓ {doneCount}
      </div>
      <div className={`flashcard ${shown ? "shown" : ""}`} onClick={() => setShown(true)}>
        <div className="front">
          <Headword word={w} />
          {w.level && <span className="level">{w.level}</span>}
        </div>
        {shown && (
          <div className="back-side">
            <div className="meaning">{pick(w.meaning)}</div>
            <GrammarLine word={w} />
            <Example word={w} />
          </div>
        )}
      </div>
      {shown ? (
        <div className="grades">
          {GRADES.map((g) => (
            <button key={g.grade} className={`grade ${g.cls}`} onClick={() => grade(g.grade)}>
              <span>{t(g.key)}</span>
              <small>{intervals && shortInterval(intervals[g.grade])}</small>
            </button>
          ))}
        </div>
      ) : (
        <button className="btn primary block" onClick={() => setShown(true)}>
          {t("showAnswer")}
        </button>
      )}
    </div>
  );
}
