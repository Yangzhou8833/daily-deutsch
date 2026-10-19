import { Fragment, useEffect, useMemo, useState } from "react";
import { SpeakButton } from "../components/common";
import { useLang } from "../i18n";
import { logDrill } from "../store";
import type { Lesson } from "../types";
import { sameAnswer } from "../util";
import { Feedback, inputProps, QuizFrame, UmlautBar, useLastInput, useQuiz } from "./quiz";

/**
 * One answer per gap. Separable verbs have two gaps and an answer like "setzt … ab";
 * when the pieces don't match the gaps ("Herz … auf … der … Zunge" for one gap) they form one answer.
 */
function gapAnswers(cloze: string, answer: string): string[] {
  const gaps = cloze.split("___").length - 1;
  const pieces = answer
    .split("…")
    .map((s) => s.trim())
    .filter(Boolean);
  if (pieces.length === gaps) return pieces;
  if (gaps === 1) return [pieces.join(" ")];
  return Array.from({ length: gaps }, (_, i) => pieces[i] ?? "");
}

export default function ClozeDrill({ lesson, backTo }: { lesson: Lesson; backTo: string }) {
  const { t, pick } = useLang();
  const quiz = useQuiz(lesson.words.filter((w) => w.cloze && w.answer && w.cloze.includes("___")));
  const w = quiz.item;
  const texts = useMemo(() => (w ? w.cloze!.split("___") : []), [w]);
  const answers = useMemo(() => (w ? gapAnswers(w.cloze!, w.answer!) : []), [w]);
  const [values, setValues] = useState<string[]>([]);
  const [hint, setHint] = useState(0);
  const focused = useLastInput();

  useEffect(() => {
    setValues([]);
    setHint(0);
    // focus() fires no focus event if the input already has focus, so record it directly
    focused.current = document.querySelector<HTMLInputElement>(".gap");
    focused.current?.focus();
  }, [w, focused]);

  const right = (i: number) => sameAnswer(values[i] ?? "", answers[i]);

  const submit = (giveUp = false) => {
    if (!w || quiz.result !== null) return;
    const ok = !giveUp && answers.every((_, i) => right(i));
    logDrill(w.id, lesson.id, "cloze", ok);
    quiz.answer(ok);
  };

  const longest = Math.max(0, ...answers.map((a) => a.length));
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
              {texts.map((text, i) => (
                <Fragment key={i}>
                  {text}
                  {i < answers.length &&
                    (quiz.result === null ? (
                      <input
                        className="gap"
                        value={values[i] ?? ""}
                        size={Math.max(4, answers[i].length)}
                        placeholder={hint ? answers[i].slice(0, hint) + "…" : ""}
                        onFocus={(e) => (focused.current = e.currentTarget)}
                        onChange={(e) => setValues((v) => Object.assign([...v], { [i]: e.target.value }))}
                        {...inputProps}
                      />
                    ) : (
                      <b className={right(i) ? "ok-text" : "bad-text"}>{answers[i]}</b>
                    ))}
                </Fragment>
              ))}
              <button type="submit" hidden />
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
              <UmlautBar target={focused} />
              <div className="row">
                <button className="btn" onClick={() => setHint((h) => Math.min(h + 1, longest))}>
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
            <Feedback ok={quiz.result} answer={answers.join(" … ")} onNext={quiz.next} />
          )}
        </>
      )}
    </QuizFrame>
  );
}
