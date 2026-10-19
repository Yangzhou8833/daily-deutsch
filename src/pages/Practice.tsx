import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { Loading, Page, TranslationNotice } from "../components/common";
import { loadIndex, loadLesson, useAsync } from "../data";
import ArticleDrill from "../drills/ArticleDrill";
import ClozeDrill from "../drills/ClozeDrill";
import GrammarDrill from "../drills/GrammarDrill";
import PluralDrill from "../drills/PluralDrill";
import SentenceDrill from "../drills/SentenceDrill";
import { useLang, type UIKey } from "../i18n";
import { isHidden } from "../store";
import Learn from "./Learn";
import WordList from "./WordList";

const TITLES: Record<string, UIKey> = {
  learn: "learn",
  article: "article",
  plural: "plural",
  cloze: "cloze",
  grammar: "grammar",
  sentence: "sentence",
  list: "wordList",
};

export function Practice() {
  const { id = "", mode = "learn" } = useParams();
  const { t } = useLang();
  const loaded = useAsync(() => loadLesson(id), [id]);
  // hidden words are left out of every drill (checked once when the drill opens)
  const lesson = useMemo(() => loaded && { ...loaded, words: loaded.words.filter((w) => !isHidden(w.id)) }, [loaded]);
  const back = `/lesson/${id}`;
  if (!lesson || !loaded)
    return (
      <Page back={back}>
        <Loading value={lesson} />
      </Page>
    );

  const props = { lesson, backTo: back };
  return (
    <Page back={back} title={t(TITLES[mode] ?? "learn")}>
      <TranslationNotice langs={lesson.langs} />
      {mode === "learn" && <Learn key={id} pool={lesson.words.map((word) => ({ word, lesson: id }))} backTo={back} />}
      {mode === "article" && <ArticleDrill {...props} />}
      {mode === "plural" && <PluralDrill {...props} />}
      {mode === "cloze" && <ClozeDrill {...props} />}
      {mode === "grammar" && <GrammarDrill {...props} />}
      {mode === "sentence" && <SentenceDrill {...props} />}
      {mode === "list" && <WordList lesson={loaded} />}
    </Page>
  );
}

/** Due cards from every lesson in one session. Looks words up in all lessons, because a word's
 *  stored lesson id can be outdated after lessons are reorganised. */
export function Review() {
  const { t } = useLang();
  const pool = useAsync(async () => {
    const index = await loadIndex();
    const lessons = await Promise.all(index.map((l) => loadLesson(l.id).catch(() => null)));
    return lessons.flatMap((l) => l?.words.filter((w) => !isHidden(w.id)).map((word) => ({ word, lesson: l.id })) ?? []);
  }, []);
  return (
    <Page back="/" title={t("reviewNow")}>
      {pool ? <Learn pool={pool} backTo="/" allowNew={false} /> : <Loading value={pool} />}
    </Page>
  );
}
