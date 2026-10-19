import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DayCountsView, Example, GrammarLine, Headword } from "../components/common";
import { useLang, type UIKey } from "../i18n";
import { addExtraNewToday, getSettings, useSettingsVersion } from "../settings";
import { dueNow, isHidden, isNewWord, LEARN_AHEAD_MS, newLeftToday, previewDue, queueOfWord, Rating, review, reviewsLeftToday, setHidden, type Grade } from "../store";
import type { Word } from "../types";
import { shortInterval } from "../util";

const EXTRA_NEW = 10; // "learn 10 more today" once the daily limit is reached
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

const unseen = (pool: Item[]) => pool.filter((i) => isNewWord(i.word.id) && !isHidden(i.word.id));

/** Like Anki: learning cards, then reviews (up to today's review limit), then new words (up to today's new limit). */
function buildQueue(pool: Item[], allowNew: boolean): Item[] {
  const byId = new Map(pool.map((i) => [i.word.id, i]));
  const due = dueNow();
  const pick = (ids: string[]) => ids.flatMap((id) => byId.get(id) ?? []);
  const reviews = pick(due.review).slice(0, reviewsLeftToday());
  const fresh = allowNew ? unseen(pool).slice(0, newLeftToday()) : [];
  return [...pick(due.learning), ...reviews, ...fresh];
}

/** What a queued card is now: new word, learning step or review. */
const kind = (i: Item) => (isNewWord(i.word.id) ? "new" : queueOfWord(i.word.id) === "learning" ? "learning" : "review");

export default function Learn({ pool, backTo, allowNew = true }: { pool: Item[]; backTo: string; allowNew?: boolean }) {
  const { t, pick } = useLang();
  useSettingsVersion();
  const [queue, setQueue] = useState(() => buildQueue(pool, allowNew));
  const [shown, setShown] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [undo, setUndo] = useState<Item | null>(null);
  const current = queue[0];
  const intervals = useMemo(() => (current ? previewDue(current.word.id) : null), [current]);

  if (!current) {
    const more = allowNew && unseen(pool).length > 0;
    return (
      <div className="done">
        <div className="done-emoji">🎉</div>
        <p>{t("allCaughtUp")}</p>
        {more && newLeftToday() === 0 && (
          <p className="muted small">
            {t("newLimitReached")} ({getSettings().newPerDay}) · <Link to="/settings">{t("options")}</Link>
          </p>
        )}
        {more && (
          <button
            className="btn primary"
            onClick={() => {
              if (newLeftToday() === 0) addExtraNewToday(EXTRA_NEW);
              setQueue(buildQueue(pool, true));
            }}
          >
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

  const hide = () => {
    setHidden(current.word.id, current.lesson, true);
    setQueue(queue.filter((i) => i.word.id !== current.word.id));
    setShown(false);
    setUndo(current);
  };

  const w = current.word;
  return (
    <div className="study">
      {undo && (
        <div className="toast">
          {t("wordHidden")}: <b>{undo.word.word}</b>
          <button
            className="link-btn"
            onClick={() => {
              setHidden(undo.word.id, undo.lesson, false);
              setQueue([undo, ...queue]);
              setUndo(null);
            }}
          >
            {t("undo")}
          </button>
        </div>
      )}
      <div className="study-count muted">
        <DayCountsView
          counts={{
            new: queue.filter((i) => kind(i) === "new").length,
            learning: queue.filter((i) => kind(i) === "learning").length,
            review: queue.filter((i) => kind(i) === "review").length,
          }}
          current={kind(current)}
        />{" "}
        · ✓ {doneCount}
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
      <button className="link-btn hide-word" onClick={hide}>
        🚫 {t("hideWord")}
      </button>
    </div>
  );
}
