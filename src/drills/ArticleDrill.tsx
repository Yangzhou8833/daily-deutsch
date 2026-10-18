import { Example, Headword } from "../components/common";
import { useLang } from "../i18n";
import { logDrill } from "../store";
import type { Lesson } from "../types";
import { Feedback, QuizFrame, useQuiz } from "./quiz";

const ARTICLES = ["der", "die", "das"] as const;

export default function ArticleDrill({ lesson, backTo }: { lesson: Lesson; backTo: string }) {
  const { pick } = useLang();
  const quiz = useQuiz(lesson.words.filter((w) => w.article));
  const w = quiz.item;

  return (
    <QuizFrame quiz={quiz} backTo={backTo}>
      {w && (
        <>
          <div className="flashcard shown">
            <div className="front">
              <Headword word={w} hideArticle={quiz.result === null} />
            </div>
            <div className="meaning">{pick(w.meaning)}</div>
            {quiz.result !== null && <Example word={w} />}
          </div>
          <div className="choices three">
            {ARTICLES.map((a) => {
              const state = quiz.result === null ? "" : a === w.article ? "right" : "dim";
              return (
                <button
                  key={a}
                  className={`choice art-btn art-${a} ${state}`}
                  disabled={quiz.result !== null}
                  onClick={() => {
                    const ok = a === w.article;
                    logDrill(w.id, lesson.id, "article", ok);
                    quiz.answer(ok);
                  }}
                >
                  {a}
                </button>
              );
            })}
          </div>
          {quiz.result !== null && (
            <Feedback ok={quiz.result} answer={`${w.article} ${w.word}`} onNext={quiz.next} />
          )}
        </>
      )}
    </QuizFrame>
  );
}
