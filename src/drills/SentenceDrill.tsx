import { useState } from "react";
import { sayGerman, SpeakButton } from "../components/common";
import { useLang } from "../i18n";
import { logDrill } from "../store";
import type { Lesson } from "../types";
import { QuizFrame, useQuiz } from "./quiz";

/** Chinese prompt → recall the German sentence → reveal and grade yourself. */
export default function SentenceDrill({ lesson, backTo }: { lesson: Lesson; backTo: string }) {
  const { t } = useLang();
  const quiz = useQuiz(lesson.sentences ?? []);
  const [shown, setShown] = useState(false);
  const s = quiz.item;

  const grade = (ok: boolean) => {
    if (!s) return;
    logDrill(s.id, lesson.id, "sentence", ok);
    quiz.answer(ok);
    quiz.next();
    setShown(false);
  };

  return (
    <QuizFrame quiz={quiz} backTo={backTo}>
      {s && (
        <>
          <div className="flashcard shown">
            <div className="meaning">{s.zh}</div>
            {shown ? (
              <div className="back-side">
                <div className="sentence-de">
                  {s.de} <SpeakButton text={s.de} />
                </div>
              </div>
            ) : (
              <p className="muted small">{t("sayIt")}</p>
            )}
          </div>
          {shown ? (
            <div className="row">
              <button className="btn grade-no" onClick={() => grade(false)}>
                {t("notYet")}
              </button>
              <button className="btn primary" onClick={() => grade(true)}>
                {t("knewIt")}
              </button>
            </div>
          ) : (
            <button
              className="btn primary block"
              onClick={() => {
                setShown(true);
                sayGerman(s.de);
              }}
            >
              {t("showAnswer")}
            </button>
          )}
        </>
      )}
    </QuizFrame>
  );
}
