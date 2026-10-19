import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { updateProfile, useAccount } from "../account";
import { LANGS, setLang, setUiLang, UI_LANGS, useLang, type UiLang } from "../i18n";
import type { Lang } from "../types";
import type { Word } from "../types";
import { speak } from "../util";

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
      <Header back={back} title={title} />
      <main className="page">{children}</main>
    </>
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
        speak(text);
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
  if (word.article) return <div className="gram">{word.plural ?? t("noPlural")}</div>;
  const note = word.info ?? pick(word.info_tr);
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
  return langs.includes(lang) ? null : <p className="notice">{t("noTranslation")}</p>;
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  return (
    <div className="bar" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div style={{ width: `${max ? Math.min(100, (value / max) * 100) : 0}%` }} />
    </div>
  );
}
