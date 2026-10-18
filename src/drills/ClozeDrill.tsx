import { useEffect, useState } from "react";
import { SpeakButton } from "../components/common";
import { useLang } from "../i18n";
import { logDrill } from "../store";
import type { Lesson } from "../types";
import { sameAnswer } from "../util";
import { Feedback, inputProps, QuizFrame, UmlautBar, useLastInput, useQuiz } from "./quiz";

export default function ClozeDrill({ lesson, backTo }: { lesson: Lesson; backTo: string }) {
  const { t, pick } = useLang();
  const quiz = useQuiz(lesson.words.filter((w) => w.cloze && w.answer && w.cloze.includes("___")));
  const w = quiz.item;
  const [value, setValue] = useState("");
  const [hint, setHint] = useState(0);
  const input = useLastInput();

  useEffect(() => {
    setValue("");
    setHint(0);
    input.current?.focus();
  }, [w, input]);

  const submit = (giveUp = false) => {
    if (!w || quiz.result !== null) return;
    const ok = !giveUp && sameAnswer(value, w.answer!);
    logDrill(w.id, lesson.id, "cloze", ok);
    quiz.answer(ok);
  };

  const [before, after] = w ? w.cloze!.split("___", 2) : ["", ""];
  return (
    <QuizFrame quiz={quiz} backTo={backTo}>
      {w && (
        <>
          <div className="flashcard shown">
            <div className="meaning">{pick(w.meaning)}</div>
            <form
              className="cloze-line"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              {before}
              {quiz.result === null ? (
                <input
                  ref={input}
                  className="gap"
                  value={value}
                  size={Math.max(4, w.answer!.length)}
                  placeholder={hint ? w.answer!.slice(0, hint) + "…" : ""}
                  onChange={(e) => setValue(e.target.value)}
                  {...inputProps}
                />
              ) : (
                <b className={quiz.result ? "ok-text" : "bad-text"}>{w.answer}</b>
              )}
              {after}
            </form>
            {quiz.result !== null && (
              <div className="example">
                <div>
                  {w.example} <SpeakButton text={w.example} />
                </div>
                <div className="muted">{pick(w.example_tr)}</div>
              </div>
            )}
          </div>
          {quiz.result === null ? (
            <>
              <UmlautBar target={input} />
              <div className="row">
                <button className="btn" onClick={() => setHint((h) => Math.min(h + 1, w.answer!.length))}>
                  💡 {t("hintFirst")}
                </button>
                <button className="btn" onClick={() => submit(true)}>
                  {t("reveal")}
                </button>
                <button className="btn primary" onClick={() => submit()}>
                  {t("check")}
                </button>
              </div>
            </>
          ) : (
            <Feedback ok={quiz.result} answer={w.answer} onNext={quiz.next} />
          )}
        </>
      )}
    </QuizFrame>
  );
}
