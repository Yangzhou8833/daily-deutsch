import { useState } from "react";
import { GrammarLine, Headword } from "../components/common";
import { useLang } from "../i18n";
import { isHidden, setHidden, useProgress } from "../store";
import type { Lesson } from "../types";

export default function WordList({ lesson }: { lesson: Lesson }) {
  const { t, pick } = useLang();
  useProgress();
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const words = needle
    ? lesson.words.filter((w) => w.word.toLowerCase().includes(needle) || pick(w.meaning).toLowerCase().includes(needle))
    : lesson.words;

  return (
    <>
      <input className="search" placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="wordlist">
        {words.map((w) => (
          <li key={w.id} className={isHidden(w.id) ? "is-hidden" : ""}>
            <div className="wl-head">
              <Headword word={w} />
              {w.level && <span className="level">{w.level}</span>}
              <button
                className="link-btn wl-toggle"
                title={isHidden(w.id) ? t("restore") : t("hideWord")}
                onClick={() => setHidden(w.id, lesson.id, !isHidden(w.id))}
              >
                {isHidden(w.id) ? `↩ ${t("restore")}` : "🚫"}
              </button>
            </div>
            <div className="wl-meaning">{pick(w.meaning)}</div>
            <GrammarLine word={w} />
          </li>
        ))}
      </ul>
    </>
  );
}
