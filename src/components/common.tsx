import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { updateProfile, useAccount } from "../account";
import { exitDemo, isDemo } from "../demo";
import { LANGS, setLang, setUiLang, UI_LANGS, useLang, type UIKey, type UiLang } from "../i18n";
import type { Lang } from "../types";
import type { Word } from "../types";
import type { DayCounts } from "../store";
import { speak, type SpeakProblem } from "../util";

export function Header({ back, title }: { back?: string; title?: string }) {
  const { t } = useLang();
  const acc = useAccount();
  return (
    <header className="header">
      {back ? (
        <Link to={back} className="back" aria-label={t("back")}>
          ‹ {t("back")}
        </Link>
      ) : (
        <Link to="/" className="brand">
          Daily <b>Deutsch</b>
        </Link>
      )}
      {title && <span className="header-title">{title}</span>}
      <LangMenu />
      {acc.status !== "off" && (
        <Link to="/account" className={`avatar ${acc.status === "in" ? "in" : ""}`} aria-label={t("account")}>
          {acc.status === "in" ? (acc.profile?.display_name ?? "?").slice(0, 1).toUpperCase() : "👤"}
        </Link>
      )}
    </header>
  );
}

/** "🌐 DE · TR" button opening two pickers: interface language and explanation language. */
function LangMenu() {
  const { t, lang, uiLang } = useLang();
  const acc = useAccount();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div className="lang-menu" ref={ref}>
      <button type="button" className="lang" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Language">
        🌐 {uiLang.toUpperCase()} · {lang.toUpperCase()}
      </button>
      {open && (
        <div className="lang-pop">
          <label>
            {t("uiLang")}
            <select value={uiLang} onChange={(e) => setUiLang(e.target.value as UiLang)}>
              {UI_LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("nativeLang")}
            <select
              value={lang}
              onChange={(e) => {
                const next = e.target.value as Lang;
                setLang(next);
                if (acc.status === "in") updateProfile({ native_lang: next });
              }}
            >
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}

export function Page({ children, back, title }: { children: ReactNode; back?: string; title?: string }) {
  return (
    <>
      {isDemo && <DemoBanner />}
      <Header back={back} title={title} />
      <main className="page">{children}</main>
      <SpeechHint />
    </>
  );
}

// ---------------------------------------------------------------- pronunciation

const speechListeners = new Set<(p: SpeakProblem) => void>();

/** Read German aloud; if the device can't, the page shows why (SpeechHint). */
export function sayGerman(text: string) {
  speak(text, (p) => speechListeners.forEach((l) => l(p)));
}

const SPEECH_HINT: Record<SpeakProblem, UIKey> = { unsupported: "speechUnsupported", noVoice: "speechNoVoice", failed: "speechFailed" };

/** Explains a pronunciation that didn't play (in-app browser, no German voice, muted phone). */
function SpeechHint() {
  const { t } = useLang();
  const [problem, setProblem] = useState<SpeakProblem | null>(null);
  useEffect(() => {
    speechListeners.add(setProblem);
    return () => {
      speechListeners.delete(setProblem);
    };
  }, []);
  useEffect(() => {
    if (!problem) return;
    const id = setTimeout(() => setProblem(null), 8000);
    return () => clearTimeout(id);
  }, [problem]);
  if (!problem) return null;
  return (
    <div className="toast speech-hint" role="status">
      🔇 {t(SPEECH_HINT[problem])}
      <button type="button" className="link-btn" onClick={() => setProblem(null)} aria-label="OK">
        ✕
      </button>
    </div>
  );
}

export function Loading({ value }: { value: unknown }) {
  const { t } = useLang();
  return <p className="muted center">{value === null ? t("loadError") : t("loading")}</p>;
}

export function SpeakButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      className="speak"
      aria-label="Play pronunciation"
      onClick={(e) => {
        e.stopPropagation();
        sayGerman(text);
      }}
    >
      🔊
    </button>
  );
}

/** German headword with gender-coloured article. */
export function Headword({ word, hideArticle }: { word: Word; hideArticle?: boolean }) {
  const full = word.article ? `${word.article} ${word.word}` : word.word;
  return (
    <span className="headword">
      {word.article && !hideArticle && <span className={`art art-${word.article}`}>{word.article} </span>}
      {word.article && hideArticle && <span className="art art-unknown">___ </span>}
      {word.word}
      <SpeakButton text={full} />
    </span>
  );
}

/** Grammar line under the headword: plural for nouns, forms / labels otherwise. */
export function GrammarLine({ word }: { word: Word }) {
  const { t, pick } = useLang();
  const note = word.info ?? pick(word.info_tr);
  if (word.article) {
    // "nur Singular" / "nur Plural" notes already say what the plural line would
    const plural = word.plural && !note?.includes("nur Plural") ? word.plural : note?.includes("nur ") ? null : t("noPlural");
    const line = [plural, note].filter(Boolean).join(" · ");
    return line ? <div className="gram">{line}</div> : null;
  }
  return note ? <div className="gram">{note}</div> : null;
}

export function Example({ word }: { word: Word }) {
  const { pick } = useLang();
  return (
    <div className="example">
      <div>
        {word.example} <SpeakButton text={word.example} />
      </div>
      <div className="muted">{pick(word.example_tr)}</div>
    </div>
  );
}

export function TranslationNotice({ langs }: { langs: string[] }) {
  const { lang, t } = useLang();
  if (langs.includes(lang)) return null;
  return <p className="notice">{langs.includes("en") ? t("noTranslationEn") : t("noTranslation")}</p>;
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  return (
    <div className="bar" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div style={{ width: `${max ? Math.min(100, (value / max) * 100) : 0}%` }} />
    </div>
  );
}

/** Anki's three numbers: new (blue) · learning (red) · due (green); the label is in the tooltip and the legend. */
export function DayCountsView({ counts, current }: { counts: DayCounts; current?: keyof DayCounts }) {
  const { t } = useLang();
  const parts: { key: keyof DayCounts; label: string }[] = [
    { key: "new", label: t("countNew") },
    { key: "learning", label: t("countLearning") },
    { key: "review", label: t("countReview") },
  ];
  return (
    <span className="daycounts" aria-label={parts.map((p) => `${p.label} ${counts[p.key]}`).join(", ")}>
      {parts.map((p) => (
        <b key={p.key} className={`dc-${p.key} ${current === p.key ? "dc-current" : ""}`} title={p.label}>
          {counts[p.key]}
        </b>
      ))}
    </span>
  );
}

/** Legend for DayCountsView, so the colours are never the only cue. */
export function DayCountsLegend() {
  const { t } = useLang();
  return (
    <p className="daycounts-legend muted small">
      <span className="dc-new">●</span> {t("countNew")} <span className="dc-learning">●</span> {t("countLearning")}{" "}
      <span className="dc-review">●</span> {t("countReview")}
    </p>
  );
}

/** Shown on every page in demo mode: the data is simulated, and how to get back. */
function DemoBanner() {
  const { t } = useLang();
  return (
    <div className="demo-banner" role="note">
      🎬 {t("demoBanner")}
      <button type="button" className="link-btn" onClick={exitDemo}>
        {t("exitDemo")}
      </button>
    </div>
  );
}
