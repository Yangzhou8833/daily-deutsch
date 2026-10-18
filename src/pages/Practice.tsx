import { useParams } from "react-router-dom";
import { Loading, Page, TranslationNotice } from "../components/common";
import { loadLesson, useAsync } from "../data";
import ArticleDrill from "../drills/ArticleDrill";
import ClozeDrill from "../drills/ClozeDrill";
import GrammarDrill from "../drills/GrammarDrill";
import PluralDrill from "../drills/PluralDrill";
import { useLang, type UIKey } from "../i18n";
import { dueLessons } from "../store";
import Learn from "./Learn";
import WordList from "./WordList";

const TITLES: Record<string, UIKey> = {
  learn: "learn",
  article: "article",
  plural: "plural",
  cloze: "cloze",
  grammar: "grammar",
  list: "wordList",
};

export function Practice() {
  const { id = "", mode = "learn" } = useParams();
  const { t } = useLang();
  const lesson = useAsync(() => loadLesson(id), [id]);
  const back = `/lesson/${id}`;
  if (!lesson)
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
      {mode === "list" && <WordList lesson={lesson} />}
    </Page>
  );
}

/** Due cards from every lesson in one session. */
export function Review() {
  const { t } = useLang();
  const pool = useAsync(async () => {
    const lessons = await Promise.all(Object.keys(dueLessons()).map(loadLesson));
    return lessons.flatMap((l) => l.words.map((word) => ({ word, lesson: l.id })));
  }, []);
  return (
    <Page back="/" title={t("reviewNow")}>
      {pool ? <Learn pool={pool} backTo="/" allowNew={false} /> : <Loading value={pool} />}
    </Page>
  );
}
