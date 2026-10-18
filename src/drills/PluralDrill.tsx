import { useMemo } from "react";
import { Example, Headword } from "../components/common";
import { useLang } from "../i18n";
import { logDrill } from "../store";
import type { Lesson } from "../types";
import { shuffle } from "../util";
import { Feedback, QuizFrame, useQuiz } from "./quiz";

const stripArticle = (p: string) => p.replace(/^die\s+/, "");

/** Put an umlaut on the last a / o / u / au of the word. */
function umlaut(s: string): string {
  const au = s.lastIndexOf("au");
  const m = /[aou](?=[^aou]*$)/.exec(s.slice(au >= 0 ? au + 2 : 0));
  if (au >= 0 && !m) return s.slice(0, au) + "äu" + s.slice(au + 2);
  if (!m) return s;
  const i = (au >= 0 ? au + 2 : 0) + m.index;
  return s.slice(0, i) + ({ a: "ä", o: "ö", u: "ü" } as Record<string, string>)[s[i]] + s.slice(i + 1);
}

/** Correct plural plus three plausible wrong endings. */
function pluralChoices(singular: string, plural: string): string[] {
  const right = stripArticle(plural);
  const u = umlaut(singular);
  const endsE = singular.endsWith("e");
  const candidates = [
    singular + (endsE ? "n" : "e"),
    singular + (endsE ? "s" : "en"),
    singular + "er",
    u + "e",
    u + "er",
    singular + "s",
    singular,
    u,
  ];
  const wrong = shuffle([...new Set(candidates)].filter((c) => c !== right)).slice(0, 3);
  return shuffle([right, ...wrong]);
}

export default function PluralDrill({ lesson, backTo }: { lesson: Lesson; backTo: string }) {
  const { pick } = useLang();
  const quiz = useQuiz(lesson.words.filter((w) => w.article && w.plural));
  const w = quiz.item;
  const choices = useMemo(() => (w ? pluralChoices(w.word, w.plural!) : []), [w]);
  const right = w ? stripArticle(w.plural!) : "";

  return (
    <QuizFrame quiz={quiz} backTo={backTo}>
      {w && (
        <>
          <div className="flashcard shown">
            <div className="front">
              <Headword word={w} />
            </div>
            <div className="meaning">{pick(w.meaning)}</div>
            <div className="gram">die ___ ?</div>
            {quiz.result !== null && <Example word={w} />}
          </div>
          <div className="choices">
            {choices.map((c) => {
              const state = quiz.result === null ? "" : c === right ? "right" : "dim";
              return (
                <button
                  key={c}
                  className={`choice ${state}`}
                  disabled={quiz.result !== null}
                  onClick={() => {
                    const ok = c === right;
                    logDrill(w.id, lesson.id, "plural", ok);
                    quiz.answer(ok);
                  }}
                >
                  die {c}
                </button>
              );
            })}
          </div>
          {quiz.result !== null && <Feedback ok={quiz.result} answer={`die ${right}`} onNext={quiz.next} />}
        </>
      )}
    </QuizFrame>
  );
}
