import { Fragment, useEffect, useMemo, useState } from "react";
import { SpeakButton } from "../components/common";
import { useLang } from "../i18n";
import { logDrill } from "../store";
import type { Lesson } from "../types";
import { sameAnswer } from "../util";
import { Feedback, inputProps, QuizFrame, UmlautBar, useLastInput, useQuiz } from "./quiz";

type Part = { text: string } | { answer: string; hint?: string };
const CLOZE = /\{\{c\d+::(.*?)(?:::(.*?))?\}\}/g;

function parse(text: string): Part[] {
  const parts: Part[] = [];
  let last = 0;
  for (const m of text.matchAll(CLOZE)) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ answer: m[1], hint: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

const plain = (text: string) => text.replace(CLOZE, "$1");

export default function GrammarDrill({ lesson, backTo }: { lesson: Lesson; backTo: string }) {
  const { t, pick } = useLang();
  const quiz = useQuiz(lesson.grammar);
  const g = quiz.item;
  const parts = useMemo(() => (g ? parse(g.text) : []), [g]);
  const gaps = parts.filter((p): p is { answer: string; hint?: string } => "answer" in p);
  const [values, setValues] = useState<string[]>([]);
  const focused = useLastInput();

  useEffect(() => {
    setValues([]);
    // focus() fires no focus event if the input already has focus, so record it directly
    focused.current = document.querySelector<HTMLInputElement>(".gap");
    focused.current?.focus();
  }, [g, focused]);

  const submit = (giveUp = false) => {
    if (!g || quiz.result !== null) return;
    const ok = !giveUp && gaps.every((gap, i) => sameAnswer(values[i] ?? "", gap.answer));
    logDrill(g.id, lesson.id, "grammar", ok);
    quiz.answer(ok);
  };

  let gapIndex = 0;
  return (
    <QuizFrame quiz={quiz} backTo={backTo}>
      {g && (
        <>
          <div className="flashcard shown">
            <form
              className="cloze-line"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              {parts.map((p, k) => {
                if ("text" in p) return <Fragment key={k}>{p.text}</Fragment>;
                const i = gapIndex++;
                if (quiz.result !== null)
                  return (
                    <b key={k} className={sameAnswer(values[i] ?? "", p.answer) ? "ok-text" : "bad-text"}>
                      {p.answer}
                    </b>
                  );
                return (
                  <input
                    key={k}
                    className="gap"
                    value={values[i] ?? ""}
                    size={Math.max(3, p.answer.length)}
                    placeholder={p.hint ?? ""}
                    onFocus={(e) => (focused.current = e.currentTarget)}
                    onChange={(e) => setValues((v) => Object.assign([...v], { [i]: e.target.value }))}
                    {...inputProps}
                  />
                );
              })}
              <button type="submit" hidden />
            </form>
            {quiz.result !== null && (
              <>
                <div className="gram">💡 {pick(g.hint)}</div>
                <SpeakButton text={plain(g.text)} />
              </>
            )}
          </div>
          {quiz.result === null ? (
            <>
              <UmlautBar target={focused} />
              <div className="row">
                <button className="btn" onClick={() => submit(true)}>
                  {t("reveal")}
                </button>
                <button className="btn primary" onClick={() => submit()}>
                  {t("check")}
                </button>
              </div>
            </>
          ) : (
            <Feedback ok={quiz.result} answer={gaps.map((x) => x.answer).join(" … ")} onNext={quiz.next} />
          )}
        </>
      )}
    </QuizFrame>
  );
}
