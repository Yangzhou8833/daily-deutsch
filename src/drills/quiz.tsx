import { useRef, useState, type ReactNode, type RefObject } from "react";
import { Link } from "react-router-dom";
import { ProgressBar } from "../components/common";
import { useLang } from "../i18n";
import { shuffle } from "../util";

const ROUND = 15;

/** One round of up to 15 shuffled items with a running score. */
export function useQuiz<T>(items: T[]) {
  const [round, setRound] = useState(() => shuffle(items).slice(0, ROUND));
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<boolean | null>(null);
  return {
    item: round[index] as T | undefined,
    index,
    total: round.length,
    score,
    /** null until answered, then whether it was right. */
    result,
    answer(ok: boolean) {
      if (result !== null) return;
      setResult(ok);
      if (ok) setScore((s) => s + 1);
    },
    next() {
      setResult(null);
      setIndex((i) => i + 1);
    },
    restart() {
      setRound(shuffle(items).slice(0, ROUND));
      setIndex(0);
      setScore(0);
      setResult(null);
    },
  };
}

export function QuizFrame({
  quiz,
  backTo,
  children,
}: {
  quiz: ReturnType<typeof useQuiz<unknown>>;
  backTo: string;
  children: ReactNode;
}) {
  const { t } = useLang();
  if (quiz.total === 0) return <p className="muted center">{t("nothingHere")}</p>;
  if (!quiz.item)
    return (
      <div className="done">
        <div className="done-emoji">{quiz.score / quiz.total >= 0.8 ? "🏆" : "💪"}</div>
        <p className="done-score">
          {t("score")}: {quiz.score} / {quiz.total}
        </p>
        <button className="btn primary" onClick={quiz.restart}>
          {t("again2")}
        </button>
        <Link to={backTo} className="btn">
          {t("toLesson")}
        </Link>
      </div>
    );
  return (
    <div className="study">
      <div className="study-count muted">
        {quiz.index + 1} / {quiz.total} · ✓ {quiz.score}
      </div>
      <ProgressBar value={quiz.index} max={quiz.total} />
      {children}
    </div>
  );
}

export function Feedback({ ok, answer, onNext }: { ok: boolean; answer: ReactNode; onNext: () => void }) {
  const { t } = useLang();
  return (
    <div className={`feedback ${ok ? "ok" : "bad"}`}>
      <div>{ok ? t("correct") : <>{t("wrong")}: <b>{answer}</b></>}</div>
      <button className="btn primary block" onClick={onNext} autoFocus>
        {t("next")}
      </button>
    </div>
  );
}

/** ä ö ü ß buttons for keyboards without German letters; types into the last focused input. */
export function UmlautBar({ target }: { target: RefObject<HTMLInputElement | null> }) {
  return (
    <div className="umlauts">
      {["ä", "ö", "ü", "ß", "Ä", "Ö", "Ü"].map((ch) => (
        <button
          key={ch}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const el = target.current;
            if (!el) return;
            const start = el.selectionStart ?? el.value.length;
            const end = el.selectionEnd ?? start;
            const value = el.value.slice(0, start) + ch + el.value.slice(end);
            // let React's onChange see the new value
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, value);
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.focus();
            el.setSelectionRange(start + 1, start + 1);
          }}
        >
          {ch}
        </button>
      ))}
    </div>
  );
}

export function useLastInput() {
  return useRef<HTMLInputElement | null>(null);
}

export const inputProps = {
  autoCapitalize: "off",
  autoCorrect: "off",
  autoComplete: "off",
  spellCheck: false,
} as const;
