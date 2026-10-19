/** Editor-only pages: list of web-made lessons, and the photo/text → AI → review → publish flow. */
import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAccount } from "../account";
import { Headword, Loading, Page } from "../components/common";
import { invalidateDbLessons, loadIndex, type LessonRow } from "../data";
import { generateLesson, knownWords, prepareImage, type ImagePart } from "../generate";
import { useLang } from "../i18n";
import { supabase } from "../supabase";
import type { GrammarCard, Lang, Translated, Word } from "../types";

// The editor is only used by the class organiser, so it has Chinese and English text only.
const TEXT = {
  zh: {
    admin: "课程管理", newLesson: "＋ 新建课程（拍照 / 粘贴）", noLessons: "还没有在网页上做的课程",
    draft: "草稿", published: "已发布", edit: "编辑", view: "查看", words: "词",
    needLogin: "请先登录", notEditor: "你的账号还没有编辑权限。在 Supabase 的 SQL Editor 里运行：",
    photos: "课本照片", addPhotos: "📷 拍照或选择图片", photosHint: "每张照片单独识别，最多 10 张",
    pasteText: "或粘贴课文 / 单词表", level: "级别", titleHint: "课程名称（可选，例如 Lektion 5 · Wohnen）",
    instructions: "给 AI 的额外要求（可选，例如：只要蓝色框里的词）", skipKnown: "跳过已经学过的词（所有已发布课程）",
    generate: "✨ 用 AI 生成卡片", manual: "不用 AI，手动添加", generating: "AI 正在识别…",
    progress: (n: number, d: number, t: number) => `已生成 ${n} 个词 · 完成 ${d}/${t}`,
    slow: "每张照片大约需要 30–90 秒", lessonTitle: "课程标题", lessonId: "链接 ID（小写字母、数字、-）", date: "日期",
    wordsTitle: "单词", grammarTitle: "语法填空", addWord: "＋ 添加单词", addGrammar: "＋ 添加语法题",
    morePhotos: "＋ 再识别几页", save: "保存草稿", publish: "发布", update: "保存并更新", unpublish: "取消发布",
    del: "删除课程", confirmDelete: "确定删除这门课程？同学们的相关进度会失效。", saved: "已保存",
    issues: "发布前需要修正：", removeWord: "删除", word: "单词", plural: "复数（die …）", info: "语法说明（非名词）",
    meaning: "释义", example: "例句", exampleTr: "例句翻译", cloze: "填空句（用 ___ 代替单词）", answer: "答案",
    grammarText: "句子（Anki 填空：{{c1::答案}}）", hint: "提示", idTaken: "这个 ID 已被使用，请换一个",
    clozeMismatch: "填空句 + 答案 ≠ 例句", missing: "缺少", noteFromAi: "AI 提示：",
  },
  en: {
    admin: "Lesson editor", newLesson: "＋ New lesson (photo / paste)", noLessons: "No lessons made on the web yet",
    draft: "Draft", published: "Published", edit: "Edit", view: "View", words: "words",
    needLogin: "Please sign in first", notEditor: "Your account can't edit lessons yet. Run this in the Supabase SQL Editor:",
    photos: "Textbook photos", addPhotos: "📷 Take or choose photos", photosHint: "Each photo is processed separately, up to 10",
    pasteText: "Or paste the text / word list", level: "Level", titleHint: "Lesson name (optional, e.g. Lektion 5 · Wohnen)",
    instructions: "Extra instructions for the AI (optional, e.g. only the words in the blue box)", skipKnown: "Skip words already learned (all published lessons)",
    generate: "✨ Generate cards with AI", manual: "Add words manually", generating: "The AI is reading…",
    progress: (n: number, d: number, t: number) => `${n} words so far · ${d}/${t} parts done`,
    slow: "About 30–90 seconds per photo", lessonTitle: "Lesson title", lessonId: "Link ID (lowercase letters, digits, -)", date: "Date",
    wordsTitle: "Words", grammarTitle: "Grammar cloze", addWord: "＋ Add word", addGrammar: "＋ Add grammar card",
    morePhotos: "＋ Read more pages", save: "Save draft", publish: "Publish", update: "Save & update", unpublish: "Unpublish",
    del: "Delete lesson", confirmDelete: "Delete this lesson? Classmates' progress on it will be lost.", saved: "Saved",
    issues: "Fix before publishing:", removeWord: "Remove", word: "Word", plural: "Plural (die …)", info: "Grammar note (non-nouns)",
    meaning: "Meaning", example: "Example", exampleTr: "Example translation", cloze: "Cloze (___ instead of the word)", answer: "Answer",
    grammarText: "Sentence (Anki cloze: {{c1::answer}})", hint: "Hint", idTaken: "This ID is already used — pick another",
    clozeMismatch: "cloze + answer ≠ example", missing: "missing", noteFromAi: "AI note:",
  },
};
function useText() {
  const { uiLang } = useLang();
  return TEXT[uiLang === "zh" ? "zh" : "en"];
}

const LANGS: Lang[] = ["zh", "en", "tr"];
const LEVELS = ["A1", "A2", "B1", "B2"];

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

const emptyWord = (): Word => ({
  id: crypto.randomUUID(),
  word: "",
  article: null,
  plural: null,
  info: null,
  level: null,
  meaning: {},
  example: "",
  example_tr: {},
  cloze: null,
  answer: null,
});

function wordIssues(w: Word, T: ReturnType<typeof useText>): string[] {
  const out: string[] = [];
  if (!w.word.trim()) out.push(`${T.missing}: ${T.word}`);
  const noMeaning = LANGS.filter((l) => !w.meaning[l]?.trim());
  if (noMeaning.length) out.push(`${T.missing}: ${T.meaning} (${noMeaning.join(", ")})`);
  if (!w.example.trim()) out.push(`${T.missing}: ${T.example}`);
  if (w.cloze && !w.answer) out.push(`${T.missing}: ${T.answer}`);
  if (w.cloze && w.answer && w.cloze.replace("___", w.answer) !== w.example) out.push(T.clozeMismatch);
  return out;
}

// ---------------------------------------------------------------- guards + list

function EditorGate({ children }: { children: ReactNode }) {
  const T = useText();
  const acc = useAccount();
  if (acc.status === "loading") return <Loading value={undefined} />;
  if (acc.status !== "in")
    return (
      <p className="center">
        <Link to="/account" className="btn primary">
          {T.needLogin}
        </Link>
      </p>
    );
  if (!acc.profile?.is_editor)
    return (
      <div className="panel">
        <p>{T.notEditor}</p>
        <pre className="sql">
          {`update public.profiles set is_editor = true\nwhere id = (select id from auth.users where email = '${acc.email}');`}
        </pre>
      </div>
    );
  return <>{children}</>;
}

export function AdminHome() {
  const T = useText();
  const [rows, setRows] = useState<LessonRow[] | null>();
  useEffect(() => {
    supabase
      ?.from("lessons")
      .select("id, title, lesson_date, published, words_count")
      .order("lesson_date", { ascending: false })
      .then(({ data }) => setRows((data as LessonRow[]) ?? []));
  }, []);

  return (
    <Page back="/account" title={T.admin}>
      <EditorGate>
        <Link to="/admin/new" className="btn primary block">
          {T.newLesson}
        </Link>
        {!rows ? (
          <Loading value={rows} />
        ) : rows.length === 0 ? (
          <p className="muted center">{T.noLessons}</p>
        ) : (
          <ul className="lessons admin-list">
            {rows.map((r) => (
              <li key={r.id} className="lesson-card">
                <div className="lesson-top">
                  <span className="lesson-title">{r.title}</span>
                  <span className={`pill ${r.published ? "" : "draft"}`}>{r.published ? T.published : T.draft}</span>
                </div>
                <div className="lesson-meta muted">
                  {r.lesson_date} · {r.id} · {r.words_count} {T.words}
                </div>
                <div className="row">
                  <Link to={`/admin/edit/${r.id}`} className="btn">
                    {T.edit}
                  </Link>
                  {r.published && (
                    <Link to={`/lesson/${r.id}`} className="btn">
                      {T.view}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </EditorGate>
    </Page>
  );
}

// ---------------------------------------------------------------- field editors

function TranslatedInputs({ value, onChange, label }: { value: Translated; onChange: (v: Translated) => void; label: string }) {
  return (
    <fieldset className="tr-inputs">
      <legend>{label}</legend>
      {LANGS.map((l) => (
        <label key={l}>
          <span>{l}</span>
          <input value={value[l] ?? ""} onChange={(e) => onChange({ ...value, [l]: e.target.value })} />
        </label>
      ))}
    </fieldset>
  );
}

function WordEditor({ w, onChange, onRemove, open }: { w: Word; onChange: (w: Word) => void; onRemove: () => void; open?: boolean }) {
  const T = useText();
  const { pick } = useLang();
  const issues = wordIssues(w, T);
  const set = (patch: Partial<Word>) => onChange({ ...w, ...patch });
  const orNull = (s: string) => (s === "" ? null : s);
  return (
    <details className={`word-edit ${issues.length ? "has-issues" : ""}`} open={open}>
      <summary>
        {w.word ? <Headword word={w} /> : <i className="muted">({T.word})</i>}
        <span className="muted"> — {pick(w.meaning)}</span>
        {issues.length > 0 && <span className="issue-dot" title={issues.join("\n")}>!</span>}
      </summary>
      <div className="word-grid">
        <div className="row">
          <select value={w.article ?? ""} onChange={(e) => set({ article: orNull(e.target.value) as Word["article"], ...(e.target.value ? { info: null } : { plural: null }) })}>
            <option value="">—</option>
            <option>der</option>
            <option>die</option>
            <option>das</option>
          </select>
          <input placeholder={T.word} value={w.word} onChange={(e) => set({ word: e.target.value })} className="grow" />
          <select value={w.level ?? ""} onChange={(e) => set({ level: orNull(e.target.value) })}>
            <option value="">–</option>
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
        {w.article ? (
          <input placeholder={T.plural} value={w.plural ?? ""} onChange={(e) => set({ plural: orNull(e.target.value) })} />
        ) : (
          <input placeholder={T.info} value={w.info ?? ""} onChange={(e) => set({ info: orNull(e.target.value) })} />
        )}
        <TranslatedInputs label={T.meaning} value={w.meaning} onChange={(meaning) => set({ meaning })} />
        <input placeholder={T.example} value={w.example} onChange={(e) => set({ example: e.target.value })} />
        <TranslatedInputs label={T.exampleTr} value={w.example_tr} onChange={(example_tr) => set({ example_tr })} />
        <div className="row">
          <input placeholder={T.cloze} value={w.cloze ?? ""} onChange={(e) => set({ cloze: orNull(e.target.value) })} className="grow" />
          <input placeholder={T.answer} value={w.answer ?? ""} onChange={(e) => set({ answer: orNull(e.target.value) })} />
        </div>
        {issues.length > 0 && <p className="error small">{issues.join(" · ")}</p>}
        <button type="button" className="link-btn danger" onClick={onRemove}>
          {T.removeWord}
        </button>
      </div>
    </details>
  );
}

function GrammarEditor({ g, onChange, onRemove }: { g: GrammarCard; onChange: (g: GrammarCard) => void; onRemove: () => void }) {
  const T = useText();
  return (
    <div className="panel grammar-edit">
      <input placeholder={T.grammarText} value={g.text} onChange={(e) => onChange({ ...g, text: e.target.value })} />
      <TranslatedInputs label={T.hint} value={g.hint} onChange={(hint) => onChange({ ...g, hint })} />
      <button type="button" className="link-btn danger" onClick={onRemove}>
        {T.removeWord}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- generate + review

interface Draft {
  id: string;
  title: string;
  level: string;
  date: string;
  words: Word[];
  grammar: GrammarCard[];
  published: boolean;
}

function GeneratePanel({ draft, onDone, onCancel }: { draft: Draft; onDone: (r: { title: string; words: Word[]; grammar: GrammarCard[]; notes: string[] }) => void; onCancel?: () => void }) {
  const T = useText();
  const [images, setImages] = useState<ImagePart[]>([]);
  const [text, setText] = useState("");
  const [level, setLevel] = useState(draft.level || "A2");
  const [title, setTitle] = useState(draft.title);
  const [instructions, setInstructions] = useState("");
  const [skipKnown, setSkipKnown] = useState(true);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setError(null);
    setProgress(T.generating);
    try {
      const known = [...(skipKnown ? await knownWords() : []), ...draft.words.map((w) => w.word)];
      const result = await generateLesson({ images, text, level, title, instructions, known }, (n, d, t) => setProgress(T.progress(n, d, t)));
      onDone(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setProgress(null);
    }
  };

  if (progress)
    return (
      <div className="done">
        <div className="spinner" />
        <p>{progress}</p>
        <p className="muted small">{T.slow}</p>
      </div>
    );

  return (
    <div className="form panel">
      <label>
        {T.photos}
        <span className="file-btn btn">
          {T.addPhotos}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={async (e) => {
              const files = [...(e.target.files ?? [])];
              e.target.value = "";
              const prepared = await Promise.all(files.map(prepareImage));
              setImages((cur) => [...cur, ...prepared].slice(0, 10));
            }}
          />
        </span>
        <span className="muted small">{T.photosHint}</span>
      </label>
      {images.length > 0 && (
        <div className="thumbs">
          {images.map((img, i) => (
            <button key={img.preview} type="button" className="thumb" onClick={() => setImages(images.filter((_, j) => j !== i))} title="remove">
              <img src={img.preview} alt="" />
              <span>×</span>
            </button>
          ))}
        </div>
      )}
      <label>
        {T.pasteText}
        <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <div className="row">
        <label className="grow">
          {T.level}
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        {T.titleHint}
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        {T.instructions}
        <input value={instructions} onChange={(e) => setInstructions(e.target.value)} />
      </label>
      <label className="check">
        <input type="checkbox" checked={skipKnown} onChange={(e) => setSkipKnown(e.target.checked)} /> {T.skipKnown}
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn primary block" disabled={!images.length && !text.trim()} onClick={run}>
        {T.generate}
      </button>
      {onCancel && (
        <button type="button" className="link-btn" onClick={onCancel}>
          {T.manual}
        </button>
      )}
    </div>
  );
}

export function LessonEditor() {
  const T = useText();
  const { id: editId } = useParams();
  const navigate = useNavigate();
  const isNew = !editId;
  const [draft, setDraft] = useState<Draft | null>(
    isNew ? { id: "", title: "", level: "A2", date: new Date().toLocaleDateString("sv"), words: [], grammar: [], published: false } : null,
  );
  const [phase, setPhase] = useState<"input" | "review">(isNew ? "input" : "review");
  const [notes, setNotes] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newWordId, setNewWordId] = useState<string | null>(null);

  useEffect(() => {
    if (isNew || !supabase) return;
    supabase
      .from("lessons")
      .select("*")
      .eq("id", editId)
      .single()
      .then(({ data }) => {
        const r = data as LessonRow;
        setDraft({ id: r.id, title: r.title, level: r.level ?? "A2", date: r.lesson_date, words: r.content.words, grammar: r.content.grammar, published: r.published });
      });
  }, [editId, isNew]);

  if (!draft)
    return (
      <Page back="/admin" title={T.admin}>
        <Loading value={draft} />
      </Page>
    );

  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const issues = draft.words.flatMap((w) => wordIssues(w, T).map((i) => `${w.word || "?"}: ${i}`));

  const save = async (published: boolean) => {
    setBusy(true);
    setStatus(null);
    if (isNew && (await loadIndex()).some((l) => l.id === draft.id)) {
      setStatus(T.idTaken);
      setBusy(false);
      return;
    }
    const langs = LANGS.filter((l) => draft.words.every((w) => w.meaning[l]?.trim()));
    const row = {
      id: draft.id,
      title: draft.title,
      level: draft.level,
      lesson_date: draft.date,
      content: { words: draft.words, grammar: draft.grammar },
      langs,
      words_count: draft.words.length,
      grammar_count: draft.grammar.length,
      published,
      updated_at: new Date().toISOString(),
    };
    const { error } = isNew ? await supabase!.from("lessons").insert(row) : await supabase!.from("lessons").update(row).eq("id", draft.id);
    setBusy(false);
    if (error) {
      setStatus(error.code === "23505" ? T.idTaken : error.message);
      return;
    }
    invalidateDbLessons();
    set({ published });
    setStatus(T.saved);
    if (isNew) navigate(`/admin/edit/${draft.id}`, { replace: true });
  };

  const remove = async () => {
    if (!confirm(T.confirmDelete)) return;
    const { error } = await supabase!.from("lessons").delete().eq("id", draft.id);
    if (error) return setStatus(error.message);
    invalidateDbLessons();
    navigate("/admin");
  };

  return (
    <Page back="/admin" title={draft.title || T.admin}>
      <EditorGate>
        {phase === "input" ? (
          <GeneratePanel
            draft={draft}
            onCancel={() => setPhase("review")}
            onDone={(r) => {
              const title = draft.title || r.title;
              set({ title, id: draft.id || slugify(title), words: [...draft.words, ...r.words], grammar: [...draft.grammar, ...r.grammar] });
              setNotes(r.notes);
              setPhase("review");
            }}
          />
        ) : (
          <>
            {notes.length > 0 && (
              <p className="notice">
                {T.noteFromAi} {notes.join(" · ")}
              </p>
            )}
            <section className="form panel">
              <label>
                {T.lessonTitle}
                <input
                  value={draft.title}
                  // a new lesson's ID follows the title until the ID is edited by hand
                  onChange={(e) => set({ title: e.target.value, ...(isNew && draft.id === slugify(draft.title) ? { id: slugify(e.target.value) } : {}) })}
                />
              </label>
              <label>
                {T.lessonId}
                <input value={draft.id} disabled={!isNew} onChange={(e) => set({ id: slugify(e.target.value) })} />
              </label>
              <div className="row">
                <label>
                  {T.level}
                  <select value={draft.level} onChange={(e) => set({ level: e.target.value })}>
                    {LEVELS.map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                </label>
                <label className="grow">
                  {T.date}
                  <input type="date" value={draft.date} onChange={(e) => set({ date: e.target.value })} />
                </label>
              </div>
            </section>

            <h2>
              {T.wordsTitle} · {draft.words.length}
            </h2>
            <div className="word-list-edit">
              {draft.words.map((w, i) => (
                <WordEditor
                  key={w.id}
                  w={w}
                  open={w.id === newWordId}
                  onChange={(nw) => set({ words: draft.words.map((x, j) => (j === i ? nw : x)) })}
                  onRemove={() => set({ words: draft.words.filter((_, j) => j !== i) })}
                />
              ))}
            </div>
            <div className="row">
              <button
                className="btn"
                onClick={() => {
                  const w = emptyWord();
                  setNewWordId(w.id);
                  set({ words: [...draft.words, w] });
                }}
              >
                {T.addWord}
              </button>
              <button className="btn" onClick={() => setPhase("input")}>
                {T.morePhotos}
              </button>
            </div>

            <h2>
              {T.grammarTitle} · {draft.grammar.length}
            </h2>
            {draft.grammar.map((g, i) => (
              <GrammarEditor
                key={g.id}
                g={g}
                onChange={(ng) => set({ grammar: draft.grammar.map((x, j) => (j === i ? ng : x)) })}
                onRemove={() => set({ grammar: draft.grammar.filter((_, j) => j !== i) })}
              />
            ))}
            <button className="btn" onClick={() => set({ grammar: [...draft.grammar, { id: crypto.randomUUID(), text: "", hint: {} }] })}>
              {T.addGrammar}
            </button>

            <section className="panel publish-bar">
              {issues.length > 0 && (
                <details className="error small">
                  <summary>
                    {T.issues} {issues.length}
                  </summary>
                  <ul>
                    {issues.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </details>
              )}
              {status && <p className="muted small">{status}</p>}
              <div className="row">
                <button className="btn" disabled={busy || !draft.id || !draft.title} onClick={() => save(false)}>
                  {draft.published ? T.unpublish : T.save}
                </button>
                <button className="btn primary" disabled={busy || !draft.id || !draft.title || issues.length > 0 || !draft.words.length} onClick={() => save(true)}>
                  {draft.published ? T.update : T.publish}
                </button>
              </div>
              {!isNew && (
                <button className="link-btn danger" onClick={remove}>
                  {T.del}
                </button>
              )}
            </section>
          </>
        )}
      </EditorGate>
    </Page>
  );
}
